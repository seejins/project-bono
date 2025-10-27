# F1 Race Engineer - Deployment Guide

This guide covers deploying the F1 Race Engineer application to production using Render's free tier.

## Overview

The application uses a two-tier architecture:
- **Cloud Backend**: Hosted on Render, handles web app and data storage
- **Local Host App**: Runs on the host's computer, captures UDP telemetry and uploads to cloud

## Prerequisites

- GitHub account
- Render account (free)
- Node.js 18+ installed locally
- F1 23 game with UDP telemetry enabled

## Step 1: Prepare Repository

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add production deployment configuration"
   git push origin main
   ```

2. **Verify Files**
   Ensure these files are in your repository:
   - `render.yaml` (deployment configuration)
   - `backend/env.example` (environment template)
   - `frontend/env.example` (environment template)
   - `local-host/` (UDP capture app)

## Step 2: Deploy to Render

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Connect your GitHub account

### 2.2 Deploy Backend Service
1. **New Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `f1-race-engineer-backend`
     - **Environment**: `Node`
     - **Build Command**: `cd backend && npm install && npm run build`
     - **Start Command**: `cd backend && npm start`
     - **Plan**: `Free`

2. **Environment Variables**
   Set these in Render dashboard:
   ```
   NODE_ENV=production
   PORT=10000
   DISABLE_UDP=true
   API_KEY=[generate random string]
   ADMIN_PASSWORD=1234
   SESSION_SECRET=[generate random string]
   FRONTEND_URL=https://f1-race-engineer-frontend.onrender.com
   ```

3. **Database**
   - Add PostgreSQL database (free tier)
   - Render will automatically set `DATABASE_URL`

### 2.3 Deploy Frontend Service
1. **New Static Site**
   - Click "New" → "Static Site"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `f1-race-engineer-frontend`
     - **Build Command**: `cd frontend && npm install && npm run build`
     - **Publish Directory**: `frontend/dist`
     - **Plan**: `Free`

2. **Environment Variables**
   ```
   VITE_API_URL=https://f1-race-engineer-backend.onrender.com
   VITE_APP_PASSWORD=f1racing2024
   VITE_DEBUG=false
   ```

### 2.4 Alternative: Use render.yaml
Instead of manual setup, you can use the `render.yaml` file:
1. Click "New" → "Blueprint"
2. Connect your repository
3. Render will automatically create services from `render.yaml`

## Step 3: Configure Local Host App

### 3.1 Install Dependencies
```bash
cd local-host
npm install
```

### 3.2 Configure Environment
```bash
cp env.example .env
```

Edit `.env`:
```env
CLOUD_API_URL=https://f1-race-engineer-backend.onrender.com
API_KEY=[copy from backend API_KEY]
SEASON_ID=default-season
DEBUG=false
```

### 3.3 Build and Test
```bash
npm run build
npm start
```

## Step 4: Test Deployment

### 4.1 Backend Health Check
Visit: `https://f1-race-engineer-backend.onrender.com/health`
Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "telemetry": false
}
```

### 4.2 Frontend Access
Visit: `https://f1-race-engineer-frontend.onrender.com`
- Should show password gate
- Enter password: `dinof1`
- Should load the main application

### 4.3 Local Host Connection
Run the local host app and check console for:
- "✅ UDP listener started successfully"
- Connection to cloud API

## Step 5: Share with Friends

### 5.1 App Access
- **URL**: `https://f1-race-engineer-frontend.onrender.com`
- **Password**: `dinof1`

### 5.2 Host Setup
The host needs to:
1. Install and configure the local host app
2. Enable UDP telemetry in F1 23
3. Run the local host app during sessions

## Configuration Details

### Environment Variables Reference

#### Backend (Production)
| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `10000` | Render's port |
| `DISABLE_UDP` | `true` | Disable UDP in cloud |
| `API_KEY` | `[random]` | Local host authentication |
| `ADMIN_PASSWORD` | `1234` | Admin panel access |
| `SESSION_SECRET` | `[random]` | Session encryption |
| `FRONTEND_URL` | `[frontend-url]` | CORS configuration |
| `DATABASE_URL` | `[auto]` | PostgreSQL connection |

#### Frontend (Production)
| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | `[backend-url]` | API endpoint |
| `VITE_APP_PASSWORD` | `dinof1` | App access |
| `VITE_DEBUG` | `false` | Disable debug |

#### Local Host
| Variable | Value | Purpose |
|----------|-------|---------|
| `CLOUD_API_URL` | `[backend-url]` | Cloud API |
| `API_KEY` | `[backend-key]` | Authentication |
| `SEASON_ID` | `default-season` | Season ID |
| `DEBUG` | `false` | Debug mode |

## Troubleshooting

### Common Issues

#### Backend Won't Start
- Check environment variables are set
- Verify database connection
- Check build logs for errors

#### Frontend Build Fails
- Ensure all environment variables are set
- Check for TypeScript errors
- Verify dependencies are installed

#### Local Host Can't Connect
- Verify `CLOUD_API_URL` is correct
- Check `API_KEY` matches backend
- Test internet connection

#### UDP Not Working
- Enable UDP in F1 23 settings
- Check Windows Firewall
- Run as administrator
- Verify port 20777 is available

### Debugging Steps

1. **Check Render Logs**
   - Go to service dashboard
   - Click "Logs" tab
   - Look for error messages

2. **Test API Endpoints**
   ```bash
   curl https://f1-race-engineer-backend.onrender.com/health
   curl https://f1-race-engineer-backend.onrender.com/api/sessions/status
   ```

3. **Local Host Debug**
   ```bash
   DEBUG=true npm start
   ```

## Security Considerations

### Production Security
- Change default passwords
- Use strong API keys
- Enable HTTPS (automatic on Render)
- Regular security updates

### Data Privacy
- No user accounts required
- Data stored in PostgreSQL
- Local host only captures session data
- No personal information collected

## Maintenance

### Regular Tasks
- Monitor Render service health
- Update dependencies monthly
- Backup database data
- Check for F1 23 updates

### Scaling Considerations
- Free tier limitations
- Database size limits
- Concurrent user limits
- Upgrade to paid plans if needed

## Support

### Getting Help
- Check Render documentation
- Review application logs
- Test locally first
- Verify environment variables

### Community
- Share with friends
- Report issues
- Suggest improvements
- Contribute to development

## Cost Breakdown

### Free Tier Limits
- **Backend**: 750 hours/month
- **Frontend**: Unlimited static hosting
- **Database**: 1GB storage
- **Bandwidth**: 100GB/month

### Estimated Usage
- Small group (5-10 friends): Free tier sufficient
- Larger groups: May need paid plans
- Heavy usage: Consider database upgrades

This deployment setup provides a complete, free solution for hosting your F1 Race Engineer application with friends!
