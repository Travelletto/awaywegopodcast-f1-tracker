#!/usr/bin/env node
// setup-admin.js - Create or reset admin account
// Usage: node setup-admin.js <username> <password>

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database');

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node setup-admin.js <username> <password>');
  console.log('Example: node setup-admin.js admin MySecurePassword123');
  process.exit(1);
}

const [username, password] = args;

if (password.length < 8) {
  console.error('Error: Password must be at least 8 characters');
  process.exit(1);
}

// Initialize database
db.getDb();

const hash = bcrypt.hashSync(password, 12);
db.createAdmin(username, hash);

console.log(`Admin account "${username}" created/updated successfully.`);
console.log(`You can now log in at /admin`);
