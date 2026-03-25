// API is defined in config.js (loaded before this script)
let currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
let allBookings = [];
let selectedWorkerForBooking = null;
let selectedRating = 0;
let ratingBookingId = null;

if (!currentUser || sessionStorage.getItem('userType') !== 'customer') {
    window.location.href = 'index.html';
}

(async () => {
    await refreshUser();
    renderNav();
    loadDashboard();
    loadNotifications();
    setInterval(loadNotifications, 15000);
    setInterval(() => {
        if (document.getElementById('sec-bookings').classList.contains('active')) loadBookings();
    }, 6000);
})();

async function refreshUser() {
    try {
        const res = await fetch(`${API}/auth/session`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
    } catch (e) {}
}

function renderNav() {
    document.getElementById('navName').textContent = currentUser.name;
    const av = document.getElementById('navAvatar');
    if (currentUser.avatar) {
        av.innerHTML = `<img src="${currentUser.avatar}" alt="avatar">`;
    } else {
        av.textContent = currentUser.name.charAt(0).toUpperCase();
    }
}

function showSection(id) {
    document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
    document.getElementById(`sec-${id}`).classList.add('active');
    const navEl = document.getElementById(`nav-${id}`);
    if (navEl) navEl.classList.add('active');
    if (id === 'home') loadDashboard();
    if (id === 'find') searchWorkers();
    if (id === 'bookings') loadBookings();
    if (id === 'wallet') loadWallet();
    if (id === 'notifications') loadNotifications(true);
    if (id === 'profile') loadProfile();
}

async function fetchBookings() {
    try {
        const res = await fetch(`${API}/bookings/customer/${currentUser._id}`, { credentials: 'include' });
        return res.ok ? await res.json() : [];
    } catch (e) { return []; }
}

async function loadDashboard() {
    await refreshUser();
    const bookings = await fetchBookings();
    allBookings = bookings;
    document.getElementById('totalBookings').textContent = bookings.length;
    document.getElementById('completedCount').textContent = bookings.filter(b => b.status === 'completed').length;
    document.getElementById('walletStat').textContent = `₹${(currentUser.wallet || 0).toFixed(2)}`;
    document.getElementById('reviewsGiven').textContent = bookings.filter(b => b.rated).length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const badge = document.getElementById('pendingCount');
    badge.style.display = pending > 0 ? 'flex' : 'none';
    badge.textContent = pending;
    const recent = bookings.slice(0, 3);
    const container = document.getElementById('recentBookings');
    if (!recent.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-calendar"></i><h3>No bookings yet</h3><p>Find a worker to get started</p></div>`;
    } else {
        container.innerHTML = recent.map(b => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 0;border-bottom:1px solid var(--border)">
                <div><div style="font-weight:600;font-size:.9rem">${b.workerName}</div>
                <div style="font-size:.8rem;color:var(--text-light);text-transform:capitalize">${b.serviceType}</div></div>
                <span class="status-pill ${b.status}">${b.status}</span>
            </div>`).join('');
    }
}

async function searchWorkers() {
    const service = document.getElementById('filterService')?.value || '';
    const sort = document.getElementById('filterSort')?.value || 'rating';
    const maxRate = document.getElementById('filterMaxRate')?.value || '';
    const params = new URLSearchParams({ sortBy: sort });
    if (service) params.append('serviceType', service);
    if (maxRate) params.append('maxRate', maxRate);
    try {
        const res = await fetch(`${API}/workers/search?${params}`, { credentials: 'include' });
        const workers = await res.json();
        renderWorkers(workers);
    } catch (e) { showToast('Error loading workers', 'error'); }
}

function renderWorkers(workers) {
    const container = document.getElementById('workersList');
    if (!workers.length) {
        container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-user-slash"></i><h3>No workers found</h3><p>Try a different service or remove filters</p></div>`;
        return;
    }
    container.innerHTML = workers.map(w => {
        const initials = w.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const avatarHtml = w.avatar ? `<img src="${w.avatar}" alt="${w.name}">` : initials;
        const fullStars = Math.round(w.rating);
        const stars = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
        return `<div class="worker-card">
            <div class="wc-header">
                <div class="wc-avatar">${avatarHtml}</div>
                <div style="flex:1">
                    <div class="wc-name">${w.name}</div>
                    <div class="wc-service"><i class="fas fa-tools" style="font-size:.75rem"></i> ${w.serviceType.replace(/-/g,' ')}</div>
                    <div class="wc-rating">${stars} <span>(${w.totalReviews} reviews)</span></div>
                </div>
            </div>
            <div class="wc-stats">
                <div class="wc-stat"><strong>${w.experience}yr</strong><small>Experience</small></div>
                <div class="wc-stat"><strong>₹${w.hourlyRate}</strong><small>Per Hour</small></div>
                <div class="wc-stat"><strong>${w.completedJobs}</strong><small>Jobs Done</small></div>
            </div>
            ${w.bio ? `<p style="font-size:.82rem;color:var(--text-light);margin-bottom:1rem;line-height:1.5">${w.bio.slice(0,100)}...</p>` : ''}
            <div class="wc-actions">
                <button class="btn-book" onclick='openBookModal(${JSON.stringify(w).replace(/'/g,"&#39;")})'>
                    <i class="fas fa-calendar-plus"></i> Book Now
                </button>
                <button class="btn-view" onclick='viewWorker("${w._id}")'>
                    <i class="fas fa-eye"></i> View Profile
                </button>
            </div>
        </div>`;
    }).join('');
}

async function viewWorker(workerId) {
    try {
        const res = await fetch(`${API}/workers/${workerId}`, { credentials: 'include' });
        const w = await res.json();
        const initials = w.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const avatarHtml = w.avatar
            ? `<img src="${w.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
            : initials;
        const fullStars = Math.round(w.rating);
        const stars = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
        const reviewsHtml = (w.reviews || []).map(r => `
            <div style="padding:.75rem 0;border-bottom:1px solid var(--border)">
                <div style="display:flex;justify-content:space-between;margin-bottom:.3rem">
                    <strong style="font-size:.9rem">${r.customerName}</strong>
                    <span style="color:var(--warning)">${'★'.repeat(r.rating)}</span>
                </div>
                <p style="font-size:.85rem;color:var(--text-light)">${r.review || 'No comment'}</p>
            </div>`).join('') || '<p style="color:var(--text-light);font-size:.9rem;padding:.5rem 0">No reviews yet</p>';

        document.getElementById('workerDetailContent').innerHTML = `
            <div style="text-align:center;margin-bottom:1.5rem">
                <div style="width:80px;height:80px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.8rem;font-weight:700;margin:0 auto 1rem;overflow:hidden">${avatarHtml}</div>
                <h2 style="font-size:1.4rem;font-weight:800">${w.name}</h2>
                <p style="color:var(--text-light);text-transform:capitalize;margin:.3rem 0">${w.serviceType.replace(/-/g,' ')}</p>
                <div style="color:var(--warning);font-size:1.1rem">${stars} <span style="color:var(--text-light);font-size:.85rem">(${w.totalReviews})</span></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem;margin-bottom:1.5rem">
                <div class="wc-stat"><strong>${w.experience}yr</strong><small>Experience</small></div>
                <div class="wc-stat"><strong>₹${w.hourlyRate}/hr</strong><small>Rate</small></div>
                <div class="wc-stat"><strong>${w.completedJobs}</strong><small>Jobs Done</small></div>
            </div>
            ${w.bio ? `<p style="font-size:.9rem;color:var(--text-light);margin-bottom:1.5rem;line-height:1.6;background:var(--bg);padding:1rem;border-radius:8px">${w.bio}</p>` : ''}
            <button class="btn-book" style="width:100%;margin-bottom:1.5rem" onclick='openBookModal(${JSON.stringify(w).replace(/'/g,"&#39;")});closeModal("workerDetailModal")'>
                <i class="fas fa-calendar-plus"></i> Book This Worker
            </button>
            <h4 style="margin-bottom:.75rem">Customer Reviews</h4>
            ${reviewsHtml}`;
        openModal('workerDetailModal');
    } catch (e) { showToast('Error loading worker profile', 'error'); }
}

function openBookModal(worker) {
    selectedWorkerForBooking = worker;
    document.getElementById('bookModalContent').innerHTML = `
        <div style="display:flex;align-items:center;gap:1rem;padding:1rem;background:var(--bg);border-radius:10px;margin-bottom:1.5rem">
            <div style="width:50px;height:50px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0">
                ${worker.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
            </div>
            <div>
                <div style="font-weight:700">${worker.name}</div>
                <div style="font-size:.85rem;color:var(--text-light);text-transform:capitalize">${worker.serviceType.replace(/-/g,' ')}</div>
                <div style="font-size:.85rem;color:var(--warning)">⭐ ${worker.rating} · ${worker.experience} yrs exp</div>
            </div>
        </div>
        <div style="display:flex;justify-content:space-between;padding:.75rem 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--text-light)">Hourly Rate</span><strong>₹${worker.hourlyRate}/hr</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:.75rem 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--text-light)">Your Wallet Balance</span>
            <strong style="color:${(currentUser.wallet || 0) >= worker.hourlyRate ? 'var(--success)' : 'var(--danger)'}">₹${(currentUser.wallet || 0).toFixed(2)}</strong>
        </div>
        ${(currentUser.wallet || 0) < worker.hourlyRate
            ? `<div style="background:#fce4ec;color:var(--danger);padding:.75rem 1rem;border-radius:8px;margin-top:1rem;font-size:.88rem"><i class="fas fa-exclamation-circle"></i> Insufficient balance. Please add money to your wallet first.</div>`
            : `<div style="background:#e8f5e9;color:var(--success);padding:.75rem 1rem;border-radius:8px;margin-top:1rem;font-size:.88rem"><i class="fas fa-check-circle"></i> ₹${worker.hourlyRate} will be held and paid on completion.</div>`}`;
    openModal('bookModal');
}

async function confirmBooking() {
    if (!selectedWorkerForBooking) return;
    if ((currentUser.wallet || 0) < selectedWorkerForBooking.hourlyRate) {
        showToast('Insufficient wallet balance!', 'error');
        closeModal('bookModal');
        showSection('wallet');
        return;
    }
    try {
        const res = await fetch(`${API}/bookings`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({
                customerId: currentUser._id, workerId: selectedWorkerForBooking._id,
                customerName: currentUser.name, workerName: selectedWorkerForBooking.name,
                serviceType: selectedWorkerForBooking.serviceType,
                amount: selectedWorkerForBooking.hourlyRate,
                workerLocation: selectedWorkerForBooking.location
            })
        });
        if (res.ok) {
            showToast('Booking sent! Waiting for worker to accept.', 'success');
            closeModal('bookModal');
            showSection('bookings');
        } else {
            showToast('Booking failed', 'error');
        }
    } catch (e) { showToast('Error creating booking', 'error'); }
}

async function loadBookings() {
    const bookings = await fetchBookings();
    allBookings = bookings;
    renderBookings(bookings);
}

function filterBookings(status, e) {
    document.querySelectorAll('#sec-bookings .btn-sm').forEach(b => b.className = 'btn-sm btn-sm-outline');
    if (e && e.target) e.target.className = 'btn-sm btn-sm-primary';
    const filtered = status === 'all' ? allBookings : allBookings.filter(b => b.status === status);
    renderBookings(filtered);
}

function renderBookings(bookings) {
    const container = document.getElementById('bookingsList');
    if (!bookings.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-times"></i><h3>No bookings found</h3><p>Your bookings will appear here</p></div>`;
        return;
    }
    container.innerHTML = bookings.map(b => {
        let actions = '';
        let locationHtml = '';

        if (b.status === 'accepted' || b.status === 'in-progress') {
            locationHtml = `<div class="location-live"><i class="fas fa-map-marker-alt"></i> Worker location updating live · ${b.workerLocation ? `${b.workerLocation.lat.toFixed(4)}, ${b.workerLocation.lng.toFixed(4)}` : 'Fetching...'}</div>`;
        }
        if (b.status === 'in-progress') {
            actions += `<button class="btn-sm btn-sm-success" onclick="completeBooking('${b._id}')"><i class="fas fa-check"></i> Mark Complete & Pay</button>`;
        }
        if (b.status === 'completed' && !b.paid) {
            actions += `<button class="btn-sm btn-sm-success" onclick="completeBooking('${b._id}')"><i class="fas fa-rupee-sign"></i> Confirm & Pay</button>`;
        }
        if (b.status === 'completed' && b.paid && !b.rated) {
            actions += `<button class="btn-sm btn-sm-primary" onclick="openRateModal('${b._id}')"><i class="fas fa-star"></i> Rate Worker</button>`;
        }
        if (b.status === 'pending') {
            actions += `<span style="font-size:.82rem;color:var(--text-light)"><i class="fas fa-clock"></i> Waiting for worker to accept...</span>`;
        }

        return `<div class="booking-card ${b.status}">
            <div class="bc-header">
                <div>
                    <div class="bc-title">${b.workerName}</div>
                    <div class="bc-sub" style="text-transform:capitalize">${b.serviceType.replace(/-/g,' ')}</div>
                </div>
                <span class="status-pill ${b.status}">${b.status.replace('-',' ')}</span>
            </div>
            <div class="bc-details">
                <span class="bc-detail"><i class="fas fa-rupee-sign"></i> ₹${b.amount}</span>
                <span class="bc-detail"><i class="fas fa-calendar"></i> ${new Date(b.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
                ${b.rating ? `<span class="bc-detail"><i class="fas fa-star" style="color:var(--warning)"></i> Rated ${b.rating}/5</span>` : ''}
            </div>
            ${locationHtml}
            ${actions ? `<div class="bc-actions">${actions}</div>` : ''}
        </div>`;
    }).join('');
}


