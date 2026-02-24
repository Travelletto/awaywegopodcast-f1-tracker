// generateLeaderboardImage.js - Renders the leaderboard as a PNG using canvas
const { createCanvas } = require('canvas');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const OUTPUT_PATH = path.join(__dirname, 'leaderboard-image.png');

const BG        = '#0D0D1A';
const HEADER_BG = '#1E1E3A';
const ROW_EVEN  = '#111126';
const ROW_ODD   = '#1A1A2E';
const RED       = '#E4002B';
const WHITE     = '#FFFFFF';
const MUTED     = '#8888AA';
const BORDER    = '#2A2A4A';
const GOLD      = '#FFD700';
const SILVER    = '#C0C0C0';
const BRONZE    = '#CD7F32';

const WIDTH       = 800;
const PADDING     = 40;
const TITLE_H     = 70;
const COL_HDR_H   = 44;
const ROW_H       = 44;
const FOOTER_H    = 44;
const MAX_ROWS    = 20;

const COL_RANK   = PADDING;
const COL_PLAYER = PADDING + 70;
const COL_POINTS = WIDTH - PADDING;

function rankColor(rank) {
  if (rank === 1) return GOLD;
  if (rank === 2) return SILVER;
  if (rank === 3) return BRONZE;
  return WHITE;
}

async function generateLeaderboardImage() {
  const leaderboard = db.calculateLeaderboard();
  const rows = Math.min(leaderboard.length, MAX_ROWS);
  const HEIGHT = TITLE_H + COL_HDR_H + ROW_H * rows + FOOTER_H;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, WIDTH, TITLE_H);
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Away We Go Podcast  ·  F1 2026 Prediction Leaderboard', WIDTH / 2, TITLE_H / 2);

  const hdrY = TITLE_H;
  ctx.fillStyle = HEADER_BG;
  ctx.fillRect(0, hdrY, WIDTH, COL_HDR_H);

  ctx.fillStyle = MUTED;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const hdrMid = hdrY + COL_HDR_H / 2;
  ctx.fillText('RANK', COL_RANK, hdrMid);
  ctx.fillText('PLAYER', COL_PLAYER, hdrMid);
  ctx.textAlign = 'right';
  ctx.fillText('POINTS', COL_POINTS, hdrMid);

  ctx.fillStyle = RED;
  ctx.fillRect(0, hdrY + COL_HDR_H - 2, WIDTH, 2);

  for (let i = 0; i < rows; i++) {
    const e = leaderboard[i];
    const rowY = TITLE_H + COL_HDR_H + i * ROW_H;
    const mid  = rowY + ROW_H / 2;

    ctx.fillStyle = i % 2 === 0 ? ROW_EVEN : ROW_ODD;
    ctx.fillRect(0, rowY, WIDTH, ROW_H);

    const rc = rankColor(e.rank);
    ctx.fillStyle = rc;
    ctx.font = e.rank <= 3 ? 'bold 18px sans-serif' : '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(e.rank), COL_RANK, mid);

    ctx.fillStyle = WHITE;
    ctx.font = '16px sans-serif';
    ctx.fillText(e.username, COL_PLAYER, mid);

    ctx.fillStyle = rc;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${e.totalPoints} pts`, COL_POINTS, mid);

    ctx.fillStyle = BORDER;
    ctx.fillRect(0, rowY + ROW_H - 1, WIDTH, 1);
  }

  const ftY = TITLE_H + COL_HDR_H + rows * ROW_H;
  ctx.fillStyle = HEADER_BG;
  ctx.fillRect(0, ftY, WIDTH, FOOTER_H);
  ctx.fillStyle = MUTED;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Updated ${new Date().toUTCString()}`, WIDTH / 2, ftY + FOOTER_H / 2);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(OUTPUT_PATH, buffer);
  return buffer;
}

module.exports = { generateLeaderboardImage };
