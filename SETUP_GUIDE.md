# Skill Setu - Complete Setup Guide

## Step-by-Step Installation

### Step 1: Verify MongoDB Installation

1. Open MongoDB Compass
2. Click "Connect" (it should connect to `mongodb://localhost:27017`)
3. If connection fails, ensure MongoDB service is running:
   - Windows: Open Services, find "MongoDB Server", and start it
   - Mac: Run `brew services start mongodb-community`
   - Linux: Run `sudo systemctl start mongod`

### Step 2: Install Node.js Dependencies

Open terminal/command prompt in the project folder and run:

```bash
npm install
```

This will install:
- express (web server)
- mongodb (database driver)
- cors (cross-origin requests)
- bcrypt (password encryption)
- express-session (session management)
- dotenv (environment variables)

### Step 3: Verify Configuration

Check the `.env` file contains:
```
MONGODB_URI=mongodb://localhost:27017/skillsetu
PORT=3000
SESSION_SECRET=your-secret-key-change-this-in-production
```

### Step 4: Start the Server

```bash
npm start
```

You should see:
```
Connected to MongoDB
Demo workers created
Server running on http://localhost:3000
```

### Step 5: Open the Application

Open your web browser and go to:
```
http://localhost:3000
```

### Step 6: Verify Database in MongoDB Compass

1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. You should see a database named `skillsetu`
4. Inside it, you'll find three collections:
   - `users` (customers)
   - `workers` (service providers)
   - `bookings` (job bookings)

## Testing the Application

### Test as Customer

1. Click "Customer Login" on homepage
2. Click "Register" link
3. Register with any email and password
4. Login with your credentials
5. Search for a service (e.g., Plumber)
6. Add money to wallet (e.g., ₹500)
7. Book a worker
8. View booking status in "My Bookings"

### Test as Worker

1. Use demo account:
   - Email: worker1@skillsetu.com
   - Password: password123
2. Toggle "Online" status
3. Check "Job Requests" for pending bookings
4. Accept a job
5. Start the job (location tracking begins)
6. Complete the job
7. Check wallet balance

## Common Issues & Solutions

### Issue: "Cannot connect to MongoDB"
**Solution:** 
- Ensure MongoDB service is running
- Check MongoDB Compass can connect to localhost:27017
- Restart MongoDB service

### Issue: "Port 3000 already in use"
**Solution:**
- Change PORT in `.env` to 3001 or another available port
- Update API_URL in `app.js`, `customer.js`, and `worker.js` to match

### Issue: "npm install fails"
**Solution:**
- Ensure Node.js is installed (run `node --version`)
- Delete `node_modules` folder and `package-lock.json`
- Run `npm install` again

### Issue: "Session not persisting"
**Solution:**
- Clear browser cookies and cache
- Restart the server
- Try in incognito/private browsing mode

### Issue: "Workers not showing in search"
**Solution:**
- Check MongoDB Compass to verify workers collection has data
- Ensure workers have `available: true` status
- Restart the server to reinitialize demo data

## Development Mode

For development with auto-restart on file changes:

```bash
npm run dev
```

This requires `nodemon` which is included in devDependencies.

## Database Management

### View Data in MongoDB Compass

1. Connect to `mongodb://localhost:27017`
2. Select `skillsetu` database
3. Browse collections:
   - Click on `workers` to see all workers
   - Click on `users` to see all customers
   - Click on `bookings` to see all bookings

### Reset Database

To start fresh, in MongoDB Compass:
1. Right-click on `skillsetu` database
2. Select "Drop Database"
3. Restart the server (demo data will be recreated)

### Backup Database

In MongoDB Compass:
1. Select `skillsetu` database
2. Click "..." menu
3. Select "Export Collection"
4. Choose JSON or CSV format

## Production Deployment

Before deploying to production:

1. Change `SESSION_SECRET` in `.env` to a strong random string
2. Update `MONGODB_URI` to your production MongoDB connection string
3. Set `NODE_ENV=production` in `.env`
4. Enable HTTPS
5. Configure proper CORS origins in `server.js`
6. Set up MongoDB Atlas for cloud database
7. Use environment variables for sensitive data

## API Testing

You can test API endpoints using tools like Postman or curl:

### Example: Register a new customer
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","userType":"customer"}'
```

### Example: Search for workers
```bash
curl http://localhost:3000/api/workers/search?serviceType=plumber
```

## Support

For issues or questions:
1. Check this guide first
2. Verify MongoDB is running
3. Check server console for error messages
4. Check browser console for frontend errors
5. Verify all dependencies are installed

## Next Steps

After successful setup:
1. Explore the customer dashboard features
2. Test the worker dashboard with demo accounts
3. Try the complete booking workflow
4. Monitor database changes in MongoDB Compass
5. Customize the application for your needs
