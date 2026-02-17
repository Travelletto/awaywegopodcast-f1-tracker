// app.js - Frontend for F1 Prediction Tracker
(() => {
  'use strict';

  let currentUser = null;
  let seasonData = null;
  let currentView = 'leaderboard';

  const teamColors = {
    'Red Bull': '#1E5BC6',
    'McLaren': '#FF8000',
    'Ferrari': '#E4002B',
    'Mercedes': '#00A19B',
    'Aston Martin': '#115845',
    'Alpine': '#F282B4',
    'Williams': '#002B5C',
    'Haas': '#FFFFFF',
    'Audi': '#6D6D6D',
    'Racing Bulls': '#4781D7',
    'Cadillac': '#000000'
  };

  // ── Init ──
  async function init() {
    // Check if user has reset password token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    if (resetToken) {
      showResetPasswordModal(resetToken);
      return;
    }

    // Check if user is logged in
    const meResp = await fetch('/api/me', { credentials: 'include' });
    const meData = await meResp.json();
    
    await loadSeasonData();
    
    if (meData.user) {
      currentUser = meData.user;
      currentView = 'calendar';
      renderUserArea();
      showNav();
      renderView(currentView);
      attachNavHandlers();
    } else {
      // Not logged in - show leaderboard only
      currentView = 'leaderboard';
      renderUserArea();
      showPublicNav();
      renderView('leaderboard');
      attachNavHandlers();
    }
  }

  async function loadSeasonData() {
    const resp = await fetch('/api/data');
    seasonData = await resp.json();
  }

  // ── Modal Management ──
  function showSignupModal() {
    hideAllModals();
    document.getElementById('signupModal').style.display = 'flex';
  }

  function showLoginModal() {
    hideAllModals();
    document.getElementById('loginModal').style.display = 'flex';
  }

  function showForgotPasswordModal() {
    hideAllModals();
    document.getElementById('forgotPasswordModal').style.display = 'flex';
  }

  function showResetPasswordModal(token) {
    hideAllModals();
    document.getElementById('resetToken').value = token;
    document.getElementById('resetPasswordModal').style.display = 'flex';
  }

  function hideAllModals() {
    document.getElementById('signupModal').style.display = 'none';
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('forgotPasswordModal').style.display = 'none';
    document.getElementById('resetPasswordModal').style.display = 'none';
  }

  // ── Auth Forms ──
  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      username: form.username.value,
      email: form.email.value,
      password: form.password.value,
      emailOptin: form.emailOptin.checked
    };
    
    const resp = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    
    const result = await resp.json();
    
    if (!resp.ok) {
      document.getElementById('signupError').textContent = result.error;
      document.getElementById('signupError').style.display = 'block';
      return;
    }
    
    currentUser = result;
    currentView = 'calendar';
    hideAllModals();
    await loadSeasonData();
    renderUserArea();
    showNav();
    renderView('calendar');
    attachNavHandlers();
  });

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      emailOrUsername: form.emailOrUsername.value,
      password: form.password.value
    };
    
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    
    const result = await resp.json();
    
    if (!resp.ok) {
      document.getElementById('loginError').textContent = result.error;
      document.getElementById('loginError').style.display = 'block';
      return;
    }
    
    currentUser = result;
    currentView = 'calendar';
    hideAllModals();
    await loadSeasonData();
    renderUserArea();
    showNav();
    renderView('calendar');
    attachNavHandlers();
  });

  document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = { email: form.email.value };
    
    const resp = await fetch('/api/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await resp.json();
    
    document.getElementById('forgotPasswordError').style.display = 'none';
    document.getElementById('forgotPasswordSuccess').textContent = result.message;
    document.getElementById('forgotPasswordSuccess').style.display = 'block';
    form.reset();
  });

  document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;
    
    if (newPassword !== confirmPassword) {
      document.getElementById('resetPasswordError').textContent = 'Passwords do not match';
      document.getElementById('resetPasswordError').style.display = 'block';
      return;
    }
    
    const data = {
      token: form.token.value,
      newPassword: newPassword
    };
    
    const resp = await fetch('/api/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await resp.json();
    
    if (!resp.ok) {
      document.getElementById('resetPasswordError').textContent = result.error;
      document.getElementById('resetPasswordError').style.display = 'block';
      return;
    }
    
    document.getElementById('resetPasswordError').style.display = 'none';
    document.getElementById('resetPasswordSuccess').textContent = 'Password updated! You can now log in.';
    document.getElementById('resetPasswordSuccess').style.display = 'block';
    
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  });

  // Modal switching links
  document.getElementById('showLoginLink').addEventListener('click', (e) => {
    e.preventDefault();
    showLoginModal();
  });

  document.getElementById('showSignupLink').addEventListener('click', (e) => {
    e.preventDefault();
    showSignupModal();
  });

  document.getElementById('showForgotPasswordLink').addEventListener('click', (e) => {
    e.preventDefault();
    showForgotPasswordModal();
  });

  document.getElementById('backToLoginLink').addEventListener('click', (e) => {
    e.preventDefault();
    showLoginModal();
  });

  // ── User Area ──
  function renderUserArea() {
    const userArea = document.getElementById('userArea');
    if (!currentUser) {
      userArea.innerHTML = '';
      return;
    }
    userArea.innerHTML = `
      <span class="user-name">${escHtml(currentUser.username)}</span>
      <button class="btn btn-small btn-secondary" id="logoutBtn">Log Out</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', logout);
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    currentUser = null;
    currentView = 'leaderboard';
    hideNav();
    renderUserArea();
    showPublicNav();
    renderView('leaderboard');
    attachNavHandlers();
  }

  function showNav() {
    const nav = document.getElementById('nav');
    nav.innerHTML = `
      <button class="nav-btn active" data-view="calendar">Calendar</button>
      <button class="nav-btn" data-view="predictions">My Predictions</button>
      <button class="nav-btn" data-view="leaderboard">Leaderboard</button>
      <button class="nav-btn" data-view="settings">Settings</button>
    `;
    nav.style.display = 'flex';
  }

  function showPublicNav() {
    const nav = document.getElementById('nav');
    nav.innerHTML = `
      <button class="nav-btn active" data-view="leaderboard">Leaderboard</button>
      <button class="nav-btn" data-view="login">Sign Up / Log In</button>
    `;
    nav.style.display = 'flex';
  }

  function hideNav() {
    document.getElementById('nav').style.display = 'none';
  }

  function attachNavHandlers() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        renderView(currentView);
      });
    });
  }

  // ── View Rendering ──
  function renderView(view) {
    const main = document.getElementById('main');
    switch (view) {
      case 'calendar':
        if (!currentUser) {
          showSignupModal();
          return;
        }
        renderCalendar(main);
        break;
      case 'predictions':
        if (!currentUser) {
          showSignupModal();
          return;
        }
        renderMyPredictions(main);
        break;
      case 'leaderboard':
        renderLeaderboard(main);
        break;
      case 'settings':
        if (!currentUser) {
          showSignupModal();
          return;
        }
        renderSettings(main);
        break;
      case 'login':
        showSignupModal();
        break;
      default:
        main.innerHTML = '<p class="loading">Unknown view</p>';
    }
  }

  // ── Calendar View ──
  function renderCalendar(container) {
    if (!seasonData) {
      container.innerHTML = '<p class="loading">Loading...</p>';
      return;
    }
    
    container.innerHTML = `
      <h1 class="view-title">2026 Formula 1 World Championship Calendar</h1>
      <div class="race-list" id="raceList"></div>
    `;
    
    const raceList = document.getElementById('raceList');
    for (const race of seasonData.races) {
      const card = document.createElement('div');
      card.className = 'race-card';
      
      const hasRaceResult = race.raceResult !== null;
      const hasSprintResult = race.sprint && race.sprintResult !== null;
      const allResultsIn = hasRaceResult && (!race.sprint || hasSprintResult);
      
      if (allResultsIn) {
        card.classList.add('completed');
      } else if (race.raceLocked) {
        card.classList.add('active');
      } else {
        card.classList.add('upcoming');
      }
      
      const statusText = allResultsIn ? 'Completed' : (race.raceLocked ? 'Locked' : 'Open');
      const statusClass = allResultsIn ? 'status-completed' : (race.raceLocked ? 'status-locked' : 'status-open');
      
      card.innerHTML = `
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
        </div>
        <div class="race-status ${statusClass}">${statusText}</div>
      `;
      
      card.addEventListener('click', () => showRaceDetail(race));
      raceList.appendChild(card);
    }
  }

  // ── Race Detail View ──
  async function showRaceDetail(race) {
    const main = document.getElementById('main');
    main.innerHTML = '<p class="loading">Loading race details...</p>';
    
    const resp = await fetch(`/api/predictions/${race.id}`, { credentials: 'include' });
    const data = await resp.json();
    
    main.innerHTML = `
      <button class="btn btn-back" id="backBtn">← Back to Calendar</button>
      <div class="prediction-header">
        <h2>${escHtml(race.name)}</h2>
        <div class="race-meta">
          <span>${escHtml(race.location)}</span>
          <span>${escHtml(race.dates)}</span>
          ${race.sprint ? '<span class="sprint-badge">Sprint Weekend</span>' : ''}
        </div>
      </div>
      <div id="raceContent"></div>
    `;
    
    document.getElementById('backBtn').addEventListener('click', () => renderView('calendar'));
    
    const content = document.getElementById('raceContent');
    
    // Race prediction form
    if (!race.raceLocked) {
      content.innerHTML += renderPredictionForm(race, 'race', data.race);
    } else if (race.raceResult) {
      content.innerHTML += renderResultDisplay(race, 'race', race.raceResult, data.race);
    } else {
      content.innerHTML += '<div class="lock-info">⏳ Race predictions are locked. Results will be posted after the race.</div>';
    }
    
    // Sprint prediction form (if applicable)
    if (race.sprint) {
      if (!race.sprintLocked) {
        content.innerHTML += renderPredictionForm(race, 'sprint', data.sprint);
      } else if (race.sprintResult) {
        content.innerHTML += renderResultDisplay(race, 'sprint', race.sprintResult, data.sprint);
      } else {
        content.innerHTML += '<div class="lock-info">⏳ Sprint predictions are locked. Results will be posted after the sprint.</div>';
      }
    }
    
    attachPredictionHandlers(race);
  }

  function renderPredictionForm(race, type, existingPred) {
    const title = type === 'race' ? 'Race Prediction' : 'Sprint Prediction';
    const points = type === 'race' ? 'Race Points: P1 = 25pts, P2 = 18pts, P3 = 15pts' : 'Sprint Points: P1 = 8pts, P2 = 7pts, P3 = 6pts';
    
    return `
      <div class="prediction-section">
        <h3>${title}</h3>
        <p class="points-display">${points}</p>
        <form class="prediction-form" data-race-id="${race.id}" data-type="${type}">
          <div class="position-row">
            <div class="position-label p1">P1</div>
            <select class="driver-select" name="p1" required>
              ${renderDriverOptions(existingPred?.p1)}
            </select>
          </div>
          <div class="position-row">
            <div class="position-label p2">P2</div>
            <select class="driver-select" name="p2" required>
              ${renderDriverOptions(existingPred?.p2)}
            </select>
          </div>
          <div class="position-row">
            <div class="position-label p3">P3</div>
            <select class="driver-select" name="p3" required>
              ${renderDriverOptions(existingPred?.p3)}
            </select>
          </div>
          <div class="prediction-actions">
            <button type="submit" class="btn btn-primary">Save Prediction</button>
          </div>
          <div class="error-msg" style="display:none;"></div>
          <div class="success-msg" style="display:none;"></div>
        </form>
      </div>
    `;
  }

  function renderDriverOptions(selected) {
    if (!seasonData) return '';
    const teamOrder = seasonData.teams.map(t => t.name);
    const grouped = {};
    for (const team of teamOrder) {
      grouped[team] = seasonData.drivers.filter(d => d.team === team);
    }
    let html = '<option value="">Select driver...</option>';
    for (const team of teamOrder) {
      const drivers = grouped[team];
      for (const driver of drivers) {
        const sel = driver.name === selected ? 'selected' : '';
        html += `<option value="${escHtml(driver.name)}" ${sel}>${escHtml(driver.name)} (${escHtml(team)})</option>`;
      }
    }
    return html;
  }

  function renderResultDisplay(race, type, result, prediction) {
    const title = type === 'race' ? 'Race Results' : 'Sprint Results';
    let score = 0;
    const points = type === 'race' ? { p1: 25, p2: 18, p3: 15 } : { p1: 8, p2: 7, p3: 6 };
    
    let p1Match = false, p2Match = false, p3Match = false;
    if (prediction) {
      if (prediction.p1 === result.p1) { score += points.p1; p1Match = true; }
      if (prediction.p2 === result.p2) { score += points.p2; p2Match = true; }
      if (prediction.p3 === result.p3) { score += points.p3; p3Match = true; }
    }
    
    return `
      <div class="prediction-section">
        <h3>${title}</h3>
        <div class="result-display">
          <h4>Official Results:</h4>
          <div class="result-row">
            <div class="position-label p1">P1</div>
            <span>${escHtml(result.p1)}</span>
            ${prediction ? `<span class="${p1Match ? 'match-yes' : 'match-no'}">${p1Match ? '✓' : '✗'}</span>` : ''}
            ${p1Match ? `<span class="score-earned">+${points.p1}</span>` : ''}
          </div>
          <div class="result-row">
            <div class="position-label p2">P2</div>
            <span>${escHtml(result.p2)}</span>
            ${prediction ? `<span class="${p2Match ? 'match-yes' : 'match-no'}">${p2Match ? '✓' : '✗'}</span>` : ''}
            ${p2Match ? `<span class="score-earned">+${points.p2}</span>` : ''}
          </div>
          <div class="result-row">
            <div class="position-label p3">P3</div>
            <span>${escHtml(result.p3)}</span>
            ${prediction ? `<span class="${p3Match ? 'match-yes' : 'match-no'}">${p3Match ? '✓' : '✗'}</span>` : ''}
            ${p3Match ? `<span class="score-earned">+${points.p3}</span>` : ''}
          </div>
          ${prediction ? `<p class="points-display">You earned <strong>${score} points</strong> for this ${type}!</p>` : '<p class="text-dim">You did not make a prediction for this event.</p>'}
        </div>
      </div>
    `;
  }

  function attachPredictionHandlers(race) {
    const forms = document.querySelectorAll('.prediction-form');
    forms.forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = form.dataset.type;
        const data = {
          type,
          p1: form.p1.value,
          p2: form.p2.value,
          p3: form.p3.value
        };
        
        const resp = await fetch(`/api/predictions/${race.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        });
        
        const result = await resp.json();
        const errorEl = form.querySelector('.error-msg');
        const successEl = form.querySelector('.success-msg');
        
        if (!resp.ok) {
          errorEl.textContent = result.error;
          errorEl.style.display = 'block';
          successEl.style.display = 'none';
          return;
        }
        
        errorEl.style.display = 'none';
        successEl.textContent = '✓ Prediction saved!';
        successEl.style.display = 'block';
      });
    });
  }

  // ── My Predictions View ──
  async function renderMyPredictions(container) {
    container.innerHTML = '<p class="loading">Loading your predictions...</p>';
    
    const resp = await fetch('/api/my-predictions', { credentials: 'include' });
    const data = await resp.json();
    
    if (data.predictions.length === 0) {
      container.innerHTML = `
        <h1 class="view-title">My Predictions</h1>
        <div class="empty-state">
          <h3>No predictions yet</h3>
          <p>Head to the calendar to start making your race predictions!</p>
        </div>
      `;
      return;
    }
    
    const grouped = {};
    for (const pred of data.predictions) {
      if (!grouped[pred.race_id]) grouped[pred.race_id] = {};
      grouped[pred.race_id][pred.prediction_type] = pred;
    }
    
    container.innerHTML = `
      <h1 class="view-title">My Predictions</h1>
      <div id="predList"></div>
    `;
    
    const predList = document.getElementById('predList');
    for (const race of seasonData.races) {
      const racePreds = grouped[race.id];
      if (!racePreds) continue;
      
      const card = document.createElement('div');
      card.className = 'my-pred-card';
      
      let html = `<h4>${escHtml(race.name)}</h4>`;
      if (racePreds.race) {
        html += `<div class="my-pred-drivers">
          <strong>Race:</strong>
          <span class="driver-color-dot" style="background-color: ${getDriverColor(racePreds.race.p1)}"></span>${escHtml(racePreds.race.p1)},
          <span class="driver-color-dot" style="background-color: ${getDriverColor(racePreds.race.p2)}"></span>${escHtml(racePreds.race.p2)},
          <span class="driver-color-dot" style="background-color: ${getDriverColor(racePreds.race.p3)}"></span>${escHtml(racePreds.race.p3)}
        </div>`;
      }
      if (racePreds.sprint) {
        html += `<div class="my-pred-drivers">
          <strong>Sprint:</strong>
          <span class="driver-color-dot" style="background-color: ${getDriverColor(racePreds.sprint.p1)}"></span>${escHtml(racePreds.sprint.p1)},
          <span class="driver-color-dot" style="background-color: ${getDriverColor(racePreds.sprint.p2)}"></span>${escHtml(racePreds.sprint.p2)},
          <span class="driver-color-dot" style="background-color: ${getDriverColor(racePreds.sprint.p3)}"></span>${escHtml(racePreds.sprint.p3)}
        </div>`;
      }
      
      card.innerHTML = html;
      predList.appendChild(card);
    }
  }

  function getDriverColor(driverName) {
    if (!seasonData) return '#666';
    const driver = seasonData.drivers.find(d => d.name === driverName);
    if (!driver) return '#666';
    return teamColors[driver.team] || '#666';
  }

  // ── Leaderboard View ──
  async function renderLeaderboard(container) {
    container.innerHTML = '<p class="loading">Loading leaderboard...</p>';
    
    const resp = await fetch('/api/leaderboard');
    const data = await resp.json();
    
    if (data.leaderboard.length === 0) {
      container.innerHTML = `
        <h1 class="view-title">Leaderboard</h1>
        <div class="empty-state">
          <h3>No scores yet</h3>
          <p>Scores will appear after the first race results are posted.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <h1 class="view-title">Leaderboard</h1>
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th class="sorted">Rank</th>
            <th>Username</th>
            <th>Total Points</th>
            <th class="detail-cell">Race Points</th>
            <th class="detail-cell">Sprint Points</th>
            <th class="detail-cell">Correct</th>
          </tr>
        </thead>
        <tbody id="leaderboardBody"></tbody>
      </table>
    `;
    
    const tbody = document.getElementById('leaderboardBody');
    for (const entry of data.leaderboard) {
      const row = document.createElement('tr');
      const rankClass = entry.rank <= 3 ? `rank-${entry.rank}` : '';
      row.innerHTML = `
        <td class="rank-cell ${rankClass}">${entry.rank}</td>
        <td class="username-cell">${escHtml(entry.username)}</td>
        <td class="points-cell">${entry.totalPoints}</td>
        <td class="detail-cell">${entry.racePoints}</td>
        <td class="detail-cell">${entry.sprintPoints}</td>
        <td class="detail-cell">${entry.correctPredictions} / ${entry.totalPredictions * 3}</td>
      `;
      tbody.appendChild(row);
    }
  }

  // ── Settings View ──
  function renderSettings(container) {
    container.innerHTML = `
      <h1 class="view-title">Settings</h1>
      <div class="settings-card">
        <h3>Email Preferences</h3>
        <p class="text-dim mb-1">Current email: ${escHtml(currentUser.email)}</p>
        <form id="emailForm">
          <div class="checkbox-group">
            <label>
              <input type="checkbox" name="emailOptin" ${currentUser.emailOptin ? 'checked' : ''}>
              <span>Send me race weekend reminders</span>
            </label>
          </div>
          <button type="submit" class="btn btn-primary mt-2">Save Preferences</button>
        </form>
        <div class="success-msg mt-1" id="emailSuccess" style="display:none;">✓ Preferences saved</div>
      </div>
      <div class="settings-card">
        <h3>Account</h3>
        <p class="text-dim">Username: ${escHtml(currentUser.username)}</p>
      </div>
    `;
    
    document.getElementById('emailForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = {
        email: currentUser.email,
        emailOptin: form.emailOptin.checked
      };
      
      await fetch('/api/me/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      currentUser.emailOptin = data.emailOptin;
      document.getElementById('emailSuccess').style.display = 'block';
      setTimeout(() => {
        document.getElementById('emailSuccess').style.display = 'none';
      }, 3000);
    });
  }

  // ── Utilities ──
  function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Start App ──
  init();
})();
