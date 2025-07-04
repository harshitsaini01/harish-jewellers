# 🚀 Harish Jewellers - Deployment Guide

## Domain: [harishjewellers.shop](https://harishjewellers.shop)

This guide will help you deploy your Harish Jewellers management system from GitHub to your Hostinger VPS.

## 📋 Pre-Deployment Checklist

- [x] Domain configured: `harishjewellers.shop`
- [x] CORS settings updated for production
- [x] Environment variables configured
- [x] Production build ready
- [x] GitHub repository ready

## 🔧 VPS Requirements

- **Node.js**: v16+ (recommended: v18+)
- **npm**: Latest version
- **Memory**: Minimum 512MB RAM
- **Storage**: 2GB+ free space
- **OS**: Ubuntu 20.04+ or CentOS 7+

## 📦 GitHub to VPS Deployment

### Step 1: Clone Repository on VPS

```bash
# SSH into your Hostinger VPS
ssh root@your-vps-ip

# Clone the repository
git clone https://github.com/yourusername/harish-jewellers.git
cd harish-jewellers

# Run the automated deployment script
./deploy.sh
```

### Step 2: Configure Environment

```bash
cd server
nano .env
```

**Update these critical settings:**
```bash
# CHANGE THIS TO A SECURE SECRET!
JWT_SECRET=your-very-secure-random-string-here

# Your domain (already set)
FRONTEND_URL=https://harishjewellers.shop

# Production settings
NODE_ENV=production
PORT=5000
```

### Step 3: Start the Application

```bash
# Start the server
NODE_ENV=production node index.js
```

**For persistent running (recommended):**
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start index.js --name "harish-jewellers" --env production

# Set PM2 to start on boot
pm2 startup
pm2 save
```

## 🌐 Domain & SSL Setup

### Configure Domain DNS
Point your domain to your VPS IP:
- **A Record**: `@` → `your-vps-ip`
- **A Record**: `www` → `your-vps-ip`

### SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt update
sudo apt install certbot

# Get SSL certificate
sudo certbot --standalone -d harishjewellers.shop -d www.harishjewellers.shop
```

### Nginx Configuration (Optional but Recommended)
```bash
# Install Nginx
sudo apt install nginx

# Create configuration
sudo nano /etc/nginx/sites-available/harishjewellers.shop
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name harishjewellers.shop www.harishjewellers.shop;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name harishjewellers.shop www.harishjewellers.shop;

    ssl_certificate /etc/letsencrypt/live/harishjewellers.shop/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/harishjewellers.shop/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔐 Security Setup

### 1. Change Default Password
- Login: `admin` / `admin123`
- **Immediately change the password** after first login

### 2. Firewall Configuration
```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 3. Secure JWT Secret
Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📊 Monitoring & Maintenance

### View Application Logs
```bash
# If using PM2
pm2 logs harish-jewellers

# If running directly
tail -f /path/to/your/logfile
```

### Database Backups
Your app automatically creates backups in `server/backups/`

### Updates from GitHub
```bash
cd /path/to/harish-jewellers
git pull origin main
pm2 restart harish-jewellers
```

## 🆘 Troubleshooting

### Common Issues

**Port 5000 already in use:**
```bash
sudo lsof -ti:5000 | xargs sudo kill -9
```

**Permission denied for uploads:**
```bash
chmod 755 server/uploads server/data
```

**Database connection issues:**
```bash
# Check if SQLite file exists and has proper permissions
ls -la server/data/
chmod 644 server/data/harish_jewellers.db
```

## 📞 Support

- **Domain**: harishjewellers.shop
- **Repository**: GitHub repository
- **Default Login**: admin / admin123 (CHANGE IMMEDIATELY!)

## 🎉 Success Checklist

- [ ] VPS setup complete
- [ ] Repository cloned and deployed
- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Domain pointing to VPS
- [ ] Application accessible at https://harishjewellers.shop
- [ ] Default password changed
- [ ] PM2 monitoring active

**Your Harish Jewellers management system is now live! 🚀**