// server.js - Away We Go Podcast F1 Prediction Tracker
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database on startup
db.getDb();

// ── F1 2026 Season Data ──

const TEAMS = [
  { name: 'Red Bull', color: '#1E5BC6' },
  { name: 'McLaren', color: '#FF8000' },
  { name: 'Ferrari', color: '#E4002B' },
  { name: 'Mercedes', color: '#00A19B' },
  { name: 'Aston Martin', color: '#115845' },
  { name: 'Alpine', color: '#F282B4' },
  { name: 'Williams', color: '#002B5C' },
  { name: 'Haas', color: '#FFFFFF' },
  { name: 'Audi', color: '#6D6D6D' },
  { name: 'Racing Bulls', color: '#4781D7' },
  { name: 'Cadillac', color: '#000000' }
];

const DRIVERS = [
  { name: 'Max Verstappen', team: 'Red Bull' },
  { name: 'Isack Hadjar', team: 'Red Bull' },
  { name: 'Lando Norris', team: 'McLaren' },
  { name: 'Oscar Piastri', team: 'McLaren' },
  { name: 'Charles Leclerc', team: 'Ferrari' },
  { name: 'Lewis Hamilton', team: 'Ferrari' },
  { name: 'George Russell', team: 'Mercedes' },
  { name: 'Kimi Antonelli', team: 'Mercedes' },
  { name: 'Fernando Alonso', team: 'Aston Martin' },
  { name: 'Lance Stroll', team: 'Aston Martin' },
  { name: 'Pierre Gasly', team: 'Alpine' },
  { name: 'Franco Colapinto', team: 'Alpine' },
  { name: 'Carlos Sainz', team: 'Williams' },
  { name: 'Alexander Albon', team: 'Williams' },
  { name: 'Nico Hulkenberg', team: 'Audi' },
  { name: 'Gabriel Bortoleto', team: 'Audi' },
  { name: 'Esteban Ocon', team: 'Haas' },
  { name: 'Oliver Bearman', team: 'Haas' },
  { name: 'Yuki Tsunoda', team: 'Racing Bulls' },
  { name: 'Liam Lawson', team: 'Racing Bulls' },
  { name: 'Sergio Perez', team: 'Cadillac' },
  { name: 'Valtteri Bottas', team: 'Cadillac' }
];

