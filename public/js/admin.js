// admin.js - Admin panel for F1 Prediction Tracker

(function () {
  'use strict';

  let isLoggedIn = false;
  let seasonData = null;
  const teamColors = {};

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

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

  function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Init ──

  async function init() {
    seasonData = await api('/api/data');
    for (const team of seasonData.teams) {
      teamColors[team.name] = team.color;
    }

    // Check if already logged in
    try {
      const data = await api('/api/admin/me');
      if (data.admin) {
        isLoggedIn = true;
        showDashboard();
      } else {
        showLogin();
      }
    } catch {
      showLogin();
    }

    setupLoginForm();
    setupAdminNav();
  }

  function showLogin() {
    $('#admin-login').style.display = 'block';
    $('#admin-dashboard').style.display = 'none';
  }

  function showDashboard() {
    $('#admin-login').style.display = 'none';
    $('#admin-dashboard').style.display = 'block';
    $('#admin-user-area').innerHTML = `
      <button class="btn btn-small btn-secondary" id="btn-admin-logout">Logout</button>
    `;
    $('#btn-admin-logout').addEventListener('click', async () => {
      await api('/api/admin/logout', { method: 'POST' });
      isLoggedIn = false;
      showLogin();
      $('#admin-user-area').innerHTML = '';
    });

    populateRaceSelects();
    loadResultsForm();
  }

  // ── Login ──

  function setupLoginForm() {
    $('#admin-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = $('#admin-username').value;
      const password = $('#admin-password').value;
      const errEl = $('#admin-login-error');

      try {
        await api('/api/admin/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        isLoggedIn = true;
        showDashboard();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    });
  }

  // ── Admin Navigation ──

  function setupAdminNav() {
    $$('.nav-btn[data-admin-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.adminView;
        $$('.admin-section').forEach(s => s.style.display = 'none');
        $(`#admin-${view}`).style.display = 'block';
        $$('.nav-btn[data-admin-view]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (view === 'users') loadUsers();
        if (view === 'predictions') loadAdminPredictions();
        if (view === 'leaderboard') loadAdminLeaderboard();
      });
    });
  }

  // ── Race Selects ──

  function populateRaceSelects() {
    const selects = ['#result-race-select', '#pred-race-select'];
    selects.forEach(selId => {
      const sel = $(selId);
      if (!sel) return;
      sel.innerHTML = seasonData.races.map(r =>
        `<option value="${r.id}">${r.id}. ${escHtml(r.name)}${r.sprint ? ' (Sprint)' : ''} - ${r.dates}</option>`
      ).join('');
    });

    $('#result-race-select').addEventListener('change', loadResultsForm);
    $('#pred-race-select').addEventListener('change', loadAdminPredictions);
  }

  // ── Enter Results ──

  function getDriverOptions(selected) {
    let html = '<option value="">Select driver...</option>';
    const teamOrder = seasonData.teams.map(t => t.name);
    for (const team of teamOrder) {
      const drivers = seasonData.drivers.filter(d => d.team === team);
      const color = teamColors[team] || '#666';
      for (const driver of drivers) {
        const sel = driver.name === selected ? 'selected' : '';
        html += `<option value="${escHtml(driver.name)}" ${sel} style="border-left:4px solid ${color}">${escHtml(driver.name)} (${escHtml(team)})</option>`;
      }
    }
    return html;
  }

  function loadResultsForm() {
    const raceId = parseInt($('#result-race-select').value, 10);
    const race = seasonData.races.find(r => r.id === raceId);
    if (!race) return;

    const area = $('#result-form-area');

    let html = '';

    // Sprint result form (if sprint weekend)
    if (race.sprint) {
      const sr = race.sprintResult;
      html += `
        <div class="admin-result-section">
          <h3>Sprint Result <span class="sprint-badge">Sprint</span></h3>
          ${sr ? `
            <div class="current-result">
              <strong>Current:</strong> P1: ${escHtml(sr.p1)}, P2: ${escHtml(sr.p2)}, P3: ${escHtml(sr.p3)}
            </div>
          ` : ''}
          <form id="form-result-sprint">
            <div class="position-row">
              <span class="position-label p1">P1</span>
              <select class="driver-select" id="result-sprint-p1">${getDriverOptions(sr ? sr.p1 : '')}</select>
            </div>
            <div class="position-row">
              <span class="position-label p2">P2</span>
              <select class="driver-select" id="result-sprint-p2">${getDriverOptions(sr ? sr.p2 : '')}</select>
            </div>
            <div class="position-row">
              <span class="position-label p3">P3</span>
              <select class="driver-select" id="result-sprint-p3">${getDriverOptions(sr ? sr.p3 : '')}</select>
            </div>
            <div id="result-sprint-msg" style="display:none"></div>
            <button type="submit" class="btn btn-success mt-1">Save Sprint Result</button>
          </form>
        </div>
      `;
    }

    // Race result form
    const rr = race.raceResult;
    html += `
      <div class="admin-result-section">
        <h3>Race Result</h3>
        ${rr ? `
          <div class="current-result">
            <strong>Current:</strong> P1: ${escHtml(rr.p1)}, P2: ${escHtml(rr.p2)}, P3: ${escHtml(rr.p3)}
          </div>
        ` : ''}
        <form id="form-result-race">
          <div class="position-row">
            <span class="position-label p1">P1</span>
            <select class="driver-select" id="result-race-p1">${getDriverOptions(rr ? rr.p1 : '')}</select>
          </div>
          <div class="position-row">
            <span class="position-label p2">P2</span>
            <select class="driver-select" id="result-race-p2">${getDriverOptions(rr ? rr.p2 : '')}</select>
          </div>
          <div class="position-row">
            <span class="position-label p3">P3</span>
            <select class="driver-select" id="result-race-p3">${getDriverOptions(rr ? rr.p3 : '')}</select>
          </div>
          <div id="result-race-msg" style="display:none"></div>
          <button type="submit" class="btn btn-success mt-1">Save Race Result</button>
        </form>
      </div>
    `;

    area.innerHTML = html;

    // Bind submit handlers
    setupResultSubmit(raceId, 'race');
    if (race.sprint) {
      setupResultSubmit(raceId, 'sprint');
    }
  }

  function setupResultSubmit(raceId, type) {
    const form = $(`#form-result-${type}`);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msgEl = $(`#result-${type}-msg`);
      const p1 = $(`#result-${type}-p1`).value;
      const p2 = $(`#result-${type}-p2`).value;
      const p3 = $(`#result-${type}-p3`).value;

      if (!p1 || !p2 || !p3) {
        showMsg(msgEl, 'Select all three positions', 'error');
        return;
      }
      if (p1 === p2 || p1 === p3 || p2 === p3) {
        showMsg(msgEl, 'Each position must be a different driver', 'error');
        return;
      }

      try {
        await api(`/api/admin/results/${raceId}`, {
          method: 'POST',
          body: JSON.stringify({ type, p1, p2, p3 })
        });
        showMsg(msgEl, 'Result saved! Leaderboard updated.', 'success');
        // Refresh season data to get updated results
        seasonData = await api('/api/data');
        // Refresh the form to show current result
        setTimeout(() => loadResultsForm(), 500);
      } catch (err) {
        showMsg(msgEl, err.message, 'error');
      }
    });
  }

  // ── View Users ──

  async function loadUsers() {
    const list = $('#users-list');
    list.innerHTML = '<div class="loading">Loading users</div>';

    try {
      const data = await api('/api/admin/users');
      const users = data.users;

      if (users.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No users yet</p></div>';
        return;
      }

      list.innerHTML = `
        <p class="text-dim mb-1">${users.length} registered user${users.length !== 1 ? 's' : ''}</p>
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Reminders</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${u.id}</td>
                <td>${escHtml(u.username)}</td>
                <td>${escHtml(u.email || '-')}</td>
                <td>${u.email_optin ? 'Yes' : 'No'}</td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      list.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
  }

  // ── View Predictions ──

  async function loadAdminPredictions() {
    const raceId = parseInt($('#pred-race-select').value, 10);
    const list = $('#admin-pred-list');
    list.innerHTML = '<div class="loading">Loading predictions</div>';

    try {
      const data = await api(`/api/admin/predictions/${raceId}`);
      const race = seasonData.races.find(r => r.id === raceId);

      let html = '';

      // Race predictions
      html += `<h3 class="mt-2 mb-1">Race Predictions (${data.race.length} submitted)</h3>`;
      if (data.race.length === 0) {
        html += '<p class="text-dim">No race predictions</p>';
      } else {
        html += `
          <table class="admin-table">
            <thead><tr><th>User</th><th>P1</th><th>P2</th><th>P3</th></tr></thead>
            <tbody>
              ${data.race.map(p => `
                <tr>
                  <td>${escHtml(p.username)}</td>
                  <td><span class="driver-color-dot" style="background:${getDriverColor(p.p1)}"></span>${escHtml(p.p1)}</td>
                  <td><span class="driver-color-dot" style="background:${getDriverColor(p.p2)}"></span>${escHtml(p.p2)}</td>
                  <td><span class="driver-color-dot" style="background:${getDriverColor(p.p3)}"></span>${escHtml(p.p3)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }

      // Missing race predictions
      if (data.missingRace && data.missingRace.length > 0) {
        html += `<p class="text-dim" style="margin-top:0.5rem">Not yet predicted (${data.missingRace.length}): ${data.missingRace.map(u => escHtml(u.username)).join(', ')}</p>`;
      }

      // Sprint predictions
      if (race && race.sprint) {
        html += `<h3 class="mt-2 mb-1">Sprint Predictions (${data.sprint.length} submitted)</h3>`;
        if (data.sprint.length === 0) {
          html += '<p class="text-dim">No sprint predictions</p>';
        } else {
          html += `
            <table class="admin-table">
              <thead><tr><th>User</th><th>P1</th><th>P2</th><th>P3</th></tr></thead>
              <tbody>
                ${data.sprint.map(p => `
                  <tr>
                    <td>${escHtml(p.username)}</td>
                    <td><span class="driver-color-dot" style="background:${getDriverColor(p.p1)}"></span>${escHtml(p.p1)}</td>
                    <td><span class="driver-color-dot" style="background:${getDriverColor(p.p2)}"></span>${escHtml(p.p2)}</td>
                    <td><span class="driver-color-dot" style="background:${getDriverColor(p.p3)}"></span>${escHtml(p.p3)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }

        // Missing sprint predictions
        if (data.missingSprint && data.missingSprint.length > 0) {
          html += `<p class="text-dim" style="margin-top:0.5rem">Not yet predicted (${data.missingSprint.length}): ${data.missingSprint.map(u => escHtml(u.username)).join(', ')}</p>`;
        }
      }

      list.innerHTML = html;
    } catch (err) {
      list.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
  }

  function getDriverColor(driverName) {
    const driver = seasonData.drivers.find(d => d.name === driverName);
    if (!driver) return '#666';
    return teamColors[driver.team] || '#666';
  }

  // ── Admin Leaderboard ──

  async function loadAdminLeaderboard() {
    const content = $('#admin-leaderboard-content');
    content.innerHTML = '<div class="loading">Loading leaderboard</div>';

    try {
      const data = await api('/api/admin/leaderboard');

      if (data.leaderboard.length === 0) {
        content.innerHTML = '<div class="empty-state"><p>No data yet</p></div>';
        return;
      }

      content.innerHTML = `
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>User</th>
              <th>Total</th>
              <th>Race</th>
              <th>Sprint</th>
              <th>Correct</th>
            </tr>
          </thead>
          <tbody>
            ${data.leaderboard.map(entry => {
              const rankClass = entry.rank <= 3 ? `rank-${entry.rank}` : '';
              return `
                <tr>
                  <td class="rank-cell ${rankClass}">${entry.rank}</td>
                  <td class="username-cell">${escHtml(entry.username)}</td>
                  <td class="points-cell">${entry.totalPoints}</td>
                  <td>${entry.racePoints}</td>
                  <td>${entry.sprintPoints}</td>
                  <td>${entry.correctPredictions}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      content.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
  }

  // MailerLite sync buttons (appear in Users tab and Leaderboard tab)
  function setupMailerLiteSyncButtons() {
    const syncBtns = $$('.mailerlite-sync-btn');
    const statusEls = $$('.mailerlite-sync-status');

    syncBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        // Disable all sync buttons and show syncing state
        syncBtns.forEach(b => { b.disabled = true; b.textContent = 'Syncing...'; });
        statusEls.forEach(s => { s.textContent = ''; });

        try {
          await api('/api/admin/mailerlite-sync', { method: 'POST' });
          syncBtns.forEach(b => b.textContent = 'Sync Complete!');
          statusEls.forEach(s => { s.textContent = 'All opted-in users synced to MailerLite'; s.style.color = 'var(--f1-success)'; });
          setTimeout(() => {
            syncBtns.forEach(b => { b.textContent = 'Sync MailerLite'; b.disabled = false; });
          }, 3000);
        } catch (err) {
          syncBtns.forEach(b => b.textContent = 'Sync Failed');
          statusEls.forEach(s => { s.textContent = err.message; s.style.color = '#ff6b6b'; });
          setTimeout(() => {
            syncBtns.forEach(b => { b.textContent = 'Sync MailerLite'; b.disabled = false; });
          }, 3000);
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', setupMailerLiteSyncButtons);

  function showMsg(el, text, type) {
    el.textContent = text;
    el.className = type === 'success' ? 'success-msg mt-1' : 'error-msg mt-1';
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
