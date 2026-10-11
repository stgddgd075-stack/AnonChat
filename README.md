# AnonChat

**Anonymous Telegram-like messenger** — no registration required.

Just pick a nickname → get a unique ID automatically → chat privately, create groups & channels.

## Features

- ✅ **No registration** — only nickname
- ✅ Auto-generated unique ID (`@xxxxxxxx`)
- ✅ Private 1-on-1 chats
- ✅ Groups (multi-user)
- ✅ Channels (broadcast, only owner posts)
- ✅ Real-time messaging (Socket.io)
- ✅ **Bilingual**: English + فارسی (full RTL support)
- ✅ Dark Telegram-inspired UI
- ✅ Mobile responsive
- ✅ Search users by ID or nickname
- ✅ Invite to groups/channels by ID

## Tech Stack

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: Vanilla JS (no framework) + modern CSS
- **Storage**: In-memory (perfect for temporary/demo servers)
- **Languages**: English & Persian

## Quick Start

```bash
npm install
npm start
```

Open http://localhost:3000

## Deploy (temporary public server)

### Option 1: Render.com (free)
1. This repo is already public: https://github.com/stgddgd075-stack/AnonChat
2. Go to https://render.com → New → Web Service
3. Connect the repo `stgddgd075-stack/AnonChat`
4. Build command: `npm install`
5. Start command: `npm start`
6. Done — free public HTTPS URL in ~1 minute

### Option 2: Railway / Fly.io / Glitch / Cyclic
Same idea — any free Node host with `npm start`.

### Option 3: Local + tunnel
```bash
npm start
npx localtunnel --port 3000
```

## How to use

1. Open the site
2. Choose language (EN / FA)
3. Enter nickname → Join
4. Your ID appears at top (click to copy)
5. Search others by ID/nickname to start private chat
6. Use bottom buttons 💬 👥 📢 to create private / group / channel
7. Share your ID with friends so they can find you

## Notes

- Data is **in-memory** → server restarts wipe everything (by design for temporary servers)
- Max message length: 2000 chars
- History limited to last ~500 messages per chat
- Channels: only creator can send messages

## License

MIT

---

Built fully automated by Grok · Zero to one hundred · Public repo ready
