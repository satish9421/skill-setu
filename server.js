const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsetu';

let db, usersCol, workersCol, bookingsCol, notificationsCol, reviewsCol, otpCol;

// Multer for avatar uploads
const uploadDir = 'public/uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

// Middleware
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:3000',
    'https://skill-setu.netlify.app',
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin) || origin.includes('localhost')) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());
app.use(express.static('.'));
app.use('/public', express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'skillsetu-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
});

async function sendEmail(to, subject, html) {
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') {
        console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
        return true;
    }
    try {
        await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
        return true;
    } catch (e) {
        console.error('Email error:', e.message);
        return false;
    }
}

// SMS via Twilio
async function sendSMS(to, message) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.log(`[SMS MOCK] To: ${to} | Message: ${message}`);
        return true;
    }
    try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        // Ensure number is in E.164 format e.g. +919876543210
        const formattedNumber = to.startsWith('+') ? to : `+91${to.replace(/\D/g,'')}`;
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedNumber
        });
        return true;
    } catch (e) {
        console.error('SMS error:', e.message);
        return false;
    }
}

// Connect to MongoDB
async function connectDB() {
    const client = await MongoClient.connect(MONGODB_URI);
    db = client.db();
    usersCol = db.collection('users');
    workersCol = db.collection('workers');
    bookingsCol = db.collection('bookings');
    notificationsCol = db.collection('notifications');
    reviewsCol = db.collection('reviews');
    otpCol = db.collection('otps');

    await usersCol.createIndex({ email: 1 }, { unique: true });
    await workersCol.createIndex({ email: 1 }, { unique: true });
    await workersCol.createIndex({ serviceType: 1, available: 1 });
    await bookingsCol.createIndex({ customerId: 1 });
    await bookingsCol.createIndex({ workerId: 1 });
    await notificationsCol.createIndex({ userId: 1 });
    await otpCol.createIndex({ email: 1 });
    await otpCol.createIndex({ createdAt: 1 }, { expireAfterSeconds: 600 });

    console.log('✅ Connected to MongoDB');
    await initializeDemoData();
}

async function initializeDemoData() {
    const count = await workersCol.countDocuments();
    if (count > 0) return;

    const services = ['plumber','carpenter','electrician','cook','maid','gardener','painter','ac-technician','mechanic','cleaner','locksmith','mobile-repair'];
    const names = ['Rajesh Kumar','Amit Singh','Priya Sharma','Suresh Patel','Deepak Verma','Anita Devi','Ramesh Yadav','Sunita Kumari','Vijay Gupta','Meena Joshi','Arjun Nair','Kavita Reddy'];
    const bios = [
        'Expert with 8+ years of experience. Specializes in pipe fitting and leak repairs.',
        'Skilled craftsman known for quality furniture and woodwork.',
        'Certified electrician handling all wiring and electrical installations.',
        'Professional chef with expertise in Indian and continental cuisine.',
        'Reliable and thorough with excellent references.',
        'Passionate about creating beautiful gardens and green spaces.',
        'Creative painter with an eye for detail and color.',
        'Certified AC technician for all major brands.',
        'Experienced mechanic for cars and two-wheelers.',
        'Deep cleaning specialist with eco-friendly products.',
        'Fast and reliable locksmith available 24/7.',
        'Expert in smartphone and tablet repairs.'
    ];

    const workers = [];
    for (let i = 0; i < 12; i++) {
        workers.push({
            email: `worker${i+1}@skillsetu.com`,
            password: await bcrypt.hash('password123', 10),
            name: names[i],
            phone: `98765${43210 + i}`,
            bio: bios[i],
            serviceType: services[i],
            experience: Math.floor(Math.random() * 10) + 1,
            rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
            totalReviews: Math.floor(Math.random() * 80) + 10,
            hourlyRate: Math.floor(Math.random() * 300) + 150,
            available: true,
            verified: true,
            location: { lat: 28.6139 + (Math.random()-0.5)*0.15, lng: 77.2090 + (Math.random()-0.5)*0.15 },
            wallet: Math.floor(Math.random() * 2000),
            transactions: [],
            completedJobs: Math.floor(Math.random() * 120) + 10,
            avatar: null,
            skills: [],
            createdAt: new Date()
        });
    }
    await workersCol.insertMany(workers);
    console.log('✅ Demo workers created');
}

