# Sign Language Translator PWA

Progressive Web App for real-time sign language translation using phone camera.

## Features
- ✅ Works on any phone browser (no app store)
- ✅ Real-time skeletal tracking with MediaPipe
- ✅ Visual skeleton overlay (green body, red/blue hands)
- ✅ Sends to cloud API for translation
- ✅ Displays English translation

## How to Deploy

### Option 1: GitHub Pages (Free, Easy)

1. **Upload to GitHub:**
   - Create new repository: `sign-language-pwa`
   - Upload all files from `SignLanguagePWA` folder

2. **Enable GitHub Pages:**
   - Go to repository Settings
   - Scroll to "Pages"
   - Source: Deploy from branch `main`
   - Folder: `/ (root)`
   - Click Save

3. **Access your PWA:**
   - URL: `https://your-username.github.io/sign-language-pwa`
   - Open on your phone browser

### Option 2: Netlify (Free, Drag & Drop)

1. Go to https://netlify.com
2. Sign up (free)
3. Drag the `SignLanguagePWA` folder onto Netlify
4. Get URL: `https://your-app.netlify.app`

### Option 3: Local Testing (PC only)

```bash
cd C:\SignLanguagePWA
python -m http.server 8000
```

Open: http://localhost:8000

## How to Use

1. Open PWA URL on your phone
2. Click "Start Camera"
3. Allow camera permission
4. Start signing!
5. See skeleton overlay in real-time
6. Translation appears at bottom after 1 second

## Color Guide
- **Green**: Body skeleton
- **Red**: Left hand
- **Blue**: Right hand

## Troubleshooting

**Camera not working:**
- Must use HTTPS (GitHub Pages/Netlify provide this)
- Grant camera permission when prompted
- Try different browser (Chrome recommended)

**No translation:**
- Check backend is running: https://sign-language-api-lqw3.onrender.com/api/health
- Wait 30 seconds if backend was sleeping
- Check browser console for errors

**Skeleton not showing:**
- Make sure you're in frame
- Good lighting helps
- Show hands clearly to camera

## Files
- `index.html` - Main page
- `css/style.css` - Styling
- `js/config.js` - API configuration
- `js/poseDetector.js` - MediaPipe integration
- `js/apiClient.js` - Backend communication
- `js/app.js` - Main app logic
- `manifest.json` - PWA configuration
