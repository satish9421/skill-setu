const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://localhost:${window.location.port || 3000}/api`
    : `${window.location.origin}/api`;
let currentWorker = JSON.parse(sessionStorage.getItem('currentUser'));
let locationInterval = null;

if (!currentWorker || sessionStorage.getItem('userType') !== 'worker') {
    window.location.href = 'index.html';
}

(async () => {
    await refreshWorker();
    renderNav();
    loadDashboard();
    loadNotifications();
    setInterval(loadNotifications, 15000);
    setInterval(() => {
        if (document.getElementById('sec-requests').classList.contains('active')) loadRequests();
    }, 6000);
})();

async function refreshWorker() {
    try {
        const res = await fetch(`${API}/auth/session`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            currentWorker = data.user;
            sessionStorage.setItem('currentUser', JSON.stringify(currentWorker));
        }
    } catch (e) {}
}

function renderNav() {
    document.getElementById('navName').textContent = currentWorker.name;
    const av = document.getElementById('navAvatar');
    if (currentWorker.avatar) {
        av.innerHTML = `<img src="${currentWorker.avatar}" alt="avatar">`;
    } else {
        av.textContent = currentWorker.name.charAt(0).toUpperCase();
    }
    const toggle = document.getElementById('availToggle');
    const text = document.getElementById('availText');
    if (currentWorker.available) {
        toggle.className = 'availability-toggle online';
        text.textContent = 'Online';
    } else {
        toggle.className = 'availability-toggle offline';
        text.textContent = 'Offline';
    }
}

function showSection(id) {
    document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
    document.getElementById(`sec-${id}`).classList.add('active');
    const navEl = document.getElementById(`nav-${id}`);
    if (navEl) navEl.classList.add('active');
    if (id === 'home') loadDashboard();
    if (id === 'requests') loadRequests();
    if (id === 'active') loadActiveJobs();
    if (id === 'history') loadHistory();
    if (id === 'wallet') loadWallet();
    if (id === 'notifications') loadNotifications(true);
    if (id === 'profile') loadProfile();
}

async function loadDashboard() {
    await refreshWorker();
    renderNav();
    const [allJobs, pending] = await Promise.all([
        fetchJobs(''),
        fetchJobs('pending')
    ]);
    document.getElementById('totalJobs').textContent = allJobs.length;
    document.getElementById('completedJobs').textContent = currentWorker.completedJobs || 0;
    document.getElementById('myRating').textContent = (currentWorker.rating || 0).toFixed(1) + ' ⭐';
    document.getElementById('walletStat').textContent = `₹${(currentWorker.wallet || 0).toFixed(2)}`;
    const reqBadge = document.getElementById('reqCount');
    reqBadge.style.display = pending.length > 0 ? 'flex' : 'none';
    reqBadge.textContent = pending.length;
    const rating = currentWorker.rating || 0;
    document.getElementById('perfRating').textContent = `${rating.toFixed(1)} ⭐`;
    document.getElementById('ratingBar').style.width = `${(rating / 5) * 100}%`;
    const total = allJobs.length;
    const completed = currentWorker.completedJobs || 0;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('perfCompletion').textContent = `${rate}%`;
    document.getElementById('completionBar').style.width = `${rate}%`;
    document.getElementById('perfReviews').textContent = currentWorker.totalReviews || 0;
    const recent = pending.slice(0, 3);
    const container = document.getElementById('recentRequests');
    if (!recent.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><h3>No pending requests</h3><p>Go online to receive job requests</p></div>`;
    } else {
        container.innerHTML = recent.map(r => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 0;border-bottom:1px solid var(--border)">
                <div><div style="font-weight:600;font-size:.9rem">${r.customerName}</div>
                <div style="font-size:.8rem;color:var(--text-light);text-transform:capitalize">${r.serviceType.replace(/-/g,' ')}</div></div>
                <div style="display:flex;gap:.5rem">
                    <button class="btn-sm btn-sm-primary" onclick="acceptJob('${r._id}')">Accept</button>
                    <button class="btn-sm btn-sm-outline" onclick="rejectJob('${r._id}')">Reject</button>
                </div>
            </div>`).join('');
    }
}

async function fetchJobs(status) {
    try {
        const url = status ? `${API}/bookings/worker/${currentWorker._id}?status=${status}` : `${API}/bookings/worker/${currentWorker._id}`;
        const res = await fetch(url, { credentials: 'include' });
        return res.ok ? await res.json() : [];
    } catch (e) { return []; }
}

