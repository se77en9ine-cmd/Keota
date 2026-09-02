# 39POS Enterprise Deployment & Production Guide

## 1. Quick Start (Development Mode)
Run both backend Express API and Vite React frontend with a single command:
```bash
npm install --no-audit --no-fund --legacy-peer-deps
npm run seed
npm run dev
```
- **Frontend Client:** `http://localhost:3000`
- **Backend API:** `http://localhost:5000`
- **Customer Secondary Display:** `http://localhost:3000/display`

## 2. Docker & Containerized Production Deployment
```bash
docker-compose up --build -d
```
All SQLite databases, file uploads, backups, and storage mounts are automatically persisted in Docker named volumes.

## 3. Environment Variables Configuration (`.env`)
```ini
PORT=5000
NODE_ENV=production
JWT_SECRET=your-secure-jwt-secret-key
JWT_REFRESH_SECRET=your-secure-refresh-key
BACKUP_KEY=your-aes-256-backup-encryption-key
DATABASE_PATH=database/39pos.sqlite
STORAGE_DIR=storage
BACKUPS_DIR=backups
UPLOADS_DIR=uploads
```

## 4. Multi-Branch Centralized Sync Deployment (Cloud PostgreSQL)
To connect multiple offline store POS terminals to a centralized Cloud PostgreSQL instance:
1. In the central server, configure `DATABASE_URL=postgresql://user:pass@cloud-pg:5432/39pos_enterprise`.
2. Terminals write to local SQLite with zero latency and send background sync batches to `POST /api/sync/push`.
3. Central server reconciles conflicts using Last-Write-Wins (LWW) with millisecond precision timestamps.
