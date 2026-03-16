# Away We Go Podcast - Predict the Podium 2026

A web-based prediction game for the 2026 Formula 1 season. Users pick their predicted podium (P1, P2, P3) for each race and score points for correct predictions.

## Features

- **Username-only signup** (cookie-based sessions, no passwords)
- **Predict P1-P3** for every race and sprint weekend
- **Auto-locking** predictions before qualifying starts
- **Live leaderboard** with sorting and ranking
- **Sprint support** for all 6 sprint weekends
- **Admin panel** to enter results and manage the competition
- **MailerLite integration** for email reminders
- **Responsive design** (mobile-friendly)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and set your desired `PORT` (default: 3000).

### 3. Set Up Admin Account

```bash
node setup-admin.js admin YourSecurePassword123
```

Replace `admin` with your preferred admin username and choose a strong password (min 8 characters).

### 4. Start the Server

```bash
npm start
```

The app runs at `http://localhost:3000` and the admin panel at `http://localhost:3000/admin`.

For development with auto-restart on file changes:

```bash
npm run dev
```

## Hosting on WordPress/Shared Hosting

This app requires **Node.js 18+**. Most shared WordPress hosts don't support Node.js natively. Here are your options:

### Option A: VPS or Cloud Hosting (Recommended)

Use a VPS provider (DigitalOcean, Linode, Vultr, etc.) or a platform like Railway, Render, or Fly.io.

1. Upload the project files to your server
2. Run `npm install --production`
3. Create `.env` file and set up admin account
4. Use a process manager to keep it running:

```bash
# Install PM2 globally
npm install -g pm2

# Start the app
pm2 start server.js --name f1-tracker

# Auto-start on server reboot
pm2 save
pm2 startup
```

5. Set up a reverse proxy with Nginx:

```nginx
server {
    listen 80;
    server_name f1.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option B: cPanel with Node.js Support

Some shared hosts (A2 Hosting, SiteGround, etc.) offer Node.js support through cPanel:

1. Upload project files via File Manager or FTP
2. Go to cPanel > Setup Node.js App
3. Set Node.js version to 18+
4. Set the application root to your upload directory
5. Set startup file to `server.js`
6. Run `npm install` via the cPanel terminal
7. Create `.env` and run `node setup-admin.js`

### Option C: Embed in WordPress via iframe

If you host the Node.js app on a separate server, embed it on your WordPress site:

```html
<iframe src="https://f1.yourdomain.com" width="100%" height="800" frameborder="0"></iframe>
```

Or use a WordPress plugin like "Advanced iFrame" for better integration.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Set to `production` for live deployment |
| `MAILERLITE_API_KEY` | No | MailerLite API key for email integration |
| `MAILERLITE_GROUP_ID` | No | MailerLite subscriber group ID |
| `MAILERLITE_WEBHOOK_SECRET` | No | Secret key for webhook endpoint security |

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/data` | Season data (teams, drivers, calendar with results/lock status) |
| `POST` | `/api/signup` | Create account `{ username, email?, emailOptin? }` |
| `GET` | `/api/me` | Get current user from cookie |
| `POST` | `/api/logout` | Clear session cookie |
| `PUT` | `/api/me/email` | Update email settings `{ email, emailOptin }` |
| `POST` | `/api/predictions/:raceId` | Submit prediction `{ type, p1, p2, p3 }` |
| `GET` | `/api/predictions/:raceId` | Get user's prediction for a race |
| `GET` | `/api/my-predictions` | Get all user's predictions |
| `GET` | `/api/leaderboard` | Get public leaderboard |

### Admin (requires admin session cookie)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/login` | Admin login `{ username, password }` |
| `POST` | `/api/admin/logout` | Admin logout |
| `GET` | `/api/admin/me` | Check admin session |
| `POST` | `/api/admin/results/:raceId` | Enter results `{ type, p1, p2, p3 }` |
| `GET` | `/api/admin/users` | List all users |
| `GET` | `/api/admin/predictions/:raceId` | View all predictions for a race |
| `GET` | `/api/admin/leaderboard` | Get leaderboard (admin view) |
| `POST` | `/api/admin/mailerlite-sync` | Manually sync subscriber data to MailerLite |

### MailerLite Webhook

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/mailerlite/webhook` | Returns user stats `{ email }` |

## MailerLite Integration

### Setup

1. Get your API key from [MailerLite Dashboard](https://dashboard.mailerlite.com/integrations/api)
2. Optionally create a subscriber group and note the group ID
3. Add both values to your `.env` file:

```
MAILERLITE_API_KEY=your-api-key-here
MAILERLITE_GROUP_ID=your-group-id
```

### How It Works

- When users sign up with an email and opt in to reminders, their data is queued
- After the admin enters race results, all opted-in subscribers are automatically synced to MailerLite
- Custom fields sent to MailerLite: `name`, `f1_points`, `f1_rank`
- Admin can manually trigger a sync from the Leaderboard tab

### Webhook Endpoint

External services can query user stats:

```bash
curl -X POST https://your-domain.com/api/mailerlite/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret" \
  -d '{"email": "user@example.com"}'
```

Response:

```json
{
  "username": "JohnDoe",
  "email": "user@example.com",
  "totalPoints": 125,
  "rank": 3
}
```

## Points System

### Race Predictions

| Position | Points |
|----------|--------|
| P1 match | 25 |
| P2 match | 18 |
| P3 match | 15 |

### Sprint Predictions

| Position | Points |
|----------|--------|
| P1 match | 8 |
| P2 match | 7 |
| P3 match | 6 |

## Prediction Lock Times

- **Regular races**: Predictions lock 1 hour before Saturday qualifying
- **Sprint weekends**: Sprint predictions lock before Sprint Qualifying (Friday); race predictions lock before main Qualifying (Saturday)

## File Structure

```
├── server.js           # Express server with all API routes
├── database.js         # SQLite database setup and queries
├── setup-admin.js      # Admin account creation script
├── package.json        # Dependencies and scripts
├── .env.example        # Environment variable template
├── .gitignore
├── README.md
├── data/               # SQLite database (auto-created)
│   └── f1tracker.db
└── public/             # Frontend static files
    ├── index.html      # Main single-page application
    ├── admin.html      # Admin panel
    ├── css/
    │   └── style.css   # All styles (F1 red/black theme)
    └── js/
        ├── app.js      # Main frontend logic
        └── admin.js    # Admin panel logic
```

## Admin Workflow

After each race weekend:

1. Go to `/admin` and log in
2. Select the race from the dropdown
3. Use the driver dropdowns to select P1, P2, P3 for the race result
4. For sprint weekends, enter the sprint result separately
5. Click "Save Result" - points auto-calculate and the leaderboard updates instantly
6. Optionally click "Sync MailerLite" to update subscriber data

## 2026 Season

- **24 races** (March-December 2026)
- **6 sprint weekends**: China, Miami, Canada, Britain, Netherlands, Singapore
- **22 drivers** across 11 teams