// 2026 F1 Calendar with lock times (UTC)
// For regular races: qualifying is Saturday afternoon, lock = 1h before quali
// For sprint weekends: sprint quali is Friday, main quali is Saturday
// Sprint format: Fri (FP1 + Sprint Quali), Sat (Sprint + Quali), Sun (Race)
const RACES = [
  { id: 1,  name: 'Australian GP',       location: 'Melbourne',   dates: 'Mar 6-8',    sprint: false, qualiLock: '2026-03-07T05:00:00Z' },
  { id: 2,  name: 'Chinese GP',          location: 'Shanghai',    dates: 'Mar 13-15',  sprint: true,  sprintQualiLock: '2026-03-13T07:00:00Z', qualiLock: '2026-03-14T07:00:00Z' },
  { id: 3,  name: 'Japanese GP',         location: 'Suzuka',      dates: 'Mar 27-29',  sprint: false, qualiLock: '2026-03-28T05:00:00Z' },
  { id: 4,  name: 'Bahrain GP',          location: 'Sakhir',      dates: 'Apr 10-12',  sprint: false, qualiLock: '2026-04-11T14:00:00Z' },
  { id: 5,  name: 'Saudi Arabian GP',    location: 'Jeddah',      dates: 'Apr 17-19',  sprint: false, qualiLock: '2026-04-18T14:00:00Z' },
  { id: 6,  name: 'Miami GP',            location: 'Miami',       dates: 'May 1-3',    sprint: true,  sprintQualiLock: '2026-05-01T19:30:00Z', qualiLock: '2026-05-02T20:00:00Z' },
  { id: 7,  name: 'Canadian GP',         location: 'Montreal',    dates: 'May 22-24',  sprint: true,  sprintQualiLock: '2026-05-22T19:30:00Z', qualiLock: '2026-05-23T20:00:00Z' },
  { id: 8,  name: 'Monaco GP',           location: 'Monte Carlo', dates: 'Jun 5-7',    sprint: false, qualiLock: '2026-06-06T13:00:00Z' },
  { id: 9,  name: 'Barcelona-Catalunya GP', location: 'Barcelona', dates: 'Jun 12-14', sprint: false, qualiLock: '2026-06-13T13:00:00Z' },
  { id: 10, name: 'Austrian GP',         location: 'Spielberg',   dates: 'Jun 26-28',  sprint: false, qualiLock: '2026-06-27T13:00:00Z' },
  { id: 11, name: 'British GP',          location: 'Silverstone', dates: 'Jul 3-5',    sprint: true,  sprintQualiLock: '2026-07-03T13:30:00Z', qualiLock: '2026-07-04T14:00:00Z' },
  { id: 12, name: 'Belgian GP',          location: 'Spa',         dates: 'Jul 17-19',  sprint: false, qualiLock: '2026-07-18T13:00:00Z' },
  { id: 13, name: 'Hungarian GP',        location: 'Budapest',    dates: 'Jul 24-26',  sprint: false, qualiLock: '2026-07-25T13:00:00Z' },
  { id: 14, name: 'Dutch GP',            location: 'Zandvoort',   dates: 'Aug 21-23',  sprint: true,  sprintQualiLock: '2026-08-21T12:30:00Z', qualiLock: '2026-08-22T13:00:00Z' },
  { id: 15, name: 'Italian GP',          location: 'Monza',       dates: 'Sep 4-6',    sprint: false, qualiLock: '2026-09-05T13:00:00Z' },
  { id: 16, name: 'Madrid GP',           location: 'Madrid',      dates: 'Sep 11-13',  sprint: false, qualiLock: '2026-09-12T13:00:00Z' },
  { id: 17, name: 'Azerbaijan GP',       location: 'Baku',        dates: 'Sep 25-27',  sprint: false, qualiLock: '2026-09-26T11:00:00Z' },
  { id: 18, name: 'Singapore GP',        location: 'Singapore',   dates: 'Oct 9-11',   sprint: true,  sprintQualiLock: '2026-10-09T12:30:00Z', qualiLock: '2026-10-10T13:00:00Z' },
  { id: 19, name: 'United States GP',    location: 'Austin',      dates: 'Oct 23-25',  sprint: false, qualiLock: '2026-10-24T20:00:00Z' },
  { id: 20, name: 'Mexican GP',          location: 'Mexico City', dates: 'Oct 30-Nov 1', sprint: false, qualiLock: '2026-10-31T22:00:00Z' },
  { id: 21, name: 'Brazilian GP',        location: 'Sao Paulo',   dates: 'Nov 6-8',    sprint: false, qualiLock: '2026-11-07T17:00:00Z' },
  { id: 22, name: 'Las Vegas GP',        location: 'Las Vegas',   dates: 'Nov 19-21',  sprint: false, qualiLock: '2026-11-21T05:00:00Z' },
  { id: 23, name: 'Qatar GP',            location: 'Lusail',      dates: 'Nov 27-29',  sprint: false, qualiLock: '2026-11-28T13:00:00Z' },
  { id: 24, name: 'Abu Dhabi GP',        location: 'Yas Marina',  dates: 'Dec 4-6',    sprint: false, qualiLock: '2026-12-05T12:00:00Z' }
];

// ── Auth Middleware ──

function authMiddleware(req, res, next) {
  const token = req.cookies.f1tracker_token;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  const user = db.getUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid session' });
  req.user = user;
  next();
}

function adminAuthMiddleware(req, res, next) {
  const token = req.cookies.f1tracker_admin;
  if (!token) return res.status(401).json({ error: 'Admin login required' });
  const session = db.getAdminSession(token);
  if (!session) return res.status(401).json({ error: 'Admin session expired' });
  req.adminId = session.admin_id;
  next();
}

// ── Public API Routes ──

// Get F1 season data (drivers, teams, calendar)
app.get('/api/data', (req, res) => {
  const results = db.getAllResults();
  const resultsMap = {};
  for (const r of results) {
    if (!resultsMap[r.race_id]) resultsMap[r.race_id] = {};
    resultsMap[r.race_id][r.result_type] = { p1: r.p1, p2: r.p2, p3: r.p3 };
  }

  const racesWithStatus = RACES.map(race => {
    const now = new Date();
    const raceResult = resultsMap[race.id];

    // Determine lock status
    const raceLocked = new Date(race.qualiLock) <= now;
    let sprintLocked = false;
    if (race.sprint) {
      sprintLocked = new Date(race.sprintQualiLock) <= now;
    }

    return {
      ...race,
      raceLocked,
      sprintLocked,
      raceResult: raceResult?.race || null,
      sprintResult: raceResult?.sprint || null
    };
  });

  res.json({ teams: TEAMS, drivers: DRIVERS, races: racesWithStatus });
});

