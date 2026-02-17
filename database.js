// database.js - SQLite database initialization and helper queries
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'f1tracker.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      email_optin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      race_id INTEGER NOT NULL,
      prediction_type TEXT NOT NULL CHECK(prediction_type IN ('race', 'sprint')),
      p1 TEXT NOT NULL,
      p2 TEXT NOT NULL,
      p3 TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, race_id, prediction_type),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      race_id INTEGER NOT NULL,
      result_type TEXT NOT NULL CHECK(result_type IN ('race', 'sprint')),
      p1 TEXT NOT NULL,
      p2 TEXT NOT NULL,
      p3 TEXT NOT NULL,
      entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(race_id, result_type)
    );
    
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admin(id)
    );
    
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
    CREATE INDEX IF NOT EXISTS idx_predictions_race ON predictions(race_id);
    CREATE INDEX IF NOT EXISTS idx_results_race ON results(race_id);
    CREATE INDEX IF NOT EXISTS idx_reset_tokens ON password_reset_tokens(token);
  `);
}

// ── User queries ──

function createUser(username, email, passwordHash, token, emailOptin) {
  const stmt = db.prepare(
    'INSERT INTO users (username, email, password_hash, token, email_optin) VALUES (?, ?, ?, ?, ?)'
  );
  return stmt.run(username, email, passwordHash, token, emailOptin ? 1 : 0);
}

function getUserByToken(token) {
  return db.prepare('SELECT * FROM users WHERE token = ?').get(token);
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
}

function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function updateUserEmail(userId, email, emailOptin) {
  return db.prepare('UPDATE users SET email = ?, email_optin = ? WHERE id = ?')
    .run(email, emailOptin ? 1 : 0, userId);
}

function updateUserPassword(userId, passwordHash) {
  return db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(passwordHash, userId);
}

function getAllUsers() {
  return db.prepare('SELECT id, username, email, email_optin, created_at FROM users ORDER BY username').all();
}

// ── Password Reset Tokens ──

function createPasswordResetToken(userId, token, expiresAt) {
  const stmt = db.prepare(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
  );
  return stmt.run(userId, token, expiresAt);
}

function getPasswordResetToken(token) {
  return db.prepare(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP'
  ).get(token);
}

function markTokenAsUsed(token) {
  return db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE token = ?').run(token);
}

function deleteExpiredResetTokens() {
  return db.prepare('DELETE FROM password_reset_tokens WHERE expires_at <= CURRENT_TIMESTAMP OR used = 1').run();
}

// ── Prediction queries ──

function upsertPrediction(userId, raceId, type, p1, p2, p3) {
  const stmt = db.prepare(`
    INSERT INTO predictions (user_id, race_id, prediction_type, p1, p2, p3)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, race_id, prediction_type)
    DO UPDATE SET p1 = excluded.p1, p2 = excluded.p2, p3 = excluded.p3, updated_at = CURRENT_TIMESTAMP
  `);
  return stmt.run(userId, raceId, type, p1, p2, p3);
}

function getUserPrediction(userId, raceId, type) {
  return db.prepare(
    'SELECT * FROM predictions WHERE user_id = ? AND race_id = ? AND prediction_type = ?'
  ).get(userId, raceId, type);
}

function getUserPredictions(userId) {
  return db.prepare('SELECT * FROM predictions WHERE user_id = ? ORDER BY race_id').all(userId);
}

function getRacePredictions(raceId, type) {
  return db.prepare(`
    SELECT p.*, u.username FROM predictions p
    JOIN users u ON p.user_id = u.id
    WHERE p.race_id = ? AND p.prediction_type = ?
    ORDER BY u.username
  `).all(raceId, type);
}

// ── Results queries ──

function upsertResult(raceId, type, p1, p2, p3) {
  const stmt = db.prepare(`
    INSERT INTO results (race_id, result_type, p1, p2, p3)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(race_id, result_type)
    DO UPDATE SET p1 = excluded.p1, p2 = excluded.p2, p3 = excluded.p3, entered_at = CURRENT_TIMESTAMP
  `);
  return stmt.run(raceId, type, p1, p2, p3);
}

function getResult(raceId, type) {
  return db.prepare('SELECT * FROM results WHERE race_id = ? AND result_type = ?').get(raceId, type);
}

function getAllResults() {
  return db.prepare('SELECT * FROM results ORDER BY race_id').all();
}

// ── Leaderboard calculation ──

const RACE_POINTS = { p1: 25, p2: 18, p3: 15 };
const SPRINT_POINTS = { p1: 8, p2: 7, p3: 6 };

function calculateLeaderboard() {
  const users = db.prepare('SELECT id, username FROM users ORDER BY username').all();
  const results = getAllResults();
  const predictions = db.prepare('SELECT * FROM predictions').all();
  
  // Build a results lookup: { `${race_id}_${result_type}`: { p1, p2, p3 } }
  const resultsMap = {};
  for (const r of results) {
    resultsMap[`${r.race_id}_${r.result_type}`] = r;
  }
  
  // Build a predictions lookup: { `${user_id}_${race_id}_${type}`: { p1, p2, p3 } }
  const predMap = {};
  for (const p of predictions) {
    predMap[`${p.user_id}_${p.race_id}_${p.prediction_type}`] = p;
  }
  
  const leaderboard = users.map(user => {
    let totalPoints = 0;
    let racePoints = 0;
    let sprintPoints = 0;
    let correctPredictions = 0;
    let totalPredictions = 0;
    
    for (const result of results) {
      const key = `${user.id}_${result.race_id}_${result.result_type}`;
      const pred = predMap[key];
      if (!pred) continue;
      
      totalPredictions++;
      const pointsTable = result.result_type === 'sprint' ? SPRINT_POINTS : RACE_POINTS;
      
      if (pred.p1 === result.p1) { totalPoints += pointsTable.p1; correctPredictions++; }
      if (pred.p2 === result.p2) { totalPoints += pointsTable.p2; correctPredictions++; }
      if (pred.p3 === result.p3) { totalPoints += pointsTable.p3; correctPredictions++; }
      
      if (result.result_type === 'sprint') {
        if (pred.p1 === result.p1) sprintPoints += pointsTable.p1;
        if (pred.p2 === result.p2) sprintPoints += pointsTable.p2;
        if (pred.p3 === result.p3) sprintPoints += pointsTable.p3;
      } else {
        if (pred.p1 === result.p1) racePoints += pointsTable.p1;
        if (pred.p2 === result.p2) racePoints += pointsTable.p2;
        if (pred.p3 === result.p3) racePoints += pointsTable.p3;
      }
    }
    
    return {
      userId: user.id,
      username: user.username,
      totalPoints,
      racePoints,
      sprintPoints,
      correctPredictions,
      totalPredictions
    };
  });
  
  // Sort by total points descending, then by correct predictions descending as tiebreaker
  leaderboard.sort((a, b) => b.totalPoints - a.totalPoints || b.correctPredictions - a.correctPredictions);
  
  // Assign ranks (handle ties)
  let rank = 1;
  for (let i = 0; i < leaderboard.length; i++) {
    if (i > 0 && leaderboard[i].totalPoints === leaderboard[i - 1].totalPoints) {
      leaderboard[i].rank = leaderboard[i - 1].rank;
    } else {
      leaderboard[i].rank = rank;
    }
    rank++;
  }
  
  return leaderboard;
}

// ── Admin queries ──

function getAdmin(username) {
  return db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
}

function createAdmin(username, passwordHash) {
  return db.prepare('INSERT OR REPLACE INTO admin (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
}

function createAdminSession(adminId, token, expiresAt) {
  return db.prepare('INSERT INTO admin_sessions (admin_id, token, expires_at) VALUES (?, ?, ?)').run(adminId, token, expiresAt);
}

function getAdminSession(token) {
  return db.prepare('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > CURRENT_TIMESTAMP').get(token);
}

function deleteExpiredAdminSessions() {
  return db.prepare('DELETE FROM admin_sessions WHERE expires_at <= CURRENT_TIMESTAMP').run();
}

// Get users with email opt-in for MailerLite updates
function getEmailOptInUsers() {
  return db.prepare('SELECT id, username, email FROM users WHERE email_optin = 1 AND email IS NOT NULL').all();
}

module.exports = {
  getDb,
  createUser,
  getUserByToken,
  getUserByUsername,
  getUserByEmail,
  updateUserEmail,
  updateUserPassword,
  getAllUsers,
  createPasswordResetToken,
  getPasswordResetToken,
  markTokenAsUsed,
  deleteExpiredResetTokens,
  upsertPrediction,
  getUserPrediction,
  getUserPredictions,
  getRacePredictions,
  upsertResult,
  getResult,
  getAllResults,
  calculateLeaderboard,
  getAdmin,
  createAdmin,
  createAdminSession,
  getAdminSession,
  deleteExpiredAdminSessions,
  getEmailOptInUsers,
  RACE_POINTS,
  SPRINT_POINTS
};
