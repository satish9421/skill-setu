// API is defined in config.js (loaded before this script)
let currentUserType = 'customer';
let otpVerified = false;
let forgotOtpVerified = false;
let otpTimerInterval = null;

// Navbar scroll effect
window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
});

// Load platform stats
fetch(`${API}/stats/platform`).then(r => r.json()).then(data => {
    if (data.totalWorkers) document.getElementById('statWorkers').textContent = data.totalWorkers + '+';
    if (data.totalCustomers) document.getElementById('statCustomers').textContent = (data.totalCustomers || 0) + '+';
    if (data.completedBookings) document.getElementById('statJobs').textContent = (data.completedBookings || 0) + '+';
}).catch(() => {});

function toggleMenu() {
    document.getElementById('navLinks').classList.toggle('open');
}

// ── AUTH MODAL ────────────────────────────────────────────────────────────────
function openAuth(type, mode) {
    currentUserType = type;
    document.getElementById('authModal').classList.add('active');
    if (mode === 'login') showLogin();
    else showRegister();
    updateTypeTabs();
}

function closeAuth() {
    document.getElementById('authModal').classList.remove('active');
}

function showLogin() {
    document.getElementById('loginView').style.display = 'block';
    document.getElementById('registerView').style.display = 'none';
    document.getElementById('forgotView').style.display = 'none';
    updateTypeTabs();
}

function showRegister() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('registerView').style.display = 'block';
    document.getElementById('forgotView').style.display = 'none';
    otpVerified = false;
    document.getElementById('regBtn').disabled = true;
    document.getElementById('otpGroup').style.display = 'none';
    document.getElementById('serviceTypeGroup').style.display = currentUserType === 'worker' ? 'block' : 'none';
    updateTypeTabs();
}

function showForgot() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('registerView').style.display = 'none';
    document.getElementById('forgotView').style.display = 'block';
    document.getElementById('forgotStep1').style.display = 'block';
    document.getElementById('forgotStep2').style.display = 'none';
    document.getElementById('forgotStep3').style.display = 'none';
}

function switchType(type) {
    currentUserType = type;
    updateTypeTabs();
    document.getElementById('serviceTypeGroup').style.display = type === 'worker' ? 'block' : 'none';
}

function updateTypeTabs() {
    ['tabCustomer','tabWorker','regTabCustomer','regTabWorker'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const isCustomer = id.includes('Customer');
        el.classList.toggle('active', isCustomer ? currentUserType === 'customer' : currentUserType === 'worker');
    });
    const label = currentUserType === 'customer' ? 'Customer' : 'Worker';
    const loginLabel = document.getElementById('loginTypeLabel');
    const regLabel = document.getElementById('regTypeLabel');
    if (loginLabel) loginLabel.textContent = label;
    if (regLabel) regLabel.textContent = label;
}

// Close modal on overlay click
document.getElementById('authModal').addEventListener('click', function(e) {
    if (e.target === this) closeAuth();
});