// ── User Auth ──

app.post('/api/signup', (req, res) => {
  const { username, email, emailOptin } = req.body;
  if (!username || username.trim().length < 2 || username.trim().length > 30) {
    return res.status(400).json({ error: 'Username must be 2-30 characters' });
  }

  // Validate username format: alphanumeric, spaces, underscores, hyphens
  if (!/^[a-zA-Z0-9 _-]+$/.test(username.trim())) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, spaces, underscores, and hyphens' });
  }

  // Check if username already exists
  const existing = db.getUserByUsername(username.trim());
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  // Validate email if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const token = uuidv4();
  try {
    db.createUser(username.trim(), token, email, emailOptin);
    const user = db.getUserByToken(token);

    // Set cookie that lasts 1 year
    res.cookie('f1tracker_token', token, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      emailOptin: !!user.email_optin
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Get current user
app.get('/api/me', (req, res) => {
  const token = req.cookies.f1tracker_token;
  if (!token) return res.json({ user: null });
  const user = db.getUserByToken(token);
  if (!user) return res.json({ user: null });
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      emailOptin: !!user.email_optin
    }
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('f1tracker_token');
  res.json({ ok: true });
});

// Update email preferences
app.put('/api/me/email', authMiddleware, (req, res) => {
  const { email, emailOptin } = req.body;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  db.updateUserEmail(req.user.id, email, emailOptin);
  res.json({ ok: true });
});

// ── Predictions ──

// Submit or update prediction
app.post('/api/predictions/:raceId', authMiddleware, (req, res) => {
  const raceId = parseInt(req.params.raceId, 10);
  const { type, p1, p2, p3 } = req.body;

  // Validate race exists
  const race = RACES.find(r => r.id === raceId);
  if (!race) return res.status(404).json({ error: 'Race not found' });

  // Validate prediction type
  if (type !== 'race' && type !== 'sprint') {
    return res.status(400).json({ error: 'Invalid prediction type' });
  }

  // Sprint predictions only for sprint weekends
  if (type === 'sprint' && !race.sprint) {
    return res.status(400).json({ error: 'This race does not have a sprint' });
  }

  // Check lock time
  const now = new Date();
  if (type === 'race' && new Date(race.qualiLock) <= now) {
    return res.status(403).json({ error: 'Predictions are locked for this race' });
  }
  if (type === 'sprint' && new Date(race.sprintQualiLock) <= now) {
    return res.status(403).json({ error: 'Sprint predictions are locked for this race' });
  }

  // Validate drivers
  const driverNames = DRIVERS.map(d => d.name);
  if (!p1 || !p2 || !p3) {
    return res.status(400).json({ error: 'Must select P1, P2, and P3' });
  }
  if (!driverNames.includes(p1) || !driverNames.includes(p2) || !driverNames.includes(p3)) {
    return res.status(400).json({ error: 'Invalid driver selection' });
  }
  if (p1 === p2 || p1 === p3 || p2 === p3) {
    return res.status(400).json({ error: 'Each position must be a different driver' });
  }

  db.upsertPrediction(req.user.id, raceId, type, p1, p2, p3);
  res.json({ ok: true });
});

// Get current user's predictions for a race
app.get('/api/predictions/:raceId', authMiddleware, (req, res) => {
  const raceId = parseInt(req.params.raceId, 10);
  const racePred = db.getUserPrediction(req.user.id, raceId, 'race');
  const sprintPred = db.getUserPrediction(req.user.id, raceId, 'sprint');
  res.json({ race: racePred || null, sprint: sprintPred || null });
});

// Get all of current user's predictions
app.get('/api/my-predictions', authMiddleware, (req, res) => {
  const predictions = db.getUserPredictions(req.user.id);
  res.json({ predictions });
});

// ── Leaderboard ──

app.get('/api/leaderboard', (req, res) => {
  const leaderboard = db.calculateLeaderboard();
  res.json({ leaderboard });
});

// ── Admin Routes ──

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const admin = db.getAdmin(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Clean up expired sessions
  db.deleteExpiredAdminSessions();

  // Create admin session (24 hours)
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.createAdminSession(admin.id, token, expiresAt);

  res.cookie('f1tracker_admin', token, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  res.json({ ok: true, username: admin.username });
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('f1tracker_admin');
  res.json({ ok: true });
});

// Check admin session
app.get('/api/admin/me', (req, res) => {
  const token = req.cookies.f1tracker_admin;
  if (!token) return res.json({ admin: null });
  const session = db.getAdminSession(token);
  if (!session) return res.json({ admin: null });
  res.json({ admin: { id: session.admin_id } });
});

// Enter/update race results
app.post('/api/admin/results/:raceId', adminAuthMiddleware, (req, res) => {
  const raceId = parseInt(req.params.raceId, 10);
  const { type, p1, p2, p3 } = req.body;

  const race = RACES.find(r => r.id === raceId);
  if (!race) return res.status(404).json({ error: 'Race not found' });

  if (type !== 'race' && type !== 'sprint') {
    return res.status(400).json({ error: 'Invalid result type' });
  }
  if (type === 'sprint' && !race.sprint) {
    return res.status(400).json({ error: 'This race does not have a sprint' });
  }

  const driverNames = DRIVERS.map(d => d.name);
  if (!driverNames.includes(p1) || !driverNames.includes(p2) || !driverNames.includes(p3)) {
    return res.status(400).json({ error: 'Invalid driver selection' });
  }
  if (p1 === p2 || p1 === p3 || p2 === p3) {
    return res.status(400).json({ error: 'Each position must be a different driver' });
  }

  db.upsertResult(raceId, type, p1, p2, p3);

  // Trigger MailerLite update if configured
  updateMailerLite().catch(err => console.error('MailerLite update error:', err));

  res.json({ ok: true });
});

// Get all users and their predictions
app.get('/api/admin/users', adminAuthMiddleware, (req, res) => {
  const users = db.getAllUsers();
  res.json({ users });
});

// Get all predictions for a specific race
app.get('/api/admin/predictions/:raceId', adminAuthMiddleware, (req, res) => {
  const raceId = parseInt(req.params.raceId, 10);
  const racePreds = db.getRacePredictions(raceId, 'race');
  const sprintPreds = db.getRacePredictions(raceId, 'sprint');
  res.json({ race: racePreds, sprint: sprintPreds });
});

// Get full leaderboard (admin version with extra detail)
app.get('/api/admin/leaderboard', adminAuthMiddleware, (req, res) => {
  const leaderboard = db.calculateLeaderboard();
  res.json({ leaderboard });
});

// ── MailerLite Integration ──

async function updateMailerLite() {
  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_GROUP_ID;
  if (!apiKey) return; // MailerLite not configured, skip silently

  const users = db.getEmailOptInUsers();
  if (users.length === 0) return;

  const leaderboard = db.calculateLeaderboard();
  const leaderboardMap = {};
  for (const entry of leaderboard) {
    leaderboardMap[entry.userId] = entry;
  }

  for (const user of users) {
    const stats = leaderboardMap[user.id] || { totalPoints: 0, rank: '-' };
    try {
      const body = {
        email: user.email,
        fields: {
          name: user.username,
          f1_points: String(stats.totalPoints),
          f1_rank: String(stats.rank)
        }
      };
      if (groupId) {
        body.groups = [groupId];
      }

      await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });
    } catch (err) {
      console.error(`MailerLite update failed for ${user.username}:`, err.message);
    }
  }
}

