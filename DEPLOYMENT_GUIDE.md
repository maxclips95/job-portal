# 🚀 PRODUCTION DEPLOYMENT GUIDE

**Version**: 1.0 | **Date**: February 4, 2026 | **Status**: Ready for Production

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### Security Review
- [ ] All sensitive data moved to environment variables
- [ ] API keys rotated
- [ ] JWT secret generated (min 32 chars)
- [ ] Database password changed from default
- [ ] SSL certificates obtained
- [ ] CORS configuration verified
- [ ] Rate limiting configured
- [ ] DDoS protection enabled

### Backend Verification
- [ ] `npm test` passes with no errors
- [ ] `npm run build` succeeds
- [ ] Environment variables configured
- [ ] Database migrations run successfully
- [ ] Email service tested
- [ ] All 65 API endpoints verified
- [ ] Error handling working
- [ ] Logging configured

### Frontend Verification
- [ ] `npm run build` succeeds
- [ ] All pages load correctly
- [ ] API calls working
- [ ] Authentication flow tested
- [ ] Responsive design verified
- [ ] Performance optimized
- [ ] No console errors

### Database Verification
- [ ] All 14 tables created
- [ ] Indexes created
- [ ] Foreign key constraints working
- [ ] Data integrity verified
- [ ] Backup configured
- [ ] Recovery procedure documented

### Testing Verification
- [ ] All unit tests passing (150+)
- [ ] All integration tests passing (60+)
- [ ] All E2E tests passing (90+)
- [ ] Coverage report generated
- [ ] Critical paths tested

---

## 🔧 BACKEND DEPLOYMENT

### Option 1: Traditional Server (AWS EC2, DigitalOcean, Linode)

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

#### 2. Database Setup
```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE jobportal;

# Create user
CREATE USER jobportal_user WITH PASSWORD 'your_secure_password';

# Grant privileges
ALTER ROLE jobportal_user SET client_encoding TO 'utf8';
ALTER ROLE jobportal_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE jobportal_user SET default_transaction_deferrable TO on;
ALTER ROLE jobportal_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE jobportal TO jobportal_user;

\q
```

#### 3. Deploy Backend
```bash
# Clone repository
git clone <your-repo> /var/www/jobportal
cd /var/www/jobportal/backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://jobportal_user:your_secure_password@localhost:5432/jobportal
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRE=30d
ADMIN_EMAIL=admin@jobportal.com
ADMIN_PASSWORD=your_admin_password

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@jobportal.com
SITE_NAME=Job Portal

CORS_ORIGIN=https://yourdomain.com
API_URL=https://api.yourdomain.com
EOF

# Run migrations
npm run migrate

# Build application
npm run build

# Start with PM2
pm2 start npm --name "jobportal-api" -- start

# Save PM2 config
pm2 startup
pm2 save

# Verify
pm2 list
```

#### 4. Nginx Configuration
```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo cat > /etc/nginx/sites-available/jobportal-api << 'EOF'
upstream backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL Certificate (obtain from Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    limit_req zone=api_limit burst=200 nodelay;
    
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/jobportal-api /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### 2. Docker Compose
```yaml
version: '3.8'

services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: jobportal
      POSTGRES_USER: jobportal_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://jobportal_user:secure_password@db:5432/jobportal
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - db
    volumes:
      - ./logs:/app/logs

volumes:
  postgres_data:
```

#### 3. Deploy
```bash
# Build and run
docker-compose up -d

# Run migrations
docker-compose exec api npm run migrate

# Verify
docker-compose ps
```

### Option 3: Vercel/Heroku (Managed)

#### Vercel Backend
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd backend
vercel --prod

# Configure environment variables in Vercel dashboard
```

---

## 🎨 FRONTEND DEPLOYMENT

### Option 1: Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod

# Configure environment variable
# Add API_URL to environment variables in Vercel dashboard
```

### Option 2: AWS S3 + CloudFront

```bash
# Build
npm run build

# Create S3 bucket
aws s3 mb s3://jobportal-frontend

# Upload
aws s3 sync out/ s3://jobportal-frontend --delete

# Create CloudFront distribution
# Configure domain
# Set up SSL certificate
```

### Option 3: Nginx Server

```bash
# Build
npm run build

# Create directory
sudo mkdir -p /var/www/jobportal