// ── OTP ───────────────────────────────────────────────────────────────────────
async function sendOtp() {
    const email = document.getElementById('regEmail').value.trim();
    if (!email || !email.includes('@')) { showToast('Enter a valid email first', 'error'); return; }

    const btn = document.getElementById('sendOtpBtn');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    const res = await fetch(`${API}/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'register' })
    });
    const data = await res.json();

    if (res.ok) {
        document.getElementById('otpGroup').style.display = 'block';
        showToast('OTP sent to your email! (Check console if email not configured)', 'success');
        startOtpTimer(btn);
    } else {
        showToast(data.error || 'Failed to send OTP', 'error');
        btn.disabled = false;
        btn.textContent = 'Send OTP';
    }
}

function startOtpTimer(btn) {
    let seconds = 60;
    const timerEl = document.getElementById('otpTimer');
    clearInterval(otpTimerInterval);
    otpTimerInterval = setInterval(() => {
        timerEl.textContent = `(${seconds}s)`;
        seconds--;
        if (seconds < 0) {
            clearInterval(otpTimerInterval);
            timerEl.textContent = '';
            btn.disabled = false;
            btn.textContent = 'Resend';
        }
    }, 1000);
}

function otpNext(input, index) {
    input.value = input.value.replace(/\D/g, '');
    const boxes = document.querySelectorAll('#otpGroup .otp-box');
    if (input.value && index < 5) boxes[index + 1].focus();
}

function otpNextForgot(input, index) {
    input.value = input.value.replace(/\D/g, '');
    const boxes = document.querySelectorAll('.forgot-otp');
    if (input.value && index < 5) boxes[index + 1].focus();
}

async function verifyOtp() {
    const email = document.getElementById('regEmail').value.trim();
    const boxes = document.querySelectorAll('#otpGroup .otp-box');
    const otp = Array.from(boxes).map(b => b.value).join('');
    if (otp.length !== 6) { showToast('Enter all 6 digits', 'error'); return; }

    const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
    });
    const data = await res.json();

    if (res.ok) {
        otpVerified = true;
        document.getElementById('regBtn').disabled = false;
        document.getElementById('otpGroup').innerHTML = '<div style="color:#27ae60;font-weight:600;padding:.5rem 0"><i class="fas fa-check-circle"></i> Email verified!</div>';
        showToast('Email verified!', 'success');
    } else {
        showToast(data.error || 'Invalid OTP', 'error');
    }
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
async function handleRegister(e) {
    e.preventDefault();
    if (!otpVerified) { showToast('Please verify your email first', 'error'); return; }

    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    if (password !== confirm) { showToast('Passwords do not match', 'error'); return; }

    const btn = document.getElementById('regBtn');
    btn.textContent = 'Creating account...';
    btn.disabled = true;

    const body = {
        email: document.getElementById('regEmail').value.trim(),
        password,
        name: document.getElementById('regName').value.trim(),
        phone: document.getElementById('regPhone').value.trim(),
        userType: currentUserType,
        serviceType: currentUserType === 'worker' ? document.getElementById('regService').value : undefined
    };

    const res = await fetch(`${API}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();

    if (res.ok) {
        showToast('Account created! Please login.', 'success');
        setTimeout(showLogin, 1500);
    } else {
        showToast(data.error || 'Registration failed', 'error');
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.textContent = 'Logging in...';
    btn.disabled = true;

    const res = await fetch(`${API}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            email: document.getElementById('loginEmail').value.trim(),
            password: document.getElementById('loginPassword').value,
            userType: currentUserType
        })
    });
    const data = await res.json();

    if (res.ok) {
        sessionStorage.setItem('currentUser', JSON.stringify(data.user));
        sessionStorage.setItem('userType', currentUserType);
        showToast('Login successful!', 'success');
        setTimeout(() => {
            window.location.href = currentUserType === 'customer' ? 'customer-dashboard.html' : 'worker-dashboard.html';
        }, 800);
    } else {
        showToast(data.error || 'Login failed', 'error');
        btn.disabled = false;
        btn.textContent = 'Login';
    }
}

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
async function sendForgotOtp() {
    const email = document.getElementById('forgotEmail').value.trim();
    if (!email) { showToast('Enter your email', 'error'); return; }

    const res = await fetch(`${API}/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'reset' })
    });
    if (res.ok) {
        document.getElementById('forgotStep1').style.display = 'none';
        document.getElementById('forgotStep2').style.display = 'block';
        showToast('OTP sent!', 'success');
    } else {
        showToast('Failed to send OTP', 'error');
    }
}

async function verifyForgotOtp() {
    const email = document.getElementById('forgotEmail').value.trim();
    const boxes = document.querySelectorAll('.forgot-otp');
    const otp = Array.from(boxes).map(b => b.value).join('');
    if (otp.length !== 6) { showToast('Enter all 6 digits', 'error'); return; }

    const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
    });
    if (res.ok) {
        forgotOtpVerified = true;
        document.getElementById('forgotStep2').style.display = 'none';
        document.getElementById('forgotStep3').style.display = 'block';
        showToast('OTP verified!', 'success');
    } else {
        showToast('Invalid OTP', 'error');
    }
}

async function resetPassword() {
    if (!forgotOtpVerified) return;
    const newPw = document.getElementById('newPassword').value;
    const confirmPw = document.getElementById('confirmNewPassword').value;
    if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return; }
    if (newPw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }

    const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: document.getElementById('forgotEmail').value.trim(), newPassword: newPw, userType: currentUserType })
    });
    if (res.ok) {
        showToast('Password reset successfully!', 'success');
        setTimeout(showLogin, 1500);
    } else {
        showToast('Reset failed', 'error');
    }
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function togglePw(id) {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
}

function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    t.innerHTML = `${icons[type] || ''} ${msg}`;
    t.className = `toast ${type} show`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}