// ─── AUTH ROUTES ────────────────────────────────────────────────────────────

app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { email, phone, purpose } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await otpCol.deleteMany({ email });
        await otpCol.insertOne({ email, otp, purpose, createdAt: new Date() });

        console.log(`[OTP] ${email} → ${otp}`);
        // Respond immediately so UI never hangs
        res.json({ success: true, message: 'OTP sent' });

        // Send SMS if phone provided, else fallback to email
        if (phone) {
            const smsText = `Your Skill Setu OTP is: ${otp}. Valid for 10 minutes. Do not share.`;
            sendSMS(phone, smsText).catch(e => console.error('SMS error:', e.message));
        } else {
            const html = `
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;background:#f9f9f9;border-radius:10px;">
                    <h2 style="color:#6c63ff;text-align:center;">Skill Setu</h2>
                    <p>Your OTP for <strong>${purpose === 'register' ? 'email verification' : 'password reset'}</strong> is:</p>
                    <div style="font-size:36px;font-weight:bold;text-align:center;letter-spacing:10px;color:#6c63ff;padding:20px;background:#fff;border-radius:8px;margin:20px 0;">${otp}</div>
                    <p style="color:#888;font-size:13px;">This OTP expires in 10 minutes. Do not share it with anyone.</p>
                </div>`;
            sendEmail(email, 'Skill Setu - Your OTP Code', html).catch(e => console.error('Email error:', e.message));
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const record = await otpCol.findOne({ email, otp });
        if (!record) return res.status(400).json({ error: 'Invalid or expired OTP' });
        await otpCol.deleteMany({ email });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, phone, userType, serviceType } = req.body;
        const col = userType === 'customer' ? usersCol : workersCol;

        if (await col.findOne({ email })) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const base = { email, password: hashed, name, phone: phone || '', wallet: 0, transactions: [], verified: true, createdAt: new Date() };

        if (userType === 'worker') {
            Object.assign(base, {
                serviceType: serviceType || 'plumber', experience: 0, rating: 0,
                totalReviews: 0, hourlyRate: 200, available: false, bio: '',
                location: { lat: 28.6139 + (Math.random()-0.5)*0.1, lng: 77.2090 + (Math.random()-0.5)*0.1 },
                completedJobs: 0, avatar: null, skills: []
            });
        } else {
            Object.assign(base, { address: '', avatar: null });
        }

        await col.insertOne(base);

        const welcomeHtml = `<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;background:#f9f9f9;border-radius:10px;">
            <h2 style="color:#6c63ff;">Welcome to Skill Setu, ${name}!</h2>
            <p>Your account has been created successfully. You can now ${userType === 'customer' ? 'find skilled workers near you' : 'start accepting jobs'}.</p>
            <a href="http://localhost:${PORT}" style="display:inline-block;padding:12px 24px;background:#6c63ff;color:#fff;border-radius:6px;text-decoration:none;margin-top:15px;">Go to Dashboard</a>
        </div>`;
        await sendEmail(email, 'Welcome to Skill Setu!', welcomeHtml);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, userType } = req.body;
        const col = userType === 'customer' ? usersCol : workersCol;
        const user = await col.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        req.session.userId = user._id.toString();
        req.session.userType = userType;

        const userData = { ...user };
        delete userData.password;
        res.json({ success: true, user: userData });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/auth/session', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
    const col = req.session.userType === 'customer' ? usersCol : workersCol;
    const user = await col.findOne({ _id: new ObjectId(req.session.userId) });
    if (!user) return res.status(401).json({ error: 'User not found' });
    const userData = { ...user };
    delete userData.password;
    res.json({ user: userData, userType: req.session.userType });
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, newPassword, userType } = req.body;
        const col = userType === 'customer' ? usersCol : workersCol;
        const hashed = await bcrypt.hash(newPassword, 10);
        const result = await col.updateOne({ email }, { $set: { password: hashed } });
        if (result.matchedCount === 0) return res.status(404).json({ error: 'Email not found' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── WORKER ROUTES ───────────────────────────────────────────────────────────

app.get('/api/workers/search', async (req, res) => {
    try {
        const { serviceType, minRating, maxRate, sortBy } = req.query;
        const query = { available: true };
        if (serviceType) query.serviceType = serviceType;
        if (minRating) query.rating = { $gte: parseFloat(minRating) };
        if (maxRate) query.hourlyRate = { $lte: parseFloat(maxRate) };

        let workers = await workersCol.find(query).toArray();
        workers.forEach(w => delete w.password);

        if (sortBy === 'rating') workers.sort((a, b) => b.rating - a.rating);
        else if (sortBy === 'price_low') workers.sort((a, b) => a.hourlyRate - b.hourlyRate);
        else if (sortBy === 'price_high') workers.sort((a, b) => b.hourlyRate - a.hourlyRate);
        else if (sortBy === 'experience') workers.sort((a, b) => b.experience - a.experience);
        else workers.sort((a, b) => b.rating - a.rating);

        res.json(workers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/workers/:id', async (req, res) => {
    try {
        const worker = await workersCol.findOne({ _id: new ObjectId(req.params.id) });
        if (!worker) return res.status(404).json({ error: 'Worker not found' });
        delete worker.password;
        const workerReviews = await reviewsCol.find({ workerId: req.params.id }).sort({ createdAt: -1 }).limit(10).toArray();
        res.json({ ...worker, reviews: workerReviews });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/workers/:id/availability', async (req, res) => {
    try {
        await workersCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { available: req.body.available } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/workers/:id/location', async (req, res) => {
    try {
        const { location } = req.body;
        await workersCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { location } });
        await bookingsCol.updateMany(
            { workerId: req.params.id, status: { $in: ['accepted', 'in-progress'] } },
            { $set: { workerLocation: location } }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/workers/:id/profile', async (req, res) => {
    try {
        const { name, phone, serviceType, experience, hourlyRate, bio, skills } = req.body;
        await workersCol.updateOne({ _id: new ObjectId(req.params.id) }, {
            $set: { name, phone, serviceType, experience: parseInt(experience), hourlyRate: parseFloat(hourlyRate), bio, skills }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/workers/:id/avatar', upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const avatarUrl = `/public/uploads/${req.file.filename}`;
        await workersCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { avatar: avatarUrl } });
        res.json({ success: true, avatar: avatarUrl });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── CUSTOMER ROUTES ─────────────────────────────────────────────────────────

app.put('/api/customers/:id/profile', async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        await usersCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { name, phone, address } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/customers/:id/avatar', upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const avatarUrl = `/public/uploads/${req.file.filename}`;
        await usersCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { avatar: avatarUrl } });
        res.json({ success: true, avatar: avatarUrl });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── BOOKING ROUTES ──────────────────────────────────────────────────────────

app.post('/api/bookings', async (req, res) => {
    try {
        const booking = { ...req.body, status: 'pending', createdAt: new Date() };
        const result = await bookingsCol.insertOne(booking);

        // Notify worker
        await notificationsCol.insertOne({
            userId: booking.workerId, userType: 'worker',
            title: 'New Job Request', message: `${booking.customerName} needs a ${booking.serviceType}`,
            type: 'booking', bookingId: result.insertedId.toString(), read: false, createdAt: new Date()
        });

        res.json({ success: true, bookingId: result.insertedId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/bookings/customer/:customerId', async (req, res) => {
    try {
        const bookings = await bookingsCol.find({ customerId: req.params.customerId }).sort({ createdAt: -1 }).toArray();
        res.json(bookings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/bookings/worker/:workerId', async (req, res) => {
    try {
        const { status } = req.query;
        const query = { workerId: req.params.workerId };
        if (status === 'pending') query.status = 'pending';
        else if (status === 'active') query.status = { $in: ['accepted', 'in-progress'] };
        else if (status === 'history') query.status = { $in: ['completed', 'cancelled'] };
        const bookings = await bookingsCol.find(query).sort({ createdAt: -1 }).toArray();
        res.json(bookings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/bookings/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const update = { status };
        if (status === 'accepted') update.acceptedAt = new Date();
        if (status === 'in-progress') update.startedAt = new Date();
        if (status === 'completed') update.completedAt = new Date();
        if (status === 'cancelled') update.cancelledAt = new Date();

        await bookingsCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });

        const booking = await bookingsCol.findOne({ _id: new ObjectId(req.params.id) });

        // Notify customer
        const messages = {
            accepted: 'Your booking has been accepted! Worker is on the way.',
            'in-progress': 'Work has started!',
            completed: 'Job completed. Please confirm and rate.',
            cancelled: 'Your booking was cancelled.'
        };
        if (messages[status]) {
            await notificationsCol.insertOne({
                userId: booking.customerId, userType: 'customer',
                title: 'Booking Update', message: messages[status],
                type: 'booking', bookingId: req.params.id, read: false, createdAt: new Date()
            });
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/bookings/:id/complete', async (req, res) => {
    try {
        const booking = await bookingsCol.findOne({ _id: new ObjectId(req.params.id) });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        await bookingsCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: 'completed', completedAt: new Date() } });

        await usersCol.updateOne({ _id: new ObjectId(booking.customerId) }, {
            $inc: { wallet: -booking.amount },
            $push: { transactions: { type: 'debit', amount: booking.amount, description: `Payment for ${booking.serviceType}`, date: new Date() } }
        });

        await workersCol.updateOne({ _id: new ObjectId(booking.workerId) }, {
            $inc: { wallet: booking.amount, completedJobs: 1 },
            $push: { transactions: { type: 'credit', amount: booking.amount, description: `Earned from ${booking.serviceType} job`, date: new Date() } }
        });

        await notificationsCol.insertOne({
            userId: booking.workerId, userType: 'worker',
            title: 'Payment Received', message: `₹${booking.amount} credited to your wallet`,
            type: 'payment', read: false, createdAt: new Date()
        });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/bookings/:id/rate', async (req, res) => {
    try {
        const { rating, review } = req.body;
        const booking = await bookingsCol.findOne({ _id: new ObjectId(req.params.id) });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        await bookingsCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { rated: true, rating: parseFloat(rating), review } });

        await reviewsCol.insertOne({
            workerId: booking.workerId, customerId: booking.customerId,
            customerName: booking.customerName, bookingId: req.params.id,
            rating: parseFloat(rating), review, serviceType: booking.serviceType, createdAt: new Date()
        });

        const worker = await workersCol.findOne({ _id: new ObjectId(booking.workerId) });
        const newTotal = worker.totalReviews + 1;
        const newRating = ((worker.rating * worker.totalReviews + parseFloat(rating)) / newTotal).toFixed(1);
        await workersCol.updateOne({ _id: new ObjectId(booking.workerId) }, { $set: { rating: parseFloat(newRating) }, $inc: { totalReviews: 1 } });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const notifications = await notificationsCol.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(20).toArray();
        res.json(notifications);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/notifications/:userId/read-all', async (req, res) => {
    try {
        await notificationsCol.updateMany({ userId: req.params.userId }, { $set: { read: true } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── WALLET ROUTES ───────────────────────────────────────────────────────────

app.post('/api/wallet/add', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        await usersCol.updateOne({ _id: new ObjectId(userId) }, {
            $inc: { wallet: amount },
            $push: { transactions: { type: 'credit', amount, description: 'Added to wallet', date: new Date() } }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/wallet/withdraw', async (req, res) => {
    try {
        const { workerId, amount } = req.body;
        const worker = await workersCol.findOne({ _id: new ObjectId(workerId) });
        if (worker.wallet < amount) return res.status(400).json({ error: 'Insufficient balance' });
        await workersCol.updateOne({ _id: new ObjectId(workerId) }, {
            $inc: { wallet: -amount },
            $push: { transactions: { type: 'debit', amount, description: 'Withdrawn from wallet', date: new Date() } }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── STATS ───────────────────────────────────────────────────────────────────

app.get('/api/stats/platform', async (req, res) => {
    try {
        const [totalWorkers, totalCustomers, totalBookings, completedBookings] = await Promise.all([
            workersCol.countDocuments(),
            usersCol.countDocuments(),
            bookingsCol.countDocuments(),
            bookingsCol.countDocuments({ status: 'completed' })
        ]);
        res.json({ totalWorkers, totalCustomers, totalBookings, completedBookings });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Start server
connectDB().then(() => {
    app.listen(PORT, () => console.log(`🚀 Skill Setu running at http://localhost:${PORT}`));
}).catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
});
