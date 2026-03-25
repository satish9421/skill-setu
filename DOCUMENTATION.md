# Skill Setu – Project Documentation

## Overview
Skill Setu is a full-stack worker booking platform that connects customers with skilled workers (plumbers, electricians, carpenters, etc.) in real-time.

**Live URLs**
- Frontend: https://skill-setu.netlify.app
- Backend: https://skillsetu-dbms.onrender.com
- Database: MongoDB Atlas

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB (Atlas cloud) |
| Authentication | Express Session + bcrypt |
| Email OTP | Resend API (fallback: Nodemailer/Gmail) |
| File Uploads | Multer |
| Frontend Hosting | Netlify |
| Backend Hosting | Render |
| Version Control | Git + GitHub |

---

## Project Structure

```
skill-setu/
├── server.js              # Main backend — all API routes
├── app.js                 # Landing page JS (auth, OTP, login)
├── customer.js            # Customer dashboard JS
├── worker.js              # Worker dashboard JS
├── config.js              # API URL config (local vs production)
├── index.html             # Landing page
├── customer-dashboard.html
├── worker-dashboard.html
├── styles.css             # All styles
├── .env                   # Environment variables (not in git)
├── render.yaml            # Render deployment config
├── netlify.toml           # Netlify deployment config
└── public/uploads/        # Uploaded avatars
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `PORT` | Server port (default 3000, Render uses 10000) |
| `SESSION_SECRET` | Express session secret key |
| `RESEND_API_KEY` | Resend API key for email OTP |
| `RESEND_FROM` | Sender email address |
| `EMAIL_USER` | Gmail address (fallback) |
| `EMAIL_PASS` | Gmail app password (fallback) |
| `EMAIL_FROM` | Gmail sender name (fallback) |
| `FRONTEND_URL` | Netlify URL for CORS |
| `NODE_ENV` | `production` on Render |

---

## API Routes

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/send-otp` | Send OTP to email for register/reset |
| POST | `/api/auth/verify-otp` | Verify OTP code |
| POST | `/api/auth/register` | Register customer or worker |
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/session` | Get current logged-in user |
| POST | `/api/auth/reset-password` | Reset password after OTP verify |

### Workers
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/workers/search` | Search workers by service, rate, sort |
| GET | `/api/workers/:id` | Get worker profile + reviews |
| PUT | `/api/workers/:id/availability` | Toggle online/offline |
| PUT | `/api/workers/:id/location` | Update live location |
| PUT | `/api/workers/:id/profile` | Update profile details |
| POST | `/api/workers/:id/avatar` | Upload profile photo |

### Customers
| Method | Route | Description |
|--------|-------|-------------|
| PUT | `/api/customers/:id/profile` | Update name, phone, address |
| POST | `/api/customers/:id/avatar` | Upload profile photo |

### Bookings
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/bookings` | Create a new booking |
| GET | `/api/bookings/customer/:id` | Get all bookings for a customer |
| GET | `/api/bookings/worker/:id` | Get bookings for a worker (filter by status) |
| PUT | `/api/bookings/:id/status` | Update booking status (accepted/in-progress/completed/cancelled) |
| PUT | `/api/bookings/:id/complete` | Customer confirms job done, triggers payment |
| PUT | `/api/bookings/:id/rate` | Submit rating and review |

### Wallet
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/wallet/add` | Add money (max ₹1000 per transaction) |
| POST | `/api/wallet/withdraw` | Worker withdraws earnings |
| DELETE | `/api/wallet/:userId/transactions` | Clear transaction history |

### Notifications
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/notifications/:userId` | Get last 20 notifications |
| PUT | `/api/notifications/:userId/read-all` | Mark all as read |

### Stats
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/stats/platform` | Total workers, customers, bookings |

---

## Frontend Functions

### app.js (Landing Page)
| Function | Description |
|----------|-------------|
| `openAuth(type, mode)` | Open login/register modal |
| `closeAuth()` | Close auth modal |
| `showLogin()` | Switch to login view |
| `showRegister()` | Switch to register view |
| `showForgot()` | Switch to forgot password view |
| `switchType(type)` | Toggle between customer/worker tabs |
| `sendOtp()` | Send OTP to email |
| `verifyOtp()` | Verify 6-digit OTP |
| `handleRegister(e)` | Submit registration form |
| `handleLogin(e)` | Submit login form |
| `sendForgotOtp()` | Send OTP for password reset |
| `verifyForgotOtp()` | Verify forgot password OTP |
| `resetPassword()` | Submit new password |
| `togglePw(id)` | Show/hide password field |
| `showToast(msg, type)` | Show notification toast |