async function toggleAvailability() {
    currentWorker.available = !currentWorker.available;
    try {
        await fetch(`${API}/workers/${currentWorker._id}/availability`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ available: currentWorker.available })
        });
        sessionStorage.setItem('currentUser', JSON.stringify(currentWorker));
        renderNav();
        if (currentWorker.available) {
            startLocationTracking();
            showToast('You are now Online! Ready to receive jobs.', 'success');
        } else {
            stopLocationTracking();
            showToast('You are now Offline.', 'info');
        }
    } catch (e) { showToast('Error updating availability', 'error'); }
}

function startLocationTracking() {
    stopLocationTracking();
    locationInterval = setInterval(async () => {
        if (!currentWorker.location) currentWorker.location = { lat: 28.6139, lng: 77.2090 };
        currentWorker.location.lat += (Math.random() - 0.5) * 0.001;
        currentWorker.location.lng += (Math.random() - 0.5) * 0.001;
        try {
            await fetch(`${API}/workers/${currentWorker._id}/location`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ location: currentWorker.location })
            });
        } catch (e) {}
    }, 4000);
}

function stopLocationTracking() {
    if (locationInterval) { clearInterval(locationInterval); locationInterval = null; }
}

async function loadRequests() {
    const requests = await fetchJobs('pending');
    const badge = document.getElementById('reqCount');
    badge.style.display = requests.length > 0 ? 'flex' : 'none';
    badge.textContent = requests.length;
    const container = document.getElementById('requestsList');
    if (!requests.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><h3>No pending requests</h3><p>${currentWorker.available ? 'Waiting for customers to book you' : 'Go online to receive job requests'}</p></div>`;
        return;
    }
    container.innerHTML = requests.map(r => `
        <div class="booking-card pending">
            <div class="bc-header">
                <div>
                    <div class="bc-title">${r.customerName}</div>
                    <div class="bc-sub" style="text-transform:capitalize">${r.serviceType.replace(/-/g,' ')}</div>
                </div>
                <span class="status-pill pending">New Request</span>
            </div>
            <div class="bc-details">
                <span class="bc-detail"><i class="fas fa-rupee-sign"></i> ₹${r.amount}</span>
                <span class="bc-detail"><i class="fas fa-clock"></i> ${timeAgo(r.createdAt)}</span>
            </div>
            <div class="bc-actions">
                <button class="btn-sm btn-sm-success" onclick="acceptJob('${r._id}')"><i class="fas fa-check"></i> Accept</button>
                <button class="btn-sm btn-sm-danger" onclick="rejectJob('${r._id}')"><i class="fas fa-times"></i> Reject</button>
            </div>
        </div>`).join('');
}

async function acceptJob(bookingId) {
    try {
        const res = await fetch(`${API}/bookings/${bookingId}/status`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ status: 'accepted' })
        });
        if (res.ok) {
            showToast('Job accepted! Head to the customer location.', 'success');
            if (!currentWorker.available) { currentWorker.available = true; startLocationTracking(); renderNav(); }
            loadRequests();
            loadActiveJobs();
        }
    } catch (e) { showToast('Error', 'error'); }
}

async function rejectJob(bookingId) {
    try {
        await fetch(`${API}/bookings/${bookingId}/status`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ status: 'cancelled' })
        });
        showToast('Job rejected.', 'info');
        loadRequests();
    } catch (e) { showToast('Error', 'error'); }
}

async function loadActiveJobs() {
    const jobs = await fetchJobs('active');
    const container = document.getElementById('activeJobsList');
    if (!jobs.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-briefcase"></i><h3>No active jobs</h3><p>Accept a job request to get started</p></div>`;
        return;
    }
    container.innerHTML = jobs.map(j => {
        const actions = j.status === 'accepted'
            ? `<button class="btn-sm btn-sm-primary" onclick="startJob('${j._id}')"><i class="fas fa-play"></i> Start Job</button>`
            : `<button class="btn-sm btn-sm-success" onclick="completeJob('${j._id}')"><i class="fas fa-check"></i> Mark Complete</button>`;
        return `<div class="booking-card ${j.status}">
            <div class="bc-header">
                <div>
                    <div class="bc-title">${j.customerName}</div>
                    <div class="bc-sub" style="text-transform:capitalize">${j.serviceType.replace(/-/g,' ')}</div>
                </div>
                <span class="status-pill ${j.status}">${j.status.replace('-',' ')}</span>
            </div>
            <div class="bc-details">
                <span class="bc-detail"><i class="fas fa-rupee-sign"></i> ₹${j.amount}</span>
                <span class="bc-detail"><i class="fas fa-calendar"></i> ${new Date(j.createdAt).toLocaleDateString('en-IN')}</span>
            </div>
            ${j.status === 'in-progress' ? `<div class="location-live"><i class="fas fa-satellite-dish"></i> Your location is being shared with the customer</div>` : ''}
            <div class="bc-actions">${actions}</div>
        </div>`;
    }).join('');
}

