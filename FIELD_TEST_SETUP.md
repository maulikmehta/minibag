# LocalLoops - Field Testing Setup Guide

**Quick guide to start testing independently without technical assistance**

---

## 📱 For Field Testing on Mobile Devices

### Step 1: Start the Servers

**On your computer:**

```bash
# Make the script executable (first time only)
chmod +x start.sh stop.sh

# Start the servers
./start.sh
```

The script will:
- ✅ Check if Node.js is installed
- ✅ Check if dependencies are installed
- ✅ Check if ports are available
- ✅ Start backend (API + WebSocket) on ports 3000 & 3001
- ✅ Start frontend on port 5173

**You should see:**
```
Frontend:  http://localhost:5173
Backend:   http://localhost:3000
WebSocket: http://localhost:3001
```

---

### Step 2: Expose Your Local Server to Internet

**Using Cloudflare Tunnel (Already installed):**

```bash
# In a new terminal window, run:
./cloudflared tunnel --url http://localhost:5173
```

**You'll get a public URL like:**
```
https://random-words-1234.trycloudflare.com
```

**✅ Share this URL with your phone or other testers**

---

### Step 3: Access on Mobile

1. Open the Cloudflare URL on your mobile browser
2. The app should load with the home screen
3. Test all features:
   - Create session
   - Add items from catalog
   - Share link via WhatsApp
   - Join session from another device
   - Test nickname selection
   - Test real-time updates

---

## 🛑 Stopping the Servers

When done testing:

```bash
# Stop all servers cleanly
./stop.sh
```

This will kill all processes on ports 3000, 3001, and 5173.

---

## 🔧 Troubleshooting

### Problem: "Port already in use"

**Solution:**
```bash
./stop.sh  # Kill all servers
./start.sh # Restart
```

### Problem: "Cannot connect to backend"

**Check:**
1. Is the backend running? (Should see API logs in terminal)
2. Is the .env file configured with Supabase credentials?
3. Try accessing: http://localhost:3000/api/catalog/categories

### Problem: "Database errors"

**Check:**
1. Are you connected to internet?
2. Are Supabase credentials correct in `.env`?
3. Have you run all database migrations?

### Problem: Cloudflare tunnel not working

**Use ngrok instead:**
```bash
# Install ngrok (if not installed)
brew install ngrok

# Start tunnel
ngrok http 5173
```

### Problem: Changes not reflecting

**Solution:**
1. Save your files (Ctrl+S / Cmd+S)
2. Wait for Vite to reload (you'll see HMR update in terminal)
3. If stuck, refresh the browser (Cmd+R / Ctrl+R)

---

## 📋 Quick Reference Commands

```bash
# Start servers
./start.sh

# Stop servers
./stop.sh

# Restart servers
./stop.sh && ./start.sh

# Check if servers are running
lsof -i :3000 -i :3001 -i :5173

# View backend logs
# (Shows in the terminal where you ran ./start.sh)

# Open in browser
open http://localhost:5173
```

---

## 🧪 Testing Checklist

### Host Flow
- [ ] Add items from catalog
- [ ] Create session with nickname selection
- [ ] Get session link
- [ ] Share via WhatsApp
- [ ] See participant join in real-time
- [ ] Change session status

### Participant Flow
- [ ] Click join link
- [ ] Enter name
- [ ] Select nickname (2 options)
- [ ] Join session
- [ ] See host's items
- [ ] Add items from catalog (only host's items visible)
- [ ] See real-time updates

### General
- [ ] Language switching (English, Gujarati, Hindi)
- [ ] Voice search for items
- [ ] Search and add items
- [ ] Mobile responsiveness
- [ ] WhatsApp sharing
- [ ] Multiple participants joining same session

---

## 🌐 Network Setup (For Testing on Multiple Devices)

### Option 1: Cloudflare Tunnel (Recommended)
```bash
./cloudflared tunnel --url http://localhost:5173
```

### Option 2: ngrok
```bash
ngrok http 5173
```

### Option 3: Local Network (Same WiFi)
1. Find your computer's local IP:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
2. Share this URL with devices on same WiFi:
   ```
   http://YOUR_LOCAL_IP:5173
   ```
   Example: `http://192.168.1.66:5173`

---

## 📝 Environment Setup (One-Time)

If `.env` file doesn't exist or needs updating:

```bash
# Copy example
cp .env.example .env

# Edit with your Supabase credentials
nano .env
```

**Required variables:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here
```

Get these from: https://supabase.com/dashboard → Your Project → Settings → API

---

## 🐛 Known Issues & Workarounds

See `KNOWN_ISSUES.md` for:
- Current bugs
- Planned fixes
- Temporary workarounds

---

## 📞 Quick Support

**If something goes wrong:**

1. **Check the terminal** - Error messages appear there
2. **Check browser console** - Press F12 → Console tab
3. **Restart servers** - `./stop.sh && ./start.sh`
4. **Check this guide** - Most issues are documented above

**Common fixes:**
- 90% of issues: Restart servers
- 5% of issues: Check .env file
- 5% of issues: Database connection

---

## ✅ Ready to Test!

1. Run `./start.sh`
2. Open `http://localhost:5173` on computer OR
3. Run Cloudflare tunnel and share public URL
4. Start testing!

**Good luck with field testing! 🚀**

---

**Last Updated:** October 26, 2025
**Version:** v0.1.0 (Nickname Selection Feature)