# Copy built files
sudo cp -r .next/* /var/www/jobportal/

# Nginx config
sudo cat > /etc/nginx/sites-available/jobportal << 'EOF'
upstream nextjs_upstream {
    server localhost:3001;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable and restart
sudo ln -s /etc/nginx/sites-available/jobportal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔐 SECURITY HARDENING

### 1. SSL/TLS Setup
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 2. Firewall Configuration
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny everything else
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

### 3. Environment Variables
```bash
# Create secure .env with strong values
JWT_SECRET=<32+ char random string>
DATABASE_PASSWORD=<strong password>
ADMIN_PASSWORD=<strong password>
SMTP_PASS=<app-specific password>

# Protect .env file
chmod 600 .env
```

### 4. Database Security
```sql
-- Change default password
ALTER ROLE jobportal_user WITH PASSWORD 'new_strong_password';

-- Restrict connections
CREATE ROLE readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

-- Enable logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
SELECT pg_reload_conf();
```

### 5. Backup Configuration
```bash
# Create backup script
cat > /usr/local/bin/backup-jobportal.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/backups/jobportal"
DATE=$(date +%Y%m%d_%H%M%S)

# Create directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U jobportal_user jobportal | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup application
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/jobportal

# Delete old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed at $DATE"
EOF

# Make executable
chmod +x /usr/local/bin/backup-jobportal.sh

# Add to crontab (daily at 2 AM)
0 2 * * * /usr/local/bin/backup-jobportal.sh
```

---

## 📊 MONITORING & LOGGING

### 1. Application Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-auto-pull

# Monitor dashboard
pm2 monit

# Generate logs
pm2 logs jobportal-api
```

### 2. Database Monitoring
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Nginx Monitoring
```bash
# Check logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Monitor connections
netstat -an | grep ESTABLISHED | wc -l
```

### 4. Set Up Monitoring Tools
```bash
# Install New Relic or DataDog for comprehensive monitoring
npm install newrelic

# Or use free Prometheus + Grafana
docker run -d -p 9090:9090 prom/prometheus
docker run -d -p 3000:3000 grafana/grafana
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### 1. Backend Health Check
```bash
# Test API endpoint
curl -X GET https://api.yourdomain.com/api/health

# Response should be: {"status":"ok"}
```

### 2. Frontend Verification
```bash
# Test homepage loads
curl -I https://yourdomain.com

# Verify API calls work
# Check browser console (no errors)
# Test login flow
# Test job search
```

### 3. Database Verification
```bash
# Connect and verify
psql -h localhost -U jobportal_user -d jobportal

# Run test query
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM jobs;
SELECT COUNT(*) FROM applications;
```

### 4. SSL Verification
```bash
# Check certificate
curl -I https://api.yourdomain.com

# Verify in browser (green lock icon)
# Check certificate expiration
```

### 5. Email Verification
```bash
# Test email sending
# Register new account
# Check email was received
# Verify OTP works
```

---

## 🆘 TROUBLESHOOTING

### Application Won't Start
```bash
# Check logs
pm2 logs jobportal-api

# Verify environment variables
env | grep DATABASE_URL

# Test database connection
psql -h localhost -U jobportal_user -d jobportal
```

### Database Connection Failed
```bash
# Check PostgreSQL running
sudo systemctl status postgresql

# Check credentials
psql -h localhost -U jobportal_user -W

# Check port 5432 open
netstat -tuln | grep 5432
```

### API Endpoints Not Working
```bash
# Check Nginx logs
tail -f /var/log/nginx/error.log

# Test backend directly
curl http://localhost:3000/api/health

# Check firewall
sudo ufw status
```

### High Memory Usage
```bash
# Check Node process
top -p $(pgrep -f 'npm start' | head -1)

# Check for memory leaks
# Review application logs
# Restart application
pm2 restart jobportal-api
```

---

## 📈 PERFORMANCE OPTIMIZATION

### 1. Database Optimization
```sql
-- Analyze queries
ANALYZE;

-- Recreate indexes
REINDEX TABLE jobs;
REINDEX TABLE applications;

-- Vacuum
VACUUM FULL;
```

### 2. Caching Strategy
```javascript
// Implement Redis for session caching
redis-server

// Cache frequently accessed data
// Cache API responses for 5 minutes
// Cache job listings
```

### 3. CDN Configuration
```bash
# Configure CloudFront for static assets
# Set cache headers in Nginx
add_header Cache-Control "public, max-age=3600" for *.js;
add_header Cache-Control "public, max-age=86400" for *.css;
add_header Cache-Control "public, max-age=604800" for *.jpg;
```

### 4. Load Balancing
```bash
# Scale backend to multiple instances
# Use Nginx load balancer
upstream backend {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}
```

---

## 📝 MAINTENANCE PROCEDURES

### Daily
- [ ] Monitor error logs
- [ ] Check application status
- [ ] Verify database connectivity

### Weekly
- [ ] Review performance metrics
- [ ] Check disk space
- [ ] Verify backups completed

### Monthly
- [ ] Update dependencies
- [ ] Review security logs
- [ ] Test disaster recovery
- [ ] Clean up old logs

### Quarterly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Database optimization
- [ ] Update SSL certificate if needed

---

## 🎯 PRODUCTION READINESS CHECKLIST

Final verification before going live:

- [ ] All tests passing (unit, integration, E2E)
- [ ] Zero compilation errors
- [ ] All 65 API endpoints working
- [ ] All 14 pages loading correctly
- [ ] Admin panel fully functional
- [ ] Database backup configured
- [ ] SSL/TLS certificates installed
- [ ] Monitoring configured
- [ ] Logging configured
- [ ] Firewall configured
- [ ] Rate limiting enabled
- [ ] Email system working
- [ ] CORS configured correctly
- [ ] Environment variables secured
- [ ] Performance tested and optimized
- [ ] Security audit passed
- [ ] Team trained on procedures
- [ ] Support plan documented
- [ ] Disaster recovery plan prepared
- [ ] Go-live date confirmed

---

## 📞 SUPPORT & ESCALATION

### Level 1: Monitoring Alerts
- Automated alerts via email/SMS
- Dashboard notifications
- PM2 process monitoring

### Level 2: Issue Response
- Check logs
- Verify health checks
- Check resource usage
- Review recent changes

### Level 3: Incident Response
- Scale resources if needed
- Failover to backup
- Rollback changes
- Notify users

---

**Document Version**: 1.0  
**Last Updated**: February 4, 2026  
**Status**: ✅ READY FOR PRODUCTION DEPLOYMENT  

---

**🎉 READY TO DEPLOY - ALL SYSTEMS GO! 🎉**
