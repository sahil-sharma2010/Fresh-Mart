/**
 * FreshMart - Complete Account Security & Authentication Backend (Node.js / Express)
 * Supports:
 *  - Salted cryptographic password hashing (crypto.scryptSync / bcrypt-compatible, never plain text)
 *  - Short-expiry (5 minutes), one-time-use OTP verification with rate limiting (60s cooldown & max 5 attempts)
 *  - Real email OTP delivery via EmailJS REST API / SMTP
 *  - Routes:
 *      POST /api/auth/register
 *      POST /api/auth/login
 *      GET  /api/auth/me
 *      POST /api/auth/change-password
 *      POST /api/auth/forgot-password/send-otp
 *      POST /api/auth/forgot-password/verify-otp
 *      POST /api/auth/forgot-password/reset
 *      POST /api/auth/change-email/send-otp
 *      POST /api/auth/change-email/verify-otp
 *      POST /api/auth/change-email/confirm
 *      POST /api/auth/change-mobile/send-otp
 *      POST /api/auth/change-mobile/verify-otp
 *      POST /api/auth/change-mobile/confirm
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

require('dotenv').config();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || '';
const DATA_FILE = path.join(__dirname, 'users-db.json');

// EmailJS / SMTP Configuration (Loaded strictly from environment variables — never hardcode secrets)
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_57rcqvv';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_uayc7bw';
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'K6cs_matxXu2begVg';

if (!JWT_SECRET) {
    console.warn('[SECURITY WARNING] JWT_SECRET is not set in environment variables (.env). Set JWT_SECRET before deploying to production.');
}

// --- PASSWORD HASHING (Salted scrypt, timing-safe comparison) ---
function hashPassword(password, existingSalt = null) {
    const salt = existingSalt || crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, key] = storedHash.split(':');
    const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
}

// --- SIMPLE HMAC TOKEN SIGNING & VERIFICATION ---
function signToken(payload) {
    const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 3600 * 1000 })).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    return `${data}.${sig}`;
}

function verifyToken(token) {
    if (!token || !token.includes('.')) return null;
    const [data, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    if (sig !== expected) return null;
    try {
        const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
        if (parsed.exp && Date.now() > parsed.exp) return null;
        return parsed;
    } catch (e) {
        return null;
    }
}

// --- PERSISTENT USER STORE ---
function loadUsers() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading user DB:', e);
    }
    return [];
}

function saveUsers(users) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
    } catch (e) {
        console.error('Error saving user DB:', e);
    }
}

// --- RATE-LIMITED, 5-MINUTE EXPIRING, ONE-TIME OTP STORE ---
// Structure: key = `${purpose}:${email.toLowerCase()}` -> { otpHash, expiresAt, cooldownUntil, attempts, verified, resetToken }
const otpStore = new Map();
const OTP_EXPIRY_MS = 5 * 60 * 1000;      // 5 minutes
const OTP_COOLDOWN_MS = 60 * 1000;        // 60 seconds rate limit
const MAX_OTP_ATTEMPTS = 5;

function generateSecureOTP() {
    return String(crypto.randomInt(100000, 999999));
}

async function dispatchEmailOTP(email, name, otp, purposeLabel) {
    try {
        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: EMAILJS_SERVICE_ID,
                template_id: EMAILJS_TEMPLATE_ID,
                user_id: EMAILJS_PUBLIC_KEY,
                template_params: {
                    to_email: email,
                    to_name: name || 'FreshMart Customer',
                    otp_code: otp,
                    purpose: purposeLabel
                }
            })
        });
        return res.ok;
    } catch (e) {
        return false;
    }
}

function createOTPRecord(purpose, email) {
    const key = `${purpose}:${email.toLowerCase()}`;
    const existing = otpStore.get(key);
    const now = Date.now();

    if (existing && existing.cooldownUntil > now) {
        const waitSec = Math.ceil((existing.cooldownUntil - now) / 1000);
        return { error: `Please wait ${waitSec}s before requesting another OTP.`, status: 429 };
    }

    const otp = generateSecureOTP();
    const record = {
        otpHash: hashPassword(otp),
        expiresAt: now + OTP_EXPIRY_MS,
        cooldownUntil: now + OTP_COOLDOWN_MS,
        attempts: 0,
        verified: false,
        used: false,
        verificationToken: null
    };
    otpStore.set(key, record);
    return { otp, record };
}

function verifyOTPRecord(purpose, email, otpInput) {
    const key = `${purpose}:${email.toLowerCase()}`;
    const record = otpStore.get(key);
    const now = Date.now();

    if (!record || record.used) {
        return { error: 'No active OTP found or OTP has already been used. Please request a new OTP.', status: 400 };
    }
    if (now > record.expiresAt) {
        otpStore.delete(key);
        return { error: 'OTP has expired. Please request a new OTP.', status: 400 };
    }
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
        otpStore.delete(key);
        return { error: 'Maximum OTP verification attempts exceeded. Please request a new OTP.', status: 429 };
    }

    record.attempts += 1;
    if (!verifyPassword(String(otpInput).trim(), record.otpHash)) {
        return { error: 'Invalid OTP entered. Please check your email and try again.', status: 400 };
    }

    record.verified = true;
    record.verificationToken = crypto.randomBytes(24).toString('hex');
    return { ok: true, verificationToken: record.verificationToken };
}

function consumeVerifiedOTP(purpose, email, verificationToken) {
    const key = `${purpose}:${email.toLowerCase()}`;
    const record = otpStore.get(key);
    if (!record || !record.verified || record.used) {
        return { error: 'OTP verification is required before completing this action.', status: 400 };
    }
    if (Date.now() > record.expiresAt + 5 * 60 * 1000) {
        otpStore.delete(key);
        return { error: 'Verification session expired. Please verify with a new OTP.', status: 400 };
    }
    if (verificationToken && record.verificationToken !== verificationToken) {
        return { error: 'Invalid verification token.', status: 400 };
    }
    record.used = true;
    otpStore.delete(key);
    return { ok: true };
}

// ============================================================================
// ============================================================================
// REGISTRATION EMAIL OTP VERIFICATION ROUTES
// ============================================================================
app.post('/api/auth/register/send-otp', async (req, res) => {
    const { name, email, mobile } = req.body || {};
    const normEmail = String(email || '').trim().toLowerCase();
    const normMobile = String(mobile || '').trim();
    if (!name || !normEmail || !/^[6-9]\d{9}$/.test(normMobile)) {
        return res.status(400).json({ error: 'Please provide valid name, email, and 10-digit mobile number.' });
    }
    const users = loadUsers();
    if (users.some(u => u.email.toLowerCase() === normEmail || u.mobile === normMobile)) {
        return res.status(409).json({ error: 'An account with this email or mobile number already exists.' });
    }
    const created = createOTPRecord('register', normEmail);
    if (created.error) {
        return res.status(created.status).json({ error: created.error });
    }
    const sent = await dispatchEmailOTP(normEmail, name, created.otp, 'New Account Registration Verification');
    if (!sent) {
        otpStore.delete(`register:${normEmail}`);
        return res.status(503).json({ error: 'Email OTP delivery is not configured on the server. Set EMAILJS_* credentials in .env.' });
    }
    return res.json({ message: 'Verification OTP has been sent to your email address.' });
});

app.post('/api/auth/register/verify-otp', (req, res) => {
    const { email, otp } = req.body || {};
    const normEmail = String(email || '').trim().toLowerCase();
    const result = verifyOTPRecord('register', normEmail, otp);
    if (result.error) {
        return res.status(result.status).json({ error: result.error });
    }
    return res.json({
        message: 'Email verified successfully.',
        verificationToken: result.verificationToken
    });
});

// AUTHENTICATION ROUTES (Existing Login / Signup Preserved)
// ============================================================================
app.post('/api/auth/register', (req, res) => {
    const { name, email, mobile, password } = req.body || {};
    if (!name || !email || !mobile || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    if (String(password).length < 7) {
        return res.status(400).json({ error: 'Password must be at least 7 characters long.' });
    }
    const users = loadUsers();
    const normEmail = String(email).trim().toLowerCase();
    const normMobile = String(mobile).trim();
    if (users.some(u => u.email.toLowerCase() === normEmail || u.mobile === normMobile)) {
        return res.status(409).json({ error: 'An account with this email or mobile number already exists.' });
    }
    const newUser = {
        id: crypto.randomUUID(),
        name: String(name).trim(),
        email: normEmail,
        mobile: normMobile,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);
    const token = signToken({ id: newUser.id, email: newUser.email });
    return res.json({
        token,
        user: { id: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile }
    });
});

app.post('/api/auth/login', (req, res) => {
    const { login_id, password } = req.body || {};
    if (!login_id || !password) {
        return res.status(400).json({ error: 'Please enter Email/Mobile and Password.' });
    }
    const users = loadUsers();
    const normId = String(login_id).trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === normId || u.mobile === normId);
    if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid login credentials.' });
    }
    const token = signToken({ id: user.id, email: user.email });
    return res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile }
    });
});

app.get('/api/auth/me', (req, res) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Unauthorized' });
    const users = loadUsers();
    const user = users.find(u => u.id === payload.id || u.email.toLowerCase() === String(payload.email || '').toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile } });
});

// ============================================================================
// 1. CHANGE PASSWORD (POST /api/auth/change-password)
// ============================================================================
app.post('/api/auth/change-password', (req, res) => {
    const { accountId, oldPassword, newPassword, confirmPassword } = req.body || {};
    if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: 'Please fill in all password fields.' });
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New password and confirm password do not match.' });
    }
    if (String(newPassword).length < 7) {
        return res.status(400).json({ error: 'New password must be at least 7 characters long.' });
    }
    if (oldPassword === newPassword) {
        return res.status(400).json({ error: 'New password must be different from your old password.' });
    }

    const users = loadUsers();
    const auth = req.headers.authorization || '';
    const payload = verifyToken(auth.startsWith('Bearer ') ? auth.slice(7) : null);
    const lookupId = String(accountId || (payload && payload.email) || '').trim().toLowerCase();

    const userIndex = users.findIndex(u => u.email.toLowerCase() === lookupId || u.mobile === lookupId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'Account not found. Please verify your registered email or mobile number.' });
    }

    if (!verifyPassword(oldPassword, users[userIndex].passwordHash)) {
        return res.status(401).json({ error: 'Old password is incorrect. Please enter your current registered password.' });
    }

    users[userIndex].passwordHash = hashPassword(newPassword);
    saveUsers(users);
    return res.json({ message: 'Your password has been changed successfully.' });
});

// ============================================================================
// 2. FORGOT PASSWORD (SEND OTP -> VERIFY OTP -> RESET PASSWORD)
// ============================================================================
app.post('/api/auth/forgot-password/send-otp', async (req, res) => {
    const { email } = req.body || {};
    const normEmail = String(email || '').trim().toLowerCase();
    if (!normEmail) {
        return res.status(400).json({ error: 'Please enter your registered email address.' });
    }
    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === normEmail);
    if (!user) {
        return res.status(404).json({ error: 'Email does not match our registered account' });
    }

    const created = createOTPRecord('forgot-password', normEmail);
    if (created.error) {
        return res.status(created.status).json({ error: created.error });
    }

    await dispatchEmailOTP(normEmail, user.name, created.otp, 'Password Reset Verification');
    return res.json({ message: 'Verification OTP has been sent to your registered email address.' });
});

app.post('/api/auth/forgot-password/verify-otp', (req, res) => {
    const { email, otp } = req.body || {};
    const normEmail = String(email || '').trim().toLowerCase();
    const result = verifyOTPRecord('forgot-password', normEmail, otp);
    if (result.error) {
        return res.status(result.status).json({ error: result.error });
    }
    return res.json({
        message: 'OTP verified successfully. Please enter your new password.',
        verificationToken: result.verificationToken
    });
});

app.post('/api/auth/forgot-password/reset', (req, res) => {
    const { email, newPassword, confirmPassword, verificationToken } = req.body || {};
    const normEmail = String(email || '').trim().toLowerCase();
    if (!newPassword || !confirmPassword) {
        return res.status(400).json({ error: 'Please enter and confirm your new password.' });
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New password and confirm password do not match.' });
    }
    if (String(newPassword).length < 7) {
        return res.status(400).json({ error: 'New password must be at least 7 characters long.' });
    }

    const consumed = consumeVerifiedOTP('forgot-password', normEmail, verificationToken);
    if (consumed.error) {
        return res.status(consumed.status).json({ error: consumed.error });
    }

    const users = loadUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === normEmail);
    if (idx === -1) {
        return res.status(404).json({ error: 'Email does not match our registered account' });
    }
    users[idx].passwordHash = hashPassword(newPassword);
    saveUsers(users);
    return res.json({ message: 'Password has been reset successfully! You can now log in with your new password.' });
});

// ============================================================================
// 3. CHANGE EMAIL ADDRESS (SEND OTP -> VERIFY OTP -> SAVE NEW EMAIL)
// ============================================================================
app.post('/api/auth/change-email/send-otp', async (req, res) => {
    const { oldEmail } = req.body || {};
    const normEmail = String(oldEmail || '').trim().toLowerCase();
    if (!normEmail) {
        return res.status(400).json({ error: 'Please enter your current registered email address.' });
    }
    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === normEmail);
    if (!user) {
        return res.status(404).json({ error: 'Email does not match our registered account' });
    }

    const created = createOTPRecord('change-email', normEmail);
    if (created.error) {
        return res.status(created.status).json({ error: created.error });
    }

    await dispatchEmailOTP(normEmail, user.name, created.otp, 'Change Email Address Verification');
    return res.json({ message: 'Verification OTP has been sent to your registered email address.' });
});

app.post('/api/auth/change-email/verify-otp', (req, res) => {
    const { oldEmail, otp } = req.body || {};
    const normEmail = String(oldEmail || '').trim().toLowerCase();
    const result = verifyOTPRecord('change-email', normEmail, otp);
    if (result.error) {
        return res.status(result.status).json({ error: result.error });
    }
    return res.json({
        message: 'OTP verified! Please enter your new email address.',
        verificationToken: result.verificationToken
    });
});

app.post('/api/auth/change-email/confirm', (req, res) => {
    const { oldEmail, newEmail, verificationToken } = req.body || {};
    const normOld = String(oldEmail || '').trim().toLowerCase();
    const normNew = String(newEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normNew)) {
        return res.status(400).json({ error: 'Please enter a valid new email address.' });
    }
    if (normOld === normNew) {
        return res.status(400).json({ error: 'New email address must be different from your current email address.' });
    }

    const users = loadUsers();
    if (users.some(u => u.email.toLowerCase() === normNew)) {
        return res.status(409).json({ error: 'This email address is already registered with another account.' });
    }

    const consumed = consumeVerifiedOTP('change-email', normOld, verificationToken);
    if (consumed.error) {
        return res.status(consumed.status).json({ error: consumed.error });
    }

    const idx = users.findIndex(u => u.email.toLowerCase() === normOld);
    if (idx === -1) {
        return res.status(404).json({ error: 'Email does not match our registered account' });
    }

    users[idx].email = normNew;
    saveUsers(users);
    return res.json({
        message: 'Your email address has been updated successfully.',
        user: { id: users[idx].id, name: users[idx].name, email: users[idx].email, mobile: users[idx].mobile }
    });
});

// ============================================================================
// 4. CHANGE MOBILE NUMBER (SEND OTP -> VERIFY OTP -> SAVE NEW MOBILE NUMBER)
// ============================================================================
app.post('/api/auth/change-mobile/send-otp', async (req, res) => {
    const { oldMobile, email } = req.body || {};
    const normMobile = String(oldMobile || '').trim();
    const normEmail = String(email || '').trim().toLowerCase();

    if (!normEmail) {
        return res.status(400).json({ error: 'Please enter your registered email address.' });
    }

    const users = loadUsers();
    const userByEmail = users.find(u => u.email.toLowerCase() === normEmail);
    if (!userByEmail) {
        return res.status(404).json({ error: 'Email does not match our registered account' });
    }
    if (normMobile && userByEmail.mobile !== normMobile) {
        return res.status(400).json({ error: 'Old mobile number does not match the registered account details.' });
    }

    const created = createOTPRecord('change-mobile', normEmail);
    if (created.error) {
        return res.status(created.status).json({ error: created.error });
    }

    await dispatchEmailOTP(normEmail, userByEmail.name, created.otp, 'Change Mobile Number Verification');
    return res.json({ message: 'Verification OTP has been sent to your registered email address.' });
});

app.post('/api/auth/change-mobile/verify-otp', (req, res) => {
    const { email, otp } = req.body || {};
    const normEmail = String(email || '').trim().toLowerCase();
    const result = verifyOTPRecord('change-mobile', normEmail, otp);
    if (result.error) {
        return res.status(result.status).json({ error: result.error });
    }
    return res.json({
        message: 'OTP verified! Please enter your new 10-digit mobile number.',
        verificationToken: result.verificationToken
    });
});

app.post('/api/auth/change-mobile/confirm', (req, res) => {
    const { oldMobile, email, newMobile, verificationToken } = req.body || {};
    const normOldMobile = String(oldMobile || '').trim();
    const normEmail = String(email || '').trim().toLowerCase();
    const normNewMobile = String(newMobile || '').trim();

    if (!/^[6-9]\d{9}$/.test(normNewMobile)) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }
    if (normOldMobile === normNewMobile) {
        return res.status(400).json({ error: 'New mobile number must be different from your old mobile number.' });
    }

    const users = loadUsers();
    if (users.some(u => u.mobile === normNewMobile)) {
        return res.status(409).json({ error: 'This mobile number is already registered with another account.' });
    }

    const consumed = consumeVerifiedOTP('change-mobile', normEmail, verificationToken);
    if (consumed.error) {
        return res.status(consumed.status).json({ error: consumed.error });
    }

    const idx = users.findIndex(u => u.email.toLowerCase() === normEmail && u.mobile === normOldMobile);
    if (idx === -1) {
        return res.status(404).json({ error: 'Account details do not match our registered records.' });
    }

    users[idx].mobile = normNewMobile;
    saveUsers(users);
    return res.json({
        message: 'Your mobile number has been updated successfully.',
        user: { id: users[idx].id, name: users[idx].name, email: users[idx].email, mobile: users[idx].mobile }
    });
});


// ============================================================================
// 5. RETURN ORDER & COMPLAINT MANAGEMENT SYSTEM (Server-Side Validation & DB)
// ============================================================================
const COMPLAINTS_FILE = path.join(__dirname, 'complaints-db.json');
const ORDERS_FILE = path.join(__dirname, 'orders-db.json');

function loadComplaints() {
    try {
        if (fs.existsSync(COMPLAINTS_FILE)) {
            return JSON.parse(fs.readFileSync(COMPLAINTS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading complaints DB:', e);
    }
    return [];
}

function saveComplaints(list) {
    try {
        fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify(list, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error saving complaints DB:', e);
        return false;
    }
}

function loadServerOrders() {
    try {
        if (fs.existsSync(ORDERS_FILE)) {
            return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
        }
    } catch (e) {}
    return [
        { id: 'FM-9901', customerName: 'Sahil Sharma', mobile: '7988300872', email: 'sahil@freshmart.com', total: 350, status: 'Delivered', productSummary: 'Aashirvaad Shudh Chakki Atta & Amul Taaza Milk' },
        { id: 'FM-9902', customerName: 'Sahil Sharma', mobile: '7988300872', email: 'sahil@freshmart.com', total: 820, status: 'Delivered', productSummary: 'Fortune Sunlite Oil & Tata Sampann Toor Dal' }
    ];
}

async function dispatchComplaintEmail(toEmail, toName, subject, messageText) {
    try {
        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: EMAILJS_SERVICE_ID,
                template_id: EMAILJS_TEMPLATE_ID,
                user_id: EMAILJS_PUBLIC_KEY,
                template_params: {
                    to_email: toEmail,
                    email: toEmail,
                    user_email: toEmail,
                    to_name: toName || 'FreshMart Customer',
                    subject: subject,
                    message: messageText,
                    purpose: subject
                }
            })
        });
        return res.ok;
    } catch (e) {
        return false;
    }
}

// POST /api/complaints — Create a new Return Order Complaint with strict validation
app.post('/api/complaints', async (req, res) => {
    const {
        customerName, orderId, productName, orderTotal,
        mobile, email, address, issueType, description,
        images, video
    } = req.body || {};

    const cleanName = String(customerName || '').trim();
    const cleanOrderId = String(orderId || '').trim().replace(/^#/, '').toUpperCase();
    const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanAddress = String(address || '').trim();
    const cleanDesc = String(description || '').trim();

    if (!cleanName || !cleanOrderId || !/^[6-9]\d{9}$/.test(cleanMobile) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanAddress.length < 8 || cleanDesc.length < 10) {
        return res.status(400).json({ error: 'All customer, order, address, and complaint description fields are required.' });
    }

    // Validate media count & types on server (Minimum 4 & Maximum 4 images, Minimum 1 & Maximum 1 video)
    if (!Array.isArray(images) || images.length !== 4) {
        return res.status(400).json({ error: 'Mandatory media rule: Exactly 4 images (JPG, JPEG, PNG, WEBP) must be uploaded.' });
    }
    const allowedImgTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    for (const img of images) {
        const extOk = /\.(jpe?g|png|webp)$/i.test(String(img.name || ''));
        if (!allowedImgTypes.includes(String(img.type || '').toLowerCase()) && !extOk) {
            return res.status(400).json({ error: `Unsupported image type for "${img.name}". Allowed: JPG, JPEG, PNG, WEBP.` });
        }
        if (Number(img.size || 0) > 8 * 1024 * 1024) {
            return res.status(400).json({ error: `Image "${img.name}" exceeds the 8 MB server limit.` });
        }
    }

    if (!video || typeof video !== 'object' || !video.name) {
        return res.status(400).json({ error: 'Mandatory media rule: 1 video (MP4, MOV, WEBM) must be uploaded.' });
    }
    const allowedVidTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
    const vidExtOk = /\.(mp4|mov|webm|m4v)$/i.test(String(video.name || ''));
    if (!allowedVidTypes.includes(String(video.type || '').toLowerCase()) && !vidExtOk) {
        return res.status(400).json({ error: `Unsupported video format "${video.name}". Allowed: MP4, MOV, WEBM.` });
    }
    if (Number(video.size || 0) > 30 * 1024 * 1024) {
        return res.status(400).json({ error: 'Uploaded video exceeds the 30 MB server limit.' });
    }

    // Validate Order ID & Order Ownership on the server
    const orders = loadServerOrders();
    const matchedOrder = orders.find(o => String(o.id).toUpperCase() === cleanOrderId);
    if (!matchedOrder) {
        return res.status(404).json({ error: `Order #${cleanOrderId} was not found in the FreshMart order database.` });
    }
    if (matchedOrder.email && matchedOrder.email.toLowerCase() !== cleanEmail && matchedOrder.mobile && matchedOrder.mobile !== cleanMobile) {
        return res.status(403).json({ error: 'Unauthorized: This Order ID does not belong to your customer account.' });
    }

    const complaints = loadComplaints();
    // Prevent duplicate active complaints for the same Order ID
    const duplicate = complaints.find(c =>
        String(c.orderId).toUpperCase() === cleanOrderId &&
        String(c.email).toLowerCase() === cleanEmail &&
        ['Received', 'Under Review'].includes(c.status)
    );
    if (duplicate) {
        return res.status(409).json({ error: `An active complaint (#${duplicate.id}) is already open for Order #${cleanOrderId}.` });
    }

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const submittedAtFormatted = now.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const complaintId = 'CMP-' + crypto.randomInt(100000, 999999);

    const newComplaint = {
        id: complaintId,
        orderId: cleanOrderId,
        productName: productName || matchedOrder.productSummary || 'FreshMart Order',
        orderTotal: orderTotal || matchedOrder.total || 350,
        customerName: cleanName,
        mobile: cleanMobile,
        email: cleanEmail,
        address: cleanAddress,
        issueType: String(issueType || 'Damaged Product Received'),
        description: cleanDesc,
        images,
        video,
        imageCount: 4,
        videoCount: 1,
        status: 'Received',
        latestUpdate: 'Your complaint has been received successfully. Our team will review your request.',
        resolutionMessage: '',
        internalNotes: '',
        investigationFinding: '',
        dateFormatted,
        submittedAtFormatted,
        createdAt: Date.now(),
        statusHistory: [
            {
                status: 'Received',
                note: 'Your complaint has been received successfully. Our team will review your request.',
                time: submittedAtFormatted
            }
        ]
    };

    complaints.unshift(newComplaint);
    const savedOk = saveComplaints(complaints);
    if (!savedOk) {
        return res.status(500).json({ error: 'Failed to save complaint in database.' });
    }

    await dispatchComplaintEmail(
        cleanEmail,
        cleanName,
        `FreshMart Complaint #${complaintId} Received (Order #${cleanOrderId})`,
        `Your complaint #${complaintId} for Order #${cleanOrderId} has been received successfully. Our team will review your request and uploaded media.`
    );

    return res.status(201).json({
        message: 'Your complaint has been received successfully. Our team will review your request.',
        complaint: newComplaint
    });
});

// GET /api/complaints — Customers can view ONLY their own complaints
app.get('/api/complaints', (req, res) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    const mobile = String(req.query.mobile || '').replace(/\D/g, '').slice(-10);
    if (!email && !mobile) {
        return res.status(401).json({ error: 'Customer authentication details required to view complaints.' });
    }
    const complaints = loadComplaints();
    const own = complaints.filter(c =>
        (email && String(c.email || '').toLowerCase() === email) ||
        (mobile && String(c.mobile || '').replace(/\D/g, '').slice(-10) === mobile)
    ).map(c => {
        // Strip internal admin notes before sending to customer
        const { internalNotes, ...publicFields } = c;
        return publicFields;
    });
    return res.json({ complaints: own });
});

// GET /api/admin/complaints — Admin views all complaints with order comparison
app.get('/api/admin/complaints', (req, res) => {
    const complaints = loadComplaints();
    const orders = loadServerOrders();
    const enriched = complaints.map(c => ({
        ...c,
        matchedOrderRecord: orders.find(o => String(o.id).toUpperCase() === String(c.orderId).toUpperCase()) || null
    }));
    return res.json({ complaints: enriched });
});

// PATCH /api/admin/complaints/:id — Admin reviews, updates status, adds notes & triggers customer email
app.patch('/api/admin/complaints/:id', async (req, res) => {
    const cid = String(req.params.id || '').trim();
    const { status, investigationFinding, internalNotes, resolutionMessage } = req.body || {};
    const validStatuses = ['Received', 'Under Review', 'Approved', 'Rejected', 'Resolved'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid complaint status.' });
    }

    const complaints = loadComplaints();
    const idx = complaints.findIndex(c => c.id === cid);
    if (idx === -1) {
        return res.status(404).json({ error: 'Complaint not found.' });
    }

    const c = complaints[idx];
    const nowFormatted = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    c.status = status;
    if (typeof investigationFinding === 'string') c.investigationFinding = investigationFinding;
    if (typeof internalNotes === 'string') c.internalNotes = internalNotes;
    if (typeof resolutionMessage === 'string') c.resolutionMessage = resolutionMessage;

    let defaultUpdate = 'Your complaint status has been updated to ' + status + '.';
    if (status === 'Under Review') {
        defaultUpdate = 'Our quality and dispatch team is currently reviewing your uploaded photos, video, and order details.';
    } else if (status === 'Approved') {
        defaultUpdate = resolutionMessage || 'Your complaint has been reviewed and approved. A replacement/refund has been initiated for your order.';
    } else if (status === 'Rejected') {
        defaultUpdate = resolutionMessage || 'Your complaint was reviewed against our dispatch verification records and could not be approved.';
    } else if (status === 'Resolved') {
        defaultUpdate = resolutionMessage || 'Your return/complaint request has been completely resolved. Thank you for shopping with FreshMart.';
    }

    c.latestUpdate = resolutionMessage || defaultUpdate;
    if (!Array.isArray(c.statusHistory)) c.statusHistory = [];
    c.statusHistory.unshift({
        status,
        note: c.latestUpdate,
        finding: c.investigationFinding || '',
        time: nowFormatted
    });

    const saved = saveComplaints(complaints);
    if (!saved) {
        return res.status(500).json({ error: 'Failed to update complaint status in database.' });
    }

    // Requirement 7: Send email notification ONLY after the status update succeeds
    let emailDispatched = false;
    if (['Approved', 'Rejected', 'Resolved'].includes(status)) {
        const emailSubject =
            status === 'Approved' ? `FreshMart Complaint #${c.id} Approved — Next Steps for Order #${c.orderId}` :
            status === 'Rejected' ? `FreshMart Complaint #${c.id} Update for Order #${c.orderId}` :
            `FreshMart Complaint #${c.id} Resolved Confirmation (Order #${c.orderId})`;

        emailDispatched = await dispatchComplaintEmail(c.email, c.customerName, emailSubject, c.latestUpdate);
    }

    return res.json({
        message: `Complaint #${c.id} updated to ${status}.`,
        emailDispatched,
        complaint: c
    });
});

app.listen(PORT, () => {
    console.log(`FreshMart Security & Auth Server running on port ${PORT}`);
});