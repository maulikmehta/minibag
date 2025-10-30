# 🚀 START HERE - LocalLoops Quick Start

**Everything you need to test independently**

---

## ⚡ Super Quick Start (3 Commands)

```bash
# 1. Check everything is ready
./check.sh

# 2. Start servers
./start.sh

# 3. Create public URL for mobile testing
./tunnel.sh
```

That's it! You're ready to test.

---

## 📱 For Mobile Testing

### Desktop Terminal:

```bash
# Terminal 1: Start servers
./start.sh

# Terminal 2: Create public tunnel
./tunnel.sh
```

### On Your Phone:

1. Copy the Cloudflare HTTPS URL from Terminal 2
2. Paste in mobile browser
3. Start testing!

---

## 📚 Available Scripts

| Script | Command | What it does |
|--------|---------|--------------|
| **Health Check** | `./check.sh` | Verify all systems ready |
| **Start** | `./start.sh` | Start backend + frontend |
| **Stop** | `./stop.sh` | Stop all servers |
| **Tunnel** | `./tunnel.sh` | Create public URL for testing |

---

## 📖 Documentation

| File | Purpose |
|------|---------|
| **START_HERE.md** | This file - quick overview |
| **TESTING_COMMANDS.md** | All commands with examples |
| **FIELD_TEST_SETUP.md** | Complete testing guide |
| **QUICK_START.md** | Detailed setup instructions |
| **NICKNAME_SELECTION_IMPLEMENTATION.md** | Latest feature docs |

---

## 🎯 Common Workflows

### Desktop Testing Only
```bash
./start.sh
# Open http://localhost:5173
```

### Mobile Testing
```bash
./start.sh    # Terminal 1
./tunnel.sh   # Terminal 2
# Use the HTTPS URL on phone
```

### After Code Changes
```bash
# Just save files - auto-reload!
# If stuck: ./stop.sh && ./start.sh
```

### Clean Stop
```bash
./stop.sh
```

---

## 🔍 Check System Status

```bash
./check.sh
```

Shows:
- ✓ Node.js & npm installed
- ✓ Environment configured
- ✓ Dependencies installed
- ✓ Servers running/stopped
- ✓ Network info

---

## 🐛 Troubleshooting

### Quick Fixes

| Problem | Solution |
|---------|----------|
| Port busy | `./stop.sh && ./start.sh` |
| Changes not showing | Hard refresh (Cmd+Shift+R) |
| Can't connect | Check `./check.sh` |
| Database errors | Check internet & .env |

### Detailed Help

See **FIELD_TEST_SETUP.md** for complete troubleshooting guide.

---

## 📋 Testing Checklist

```
Setup:
[ ] Run ./check.sh - all green
[ ] Run ./start.sh - servers running
[ ] Run ./tunnel.sh - got public URL

Host Flow:
[ ] Add items from catalog
[ ] Create session + select nickname
[ ] Share via WhatsApp

Participant Flow:
[ ] Click join link
[ ] Enter name + select nickname
[ ] Join session
[ ] See real-time updates

Multi-Device:
[ ] Join from 2+ devices
[ ] All see updates
[ ] Nicknames work correctly
```

---

## 🎬 Example Session

```bash
$ ./check.sh
✓ All systems ready!

$ ./start.sh
✓ Node.js version: v18.17.0
Frontend:  http://localhost:5173
Backend:   http://localhost:3000
🚀 Starting...

# New terminal
$ ./tunnel.sh
📱 Public URL: https://abc-xyz-123.trycloudflare.com

# Test on phone using that URL

# When done
$ ./stop.sh
✓ All servers stopped
```

---

## 💡 Pro Tips

1. **Keep `./check.sh` handy** - Run before every session
2. **Use two terminals** - One for servers, one for tunnel
3. **Save tunnel URL** - It stays same until restart
4. **Test incognito** - Simulates fresh user
5. **Watch terminal logs** - Errors show there

---

## 🆘 Need Help?

1. Run `./check.sh` - Shows system status
2. Check `FIELD_TEST_SETUP.md` - Complete guide
3. Check `TESTING_COMMANDS.md` - All commands
4. Look at terminal logs - Shows errors

---

## ✅ You're Ready!

```bash
./check.sh    # Verify ready
./start.sh    # Start testing
```

**Happy testing! 🎉**

---

**Project:** LocalLoops Minibag
**Version:** 0.1.0 (Nickname Selection)
**Updated:** October 26, 2025

---

## 🌟 Latest Features

- ✅ Nickname selection (2 options) on join
- ✅ Nickname selection for host
- ✅ Real name stored separately
- ✅ 3-letter naming system
- ✅ WhatsApp sharing improved
- ✅ Participant catalog filtering
- ✅ Multi-language support