### customer.js (Customer Dashboard)
| Function | Description |
|----------|-------------|
| `refreshUser()` | Re-fetch current user from session |
| `renderNav()` | Update navbar with user name/avatar |
| `showSection(id)` | Switch between dashboard sections |
| `loadDashboard()` | Load stats and recent bookings |
| `searchWorkers()` | Search workers with filters |
| `renderWorkers(workers)` | Render worker cards |
| `viewWorker(workerId)` | Open worker detail modal |
| `openBookModal(worker)` | Open booking confirmation modal |
| `confirmBooking()` | Submit booking request |
| `loadBookings()` | Load all customer bookings |
| `filterBookings(status, e)` | Filter bookings by status |
| `renderBookings(bookings)` | Render booking cards |
| `completeBooking(bookingId)` | Mark job complete, trigger payment |
| `openRateModal(bookingId)` | Open rating modal |
| `setRating(val)` | Set star rating value |
| `submitRating()` | Submit review |
| `loadWallet()` | Load wallet balance and transactions |
| `openAddMoney()` | Open add money modal |
| `setAmount(val)` | Set preset amount in input |
| `addMoney()` | Add money to wallet (max ₹1000) |
| `clearTransactions()` | Clear transaction history |
| `loadNotifications(markRead)` | Load and display notifications |
| `markAllRead()` | Mark all notifications as read |
| `toggleNotifPanel()` | Show/hide notification dropdown |
| `loadProfile()` | Load profile form data |
| `updateProfile()` | Save profile changes |
| `changePassword()` | Update password |
| `uploadAvatar(input)` | Upload profile photo |
| `logout()` | Logout and redirect |
| `openModal(id)` | Show a modal |
| `closeModal(id)` | Hide a modal |
| `timeAgo(date)` | Format date as "2h ago" |
| `showToast(msg, type)` | Show notification toast |

### worker.js (Worker Dashboard)
| Function | Description |
|----------|-------------|
| `refreshWorker()` | Re-fetch worker from session |
| `renderNav()` | Update navbar with availability toggle |
| `showSection(id)` | Switch between dashboard sections |
| `loadDashboard()` | Load stats, performance, recent requests |
| `fetchJobs(status)` | Fetch jobs filtered by status |
| `toggleAvailability()` | Go online/offline |
| `startLocationTracking()` | Start sending location every 4 seconds |
| `stopLocationTracking()` | Stop location updates |
| `loadRequests()` | Load pending job requests |
| `acceptJob(bookingId)` | Accept a job request |
| `rejectJob(bookingId)` | Reject a job request |
| `loadActiveJobs()` | Load accepted/in-progress jobs |
| `startJob(bookingId)` | Mark job as in-progress |
| `completeJob(bookingId)` | Mark job as completed |
| `loadHistory()` | Load completed/cancelled jobs |
| `loadWallet()` | Load wallet balance and transactions |
| `openWithdraw()` | Open withdraw modal |
| `withdrawMoney()` | Withdraw earnings |
| `loadNotifications(markRead)` | Load notifications |
| `markAllRead()` | Mark all notifications read |
| `toggleNotifPanel()` | Toggle notification dropdown |
| `loadProfile()` | Load profile form |
| `updateProfile()` | Save profile changes |
| `changePassword()` | Update password |
| `uploadAvatar(input)` | Upload profile photo |
| `logout()` | Logout and redirect |

---

## Booking Flow

```
Customer books worker
        ↓
Booking created (status: pending)
Worker gets notification
        ↓
Worker accepts (status: accepted)
Customer gets notification
Location tracking starts
        ↓
Worker starts job (status: in-progress)
        ↓
Worker marks complete (status: completed)
Customer gets notification
        ↓
Customer confirms & pays
Wallet deducted from customer
Wallet credited to worker
        ↓
Customer rates worker (optional)
Worker rating updated
```

---

## Demo Worker Accounts

| Email | Password | Service |
|-------|----------|---------|
| worker1@skillsetu.com | password123 | Plumber |
| worker2@skillsetu.com | password123 | Carpenter |
| worker3@skillsetu.com | password123 | Electrician |
| worker4@skillsetu.com | password123 | Cook |
| worker5@skillsetu.com | password123 | Maid |
| worker6@skillsetu.com | password123 | Gardener |
| worker7@skillsetu.com | password123 | Painter |
| worker8@skillsetu.com | password123 | AC Technician |
| worker9@skillsetu.com | password123 | Mechanic |
| worker10@skillsetu.com | password123 | Cleaner |
| worker11@skillsetu.com | password123 | Locksmith |
| worker12@skillsetu.com | password123 | Mobile Repair |

---

## Wallet Rules
- Customers can add max ₹1000 per transaction
- Payment is deducted when customer confirms job completion
- Workers receive payment instantly on job confirmation
- Workers can withdraw their earnings anytime
- Full transaction history available, can be cleared manually
