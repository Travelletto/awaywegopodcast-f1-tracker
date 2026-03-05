// server.js - Away We Go Podcast F1 Prediction Tracker
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('./database');
const { generateLeaderboardImage } = require('./generateLeaderboardImage');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

app.get("/leaderboard-image.png", async (req, res) => {
  try {
    const buffer = await generateLeaderboardImage();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.send(buffer);
  } catch (err) {
    console.error('Leaderboard image generation error:', err);
    res.status(500).send('Failed to generate leaderboard image');
  }
});

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
  { name: 'Esteban Ocon', team: 'Haas' },
  { name: 'Oliver Bearman', team: 'Haas' },
  { name: 'Nico Hulkenberg', team: 'Audi' },
  { name: 'Gabriel Bortoleto', team: 'Audi' },
  { name: 'Yuki Tsunoda', team: 'Racing Bulls' },
  { name: 'Liam Lawson', team: 'Racing Bulls' },
  { name: 'Sergio Perez', team: 'Cadillac' },
  { name: 'Valtteri Bottas', team: 'Cadillac' }
];

const RACES = [
  { id: 1,  name: '🇦🇺 Australian Grand Prix',   location: 'Melbourne',   dates: 'Mar 6-8',    sprint: false, qualiLock: '2026-03-07T05:00:00Z' },
  { id: 2,  name: '🇨🇳 Chinese Grand Prix',       location: 'Shanghai',    dates: 'Mar 13-15',  sprint: true,  sprintQualiLock: '2026-03-13T07:00:00Z', qualiLock: '2026-03-14T07:00:00Z' },
  { id: 3,  name: '🇯🇵 Japanese Grand Prix',      location: 'Suzuka',      dates: 'Mar 27-29',  sprint: false, qualiLock: '2026-03-28T05:00:00Z' },
  { id: 4,  name: '🇧🇭 Bahrain Grand Prix',       location: 'Sakhir',      dates: 'Apr 10-12',  sprint: false, qualiLock: '2026-04-11T14:00:00Z' },
  { id: 5,  name: '🇸🇦 Saudi Arabian Grand Prix', location: 'Jeddah',      dates: 'Apr 17-19',  sprint: false, qualiLock: '2026-04-18T14:00:00Z' },
  { id: 6,  name: '🇺🇸 Miami Grand Prix',         location: 'Miami',       dates: 'May 1-3',    sprint: true,  sprintQualiLock: '2026-05-01T19:30:00Z', qualiLock: '2026-05-02T20:00:00Z' },
  { id: 7,  name: '🇨🇦 Canadian Grand Prix',      location: 'Montreal',    dates: 'May 22-24',  sprint: true,  sprintQualiLock: '2026-05-22T19:30:00Z', qualiLock: '2026-05-23T20:00:00Z' },
  { id: 8,  name: '🇲🇨 Monaco Grand Prix',        location: 'Monte Carlo', dates: 'Jun 5-7',    sprint: false, qualiLock: '2026-06-06T13:00:00Z' },
  { id: 9,  name: '🇪🇸 Spanish Grand Prix',       location: 'Barcelona',   dates: 'Jun 12-14',  sprint: false, qualiLock: '2026-06-13T13:00:00Z' },
  { id: 10, name: '🇦🇹 Austrian Grand Prix',      location: 'Spielberg',   dates: 'Jun 26-28',  sprint: false, qualiLock: '2026-06-27T13:00:00Z' },
  { id: 11, name: '🇬🇧 British Grand Prix',       location: 'Silverstone', dates: 'Jul 3-5',    sprint: true,  sprintQualiLock: '2026-07-03T13:30:00Z', qualiLock: '2026-07-04T14:00:00Z' },
  { id: 12, name: '🇧🇪 Belgian Grand Prix',       location: 'Spa',         dates: 'Jul 17-19',  sprint: false, qualiLock: '2026-07-18T13:00:00Z' },
  { id: 13, name: '🇭🇺 Hungarian Grand Prix',     location: 'Budapest',    dates: 'Jul 24-26',  sprint: false, qualiLock: '2026-07-25T13:00:00Z' },
  { id: 14, name: '🇳🇱 Dutch Grand Prix',         location: 'Zandvoort',   dates: 'Aug 21-23',  sprint: true,  sprintQualiLock: '2026-08-21T12:30:00Z', qualiLock: '2026-08-22T13:00:00Z' },
  { id: 15, name: '🇮🇹 Italian Grand Prix',       location: 'Monza',       dates: 'Sep 4-6',    sprint: false, qualiLock: '2026-09-05T13:00:00Z' },
  { id: 16, name: '🇪🇸 Madrid Grand Prix',        location: 'Madrid',      dates: 'Sep 11-13',  sprint: false, qualiLock: '2026-09-12T13:00:00Z' },
  { id: 17, name: '🇦🇿 Azerbaijan Grand Prix',    location: 'Baku',        dates: 'Sep 25-27',  sprint: false, qualiLock: '2026-09-26T11:00:00Z' },
  { id: 18, name: '🇸🇬 Singapore Grand Prix',     location: 'Singapore',   dates: 'Oct 9-11',   sprint: true,  sprintQualiLock: '2026-10-09T12:30:00Z', qualiLock: '2026-10-10T13:00:00Z' },
  { id: 19, name: '🇺🇸 United States Grand Prix', location: 'Austin',      dates: 'Oct 23-25',  sprint: false, qualiLock: '2026-10-24T20:00:00Z' },
  { id: 20, name: '🇲🇽 Mexican Grand Prix',       location: 'Mexico City', dates: 'Oct 30-Nov 1', sprint: false, qualiLock: '2026-10-31T22:00:00Z' },
  { id: 21, name: '🇧🇷 Brazilian Grand Prix',     location: 'Sao Paulo',   dates: 'Nov 6-8',    sprint: false, qualiLock: '2026-11-07T17:00:00Z' },
  { id: 22, name: '🇺🇸 Las Vegas Grand Prix',     location: 'Las Vegas',   dates: 'Nov 19-21',  sprint: false, qualiLock: '2026-11-21T05:00:00Z' },
  { id: 23, name: '🇶🇦 Qatar Grand Prix',         location: 'Lusail',      dates: 'Nov 27-29',  sprint: false, qualiLock: '2026-11-28T13:00:00Z' },
  { id: 24, name: '🇦🇪 Abu Dhabi Grand Prix',     location: 'Yas Marina',  dates: 'Dec 4-6',    sprint: false, qualiLock: '2026-12-05T12:00:00Z' }
];