async function startJob(bookingId) {
    try {
        const res = await fetch(`${API}/bookings/${bookingId}/status`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ status: 'in-progress' })
        });
        if (res.ok) {
            showToast('Job started! Your location is now being tracked.', 'success');
            startLocationTracking();
            loadActiveJobs();
        }
    } catch (e) { showToast('Error', 'error'); }
}

async function completeJob(bookingId) {
    try {
        const res = await fetch(`${API}/bookings/${bookingId}/status`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ status: 'completed' })
        });
        if (res.ok) {
            showToast('Job marked complete! Waiting for customer to confirm payment.', 'success');
            loadActiveJobs();
            loadHistory();
        }
    } catch (e) { showToast('Error', 'error'); }
}

async function loadHistory() {
    const jobs = await fetchJobs('history');
    const container = document.getElementById('historyList');
    if (!jobs.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><h3>No job history</h3><p>Completed jobs will appear here</p></div>`;
        return;
    }
    container.innerHTML = jobs.map(j => `
        <div class="booking-card ${j.status}">
            <div class="bc-header">
                <div>
                    <div class="bc-title">${j.customerName}</div>
                    <div class="bc-sub" style="text-transform:capitalize">${j.serviceType.replace(/-/g,' ')}</div>
                </div>
                <span class="status-pill ${j.status}">${j.status}</span>
            </div>
            <div class="bc-details">
                <span class="bc-detail"><i class="fas fa-rupee-sign"></i> ₹${j.amount}</span>
                <span class="bc-detail"><i class="fas fa-calendar"></i> ${new Date(j.createdAt).toLocaleDateString('en-IN')}</span>
                ${j.rating ? `<span class="bc-detail"><i class="fas fa-star" style="color:var(--warning)"></i> ${j.rating}/5</span>` : ''}
            </div>
        </div>`).join('');
}

async function loadWallet() {
    await refreshWorker();
    document.getElementById('walletAmount').textContent = (currentWorker.wallet || 0).toFixed(2);
    const txns = (currentWorker.transactions || []).slice().reverse();
    const container = document.getElementById('transactionList');
    if (!txns.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><h3>No transactions yet</h3></div>`;
        return;
    }
    container.innerHTML = txns.map(t => `
        <div class="transaction-item">
            <div class="ti-icon ${t.type}"><i class="fas fa-${t.type === 'credit' ? 'arrow-down' : 'arrow-up'}"></i></div>
            <div class="ti-info">
                <div class="ti-desc">${t.description}</div>
                <div class="ti-date">${new Date(t.date).toLocaleString('en-IN')}</div>
            </div>
            <div class="ti-amount ${t.type}">${t.type === 'credit' ? '+' : '-'}₹${t.amount}</div>
        </div>`).join('');
}

function openWithdraw() { openModal('withdrawModal'); }

async function withdrawMoney() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (amount > (currentWorker.wallet || 0)) { showToast('Insufficient balance', 'error'); return; }
    try {
        const res = await fetch(`${API}/wallet/withdraw`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ workerId: currentWorker._id, amount })
        });
        if (res.ok) {
            showToast(`₹${amount} withdrawn successfully!`, 'success');
            closeModal('withdrawModal');
            await refreshWorker();
            renderNav();
            loadWallet();
            loadDashboard();
        } else {
            const d = await res.json();
            showToast(d.error || 'Withdrawal failed', 'error');
        }
    } catch (e) { showToast('Error', 'error'); }
}