// Manual MailerLite sync endpoint (admin only)
app.post('/api/admin/mailerlite-sync', adminAuthMiddleware, async (req, res) => {
  try {
    await updateMailerLite();
    res.json({ ok: true, message: 'MailerLite sync complete' });
  } catch (err) {
    res.status(500).json({ error: 'MailerLite sync failed: ' + err.message });
  }
});

// MailerLite webhook endpoint for external integrations
app.post('/api/mailerlite/webhook', (req, res) => {
  // Verify webhook secret if configured
  const webhookSecret = process.env.MAILERLITE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const provided = req.headers['x-webhook-secret'] || req.body.secret;
    if (provided !== webhookSecret) {
      return res.status(403).json({ error: 'Invalid webhook secret' });
    }
  }

  // Return current leaderboard data for the requested user
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const leaderboard = db.calculateLeaderboard();
  const allUsers = db.getAllUsers();
  const user = allUsers.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const stats = leaderboard.find(l => l.userId === user.id) || { totalPoints: 0, rank: '-' };
  res.json({
    username: user.username,
    email: user.email,
    totalPoints: stats.totalPoints,
    rank: stats.rank
  });
});

// ── Serve Frontend ──

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// SPA catch-all - serve index.html for any unmatched routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ──

app.listen(PORT, () => {
  console.log(`F1 Prediction Tracker running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