async function completeBooking(bookingId) {
    if (!confirm('Confirm job is complete? Payment will be processed.')) return;
    try {
        const res = await fetch(`${API}/bookings/${bookingId}/complete`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include'
        });
        if (res.ok) {
            showToast('Job completed! Payment processed.', 'success');
            await refreshUser();
            renderNav();
            loadBookings();
            loadDashboard();
        } else { showToast('Error completing booking', 'error'); }
    } catch (e) { showToast('Error', 'error'); }
}

function openRateModal(bookingId) {
    ratingBookingId = bookingId;
    selectedRating = 0;
    document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
    document.getElementById('reviewText').value = '';
    openModal('rateModal');
}

function setRating(val) {
    selectedRating = val;
    document.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('active', i < val));
}

async function submitRating() {
    if (!selectedRating) { showToast('Please select a rating', 'error'); return; }
    try {
        const res = await fetch(`${API}/bookings/${ratingBookingId}/rate`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ rating: selectedRating, review: document.getElementById('reviewText').value })
        });
        if (res.ok) {
            showToast('Review submitted! Thank you.', 'success');
            closeModal('rateModal');
            loadBookings();
        } else { showToast('Error submitting review', 'error'); }
    } catch (e) { showToast('Error', 'error'); }
}

async function loadWallet() {
    await refreshUser();
    document.getElementById('walletAmount').textContent = (currentUser.wallet || 0).toFixed(2);
    const txns = (currentUser.transactions || []).slice().reverse();
    const container = document.getElementById('transactionList');
    if (!txns.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><h3>No transactions yet</h3><p>Add money to get started</p></div>`;
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

function setAmount(val) { document.getElementById('addMoneyAmount').value = val; }

function openAddMoney() {
    document.getElementById('addMoneyAmount').value = '';
    openModal('addMoneyModal');
}

async function addMoney() {
    const amount = parseFloat(document.getElementById('addMoneyAmount').value);
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (amount > 1000) { showToast('Cannot add more than ₹1000 at a time', 'error'); return; }
    const btn = document.querySelector('#addMoneyModal .btn-save');
    btn.textContent = 'Adding...'; btn.disabled = true;
    try {
        const res = await fetch(`${API}/wallet/add`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ userId: currentUser._id, amount })
        });
        const data = await res.json();
        if (res.ok) {
            currentUser.wallet = data.wallet;
            currentUser.transactions = data.transactions;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            closeModal('addMoneyModal');
            showToast(`₹${amount} added to wallet!`, 'success');
            renderNav(); loadWallet(); loadDashboard();
        } else { showToast(data.error || 'Failed to add money', 'error'); }
    } catch (e) { showToast('Error adding money', 'error'); }
    finally { btn.textContent = 'Add Money'; btn.disabled = false; }
}

async function clearTransactions() {
    if (!confirm('Clear all transaction history? This cannot be undone.')) return;
    try {
        const res = await fetch(`${API}/wallet/${currentUser._id}/transactions`, {
            method: 'DELETE', credentials: 'include'
        });
        if (res.ok) {
            currentUser.transactions = [];
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast('Transaction history cleared', 'success');
            loadWallet();
        }
    } catch (e) { showToast('Error', 'error'); }
}


async function loadNotifications(markRead = false) {
    try {
        const res = await fetch(`${API}/notifications/${currentUser._id}`, { credentials: 'include' });
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
            </div>`) .join('')
            : '<div style="padding:1.5rem;text-align:center;color:var(--text-light)">No notifications</div>';
        const panel = document.getElementById('notifPanel');
        panel.innerHTML = `<div class="notif-panel-header"><h4>Notifications</h4><button onclick="markAllRead()">Mark all read</button></div>${html}`;
        const listEl = document.getElementById('notifList');
        if (listEl) listEl.innerHTML = html;
        if (markRead) markAllRead();
    } catch (e) {}
}

