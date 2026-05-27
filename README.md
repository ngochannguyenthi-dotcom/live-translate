# VietFR Live 🇻🇳 → 🇫🇷

Real-time Vietnamese to French translation with voice playback. 100% free using Groq AI.

## Deploy to Vercel (5 minutes)

### Option A — Vercel CLI (recommended)
```bash
npm install -g vercel
cd vietfr-groq
vercel
# Follow prompts → your site is live!
```

### Option B — Vercel Dashboard (no terminal needed)
1. Go to vercel.com → Sign up free
2. Click "Add New Project"
3. Upload this folder (drag & drop)
4. Click Deploy → done!

### Option C — GitHub + Vercel (auto-deploy)
1. Push this folder to a GitHub repo
2. Go to vercel.com → Import Git Repository
3. Select your repo → Deploy
4. Every push auto-deploys

## How to use the app
1. Get a free Groq API key at console.groq.com
2. Paste it in the golden bar in the app
3. Click "Écouter" in Chrome or Edge
4. Speak Vietnamese → get French translation + voice playback

## Tech stack
- Pure HTML + CSS + JS (no framework, no build step)
- Groq API (llama-3.3-70b) for translation — free tier
- Web Speech API for speech recognition — free, built into Chrome/Edge
- Web Speech Synthesis for French TTS — free, built into browser

## Files
- `index.html` — app structure
- `style.css` — all styling
- `app.js` — all logic
- `vercel.json` — Vercel deployment config

