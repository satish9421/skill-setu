# Skill Setu - Worker Booking Platform

A complete web application connecting customers with skilled workers for various home services, powered by MongoDB and Node.js.

## Technology Stack

- Frontend: HTML5, CSS3, JavaScript (Vanilla)
- Backend: Node.js, Express.js
- Database: MongoDB
- Session Management: Express-session
- Security: Bcrypt for password hashing

## Features

### Customer Features
- Search for workers by service type
- View worker profiles with ratings, experience, and distance
- Real-time location tracking of workers during active jobs
- Secure in-built wallet system
- Book and manage service requests
- Rate and review workers after job completion
- Transaction history

### Worker Features
- Toggle online/offline availability
- Receive and manage job requests
- Accept/reject job offers
- Track active jobs
- Real-time location sharing during jobs
- Secure wallet with withdrawal options
- View job history and ratings
- Update profile and service rates

### Services Available
- Plumber
- Carpenter
- Electrician
- Cook
- Maid
- Gardener
- Painter
- AC Technician
- Mechanic
- Cleaner
- Locksmith
- Mobile Repair

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Compass installed and running
- MongoDB server running on localhost:27017

## Installation & Setup

### 1. Install MongoDB (if not already installed)
- Download and install MongoDB Community Server from https://www.mongodb.com/try/download/community
- Install MongoDB Compass from https://www.mongodb.com/try/download/compass
- Start MongoDB service

### 2. Install Project Dependencies
```bash
npm install
```

### 3. Configure Database Connection
The project is pre-configured to connect to MongoDB at `mongodb://localhost:27017/skillsetu`

If you need to change the connection string, edit the `.env` file:
```
MONGODB_URI=mongodb://localhost:27017/skillsetu
PORT=3000
SESSION_SECRET=your-secret-key-change-this-in-production
```

### 4. Start the Server
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

### 5. Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

## Demo Accounts

10 demo worker accounts are automatically created on first run:
- Email: worker1@skillsetu.com to worker10@skillsetu.com
- Password: password123

You can register new customer or worker accounts through the web interface.

## MongoDB Collections

The application creates three collections in the `skillsetu` database:

1. **users** - Customer accounts
2. **workers** - Worker accounts with service details
3. **bookings** - Job bookings and transactions

You can view and manage these collections using MongoDB Compass.

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- POST `/api/auth/logout` - Logout user
- GET `/api/auth/session` - Get current session

### Workers
- GET `/api/workers/search?serviceType=` - Search workers
- PUT `/api/workers/:id/availability` - Toggle availability
- PUT `/api/workers/:id/location` - Update location
- PUT `/api/workers/:id/profile` - Update profile

### Customers
- PUT `/api/customers/:id/profile` - Update profile

### Bookings
- POST `/api/bookings` - Create booking
- GET `/api/bookings/customer/:customerId` - Get customer bookings
- GET `/api/bookings/worker/:workerId` - Get worker bookings
- PUT `/api/bookings/:id/status` - Update booking status
- PUT `/api/bookings/:id/complete` - Complete booking
- PUT `/api/bookings/:id/rate` - Rate worker

### Wallet
- POST `/api/wallet/add` - Add money to wallet
- POST `/api/wallet/withdraw` - Withdraw money

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- Separate authentication for customers and workers
- Secure wallet transactions
- CORS protection

## File Structure

### Frontend
- `index.html` - Landing page with login/registration
- `customer-dashboard.html` - Customer interface
- `worker-dashboard.html` - Worker interface
- `styles.css` - Complete styling
- `app.js` - Authentication logic
- `customer.js` - Customer dashboard logic
- `worker.js` - Worker dashboard logic

### Backend
- `server.js` - Express server and API routes
- `package.json` - Dependencies and scripts
- `.env` - Environment configuration

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB service is running
- Check if MongoDB is listening on port 27017
- Verify connection string in `.env` file

### Port Already in Use
If port 3000 is already in use, change it in `.env`:
```
PORT=3001
```

### Cannot Connect to Server
- Make sure the server is running (`npm start`)
- Check browser console for errors
- Verify API_URL in frontend JS files matches your server port
