#!/usr/bin/env node
// setup-admin.js - Create or reset admin account

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database');

// Use environment variables if no command-line args provided
const args = process.argv.slice(2);
let username, password;

if (args.length >= 2) {
  [username, password] = args;
} else {
  // Fallback to environment variables
  username = process.env.ADMIN_USERNAME || 'admin';
  password = process.env.ADMIN_PASSWORD;
  
  if (!password) {
    console.error('Error: ADMIN_PASSWORD environment variable not set');
    process.exit(1);
  }
  
  console.log('Creating admin account from environment variables...');
}

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
