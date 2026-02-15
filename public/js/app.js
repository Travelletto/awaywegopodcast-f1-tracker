// app.js - Away We Go Podcast F1 Prediction Tracker (Frontend)

(function () {
  'use strict';

  // ── State ──
  let currentUser = null;
  let seasonData = null;   // { teams, drivers, races }
  let myPredictions = [];  // all predictions for current user

  // Team color lookup
  const teamColors = {};

  // ── DOM Refs ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── Init ──
  async function init() {
    await Promise.all([loadUser(), loadSeasonData()]);
    buildTeamColorMap();

    if (!currentUser) {
      showSignupModal();
    } else {
      hideSignupModal();
      loadMyPredictions();
    }

    renderUserArea();
    renderCalendar();
    setupNavigation();
    setupSignupForm();
  }

  // ── API Helpers ──

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function loadUser() {
    try {
      const data = await api('/api/me');
      currentUser = data.user;
    } catch { currentUser = null; }
  }

  async function loadSeasonData() {
    seasonData = await api('/api/data');
  }

  async function loadMyPredictions() {
    if (!currentUser) return;
    try {
      const data = await api('/api/my-predictions');
      myPredictions = data.predictions || [];
    } catch { myPredictions = []; }
  }

  function buildTeamColorMap() {
    if (!seasonData) return;
    for (const team of seasonData.teams) {
      teamColors[team.name] = team.color;
    }
  }

  function getDriverTeamColor(driverName) {
    if (!seasonData) return '#666';
    const driver = seasonData.drivers.find(d => d.name === driverName);
    if (!driver) return '#666';
    return teamColors[driver.team] || '#666';
  }

  function getDriverTeam(driverName) {
    if (!seasonData) return '';
    const driver = seasonData.drivers.find(d => d.name === driverName);
    return driver ? driver.team : '';
  }

  // ── Navigation ──

  function setupNavigation() {
    $$('.nav-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        showView(view);
        $$('.nav-btn[data-view]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    $('#btn-back-calendar').addEventListener('click', () => {
      showView('calendar');
      $$('.nav-btn[data-view]').forEach(b => b.classList.remove('active'));
      $('[data-view="calendar"]').classList.add('active');
    });
  }

  function showView(viewName) {
    $$('.view').forEach(v => v.style.display = 'none');
    const target = $(`#view-${viewName}`);
    if (target) target.style.display = 'block';

    // Render view content on switch
    if (viewName === 'leaderboard') renderLeaderboard();
    if (viewName === 'my-predictions') renderMyPredictions();
    if (viewName === 'settings') renderSettings();
  }

  // ── User Area (Header) ──

  function renderUserArea() {
    const area = $('#user-area');
    if (currentUser) {
      area.innerHTML = `
        <span class="user-name">${escHtml(currentUser.username)}</span>
        <button class="btn btn-small btn-secondary" id="btn-logout">Logout</button>
      `;
      $('#btn-logout').addEventListener('click', logout);
    } else {
      area.innerHTML = `<button class="btn btn-small btn-primary" id="btn-show-signup">Sign Up</button>`;
      $('#btn-show-signup').addEventListener('click', showSignupModal);
    }
  }

  async function logout() {
    await api('/api/logout', { method: 'POST' });
    currentUser = null;
    myPredictions = [];
    renderUserArea();
    renderCalendar();
    showSignupModal();
  }

  // ── Signup ──

  function showSignupModal() {
    $('#signup-modal').style.display = 'flex';
  }

  function hideSignupModal() {
    $('#signup-modal').style.display = 'none';
  }

  function setupSignupForm() {
    $('#signup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = $('#signup-username').value.trim();
      const email = $('#signup-email').value.trim();
      const emailOptin = $('#signup-email-optin').checked;
      const errEl = $('#signup-error');

      try {
        const data = await api('/api/signup', {
          method: 'POST',
          body: JSON.stringify({ username, email: email || undefined, emailOptin })
        });
        currentUser = data;
        hideSignupModal();
        renderUserArea();
        renderCalendar();
        loadMyPredictions();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    });
  }

  // ── Calendar View ──

  function renderCalendar() {
    const list = $('#race-list');
    if (!seasonData) {
      list.innerHTML = '<div class="loading">Loading calendar</div>';
      return;
    }

    const now = new Date();
    list.innerHTML = seasonData.races.map(race => {
      const hasResult = !!race.raceResult;
      const isLocked = race.raceLocked;
      let statusClass = 'upcoming';
      let statusText = 'Open';

      if (hasResult) {
        statusClass = 'completed';
        statusText = 'Completed';
      } else if (isLocked) {
        statusClass = 'active';
        statusText = 'Locked';
      }

      // Check if user has predicted
      const hasPrediction = myPredictions.some(p => p.race_id === race.id && p.prediction_type === 'race');
      const hasSprintPrediction = race.sprint && myPredictions.some(p => p.race_id === race.id && p.prediction_type === 'sprint');

      return `
        <div class="race-card ${statusClass}" data-race-id="${race.id}">
          <div class="race-number">${race.id}</div>
          <div class="race-info">
            <div class="race-name">
              ${escHtml(race.name)}
              ${race.sprint ? '<span class="sprint-badge">Sprint</span>' : ''}
            </div>
            <div class="race-meta">
              <span>${escHtml(race.location)}</span>
              <span>${escHtml(race.dates)}</span>
            </div>
            ${hasPrediction ? '<span class="predicted-badge">Predicted</span>' : ''}
            ${hasSprintPrediction ? '<span class="predicted-badge">Sprint Predicted</span>' : ''}
          </div>
          <div class="race-status status-${statusClass === 'completed' ? 'completed' : (statusClass === 'active' ? 'locked' : 'open')}">
            ${statusText}
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers
    $$('.race-card').forEach(card => {
      card.addEventListener('click', () => {
        const raceId = parseInt(card.dataset.raceId, 10);
        openRacePrediction(raceId);
      });
    });
  }

  // ── Prediction View ──

  async function openRacePrediction(raceId) {
    const race = seasonData.races.find(r => r.id === raceId);
    if (!race) return;

    showView('prediction');
    const content = $('#prediction-content');
    content.innerHTML = '<div class="loading">Loading</div>';

    // Fetch user's existing prediction for this race
    let userPrediction = { race: null, sprint: null };
    if (currentUser) {
      try {
        userPrediction = await api(`/api/predictions/${raceId}`);
      } catch {}
    }

    const now = new Date();
    const raceLocked = new Date(race.qualiLock) <= now;
    const sprintLocked = race.sprint ? new Date(race.sprintQualiLock) <= now : true;

    content.innerHTML = `
      <div class="prediction-header">
        <h2>${escHtml(race.name)}</h2>
        <div class="race-meta">
          <span>${escHtml(race.location)}</span>
          <span>${escHtml(race.dates)}</span>
          ${race.sprint ? '<span class="sprint-badge">Sprint Weekend</span>' : ''}
        </div>
      </div>

      ${race.sprint ? `
        <div class="prediction-section" id="sprint-section">
          <h3>Sprint Predictions <span class="sprint-badge">Sprint</span></h3>
          ${sprintLocked
            ? `<div class="lock-info">Sprint predictions are locked</div>`
            : `<div class="lock-info">Locks: ${formatLockTime(race.sprintQualiLock)}</div>`
          }
          ${renderPredictionForm('sprint', race, userPrediction.sprint, sprintLocked)}
          ${race.sprintResult ? renderResultComparison('sprint', race.sprintResult, userPrediction.sprint) : ''}
        </div>
      ` : ''}

      <div class="prediction-section" id="race-section">
        <h3>Race Predictions</h3>
        ${raceLocked
          ? `<div class="lock-info">Race predictions are locked</div>`
          : `<div class="lock-info">Locks: ${formatLockTime(race.qualiLock)}</div>`
        }
        ${renderPredictionForm('race', race, userPrediction.race, raceLocked)}
        ${race.raceResult ? renderResultComparison('race', race.raceResult, userPrediction.race) : ''}
      </div>
    `;

    // Setup form submission handlers
    setupPredictionSubmit(raceId, 'race', raceLocked);
    if (race.sprint) {
      setupPredictionSubmit(raceId, 'sprint', sprintLocked);
    }
  }

  function renderPredictionForm(type, race, existingPred, locked) {
    if (!currentUser) {
      return `<div class="empty-state mt-1"><p>Sign up to make predictions</p></div>`;
    }

    const positions = ['p1', 'p2', 'p3'];
    const labels = { p1: 'P1', p2: 'P2', p3: 'P3' };

    return `
      <form id="form-${type}" class="mt-1">
        ${positions.map(pos => `
          <div class="position-row">
            <span class="position-label ${pos}">${labels[pos]}</span>
            <select class="driver-select" id="${type}-${pos}" ${locked ? 'disabled' : ''}>
              <option value="">Select driver...</option>
              ${renderDriverOptions(existingPred ? existingPred[pos] : '')}
            </select>
          </div>
        `).join('')}
        ${!locked ? `
          <div class="prediction-actions">
            <button type="submit" class="btn btn-primary">Save Prediction</button>
          </div>
        ` : ''}
        <div id="${type}-msg" style="display:none" class="mt-1"></div>
      </form>
    `;
  }

  function renderDriverOptions(selected) {
  // Helper function to determine if text should be white or black
  function getTextColor(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? '#000000' : '#FFFFFF';
  }
  
  if (!seasonData) return '';
  const teamOrder = seasonData.teams.map(t => t.name);
  const grouped = {};
  for (const team of teamOrder) {
    grouped[team] = seasonData.drivers.filter(d => d.team === team);
  }
  let html = '<option value="">Select driver...</option>';
  for (const team of teamOrder) {
    const color = teamColors[team] || '#666';
    const textColor = getTextColor(color);
    const drivers = grouped[team];
    for (const driver of drivers) {
      const sel = driver.name === selected ? 'selected' : '';
      html += `<option value="${escHtml(driver.name)}" ${sel} style="background-color: ${color}; color: ${textColor}; padding: 8px;">${escHtml(driver.name)} (${escHtml(team)})</option>`;
    }
  }
  return html;
}

  function renderResultComparison(type, result, prediction) {
    const points = type === 'sprint'
      ? { p1: 8, p2: 7, p3: 6 }
      : { p1: 25, p2: 18, p3: 15 };

    const positions = ['p1', 'p2', 'p3'];
    let totalEarned = 0;

    const rows = positions.map(pos => {
      const resultDriver = result[pos];
      const predDriver = prediction ? prediction[pos] : null;
      const matched = predDriver && predDriver === resultDriver;
      const earned = matched ? points[pos] : 0;
      totalEarned += earned;

      const color = getDriverTeamColor(resultDriver);

      return `
        <div class="result-row">
          <span class="position-label ${pos}">${pos.toUpperCase()}</span>
          <span class="driver-color" style="background:${color}"></span>
          <span>${escHtml(resultDriver)}</span>
          ${prediction ? `
            <span class="${matched ? 'match-yes' : 'match-no'}" style="margin-left:0.5rem">
              ${matched ? 'Match!' : `(You: ${escHtml(predDriver || 'none')})`}
            </span>
            ${earned > 0 ? `<span class="score-earned">+${earned}</span>` : ''}
          ` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="result-display">
        <h4>${type === 'sprint' ? 'Sprint' : 'Race'} Result</h4>
        ${rows}
        ${prediction ? `<div class="points-display mt-1">Points earned: <span class="points-value">${totalEarned}</span></div>` : ''}
      </div>
    `;
  }

  function setupPredictionSubmit(raceId, type, locked) {
    if (locked || !currentUser) return;
    const form = $(`#form-${type}`);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msgEl = $(`#${type}-msg`);
      const p1 = $(`#${type}-p1`).value;
      const p2 = $(`#${type}-p2`).value;
      const p3 = $(`#${type}-p3`).value;

      if (!p1 || !p2 || !p3) {
        showMsg(msgEl, 'Please select all three positions', 'error');
        return;
      }
      if (p1 === p2 || p1 === p3 || p2 === p3) {
        showMsg(msgEl, 'Each position must be a different driver', 'error');
        return;
      }

      try {
        await api(`/api/predictions/${raceId}`, {
          method: 'POST',
          body: JSON.stringify({ type, p1, p2, p3 })
        });
        showMsg(msgEl, 'Prediction saved!', 'success');
        // Refresh local predictions cache
        await loadMyPredictions();
      } catch (err) {
        showMsg(msgEl, err.message, 'error');
      }
    });
  }

  function showMsg(el, text, type) {
    el.textContent = text;
    el.className = type === 'success' ? 'success-msg mt-1' : 'error-msg mt-1';
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }

  // ── Leaderboard View ──

  let leaderboardData = [];
  let leaderboardSortKey = 'totalPoints';
  let leaderboardSortDir = -1; // -1 = desc

  async function renderLeaderboard() {
    const content = $('#leaderboard-content');
    content.innerHTML = '<div class="loading">Loading leaderboard</div>';

    try {
      const data = await api('/api/leaderboard');
      leaderboardData = data.leaderboard;
    } catch {
      content.innerHTML = '<div class="error-msg">Failed to load leaderboard</div>';
      return;
    }

    renderLeaderboardTable();
  }

  function renderLeaderboardTable() {
    const content = $('#leaderboard-content');
    if (leaderboardData.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <h3>No predictions yet</h3>
          <p>Once users start making predictions and results are entered, the leaderboard will appear here.</p>
        </div>
      `;
      return;
    }

    // Sort
    const sorted = [...leaderboardData].sort((a, b) => {
      const av = a[leaderboardSortKey] ?? 0;
      const bv = b[leaderboardSortKey] ?? 0;
      return (bv - av) * (leaderboardSortDir === -1 ? 1 : -1);
    });

    // Re-assign rank for display based on sort
    if (leaderboardSortKey === 'totalPoints') {
      let rank = 1;
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i].totalPoints === sorted[i - 1].totalPoints) {
          sorted[i]._displayRank = sorted[i - 1]._displayRank;
        } else {
          sorted[i]._displayRank = rank;
        }
        rank++;
      }
    }

    const sortIcon = (key) => leaderboardSortKey === key ? (leaderboardSortDir === -1 ? ' ▼' : ' ▲') : '';

    content.innerHTML = `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th class="${leaderboardSortKey === 'totalPoints' ? 'sorted' : ''}" data-sort="totalPoints">#</th>
            <th data-sort="username">User</th>
            <th class="${leaderboardSortKey === 'totalPoints' ? 'sorted' : ''}" data-sort="totalPoints">Points${sortIcon('totalPoints')}</th>
            <th class="detail-cell ${leaderboardSortKey === 'racePoints' ? 'sorted' : ''}" data-sort="racePoints">Race${sortIcon('racePoints')}</th>
            <th class="detail-cell ${leaderboardSortKey === 'sprintPoints' ? 'sorted' : ''}" data-sort="sprintPoints">Sprint${sortIcon('sprintPoints')}</th>
            <th class="detail-cell ${leaderboardSortKey === 'correctPredictions' ? 'sorted' : ''}" data-sort="correctPredictions">Correct${sortIcon('correctPredictions')}</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((entry, i) => {
            const rankDisplay = leaderboardSortKey === 'totalPoints' ? entry._displayRank : (i + 1);
            const rankClass = rankDisplay <= 3 ? `rank-${rankDisplay}` : '';
            const isMe = currentUser && entry.userId === currentUser.id;
            return `
              <tr ${isMe ? 'style="background:rgba(228,0,43,0.08)"' : ''}>
                <td class="rank-cell ${rankClass}">${rankDisplay}</td>
                <td class="username-cell">${escHtml(entry.username)}${isMe ? ' (you)' : ''}</td>
                <td class="points-cell">${entry.totalPoints}</td>
                <td class="detail-cell">${entry.racePoints}</td>
                <td class="detail-cell">${entry.sprintPoints}</td>
                <td class="detail-cell">${entry.correctPredictions}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    // Sort handlers
    content.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (key === 'username') {
          // String sort
          leaderboardData.sort((a, b) => a.username.localeCompare(b.username));
          leaderboardSortKey = key;
          leaderboardSortDir = 1;
        } else {
          if (leaderboardSortKey === key) {
            leaderboardSortDir *= -1;
          } else {
            leaderboardSortKey = key;
            leaderboardSortDir = -1;
          }
        }
        renderLeaderboardTable();
      });
    });
  }

  // ── My Predictions View ──

  async function renderMyPredictions() {
    const content = $('#my-predictions-content');

    if (!currentUser) {
      content.innerHTML = `
        <div class="empty-state">
          <h3>Sign up to view your predictions</h3>
        </div>
      `;
      return;
    }

    content.innerHTML = '<div class="loading">Loading predictions</div>';
    await loadMyPredictions();

    if (myPredictions.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <h3>No predictions yet</h3>
          <p>Go to the Calendar and select a race to make your predictions.</p>
        </div>
      `;
      return;
    }

    // Group by race
    const byRace = {};
    for (const pred of myPredictions) {
      if (!byRace[pred.race_id]) byRace[pred.race_id] = [];
      byRace[pred.race_id].push(pred);
    }

    let html = '';
    for (const race of seasonData.races) {
      const preds = byRace[race.id];
      if (!preds) continue;

      for (const pred of preds) {
        const typeName = pred.prediction_type === 'sprint' ? 'Sprint' : 'Race';
        const result = pred.prediction_type === 'sprint' ? race.sprintResult : race.raceResult;

        let scoreHtml = '';
        if (result) {
          const pts = pred.prediction_type === 'sprint'
            ? { p1: 8, p2: 7, p3: 6 }
            : { p1: 25, p2: 18, p3: 15 };
          let earned = 0;
          if (pred.p1 === result.p1) earned += pts.p1;
          if (pred.p2 === result.p2) earned += pts.p2;
          if (pred.p3 === result.p3) earned += pts.p3;
          scoreHtml = `<div class="my-pred-score"><span class="points-value" style="color:var(--f1-gold)">${earned} pts</span></div>`;
        }

        html += `
          <div class="my-pred-card">
            <h4>${escHtml(race.name)} - ${typeName}
              ${pred.prediction_type === 'sprint' ? '<span class="sprint-badge">Sprint</span>' : ''}
            </h4>
            <div class="my-pred-drivers">
              <span class="driver-color-dot" style="background:${getDriverTeamColor(pred.p1)}"></span>P1: ${escHtml(pred.p1)}
              &nbsp;&bull;&nbsp;
              <span class="driver-color-dot" style="background:${getDriverTeamColor(pred.p2)}"></span>P2: ${escHtml(pred.p2)}
              &nbsp;&bull;&nbsp;
              <span class="driver-color-dot" style="background:${getDriverTeamColor(pred.p3)}"></span>P3: ${escHtml(pred.p3)}
            </div>
            ${scoreHtml}
          </div>
        `;
      }
    }

    content.innerHTML = html;
  }

  // ── Settings View ──

  function renderSettings() {
    const content = $('#settings-content');

    if (!currentUser) {
      content.innerHTML = `
        <div class="empty-state">
          <h3>Sign up to access settings</h3>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="settings-card">
        <h3>Account</h3>
        <p class="text-dim mb-1">Username: <strong>${escHtml(currentUser.username)}</strong></p>
      </div>

      <div class="settings-card">
        <h3>Email & Reminders</h3>
        <form id="email-settings-form">
          <div class="form-group">
            <label for="settings-email">Email Address</label>
            <input type="email" id="settings-email" value="${escHtml(currentUser.email || '')}" placeholder="your@email.com">
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" id="settings-email-optin" ${currentUser.emailOptin ? 'checked' : ''}>
              Send me race weekend reminders
            </label>
          </div>
          <div id="email-settings-msg" style="display:none"></div>
          <button type="submit" class="btn btn-primary">Save Email Settings</button>
        </form>
      </div>

      <div class="settings-card">
        <h3>Points System</h3>
        <table class="admin-table">
          <thead><tr><th>Position</th><th>Race Points</th><th>Sprint Points</th></tr></thead>
          <tbody>
            <tr><td>P1 Match</td><td>25 pts</td><td>8 pts</td></tr>
            <tr><td>P2 Match</td><td>18 pts</td><td>7 pts</td></tr>
            <tr><td>P3 Match</td><td>15 pts</td><td>6 pts</td></tr>
          </tbody>
        </table>
      </div>
    `;

    $('#email-settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msgEl = $('#email-settings-msg');
      const email = $('#settings-email').value.trim();
      const emailOptin = $('#settings-email-optin').checked;

      try {
        await api('/api/me/email', {
          method: 'PUT',
          body: JSON.stringify({ email: email || null, emailOptin })
        });
        currentUser.email = email;
        currentUser.emailOptin = emailOptin;
        showMsg(msgEl, 'Settings saved!', 'success');
      } catch (err) {
        showMsg(msgEl, err.message, 'error');
      }
    });
  }

  // ── Helpers ──

  function formatLockTime(isoString) {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }

  function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Start ──
  document.addEventListener('DOMContentLoaded', init);
})();