// ── Email Helper (SendGrid) ──

async function sendPasswordResetEmail(email, resetToken, username, baseUrl) {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (!sendgridApiKey) {
    console.warn('SENDGRID_API_KEY not configured - password reset email not sent');
    return;
  }

  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  try {
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email }],
          subject: 'Reset Your F1 Tracker Password'
        }],
        from: {
          email: process.env.FROM_EMAIL || 'noreply@awaywegopodcast.com',
          name: 'Away We Go Podcast'
        },
        content: [{
          type: 'text/html',
          value: `
            <h2>Password Reset Request</h2>
            <p>Hi ${username},</p>
            <p>You requested to reset your password for the Away We Go Podcast F1 Prediction Tracker.</p>
            <p><a href="${resetUrl}" style="background: #E4002B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
            <p>Or copy this link: ${resetUrl}</p>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>– Away We Go Podcast Team</p>
          `
        }]
      })
    });
  } catch (err) {
    console.error('SendGrid error:', err.message);
  }
}

// ── Auth Middleware ──

function authMiddleware(req, res, next) {
  const token = req.cookies.f1tracker_token;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  const user = db.getUserByToken(token);
  if (!user) {
    res.clearCookie('f1tracker_token');
    return res.status(401).json({ error: 'Invalid session' });
  }
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

app.get('/api/data', (req, res) => {
  const results = db.getAllResults();
  const resultsMap = {};
  for (const r of results) {
    if (!resultsMap[r.race_id]) resultsMap[r.race_id] = {};
    resultsMap[r.race_id][r.result_type] = { p1: r.p1, p2: r.p2, p3: r.p3 };
  }
  const now = new Date();
  const racesWithStatus = RACES.map(race => {
    const raceResult = resultsMap[race.id];
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
  const { username, email, password, emailOptin } = req.body;

  if (!username || username.trim().length < 2 || username.trim().length > 30) {
    return res.status(400).json({ error: 'Username must be 2-30 characters' });
  }
  if (!/^[a-zA-Z0-9 _-]+$/.test(username.trim())) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, spaces, underscores, and hyphens' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existingUsername = db.getUserByUsername(username.trim());
  if (existingUsername) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const existingEmail = db.getUserByEmail(email);
  if (existingEmail) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  try {
    const token = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 12);
    db.createUser(username.trim(), email, passwordHash, token, emailOptin);
    const user = db.getUserByToken(token);

    res.cookie('f1tracker_token', token, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    // Sync to MailerLite immediately if user opted in with an email
    if (email && emailOptin) {
      syncUserToMailerLite({ email, username: username.trim() }, null)
        .catch(err => console.error('MailerLite signup sync error:', err.message));
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      emailOptin: !!user.email_optin
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.post('/api/login', (req, res) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: 'Email/username and password required' });
  }

  let user = db.getUserByEmail(emailOrUsername);
  if (!user) {
    user = db.getUserByUsername(emailOrUsername);
  }

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.cookie('f1tracker_token', user.token, {
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
});

app.get('/api/me', (req, res) => {
  const token = req.cookies.f1tracker_token;
  if (!token) return res.json({ user: null });
  const user = db.getUserByToken(token);
  if (!user) {
    res.clearCookie('f1tracker_token');
    return res.json({ user: null });
  }
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      emailOptin: !!user.email_optin
    }
  });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('f1tracker_token');
  res.json({ ok: true });
});

app.put('/api/me/email', authMiddleware, (req, res) => {
  const { email, emailOptin } = req.body;
  if (email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    db.updateUserEmail(req.user.id, email, emailOptin);
  } else {
    db.updateUserEmailOptin(req.user.id, emailOptin);
  }

  // Sync to MailerLite if user opted in with an email
  const updatedEmail = email || req.user.email;
  const updatedOptin = emailOptin !== undefined ? emailOptin : req.user.email_optin;
  if (updatedEmail && updatedOptin) {
    const leaderboard = db.calculateLeaderboard();
    const stats = leaderboard.find(l => l.userId === req.user.id);
    syncUserToMailerLite({ email: updatedEmail, username: req.user.username }, stats)
      .catch(err => console.error('MailerLite email update sync error:', err.message));
  }

  res.json({ ok: true });
});

// ── Password Reset ──

app.post('/api/password-reset/request', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.json({ ok: true, message: 'If that email exists, a reset link has been sent' });
  }

  db.deleteExpiredResetTokens();

  const resetToken = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.createPasswordResetToken(user.id, resetToken, expiresAt);

  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  sendPasswordResetEmail(user.email, resetToken, user.username, baseUrl).catch(err => {
    console.error('Email send error:', err);
  });

  res.json({ ok: true, message: 'If that email exists, a reset link has been sent' });
});

