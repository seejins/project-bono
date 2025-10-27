# Environment Variables Setup Guide

This guide explains how to configure environment variables for development and production deployment.

## Development Setup

### Backend (.env)
Create `backend/.env` from `backend/env.example`:

```bash
cd backend
cp env.example .env
```

Edit `.env` with your development settings:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=sqlite:./database.sqlite
FRONTEND_URL=http://localhost:5173
DISABLE_UDP=false
API_KEY=dev-api-key-123
ADMIN_PASSWORD=1234
SESSION_SECRET=dev-session-secret
```

### Frontend (.env.local)
Create `frontend/.env.local` from `frontend/env.example`:

```bash
cd frontend
cp env.example .env.local
```

Edit `.env.local` with your development settings:
```env
VITE_API_URL=http://localhost:3001
VITE_APP_PASSWORD=dinof1
VITE_DEBUG=true
```

### Local Host App (.env)
Create `local-host/.env` from `local-host/env.example`:

```bash
cd local-host
cp env.example .env
```

Edit `.env` with your development settings:
```env
CLOUD_API_URL=http://localhost:3001
API_KEY=dev-api-key-123
SEASON_ID=default-season
DEBUG=true
```

## Production Deployment (Render)

### Backend Environment Variables
Set these in your Render backend service:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production environment |
| `PORT` | `10000` | Render's default port |
| `DISABLE_UDP` | `true` | Disable UDP in production |
| `API_KEY` | `[generated]` | Auto-generated secret key |
| `ADMIN_PASSWORD` | `1234` | Admin panel password |
| `SESSION_SECRET` | `[generated]` | Auto-generated session secret |
| `FRONTEND_URL` | `https://f1-race-engineer-frontend.onrender.com` | Frontend URL |
| `DATABASE_URL` | `[auto]` | PostgreSQL connection (auto-set by Render) |

### Frontend Environment Variables
Set these in your Render frontend service:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `https://f1-race-engineer-backend.onrender.com` | Backend API URL |
| `VITE_APP_PASSWORD` | `dinof1` | App access password |
| `VITE_DEBUG` | `false` | Disable debug mode |

### Local Host App Environment Variables
Update `local-host/.env` for production:

```env
CLOUD_API_URL=https://f1-race-engineer-backend.onrender.com
API_KEY=[copy from backend API_KEY]
SEASON_ID=default-season
DEBUG=false
```

## Security Notes

### Password Management
- **App Password**: Shared with friends for app access
- **Admin Password**: For admin panel access (change from default)
- **API Key**: Secret key for local host ↔ cloud communication

### Production Security
- Use strong, unique passwords
- Generate random API keys and session secrets
- Never commit `.env` files to version control
- Use HTTPS in production (Render provides free SSL)

## Environment Variable Reference

### Backend Variables
- `PORT`: Server port (3001 dev, 10000 prod)
- `NODE_ENV`: Environment mode (development/production)
- `DATABASE_URL`: Database connection string
- `FRONTEND_URL`: Frontend URL for CORS
- `DISABLE_UDP`: Disable UDP telemetry (true in production)
- `API_KEY`: Secret key for API authentication
- `ADMIN_PASSWORD`: Admin panel password
- `SESSION_SECRET`: Session encryption secret

### Frontend Variables
- `VITE_API_URL`: Backend API URL
- `VITE_APP_PASSWORD`: App access password
- `VITE_DEBUG`: Enable debug logging

### Local Host Variables
- `CLOUD_API_URL`: Cloud backend URL
- `API_KEY`: Authentication key (must match backend)
- `SEASON_ID`: Default season ID
- `DEBUG`: Enable debug logging

## Troubleshooting

### Common Issues
1. **CORS Errors**: Check `FRONTEND_URL` matches your frontend domain
2. **API Key Mismatch**: Ensure `API_KEY` is identical in backend and local host
3. **Database Connection**: Verify `DATABASE_URL` format and credentials
4. **Build Failures**: Check all required environment variables are set

### Validation
- Backend health check: `GET /health`
- Session API status: `GET /api/sessions/status`
- Frontend loads without console errors
- Local host connects successfully
