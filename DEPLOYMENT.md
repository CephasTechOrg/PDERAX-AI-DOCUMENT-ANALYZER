# PDERAX Deployment Guide for Render.com

## 🚀 Quick Deploy Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. Create Render Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml`

### 3. Add Environment Variable (CRITICAL!)
In Render Dashboard → Your Service → Environment:
- Add **DEEPSEEK_API_KEY** = `your-actual-api-key`
- All other env vars are already configured in render.yaml

### 4. Deploy
- Click "Create Web Service"
- Wait 3-5 minutes for build to complete
- Your API will be live at: `https://ai-pdf-analyzer-backend.onrender.com`

## ✅ What's Been Fixed

### Backend Alignment with render.yaml:
✅ **Port handling**: Now uses `$PORT` from Render environment  
✅ **Environment variables**: All configured in render.yaml  
✅ **CORS**: Production-ready (restricted origins)  
✅ **Static directory**: Auto-creates on startup  
✅ **Health checks**: Shows AI configuration status  
✅ **Startup validation**: Warns if API key missing  
✅ **.gitignore**: Prevents .env from being committed  

### Environment Variables in Render:
✅ PYTHON_VERSION=3.12.3  
✅ DEEPSEEK_API_URL (set)  
✅ AI_REQUEST_TIMEOUT=20  
✅ MAX_UPLOAD_SIZE_MB=50  
✅ ENVIRONMENT=production  
⚠️ DEEPSEEK_API_KEY (you must add manually)  

## 🔧 Local Development

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
```

Access: http://localhost:8000

## 📋 Post-Deployment Checklist

- [ ] API responds at `/health` endpoint
- [ ] Environment shows: `"environment": "production"`
- [ ] `"ai_configured": true` in health response
- [ ] Upload test file works
- [ ] Download exports work
- [ ] Check Render logs for any errors

## 🔍 Troubleshooting

### "AI service unavailable"
→ Add DEEPSEEK_API_KEY in Render dashboard

### "Static files not found"
→ Directory auto-creates, check Render logs

### "CORS errors"
→ Update allowed_origins in main.py with your frontend URL

### Build fails
→ Check Python version is 3.12.3 in render.yaml
→ Verify all dependencies in requirements.txt

## 🌐 Frontend API Configuration

Your frontend will auto-detect the backend URL:
- Local: `http://localhost:8000/api/v1`
- Production: `https://ai-pdf-analyzer-backend.onrender.com/api/v1`

## 📝 Notes

- Free tier sleeps after 15 min inactivity
- First request after sleep takes ~30s
- Upgrade to paid plan for always-on service