async function markAllRead() {
    await fetch(`${API}/notifications/${currentUser._id}/read-all`, { method: 'PUT', credentials: 'include' });
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
    document.getElementById('profileNameDisplay').textContent = currentUser.name;
    document.getElementById('profileEmailDisplay').textContent = currentUser.email;
    document.getElementById('pName').value = currentUser.name || '';
    document.getElementById('pPhone').value = currentUser.phone || '';
    document.getElementById('pAddress').value = currentUser.address || '';
    const av = document.getElementById('profileAvatar');
    if (currentUser.avatar) {
        av.innerHTML = `<img src="${currentUser.avatar}" alt="avatar">`;
    } else {
        av.textContent = currentUser.name.charAt(0).toUpperCase();
    }
}

async function updateProfile() {
    const name = document.getElementById('pName').value.trim();
    const phone = document.getElementById('pPhone').value.trim();
    const address = document.getElementById('pAddress').value.trim();
    if (!name) { showToast('Name is required', 'error'); return; }
    try {
        const res = await fetch(`${API}/customers/${currentUser._id}/profile`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ name, phone, address })
        });
        if (res.ok) {
            currentUser.name = name; currentUser.phone = phone; currentUser.address = address;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            renderNav(); loadProfile();
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
            body: JSON.stringify({ email: currentUser.email, newPassword: newPw, userType: 'customer' })
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
        const res = await fetch(`${API}/customers/${currentUser._id}/avatar`, {
            method: 'POST', credentials: 'include', body: formData
        });
        const data = await res.json();
        if (res.ok) {
            currentUser.avatar = data.avatar;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            renderNav(); loadProfile();
            showToast('Avatar updated!', 'success');
        }
    } catch (e) { showToast('Upload failed', 'error'); }
}

async function logout() {
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