async function loadNotifications(markRead = false) {
    try {
        const res = await fetch(`${API}/notifications/${currentWorker._id}`, { credentials: 'include' });
        const notifs = await res.json();
        const unread = notifs.filter(n => !n.read).length;
        const badge = document.getElementById('notifCount');
        badge.style.display = unread > 0 ? 'flex' : 'none';
        badge.textContent = unread;
        const html = notifs.length ? notifs.map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}">
                ${!n.read ? '<div class="notif-dot"></div>' : '<div style="width:8px"></div>'}
                <div>
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-msg">${n.message}</div>
                    <div class="notif-time">${timeAgo(n.createdAt)}</div>
                </div>
            </div>`).join('')
            : '<div style="padding:1.5rem;text-align:center;color:var(--text-light)">No notifications</div>';
        const panel = document.getElementById('notifPanel');
        panel.innerHTML = `<div class="notif-panel-header"><h4>Notifications</h4><button onclick="markAllRead()">Mark all read</button></div>${html}`;
        const listEl = document.getElementById('notifList');
        if (listEl) listEl.innerHTML = html;
        if (markRead) markAllRead();
    } catch (e) {}
}

async function markAllRead() {
    await fetch(`${API}/notifications/${currentWorker._id}/read-all`, { method: 'PUT', credentials: 'include' });
    loadNotifications();
}

function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener('click', e => {
    if (!document.getElementById('notifBtn').contains(e.target)) {
        document.getElementById('notifPanel').style.display = 'none';
    }
});

function loadProfile() {
    document.getElementById('profileNameDisplay').textContent = currentWorker.name;
    document.getElementById('profileEmailDisplay').textContent = currentWorker.email;
    document.getElementById('profileRatingDisplay').textContent = (currentWorker.rating || 0).toFixed(1);
    document.getElementById('pName').value = currentWorker.name || '';
    document.getElementById('pPhone').value = currentWorker.phone || '';
    document.getElementById('pService').value = currentWorker.serviceType || 'plumber';
    document.getElementById('pExperience').value = currentWorker.experience || 0;
    document.getElementById('pRate').value = currentWorker.hourlyRate || 200;
    document.getElementById('pBio').value = currentWorker.bio || '';
    const av = document.getElementById('profileAvatar');
    if (currentWorker.avatar) {
        av.innerHTML = `<img src="${currentWorker.avatar}" alt="avatar">`;
    } else {
        av.textContent = currentWorker.name.charAt(0).toUpperCase();
    }
}

async function updateProfile() {
    const name = document.getElementById('pName').value.trim();
    if (!name) { showToast('Name is required', 'error'); return; }
    try {
        const res = await fetch(`${API}/workers/${currentWorker._id}/profile`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({
                name, phone: document.getElementById('pPhone').value.trim(),
                serviceType: document.getElementById('pService').value,
                experience: document.getElementById('pExperience').value,
                hourlyRate: document.getElementById('pRate').value,
                bio: document.getElementById('pBio').value.trim(), skills: []
            })
        });
        if (res.ok) {
            currentWorker.name = name;
            sessionStorage.setItem('currentUser', JSON.stringify(currentWorker));
            await refreshWorker(); renderNav(); loadProfile();
            showToast('Profile updated!', 'success');
        } else { showToast('Update failed', 'error'); }
    } catch (e) { showToast('Error', 'error'); }
}

async function changePassword() {
    const newPw = document.getElementById('newPw').value;
    const confirmPw = document.getElementById('confirmPw').value;
    if (!newPw || newPw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return; }
    try {
        const res = await fetch(`${API}/auth/reset-password`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ email: currentWorker.email, newPassword: newPw, userType: 'worker' })
        });
        if (res.ok) {
            showToast('Password updated!', 'success');
            document.getElementById('newPw').value = '';
            document.getElementById('confirmPw').value = '';
        } else { showToast('Update failed', 'error'); }
    } catch (e) { showToast('Error', 'error'); }
}

async function uploadAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
        const res = await fetch(`${API}/workers/${currentWorker._id}/avatar`, {
            method: 'POST', credentials: 'include', body: formData
        });
        const data = await res.json();
        if (res.ok) {
            currentWorker.avatar = data.avatar;
            sessionStorage.setItem('currentUser', JSON.stringify(currentWorker));
            renderNav(); loadProfile();
            showToast('Avatar updated!', 'success');
        }
    } catch (e) { showToast('Upload failed', 'error'); }
}

async function logout() {
    stopLocationTracking();
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    sessionStorage.clear();
    window.location.href = 'index.html';
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function timeAgo(date) {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
}

function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    t.innerHTML = `${icons[type] || ''} ${msg}`;
    t.className = `toast ${type} show`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

window.addEventListener('beforeunload', stopLocationTracking);