app.post('/api/password-reset/confirm', (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const resetToken = db.getPasswordResetToken(token);
  if (!resetToken) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 12);
  db.updateUserPassword(resetToken.user_id, passwordHash);
  db.markTokenAsUsed(token);

  res.json({ ok: true, message: 'Password updated successfully' });
});

// ── Predictions ──

app.post('/api/predictions/:raceId', authMiddleware, (req, res) => {
  const raceId = parseInt(req.params.raceId, 10);
  const { type, p1, p2, p3 } = req.body;
  const race = RACES.find(r => r.id === raceId);
  if (!race) return res.status(404).json({ error: 'Race not found' });
  if (type !== 'race' && type !== 'sprint') {
    return res.status(400).json({ error: 'Invalid prediction type' });
  }
  if (type === 'sprint' && !race.sprint) {
    return res.status(400).json({ error: 'This race does not have a sprint' });
  }
  const now = new Date();
  if (type === 'race' && new Date(race.qualiLock) <= now) {
    return res.status(403).json({ error: 'Predictions are locked for this race' });
  }
  if (type === 'sprint' && new Date(race.sprintQualiLock) <= now) {
    return res.status(403).json({ error: 'Sprint predictions are locked for this race' });
  }
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

app.get('/api/predictions/:raceId', authMiddleware, (req, res) => {
  const raceId = parseInt(req.params.raceId, 10);
  const racePred = db.getUserPrediction(req.user.id, raceId, 'race');
  const sprintPred = db.getUserPrediction(req.user.id, raceId, 'sprint');
  res.json({ race: racePred || null, sprint: sprintPred || null });
});

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

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const envUsername = process.env.ADMIN_USERNAME || 'admin';
  const envPassword = process.env.ADMIN_PASSWORD;

  if (username === envUsername && password === envPassword && envPassword) {
    try {
      const hash = bcrypt.hashSync(password, 12);
      db.createAdmin(username, hash);
      const admin = db.getAdmin(username);
      if (!admin) {
        return res.status(500).json({ error: 'Admin creation failed' });
      }
      db.deleteExpiredAdminSessions();
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      db.createAdminSession(admin.id, token, expiresAt);
      res.cookie('f1tracker_admin', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      return res.json({ ok: true, username: admin.username });
    } catch (err) {
      console.error('Admin login error:', err);
      return res.status(500).json({ error: 'Login failed: ' + err.message });
    }
  }

  const admin = db.getAdmin(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  db.deleteExpiredAdminSessions();
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

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('f1tracker_admin');
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => {
  const token = req.cookies.f1tracker_admin;
  if (!token) return res.json({ admin: null });
  const session = db.getAdminSession(token);
  if (!session) return res.json({ admin: null });
  res.json({ admin: { id: session.admin_id } });
});

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
  updateMailerLite().catch(err => console.error('MailerLite update error:', err));
  generateLeaderboardImage().catch(err => console.error('Leaderboard image error:', err));
  res.json({ ok: true });
});

app.get('/api/admin/users', adminAuthMiddleware, (req, res) => {
  const users = db.getAllUsers();
  res.json({ users });
});

app.get('/api/admin/predictions/:raceId', adminAuthMiddleware, (req, res) => {
  const raceId = parseInt(req.params.raceId, 10);
  const racePreds = db.getRacePredictions(raceId, 'race');
  const sprintPreds = db.getRacePredictions(raceId, 'sprint');
  const missingRace = db.getUsersWithoutPrediction(raceId, 'race');
  const missingSprint = db.getUsersWithoutPrediction(raceId, 'sprint');
  res.json({ race: racePreds, sprint: sprintPreds, missingRace, missingSprint });
});

app.get('/api/admin/leaderboard', adminAuthMiddleware, (req, res) => {
  const leaderboard = db.calculateLeaderboard();
  res.json({ leaderboard });
});

// ── MailerLite Integration ──

// Sync a single user to MailerLite (called on signup and email update)
async function syncUserToMailerLite(user, stats) {
  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_GROUP_ID;
  if (!apiKey) return;
  if (!user.email) return;

  const body = {
    email: user.email,
    fields: {
      name: user.username,
      f1_points: String(stats?.totalPoints ?? 0),
      f1_rank: String(stats?.rank ?? '-')
    }
  };
  if (groupId) {
    body.groups = [groupId];
  }

  const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`MailerLite API ${response.status}: ${errBody}`);
  }
}

// Sync all opted-in users to MailerLite (called after results entry)
async function updateMailerLite() {
  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) return;

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
      await syncUserToMailerLite(user, stats);
    } catch (err) {
      console.error(`MailerLite update failed for ${user.username}:`, err.message);
    }
  }
}

app.post('/api/admin/mailerlite-sync', adminAuthMiddleware, async (req, res) => {
  try {
    await updateMailerLite();
    res.json({ ok: true, message: 'MailerLite sync complete' });
  } catch (err) {
    res.status(500).json({ error: 'MailerLite sync failed: ' + err.message });
  }
});

app.post('/api/mailerlite/webhook', (req, res) => {
  const webhookSecret = process.env.MAILERLITE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const provided = req.headers['x-webhook-secret'] || req.body.secret;
    if (provided !== webhookSecret) {
      return res.status(403).json({ error: 'Invalid webhook secret' });
    }
  }
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
  generateLeaderboardImage().catch(err => console.error('Leaderboard image (startup):', err));
});
