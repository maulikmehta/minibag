# Testing Commands - Quick Reference

**Super simple commands for independent field testing**

---

## 🚀 Starting the Project

### 1. Start Development Servers

```bash
./start.sh
```

**What it does:**
- ✅ Checks Node.js and npm installation
- ✅ Checks environment setup
- ✅ Verifies dependencies installed
- ✅ Frees up ports if needed
- ✅ Starts backend (API + WebSocket)
- ✅ Starts frontend (React app)

**You'll see:**
```
Frontend:  http://localhost:5173  ← Open this in browser
Backend:   http://localhost:3000
WebSocket: http://localhost:3001
```

---

### 2. Create Public URL for Mobile Testing

**Open a NEW terminal window and run:**

```bash
./tunnel.sh
```

**What it does:**
- ✅ Creates a public HTTPS URL
- ✅ Makes your local app accessible from anywhere
- ✅ Perfect for testing on mobile devices

**You'll get a URL like:**
```
https://random-words-1234.trycloudflare.com
```

**📲 Share this URL with:**
- Your mobile phone
- Other testers
- WhatsApp contacts for testing

---

### 3. Stop Everything

```bash
./stop.sh
```

**What it does:**
- ✅ Cleanly stops all servers
- ✅ Frees up all ports
- ✅ Kills all related processes

---

## 📋 Complete Testing Workflow

### First Time Setup

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Make scripts executable (first time only)
chmod +x start.sh stop.sh tunnel.sh
```

### Every Time You Test

```bash
# Terminal 1: Start servers
./start.sh

# Terminal 2: Create public tunnel (for mobile testing)
./tunnel.sh

# Test on mobile using the Cloudflare URL

# When done: Stop servers
./stop.sh
```

---

## 🎯 Common Scenarios

### Scenario 1: Quick Desktop Testing

```bash
./start.sh
# Open http://localhost:5173 in Chrome
```

### Scenario 2: Mobile Device Testing

```bash
# Terminal 1
./start.sh

# Terminal 2
./tunnel.sh
# Copy the HTTPS URL and open on phone
```

### Scenario 3: Multi-Device Testing

```bash
# Terminal 1
./start.sh

# Terminal 2
./tunnel.sh
# Share the HTTPS URL with multiple devices
# Everyone can test simultaneously
```

### Scenario 4: After Making Code Changes

```bash
# No need to restart!
# Just save your files
# Vite will auto-reload (Hot Module Replacement)

# If things get stuck:
./stop.sh && ./start.sh
```

---

## 🔍 Monitoring & Debugging

### Check if servers are running

```bash
lsof -i :3000 -i :3001 -i :5173
```

### View backend logs

Logs appear in the terminal where you ran `./start.sh`

### View frontend errors

1. Open browser
2. Press F12 (or Cmd+Option+I on Mac)
3. Go to Console tab

### Check your local IP (for WiFi testing)

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

---

## ⚡ Quick Fixes

### Problem: Port already in use

```bash
./stop.sh
./start.sh
```

### Problem: Changes not showing

```bash
# Hard refresh browser
# Mac: Cmd + Shift + R
# Windows: Ctrl + Shift + R

# Or restart servers
./stop.sh && ./start.sh
```

### Problem: Can't connect on mobile

1. Check tunnel is running (`./tunnel.sh`)
2. Use the HTTPS URL, not localhost
3. Make sure phone has internet

### Problem: Database errors

1. Check internet connection
2. Verify .env file has Supabase credentials
3. Check Supabase dashboard is accessible

---

## 📱 Mobile Testing Tips

### iPhone/Safari
- Use the Cloudflare/ngrok HTTPS URL
- Add to Home Screen for app-like experience
- Test in both portrait and landscape

### Android/Chrome
- Use the Cloudflare/ngrok HTTPS URL
- Test voice input in search
- Check WhatsApp sharing

---

## 🧪 Testing Checklist

Run through these every time:

```
Host Flow:
[ ] Add items from catalog
[ ] Create session (select nickname)
[ ] Get shareable link
[ ] Share via WhatsApp

Participant Flow:
[ ] Click join link
[ ] Enter name + select nickname
[ ] Join session
[ ] See host's items
[ ] Real-time updates work

Multi-User:
[ ] Join from 2+ devices
[ ] Everyone sees updates
[ ] Nickname selection works
[ ] Items sync across devices
```

---

## 📂 File Locations

```
/Users/maulik/llcode/localloops/
├── start.sh              ← Start servers
├── stop.sh               ← Stop servers
├── tunnel.sh             ← Create public URL
├── FIELD_TEST_SETUP.md   ← Detailed testing guide
└── TESTING_COMMANDS.md   ← This file
```

---

## 💡 Pro Tips

1. **Keep two terminals open:**
   - Terminal 1: `./start.sh` (servers)
   - Terminal 2: `./tunnel.sh` (public URL)

2. **For rapid testing:**
   - Don't restart servers for small changes
   - Hot reload handles most updates

3. **For clean slate:**
   ```bash
   ./stop.sh && ./start.sh
   ```

4. **Save tunnel URL:**
   - Write it down or text it to yourself
   - Use same URL until you restart tunnel

5. **Test incognito mode:**
   - Simulates fresh user
   - Clears localStorage

---

## 🎬 Example Session

```bash
$ ./start.sh
✓ Node.js version: v18.17.0
✓ npm version: 9.6.7
✓ Environment file found
✓ Dependencies installed
🚀 Starting development servers...
Frontend:  http://localhost:5173
Backend:   http://localhost:3000

# In new terminal
$ ./tunnel.sh
✓ Frontend is running on port 5173
📱 Your app will be accessible via a public URL
⚡ Starting tunnel...

https://abc-123-def.trycloudflare.com

# Open on phone → Test → Works!

# When done
$ ./stop.sh
✓ All servers stopped
```

---

**Ready to test? Run `./start.sh` and go! 🚀**

---

**Last Updated:** October 26, 2025
