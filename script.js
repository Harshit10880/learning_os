// ===================== STORAGE HELPERS =====================
const S = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k,v) => localStorage.setItem(k, JSON.stringify(v)),
  del: k => localStorage.removeItem(k)
};

// ===================== STATE =====================
const SUBJECT_COLORS = ['#7c3aed','#38bdf8','#22c55e','#f59e0b','#ef4444','#ec4899','#14b8a6','#a3e635','#fb923c','#818cf8'];
function colorForSubject(s) {
  if (s.color) return s.color;
  const idx = state.subjects.findIndex(x => x.id === s.id);
  return SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
}
let state = {
  user: null,
  subjects: [],
  tasks: [],
  sessions: [],
  attendance: [],
  leaves: [],
  posts: [],
  notes: [],
  currentSubjectId: null,
  activeTimers: [],
  pendingAttachments: [],
  pendingAttachType: null,
  analyticsCharts: {},
  weekChartRef: null
};

// ===================== INIT =====================
function init() {
  if (S.get('los_owner_session')) {
    showOwnerPanel();
    startClock();
    return;
  }
  state.user = S.get('los_user');
  if (state.user) {
    showApp();
  }
  startClock();
  scheduleMidnightLogout();
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  const app = document.getElementById('app');
  app.classList.add('visible');
  document.getElementById('topbar-name').textContent = state.user.name;
  attMonthOffset = 0;
  loadAllData();
  renderDashboard();
  renderTasks();
  renderActiveTimers();
  renderSessions();
  renderAttendance();
  renderPosts();
  renderNotes();
  navTo('dashboard');
}

function loadAllData() {
  const u = state.user.name;
  state.subjects = S.get(`los_subjects_${u}`) || [];
  state.tasks = S.get(`los_tasks_${u}`) || [];
  state.sessions = S.get(`los_sessions_${u}`) || [];
  state.attendance = S.get(`los_attendance_${u}`) || [];
  state.leaves = S.get(`los_leaves_${u}`) || [];
  state.posts = S.get('los_posts') || []; // shared
  state.notes = S.get(`los_notes_${u}`) || [];
  state.activeTimers = S.get(`los_active_timers_${u}`) || [];
}

function saveData(key) {
  const u = state.user.name;
  const map = { subjects: 'los_subjects', tasks: 'los_tasks', sessions: 'los_sessions', attendance: 'los_attendance', leaves: 'los_leaves', notes: 'los_notes', activeTimers: 'los_active_timers' };
  if (key === 'posts') { S.set('los_posts', state.posts); return; }
  if (map[key]) S.set(`${map[key]}_${u}`, state[key]);
}

// ===================== CLOCK =====================
function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}
function updateClock() {
  const now = new Date();
  const t = now.toLocaleTimeString('en-US', { hour12: false });
  const d = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const day = now.toLocaleDateString('en-US', { weekday: 'long' });
  const week = getWeekNumber(now);
  const el = document.getElementById('topbar-time');
  if (el) el.textContent = t;
  const ownerClockEl = document.getElementById('owner-topbar-time');
  if (ownerClockEl) ownerClockEl.textContent = t;
  const dt = document.getElementById('dash-time');
  if (dt) dt.textContent = t;
  document.getElementById('dash-date') && (document.getElementById('dash-date').textContent = d);
  document.getElementById('dash-day') && (document.getElementById('dash-day').textContent = day);
  document.getElementById('dash-week') && (document.getElementById('dash-week').textContent = 'W' + week);
  state.activeTimers.forEach(t => {
    if (t.status === 'running') {
      const elapsed = t.elapsed + (Date.now() - t.startTime);
      const el = document.getElementById('timer-disp-' + t.id);
      if (el) el.textContent = formatDuration(elapsed);
    }
  });
}
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// ===================== MIDNIGHT LOGOUT =====================
function scheduleMidnightLogout() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msToMidnight = midnight - now;
  // Show warning 1 minute before
  setTimeout(() => {
    const banner = document.getElementById('logout-banner');
    if (!state.user) return;
    banner.style.display = 'block';
    let cnt = 60;
    const interval = setInterval(() => {
      cnt--;
      document.getElementById('logout-countdown').textContent = cnt;
      if (cnt <= 0) { clearInterval(interval); doLogout(true); }
    }, 1000);
  }, Math.max(0, msToMidnight - 60000));
  setTimeout(() => {
    if (state.user) doLogout(true);
  }, msToMidnight);
}

// ===================== LOGIN / LOGOUT =====================
function doLogin() {
  const name = document.getElementById('login-username').value.trim();
  const pass = document.getElementById('login-password').value;
  if (!name) { document.getElementById('login-error').textContent = 'Please enter your name.'; return; }
  if (!pass) { document.getElementById('login-error').textContent = 'Please enter a password.'; return; }

  // Owner login check (static credentials, separate from student accounts)
  if (name.toLowerCase() === 'owner') {
    if (pass === '1010') {
      showOwnerPanel();
      return;
    } else {
      document.getElementById('login-error').textContent = 'Incorrect owner password.';
      return;
    }
  }

  const users = S.get('los_users') || {};
  if (users[name]) {
    if (users[name] !== pass) { document.getElementById('login-error').textContent = 'Incorrect password.'; return; }
  } else {
    users[name] = pass;
    S.set('los_users', users);
  }
  const now = new Date();
  const loginTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateKey = toDateKey(now);
  state.user = { name, loginTime };
  S.set('los_user', state.user);
  // Mark attendance
  loadAllData();
  const attEntry = state.attendance.find(a => a.date === dateKey);
  const isLeave = state.leaves.some(l => dateKey >= l.startDate && dateKey <= l.endDate);
  if (!attEntry && !isLeave) {
    state.attendance.push({ date: dateKey, loginTime, logoutTime: null, status: 'present' });
    saveData('attendance');
  }
  showApp();
}

function doLogout(auto = false) {
  if (!state.user) return;
  const now = new Date();
  const dateKey = toDateKey(now);
  const logoutTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const attIdx = state.attendance.findIndex(a => a.date === dateKey);
  if (attIdx >= 0) {
    state.attendance[attIdx].logoutTime = logoutTime;
    saveData('attendance');
  }
  state.activeTimers.forEach(t => {
    if (t.status === 'running') {
      t.elapsed += Date.now() - t.startTime;
      t.status = 'paused';
    }
  });
  saveData('activeTimers');
  S.del('los_user');
  state.user = null;
  document.getElementById('logout-banner').style.display = 'none';
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').textContent = '';
  if (auto) showToast('Session ended. Good night! ðŸŒ™', 'success');
}

// ===================== NAVIGATION =====================
function navTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');
  if (page === 'dashboard') renderDashboard();
  if (page === 'subjects') renderSubjects();
  if (page === 'tasks') { renderTaskSubjectFilter(); renderTasks(); }
  if (page === 'timer') { renderActiveTimers(); renderSessions(); }
  if (page === 'attendance') renderAttendance();
  if (page === 'community') renderPosts();
  if (page === 'analytics') renderAnalytics();
  if (page === 'notes') renderNotes();
  // close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
}
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===================== DASHBOARD =====================
function renderDashboard() {
  if (!state.user) return;
  // login time
  const el = document.getElementById('dash-login-time');
  if (el) el.textContent = state.user.loginTime || 'â€”';

  // overall progress
  const subjs = state.subjects;
  let overall = 0;
  if (subjs.length > 0) {
    const sum = subjs.reduce((a, s) => a + calcSubjectProgress(s), 0);
    overall = Math.round(sum / subjs.length);
  }
  setRoundProgress('overall-circle', 'overall-pct', overall);

  // attendance this month
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const daysElapsed = now.getDate();
  const presentDays = state.attendance.filter(a => a.date.startsWith(monthStr) && a.status === 'present').length;
  const leaveDays = state.leaves.filter(l => {
    const s = new Date(l.startDate), e = new Date(l.endDate);
    const ms = new Date(monthStr + '-01'), me = new Date(now);
    return s <= me && e >= ms;
  }).length;
  const attRate = daysElapsed > 0 ? Math.round(((presentDays + leaveDays) / daysElapsed) * 100) : 0;
  setRoundProgress('att-circle', 'att-pct', Math.min(100, attRate));

  // subject bars
  const dashSubj = document.getElementById('dash-subjects');
  if (subjs.length === 0) {
    dashSubj.innerHTML = '<div class="empty-state"><div class="empty-icon">ðŸ“š</div><div class="empty-text">No subjects yet</div></div>';
  } else {
    dashSubj.innerHTML = subjs.map(s => {
      const pct = calcSubjectProgress(s);
      const c = colorForSubject(s);
      return `<div class="subject-bar-row" onclick="openRoadmap('${s.id}')">
        <span class="subject-bar-name" style="color:${c};">â—&nbsp; ${escHtml(s.name)}</span>
        <div class="subject-bar-track"><div class="subject-bar-fill" style="width:${pct}%;background:linear-gradient(90deg, ${c}, ${c}cc);"></div></div>
        <span class="subject-bar-pct">${pct}%</span>
      </div>`;
    }).join('');
  }

  // tasks
  const tasks = state.tasks;
  document.getElementById('dash-total-tasks').textContent = tasks.length;
  document.getElementById('dash-done-tasks').textContent = tasks.filter(t => t.status === 'completed').length;
  document.getElementById('dash-pending-tasks').textContent = tasks.filter(t => t.status === 'pending').length;
  document.getElementById('dash-cancel-tasks').textContent = tasks.filter(t => t.status === 'cancelled').length;

  // today's study
  const todayKey = toDateKey(new Date());
  const yesterdayKey = toDateKey(new Date(Date.now() - 86400000));
  const todaySessions = state.sessions.filter(s => s.date === todayKey && s.status === 'done');
  const yesterdaySessions = state.sessions.filter(s => s.date === yesterdayKey && s.status === 'done');
  const totalMs = todaySessions.reduce((a, s) => a + s.duration, 0);
  const yesterdayMs = yesterdaySessions.reduce((a, s) => a + s.duration, 0);
  document.getElementById('dash-study-today').textContent = formatHM(totalMs);

  // vs yesterday badge
  const vsBadge = document.getElementById('dash-vs-yesterday');
  if (vsBadge) {
    if (yesterdayMs === 0 && totalMs === 0) {
      vsBadge.textContent = 'No data yet';
    } else if (yesterdayMs === 0) {
      vsBadge.textContent = 'ðŸ”¥ First session today';
    } else {
      const diffPct = Math.round(((totalMs - yesterdayMs) / yesterdayMs) * 100);
      vsBadge.textContent = diffPct >= 0 ? `â–² ${diffPct}% vs yesterday` : `â–¼ ${Math.abs(diffPct)}% vs yesterday`;
      vsBadge.style.color = diffPct >= 0 ? 'var(--success)' : 'var(--warn)';
      vsBadge.style.background = diffPct >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)';
      vsBadge.style.borderColor = diffPct >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)';
    }
  }

  // mini stats
  document.getElementById('dash-sessions-count').textContent = todaySessions.length;
  const avgMs = todaySessions.length > 0 ? totalMs / todaySessions.length : 0;
  document.getElementById('dash-avg-session').textContent = avgMs > 0 ? formatHM(avgMs) : '0m';
  const weekStartForTotal = new Date();
  const dow = weekStartForTotal.getDay();
  weekStartForTotal.setDate(weekStartForTotal.getDate() - (dow === 0 ? 6 : dow - 1));
  let weekMs = 0;
  for (let d = new Date(weekStartForTotal); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const key = toDateKey(d);
    weekMs += state.sessions.filter(s => s.date === key && s.status === 'done').reduce((a, s) => a + s.duration, 0);
  }
  document.getElementById('dash-week-total').textContent = (Math.round(weekMs / 3600000 * 10) / 10) + 'h';

  const sessDiv = document.getElementById('dash-sessions-today');
  if (todaySessions.length === 0) {
    sessDiv.innerHTML = '<div class="empty-state" style="padding:24px 12px;"><div class="empty-icon" style="font-size:1.8rem;">ðŸ“–</div><div class="empty-text">No sessions today yet â€” start a timer!</div></div>';
  } else {
    sessDiv.innerHTML = todaySessions.map(s => {
      const subj = state.subjects.find(x => x.id === s.subjectId);
      const c = subj ? colorForSubject(subj) : '#8b80a8';
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);">
        <div style="width:6px;height:6px;border-radius:50%;background:${c};flex-shrink:0;"></div>
        <span style="font-size:0.82rem;color:${c};font-weight:600;">${escHtml(getSubjectName(s.subjectId))}</span>
        <span style="font-size:0.8rem;color:var(--muted);">${escHtml(s.taskName)}</span>
        <span style="margin-left:auto;font-size:0.78rem;color:var(--text);font-weight:600;font-family:var(--font-display);">${formatHM(s.duration)}</span>
      </div>`;
    }).join('');
  }

  // week chart
  renderWeekChart();

  // streak
  const streakEl = document.getElementById('dash-streak');
  if (streakEl) streakEl.textContent = 'ðŸ”¥ ' + calcStreak();
}

function calcStreak() {
  const studyDays = new Set(state.sessions.filter(s => s.status === 'done').map(s => s.date));
  let streak = 0;
  let cursor = new Date();
  // if no session today yet, start counting from yesterday so an active streak isn't broken mid-day
  if (!studyDays.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (studyDays.has(toDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderWeekChart() {
  const ctx = document.getElementById('study-week-chart');
  if (!ctx) return;
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7; // Mon=0 ... Sun=6
  const weekData = days.map((d, i) => {
    const date = new Date(now);
    const dayOfWeek = now.getDay();
    const diff = i + 1 - (dayOfWeek === 0 ? 7 : dayOfWeek);
    date.setDate(date.getDate() + diff);
    const key = toDateKey(date);
    const ms = state.sessions.filter(s => s.date === key && s.status === 'done').reduce((a, s) => a + s.duration, 0);
    return Math.round(ms / 3600000 * 10) / 10;
  });
  if (state.weekChartRef) state.weekChartRef.destroy();
  const canvasCtx = ctx.getContext('2d');
  const gradient = canvasCtx.createLinearGradient(0, 0, 0, 150);
  gradient.addColorStop(0, '#c084fc');
  gradient.addColorStop(1, '#7c3aed');
  const colors = days.map((_, i) => i === todayIdx ? gradient : 'rgba(124,58,237,0.35)');
  const borderColors = days.map((_, i) => i === todayIdx ? '#c084fc' : 'rgba(124,58,237,0.5)');
  state.weekChartRef = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{ data: weekData, backgroundColor: colors, borderColor: borderColors, borderWidth: 1.5, borderRadius: 8, maxBarThickness: 36 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e1a30', borderColor: '#2e2850', borderWidth: 1, padding: 10,
          titleFont: { family: 'Inter', size: 11 }, bodyFont: { family: 'Inter', size: 12, weight: '600' },
          callbacks: { label: ctx => ctx.parsed.y + ' hours' }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8b80a8', font: { size: 10, family: 'Inter' } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b80a8', font: { size: 10, family: 'Inter' } }, beginAtZero: true }
      }
    }
  });
}

function setRoundProgress(circleId, pctId, pct) {
  const circle = document.getElementById(circleId);
  const label = document.getElementById(pctId);
  if (!circle || !label) return;
  const r = 58; const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  circle.style.strokeDashoffset = offset;
  label.textContent = pct + '%';
}

// ===================== SUBJECTS =====================
function calcSubjectProgress(s) {
  if (!s.topics || s.topics.length === 0) return 0;
  const done = s.topics.filter(t => t.done).length;
  return Math.round((done / s.topics.length) * 100);
}

function renderSubjects() {
  const grid = document.getElementById('subjects-grid');
  if (state.subjects.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">ðŸ“š</div><div class="empty-text">No subjects yet. Add one above!</div></div>';
    return;
  }
  grid.innerHTML = state.subjects.map(s => {
    const pct = calcSubjectProgress(s);
    const total = s.topics ? s.topics.length : 0;
    const done = s.topics ? s.topics.filter(t => t.done).length : 0;
    const c = colorForSubject(s);
    return `<div class="subject-card" onclick="openRoadmap('${s.id}')" style="border-top:3px solid ${c};">
      <div class="sc-name" style="color:${c};">${escHtml(s.name)}</div>
      <div class="sc-meta">${done}/${total} topics complete</div>
      <div class="sc-bar-track"><div class="sc-bar-fill" style="width:${pct}%;background:linear-gradient(90deg, ${c}, ${c}cc);"></div></div>
      <div class="sc-pct" style="color:${c};">${pct}%</div>
    </div>`;
  }).join('');
}

function addSubject() {
  const input = document.getElementById('new-subject-input');
  const name = input.value.trim();
  if (!name) return;
  const id = 'subj_' + Date.now();
  const color = SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length];
  state.subjects.push({ id, name, color, topics: [] });
  saveData('subjects');
  input.value = '';
  renderSubjects();
  renderTaskSubjectFilter();
  showToast(`Subject "${name}" added`, 'success');
}

function openRoadmap(id) {
  const s = state.subjects.find(s => s.id === id);
  if (!s) return;
  state.currentSubjectId = id;
  const c = colorForSubject(s);
  document.getElementById('roadmap-modal-title').textContent = s.name;
  document.getElementById('roadmap-modal-title').style.color = c;
  renderTopicList(s);
  openModal('modal-roadmap');
}

function renderTopicList(s) {
  const pct = calcSubjectProgress(s);
  const c = colorForSubject(s);
  const total = s.topics ? s.topics.length : 0;
  const done = s.topics ? s.topics.filter(t => t.done).length : 0;
  document.getElementById('roadmap-progress-bar').style.width = pct + '%';
  document.getElementById('roadmap-progress-bar').style.background = `linear-gradient(90deg, ${c}, ${c}cc)`;
  document.getElementById('roadmap-progress-text').textContent = `${done} of ${total} topics done`;
  document.getElementById('roadmap-progress-pct').textContent = pct + '%';
  document.getElementById('roadmap-progress-pct').style.color = c;
  const list = document.getElementById('topic-list');
  if (!s.topics || s.topics.length === 0) {
    list.innerHTML = '<div style="font-size:0.83rem;color:var(--muted);padding:8px 0;">No topics yet. Add one below.</div>';
    return;
  }
  list.innerHTML = s.topics.map((t, i) => `
    <div class="topic-item">
      <div class="topic-check ${t.done ? 'done' : ''}" style="${t.done ? `background:${c};border-color:${c};` : ''}" onclick="toggleTopic('${s.id}', ${i})">${t.done ? 'âœ“' : ''}</div>
      <div class="topic-name ${t.done ? 'done' : ''}">${escHtml(t.name)}</div>
      <div style="display:flex;gap:2px;">
        <button class="topic-del" onclick="moveTopic('${s.id}', ${i}, -1)" ${i === 0 ? 'style="opacity:0.25;pointer-events:none;"' : ''} title="Move up">â†‘</button>
        <button class="topic-del" onclick="moveTopic('${s.id}', ${i}, 1)" ${i === s.topics.length - 1 ? 'style="opacity:0.25;pointer-events:none;"' : ''} title="Move down">â†“</button>
      </div>
      <button class="topic-del" onclick="deleteTopic('${s.id}', ${i})">âœ•</button>
    </div>`).join('');
}

function moveTopic(subjectId, idx, dir) {
  const s = state.subjects.find(s => s.id === subjectId);
  if (!s) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= s.topics.length) return;
  [s.topics[idx], s.topics[newIdx]] = [s.topics[newIdx], s.topics[idx]];
  saveData('subjects');
  renderTopicList(s);
}

function toggleTopic(subjectId, idx) {
  const s = state.subjects.find(s => s.id === subjectId);
  if (!s) return;
  s.topics[idx].done = !s.topics[idx].done;
  saveData('subjects');
  renderTopicList(s);
  renderSubjects();
}

function deleteTopic(subjectId, idx) {
  const s = state.subjects.find(s => s.id === subjectId);
  if (!s) return;
  if (!confirm(`Delete topic "${s.topics[idx].name}"?`)) return;
  s.topics.splice(idx, 1);
  saveData('subjects');
  renderTopicList(s);
}

function addTopic() {
  const input = document.getElementById('new-topic-input');
  const name = input.value.trim();
  if (!name) return;
  const s = state.subjects.find(s => s.id === state.currentSubjectId);
  if (!s) return;
  if (!s.topics) s.topics = [];
  s.topics.push({ name, done: false });
  saveData('subjects');
  input.value = '';
  renderTopicList(s);
}

function deleteSubject() {
  if (!confirm('Delete this subject and all its topics?')) return;
  state.subjects = state.subjects.filter(s => s.id !== state.currentSubjectId);
  saveData('subjects');
  closeModal('modal-roadmap');
  renderSubjects();
  showToast('Subject deleted', 'success');
}

// ===================== TASKS =====================
function renderTaskSubjectFilter() {
  const sel1 = document.getElementById('task-filter-subject');
  const sel2 = document.getElementById('task-subject-input');
  const sel3 = document.getElementById('session-subject-input');
  const opts = state.subjects.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('');
  if (sel1) sel1.innerHTML = '<option value="">All Subjects</option>' + opts;
  if (sel2) sel2.innerHTML = opts || '<option value="">âš  Add a subject first</option>';
  if (sel3) sel3.innerHTML = opts || '<option value="">âš  Add a subject first</option>';
}

function renderTasks() {
  const search = (document.getElementById('task-search')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('task-filter-status')?.value || '';
  const filterSubj = document.getElementById('task-filter-subject')?.value || '';
  let tasks = state.tasks.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterSubj && t.subjectId !== filterSubj) return false;
    if (search && !t.name.toLowerCase().includes(search)) return false;
    return true;
  });
  const list = document.getElementById('task-list');
  if (!list) return;
  if (tasks.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">âœ…</div><div class="empty-text">No tasks found</div></div>';
    return;
  }
  list.innerHTML = tasks.map(t => {
    const isDone = t.status === 'completed';
    const isCan = t.status === 'cancelled';
    const subj = state.subjects.find(s => s.id === t.subjectId);
    const subjColor = subj ? colorForSubject(subj) : '#8b80a8';
    const isOverdue = t.deadline && t.status === 'pending' && t.deadline < toDateKey(new Date());
    return `<div class="task-item">
      <div class="task-checkbox ${isDone ? 'checked' : isCan ? 'cancelled-cb' : ''}" onclick="quickToggleTask('${t.id}')">${isDone ? 'âœ“' : isCan ? 'âœ•' : ''}</div>
      <div class="task-info">
        <div class="task-name ${isDone ? 'done' : ''}">${escHtml(t.name)}</div>
        <div class="task-tags">
          <span class="tag subject" style="background:${subjColor}26;color:${subjColor};">${escHtml(getSubjectName(t.subjectId))}</span>
          <span class="tag priority-${t.priority}">${t.priority}</span>
          <span class="tag status-${t.status}">${t.status}</span>
          ${isOverdue ? '<span class="tag" style="background:rgba(239,68,68,0.2);color:#ef4444;">âš  overdue</span>' : ''}
        </div>
      </div>
      ${t.deadline ? `<div class="task-deadline" style="${isOverdue ? 'color:var(--danger);font-weight:600;' : ''}">ðŸ“… ${t.deadline}</div>` : ''}
      <div class="task-actions">
        <button class="btn-icon" onclick="openTaskModal('${t.id}')">âœ</button>
        <button class="btn-icon danger" onclick="deleteTask('${t.id}')">ðŸ—‘</button>
      </div>
    </div>`;
  }).join('');
}

function openTaskModal(id) {
  renderTaskSubjectFilter();
  document.getElementById('task-modal-title').textContent = id ? 'Edit Task' : 'Add Task';
  document.getElementById('edit-task-id').value = id || '';
  if (id) {
    const t = state.tasks.find(t => t.id === id);
    if (!t) return;
    document.getElementById('task-name-input').value = t.name;
    document.getElementById('task-subject-input').value = t.subjectId || '';
    document.getElementById('task-priority-input').value = t.priority;
    document.getElementById('task-deadline-input').value = t.deadline || '';
    document.getElementById('task-status-input').value = t.status;
  } else {
    document.getElementById('task-name-input').value = '';
    document.getElementById('task-priority-input').value = 'medium';
    document.getElementById('task-deadline-input').value = '';
    document.getElementById('task-status-input').value = 'pending';
  }
  openModal('modal-task');
}

function saveTask() {
  if (state.subjects.length === 0) { showToast('Add a subject first', 'error'); return; }
  const id = document.getElementById('edit-task-id').value;
  const name = document.getElementById('task-name-input').value.trim();
  if (!name) { showToast('Task name required', 'error'); return; }
  const task = {
    id: id || 'task_' + Date.now(),
    name,
    subjectId: document.getElementById('task-subject-input').value,
    priority: document.getElementById('task-priority-input').value,
    deadline: document.getElementById('task-deadline-input').value,
    status: document.getElementById('task-status-input').value
  };
  if (id) {
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx >= 0) state.tasks[idx] = task;
  } else {
    state.tasks.push(task);
  }
  saveData('tasks');
  closeModal('modal-task');
  renderTasks();
  showToast(id ? 'Task updated' : 'Task added', 'success');
}

function quickToggleTask(id) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  if (t.status === 'pending') t.status = 'completed';
  else if (t.status === 'completed') t.status = 'cancelled';
  else t.status = 'pending';
  saveData('tasks');
  renderTasks();
}

function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveData('tasks');
  renderTasks();
  showToast('Task deleted');
}

// ===================== TIMER (MULTI, PARALLEL) =====================
function openSessionModal() {
  renderTaskSubjectFilter();
  document.getElementById('session-task-input').value = '';
  openModal('modal-session');
}

function startSession() {
  if (state.subjects.length === 0) { showToast('Add a subject first', 'error'); return; }
  const subjectId = document.getElementById('session-subject-input').value;
  const taskName = document.getElementById('session-task-input').value.trim();
  if (!taskName) { showToast('Enter a task name', 'error'); return; }
  closeModal('modal-session');
  state.activeTimers.push({
    id: 'tmr_' + Date.now() + '_' + Math.floor(Math.random()*1000),
    subjectId, taskName,
    status: 'running',
    startTime: Date.now(),
    elapsed: 0
  });
  saveData('activeTimers');
  renderActiveTimers();
}

function pauseResumeTimer(id) {
  const t = state.activeTimers.find(t => t.id === id);
  if (!t) return;
  if (t.status === 'running') {
    t.elapsed += Date.now() - t.startTime;
    t.status = 'paused';
  } else if (t.status === 'paused') {
    t.startTime = Date.now();
    t.status = 'running';
  }
  saveData('activeTimers');
  renderActiveTimers();
}

function markTimerPending(id) {
  const t = state.activeTimers.find(t => t.id === id);
  if (!t) return;
  if (t.status === 'running') t.elapsed += Date.now() - t.startTime;
  t.status = 'pending';
  saveData('activeTimers');
  renderActiveTimers();
  showToast(`Marked pending at ${formatDuration(t.elapsed)}`);
}

function resumePendingTimer(id) {
  const t = state.activeTimers.find(t => t.id === id);
  if (!t) return;
  t.status = 'running';
  t.startTime = Date.now();
  saveData('activeTimers');
  renderActiveTimers();
  showToast('Resumed â€” continuing from ' + formatDuration(t.elapsed));
}

function finishTimer(id, status = 'done') {
  const idx = state.activeTimers.findIndex(t => t.id === id);
  if (idx < 0) return;
  const t = state.activeTimers[idx];
  const finalElapsed = t.elapsed + (t.status === 'running' ? Date.now() - t.startTime : 0);
  const session = {
    id: 'sess_' + Date.now(),
    date: toDateKey(new Date()),
    subjectId: t.subjectId,
    taskName: t.taskName,
    duration: finalElapsed,
    status
  };
  state.sessions.push(session);
  saveData('sessions');
  state.activeTimers.splice(idx, 1);
  saveData('activeTimers');
  renderActiveTimers();
  renderSessions();
  renderDashboard();
  showToast(status === 'done' ? `Session saved: ${formatHM(finalElapsed)}` : 'Session cancelled', status === 'done' ? 'success' : '');
}

function cancelTimer(id) {
  if (!confirm('Discard this timer without saving?')) return;
  finishTimer(id, 'cancelled');
}

function renderActiveTimers() {
  const container = document.getElementById('active-timers-container');
  const badge = document.getElementById('timer-nav-badge');
  if (!container) return;
  const running = state.activeTimers.filter(t => t.status === 'running' || t.status === 'paused');
  const pending = state.activeTimers.filter(t => t.status === 'pending');

  if (badge) badge.style.display = running.length > 0 ? 'inline-block' : 'none';

  if (running.length === 0) {
    container.innerHTML = '<div class="empty-state" id="no-active-timers"><div class="empty-icon">â±</div><div class="empty-text">No active timers â€” click "+ Add Timer" to start studying</div></div>';
  } else {
    container.innerHTML = running.map(t => {
      const subj = state.subjects.find(s => s.id === t.subjectId);
      const c = subj ? colorForSubject(subj) : '#c084fc';
      const isPaused = t.status === 'paused';
      const liveElapsed = t.elapsed + (t.status === 'running' ? Date.now() - t.startTime : 0);
      return `<div class="timer-card ${isPaused ? 'is-paused' : ''}" style="--timer-accent:${c};">
        <div class="timer-card-info">
          <div class="timer-card-status" style="color:${isPaused ? 'var(--warn)' : c};">${isPaused ? 'â¸ Paused' : 'â— Running'}</div>
          <div class="timer-card-subject" style="color:${c};">${escHtml(getSubjectName(t.subjectId))}</div>
          <div class="timer-card-task">${escHtml(t.taskName)}</div>
        </div>
        <div class="timer-card-display ${isPaused ? 'paused' : 'running'}" id="timer-disp-${t.id}">${formatDuration(liveElapsed)}</div>
        <div class="timer-card-actions">
          <button class="btn-timer-sm ${isPaused ? 'btn-start' : 'btn-pause'}" onclick="pauseResumeTimer('${t.id}')">${isPaused ? 'â–¶ Resume' : 'â¸ Pause'}</button>
          <button class="btn-timer-sm btn-done" onclick="finishTimer('${t.id}', 'done')">âœ“ Done</button>
          <button class="btn-timer-sm btn-pending-t" onclick="markTimerPending('${t.id}')">â¸ Pending</button>
          <button class="btn-timer-sm btn-cancel-t" onclick="cancelTimer('${t.id}')">âœ• Cancel</button>
        </div>
      </div>`;
    }).join('');
  }

  const pendList = document.getElementById('pending-sessions-list');
  if (pendList) {
    if (pending.length === 0) {
      pendList.innerHTML = '<div class="empty-state"><div class="empty-icon">â¸</div><div class="empty-text">No pending sessions</div></div>';
    } else {
      pendList.innerHTML = pending.map(t => {
        const subj = state.subjects.find(s => s.id === t.subjectId);
        const c = subj ? colorForSubject(subj) : '#8b80a8';
        return `<div class="pending-session-item">
          <div class="pending-session-time">${formatDuration(t.elapsed)}</div>
          <div style="flex:1;">
            <div style="font-size:0.88rem;font-weight:600;color:${c};">${escHtml(getSubjectName(t.subjectId))}</div>
            <div style="font-size:0.8rem;color:var(--muted);">${escHtml(t.taskName)}</div>
          </div>
          <button class="btn-timer-sm btn-start" onclick="resumePendingTimer('${t.id}')">â–¶ Resume</button>
          <button class="btn-timer-sm btn-done" onclick="finishTimer('${t.id}', 'done')">âœ“ Done</button>
          <button class="btn-icon danger" onclick="cancelTimer('${t.id}')">ðŸ—‘</button>
        </div>`;
      }).join('');
    }
  }
}

function renderSessions() {
  const list = document.getElementById('session-history-list');
  if (!list) return;
  if (state.sessions.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">â±</div><div class="empty-text">No sessions yet</div></div>';
    return;
  }
  // Group by date
  const grouped = {};
  [...state.sessions].reverse().forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  });
  list.innerHTML = Object.entries(grouped).map(([date, sessions]) => {
    const totalMs = sessions.filter(s => s.status === 'done').reduce((a, s) => a + s.duration, 0);
    return `<div class="session-day">
      <div class="session-day-header"><span>${formatDateFriendly(date)}</span><span>${formatHM(totalMs)}</span></div>
      ${sessions.map(s => {
        const subj = state.subjects.find(x => x.id === s.subjectId);
        const c = subj ? colorForSubject(subj) : '#8b80a8';
        return `
        <div class="session-item">
          <div class="session-dot ${s.status}"></div>
          <div class="session-info">
            <div class="session-sub" style="color:${c};">${escHtml(getSubjectName(s.subjectId))}</div>
            <div class="session-task">${escHtml(s.taskName)}</div>
          </div>
          <div class="session-dur">${s.status === 'done' ? formatHM(s.duration) : s.status}</div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
}

// ===================== ATTENDANCE =====================
let attMonthOffset = 0; // 0 = current month, -1 = last month, etc.

function changeAttMonth(dir) {
  const newOffset = attMonthOffset + dir;
  if (newOffset > 0) return; // can't go beyond current month
  attMonthOffset = newOffset;
  renderAttendance();
}

function renderAttendance() {
  const base = new Date();
  const viewDate = new Date(base.getFullYear(), base.getMonth() + attMonthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  document.getElementById('att-month-title').textContent = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const nextBtn = document.getElementById('att-next-btn');
  if (nextBtn) nextBtn.style.opacity = attMonthOffset >= 0 ? '0.25' : '1';
  if (nextBtn) nextBtn.style.pointerEvents = attMonthOffset >= 0 ? 'none' : 'auto';
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const now = new Date();
  const todayKey = toDateKey(now);
  const monthStr = `${year}-${String(month+1).padStart(2,'0')}`;
  const isCurrentMonthView = attMonthOffset === 0;

  // Build leave date set
  const leaveDates = new Set();
  state.leaves.forEach(l => {
    let d = new Date(l.startDate);
    while (d <= new Date(l.endDate)) {
      leaveDates.add(toDateKey(d));
      d.setDate(d.getDate() + 1);
    }
  });

  let cal = '';
  for (let i = 0; i < firstDay; i++) cal += '<div class="att-day" style="background:transparent;"></div>';
  let presentCount = 0, leaveCount = 0, absentCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${monthStr}-${String(d).padStart(2,'0')}`;
    const isFuture = key > todayKey;
    const isToday = key === todayKey;
    let cls = 'att-day', label = d;
    if (isFuture) {
      cls += ' future';
    } else if (leaveDates.has(key)) {
      cls += ' leave'; leaveCount++;
    } else if (state.attendance.find(a => a.date === key && a.status === 'present')) {
      cls += ' present'; presentCount++;
    } else {
      cls += ' absent'; absentCount++;
    }
    if (isToday) cls += ' today';
    cal += `<div class="${cls}" title="${key}">${label}</div>`;
  }
  document.getElementById('att-calendar').innerHTML = cal;
  document.getElementById('att-present-count').textContent = presentCount;
  document.getElementById('att-leave-count').textContent = leaveCount;
  document.getElementById('att-absent-count').textContent = absentCount;
  const total = presentCount + leaveCount + absentCount;
  const rate = total > 0 ? Math.round(((presentCount + leaveCount) / total) * 100) : 0;
  document.getElementById('att-rate-text').textContent = rate + '%';
  const statsTitle = document.getElementById('att-stats-title');
  if (statsTitle) statsTitle.textContent = isCurrentMonthView ? 'This Month' : viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Leaves list â€” filter to leaves that overlap the viewed month, most recent first
  const leaveList = document.getElementById('leave-list');
  const monthStart = `${monthStr}-01`;
  const monthEnd = `${monthStr}-${String(daysInMonth).padStart(2,'0')}`;
  const monthLeaves = state.leaves.filter(l => l.startDate <= monthEnd && l.endDate >= monthStart);
  if (monthLeaves.length === 0) {
    leaveList.innerHTML = `<div class="empty-state"><div class="empty-icon">ðŸ–</div><div class="empty-text">No leaves in ${viewDate.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div></div>`;
  } else {
    leaveList.innerHTML = [...monthLeaves].reverse().map(l => {
      const realIdx = state.leaves.indexOf(l);
      return `
      <div class="leave-item">
        <div>
          <div class="leave-dates">ðŸ“… ${l.startDate} â†’ ${l.endDate}</div>
          <div class="leave-reason">${escHtml(l.reason)}</div>
        </div>
        <div class="leave-badge">Leave</div>
        <button class="btn-icon danger" onclick="deleteLeave(${realIdx})" style="margin-left:8px;">âœ•</button>
      </div>`;
    }).join('');
  }

  // Next leave
  const upcoming = state.leaves.filter(l => l.startDate >= toDateKey(now));
  document.getElementById('next-leave-info').textContent = upcoming.length > 0
    ? `Next leave: ${upcoming[0].startDate}` : 'No upcoming leaves';
}

function openLeaveModal() {
  document.getElementById('leave-start').value = '';
  document.getElementById('leave-end').value = '';
  document.getElementById('leave-reason').value = '';
  openModal('modal-leave');
}

function applyLeave() {
  const start = document.getElementById('leave-start').value;
  const end = document.getElementById('leave-end').value;
  const reason = document.getElementById('leave-reason').value.trim();
  if (!start || !end) { showToast('Select start and end dates', 'error'); return; }
  if (end < start) { showToast('End date must be after start', 'error'); return; }
  if (!reason) { showToast('Enter a reason', 'error'); return; }
  state.leaves.push({ startDate: start, endDate: end, reason });
  saveData('leaves');
  closeModal('modal-leave');
  renderAttendance();
  showToast('Leave applied', 'success');
}

function deleteLeave(idx) {
  if (!confirm('Remove this leave record?')) return;
  state.leaves.splice(idx, 1);
  saveData('leaves');
  renderAttendance();
  showToast('Leave removed');
}

// ===================== NOTES =====================
const NOTE_TYPE_META = {
  note:     { icon: 'ðŸ“', color: '#38bdf8', label: 'Note' },
  task:     { icon: 'âœ…', color: '#22c55e', label: 'Task' },
  idea:     { icon: 'ðŸ’¡', color: '#f59e0b', label: 'Idea' },
  reminder: { icon: 'â°', color: '#ec4899', label: 'Reminder' }
};

function renderNotes() {
  const list = document.getElementById('notes-list');
  if (!list) return;
  const search = (document.getElementById('notes-search')?.value || '').toLowerCase();
  const filterType = document.getElementById('notes-filter-type')?.value || '';
  let notes = [...state.notes].reverse().filter(n => {
    if (filterType && n.type !== filterType) return false;
    if (search && !n.title.toLowerCase().includes(search) && !(n.content||'').toLowerCase().includes(search)) return false;
    return true;
  });
  if (notes.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">ðŸ—’</div><div class="empty-text">No notes found</div></div>';
    return;
  }
  list.innerHTML = notes.map(n => {
    const meta = NOTE_TYPE_META[n.type] || NOTE_TYPE_META.note;
    return `<div class="task-item" style="align-items:flex-start;">
      <div style="font-size:1.1rem;flex-shrink:0;margin-top:2px;">${meta.icon}</div>
      <div class="task-info">
        <div class="task-name">${escHtml(n.title)}</div>
        ${n.content ? `<div style="font-size:0.82rem;color:var(--muted);margin-top:4px;line-height:1.5;white-space:pre-wrap;">${escHtml(n.content)}</div>` : ''}
        <div class="task-tags">
          <span class="tag" style="background:${meta.color}26;color:${meta.color};">${meta.label}</span>
          <span style="font-size:0.7rem;color:var(--muted2);">${n.date}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon" onclick="openNoteModal('${n.id}')">âœ</button>
        <button class="btn-icon danger" onclick="deleteNote('${n.id}')">ðŸ—‘</button>
      </div>
    </div>`;
  }).join('');
}

function openNoteModal(id) {
  document.getElementById('note-modal-title').textContent = id ? 'Edit Note' : 'New Note';
  document.getElementById('edit-note-id').value = id || '';
  if (id) {
    const n = state.notes.find(n => n.id === id);
    if (!n) return;
    document.getElementById('note-type-input').value = n.type;
    document.getElementById('note-title-input').value = n.title;
    document.getElementById('note-content-input').value = n.content || '';
  } else {
    document.getElementById('note-type-input').value = 'note';
    document.getElementById('note-title-input').value = '';
    document.getElementById('note-content-input').value = '';
  }
  openModal('modal-note');
}

function saveNote() {
  const id = document.getElementById('edit-note-id').value;
  const title = document.getElementById('note-title-input').value.trim();
  if (!title) { showToast('Title required', 'error'); return; }
  const type = document.getElementById('note-type-input').value;
  const content = document.getElementById('note-content-input').value.trim();
  if (id) {
    const n = state.notes.find(n => n.id === id);
    if (n) { n.type = type; n.title = title; n.content = content; }
  } else {
    state.notes.push({
      id: 'note_' + Date.now(),
      type, title, content,
      date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    });
  }
  saveData('notes');
  closeModal('modal-note');
  renderNotes();
  showToast(id ? 'Note updated' : 'Note added', 'success');
}

function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  state.notes = state.notes.filter(n => n.id !== id);
  saveData('notes');
  renderNotes();
  showToast('Note deleted');
}

// ===================== COMMUNITY =====================
let pendingAttachments = [];
let currentAttachType = null;
let editingPostId = null;

function editPost(id) {
  const p = state.posts.find(p => p.id === id);
  if (!p) return;
  editingPostId = id;
  document.getElementById('post-description').value = p.description || '';
  pendingAttachments = [...p.attachments];
  renderAttachPreview();
  document.querySelector('.post-form-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
  const btn = document.getElementById('post-submit-btn');
  if (btn) btn.textContent = 'Update Post';
  showToast('Editing post â€” make changes and update');
}

function addAttachment(type) {
  currentAttachType = type;
  document.getElementById('add-attach-title').textContent = { prompt: 'Add Prompt', pdf: 'Add PDF', image: 'Add Image', note: 'Add Note' }[type];
  document.getElementById('attach-name-input').value = '';
  document.getElementById('attach-content-input').value = '';
  document.getElementById('attach-file-input').value = '';
  document.getElementById('attach-file-name').textContent = '';
  const imgPrev = document.getElementById('attach-image-preview');
  imgPrev.style.display = 'none';
  imgPrev.src = '';
  const cf = document.getElementById('attach-content-field');
  const ff = document.getElementById('attach-file-field');
  const fileInput = document.getElementById('attach-file-input');
  if (type === 'pdf') {
    cf.style.display = 'none';
    ff.style.display = 'block';
    fileInput.accept = 'application/pdf';
    document.getElementById('attach-file-label').textContent = 'Upload PDF';
  } else if (type === 'image') {
    cf.style.display = 'none';
    ff.style.display = 'block';
    fileInput.accept = 'image/*';
    document.getElementById('attach-file-label').textContent = 'Upload Image';
  } else {
    cf.style.display = 'block';
    ff.style.display = 'none';
  }
  openModal('modal-add-attach');
}

document.getElementById('attach-file-input')?.addEventListener('change', function() {
  const f = this.files[0];
  const imgPrev = document.getElementById('attach-image-preview');
  document.getElementById('attach-file-name').textContent = f ? `ðŸ“Ž ${f.name} (${(f.size/1024).toFixed(0)} KB)` : '';
  if (f && currentAttachType === 'image' && f.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => { imgPrev.src = e.target.result; imgPrev.style.display = 'block'; };
    reader.readAsDataURL(f);
  } else {
    imgPrev.style.display = 'none';
  }
});

function confirmAddAttachment() {
  const name = document.getElementById('attach-name-input').value.trim();
  if (!name) { showToast('Enter a name', 'error'); return; }
  if (currentAttachType === 'pdf' || currentAttachType === 'image') {
    const file = document.getElementById('attach-file-input').files[0];
    if (!file) { showToast(`Choose ${currentAttachType === 'pdf' ? 'a PDF' : 'an image'} file to upload`, 'error'); return; }
    const maxSize = currentAttachType === 'pdf' ? 4 * 1024 * 1024 : 3 * 1024 * 1024;
    if (file.size > maxSize) { showToast(`File too large (max ${maxSize/1024/1024}MB)`, 'error'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
      pendingAttachments.push({ type: currentAttachType, name, content: '', fileData: e.target.result, fileName: file.name });
      closeModal('modal-add-attach');
      renderAttachPreview();
      showToast(currentAttachType === 'pdf' ? 'PDF attached' : 'Image attached');
    };
    reader.onerror = function() { showToast('Could not read file', 'error'); };
    reader.readAsDataURL(file);
    return;
  }
  const content = document.getElementById('attach-content-input').value.trim();
  pendingAttachments.push({ type: currentAttachType, name, content });
  closeModal('modal-add-attach');
  renderAttachPreview();
  showToast('Attachment added');
}

function renderAttachPreview() {
  const icons = { prompt: 'ðŸ“‹', pdf: 'ðŸ“„', image: 'ðŸ–¼', note: 'ðŸ“' };
  document.getElementById('attach-preview').innerHTML = pendingAttachments.map((a, i) =>
    a.type === 'image' && a.fileData
      ? `<div class="attach-chip" style="padding:3px;"><img src="${a.fileData}" style="width:28px;height:28px;border-radius:5px;object-fit:cover;vertical-align:middle;"> ${escHtml(a.name)}<span class="remove" onclick="removeAttach(${i})">Ã—</span></div>`
      : `<div class="attach-chip">${icons[a.type]} ${escHtml(a.name)}<span class="remove" onclick="removeAttach(${i})">Ã—</span></div>`
  ).join('');
}

function removeAttach(i) {
  pendingAttachments.splice(i, 1);
  renderAttachPreview();
}

function submitPost() {
  const desc = document.getElementById('post-description').value.trim();
  if (!desc && pendingAttachments.length === 0) { showToast('Add content before posting', 'error'); return; }
  if (editingPostId) {
    const p = state.posts.find(p => p.id === editingPostId);
    if (p) {
      p.description = desc;
      p.attachments = [...pendingAttachments];
      saveData('posts');
      showToast('Post updated', 'success');
    }
  } else {
    const post = {
      id: 'post_' + Date.now(),
      username: state.user.name,
      description: desc,
      attachments: [...pendingAttachments],
      date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    };
    state.posts.unshift(post);
    saveData('posts');
    showToast('Post published!', 'success');
  }
  clearPostForm();
  renderPosts();
}

function clearPostForm() {
  document.getElementById('post-description').value = '';
  pendingAttachments = [];
  editingPostId = null;
  const btn = document.getElementById('post-submit-btn');
  if (btn) btn.textContent = 'Publish Post';
  renderAttachPreview();
}

function renderPosts() {
  const feed = document.getElementById('posts-feed');
  if (!feed) return;
  if (state.posts.length === 0) {
    feed.innerHTML = '<div class="empty-state"><div class="empty-icon">ðŸŒ</div><div class="empty-text">No posts yet â€” be the first to share!</div></div>';
    return;
  }
  const icons = { prompt: 'ðŸ“‹', pdf: 'ðŸ“„', image: 'ðŸ–¼', note: 'ðŸ“' };
  const typeClass = { prompt: 'type-prompt', pdf: 'type-pdf', image: 'type-image', note: 'type-note' };
  feed.innerHTML = state.posts.map(p => {
    const initials = p.username.slice(0,2).toUpperCase();
    const attHtml = p.attachments.map((a, ai) =>
      a.type === 'image' && a.fileData
        ? `<div class="post-attach-chip ${typeClass[a.type]}" onclick="viewAttachment('${p.id}', ${ai})" style="padding:5px 10px 5px 5px;">
            <img src="${a.fileData}" style="width:26px;height:26px;border-radius:5px;object-fit:cover;flex-shrink:0;">
            <span class="chip-name">${escHtml(a.name)}</span>
          </div>`
        : `<div class="post-attach-chip ${typeClass[a.type]}" onclick="viewAttachment('${p.id}', ${ai})">
        <span class="chip-icon">${icons[a.type]}</span>
        <span class="chip-name">${escHtml(a.name)}</span>
      </div>`).join('');
    return `<div class="post-card">
      <div class="post-header">
        <div class="post-avatar">${initials}</div>
        <div class="post-meta">
          <div class="post-username">${escHtml(p.username)}</div>
          <div class="post-date">${escHtml(p.date)}</div>
        </div>
        ${p.username === state.user?.name ? `<button class="btn-icon" onclick="editPost('${p.id}')" style="margin-left:auto;">âœ</button><button class="btn-icon danger" onclick="deletePost('${p.id}')">ðŸ—‘</button>` : ''}
      </div>
      ${p.description ? `<div class="post-description">${escHtml(p.description)}</div>` : ''}
      ${p.attachments.length > 0 ? `<div class="post-attachments">${attHtml}</div>` : ''}
    </div>`;
  }).join('');
}

function viewAttachment(postId, idx) {
  const p = state.posts.find(p => p.id === postId);
  if (!p) return;
  const a = p.attachments[idx];
  if (!a) return;
  if (a.type === 'prompt') {
    document.getElementById('prompt-content-view').textContent = a.content || '(No content)';
    openModal('modal-prompt');
  } else {
    document.getElementById('attach-modal-title').textContent = { pdf: 'ðŸ“„ PDF', image: 'ðŸ–¼ Image', note: 'ðŸ“ Note' }[a.type] + ': ' + a.name;
    const body = document.getElementById('attach-modal-body');
    if (a.type === 'note') {
      body.innerHTML = `<div style="background:var(--bg3);padding:14px;border-radius:var(--radius-sm);font-size:0.88rem;line-height:1.7;white-space:pre-wrap;">${escHtml(a.content || '')}</div>`;
    } else if (a.type === 'pdf' && a.fileData) {
      body.innerHTML = `<div style="text-align:center;padding:20px;">
        <div style="font-size:3rem;margin-bottom:12px;">ðŸ“„</div>
        <div style="font-size:1rem;font-weight:600;margin-bottom:6px;">${escHtml(a.name)}</div>
        <div style="font-size:0.78rem;color:var(--muted);margin-bottom:18px;">${escHtml(a.fileName || '')}</div>
        <a href="${a.fileData}" download="${escHtml(a.fileName || a.name + '.pdf')}" class="btn-accent" style="display:inline-block;text-decoration:none;">â¬‡ Download PDF</a>
      </div>`;
    } else if (a.type === 'image' && a.fileData) {
      body.innerHTML = `<div style="text-align:center;">
        <img src="${a.fileData}" style="max-width:100%;max-height:360px;border-radius:10px;border:1px solid var(--border);margin-bottom:14px;">
        <div style="font-size:0.9rem;font-weight:600;margin-bottom:14px;">${escHtml(a.name)}</div>
        <a href="${a.fileData}" download="${escHtml(a.fileName || a.name + '.png')}" class="btn-accent" style="display:inline-block;text-decoration:none;">â¬‡ Download Image</a>
      </div>`;
    } else {
      body.innerHTML = `<div style="text-align:center;padding:20px;">
        <div style="font-size:3rem;margin-bottom:12px;">${a.type === 'pdf' ? 'ðŸ“„' : 'ðŸ–¼'}</div>
        <div style="font-size:1rem;font-weight:600;margin-bottom:6px;">${escHtml(a.name)}</div>
        <div style="font-size:0.8rem;color:var(--muted);">Reference only â€” no file attached</div>
      </div>`;
    }
    openModal('modal-attachment');
  }
}

function copyPrompt() {
  const content = document.getElementById('prompt-content-view').textContent;
  navigator.clipboard.writeText(content).then(() => showToast('Prompt copied!', 'success'));
}

function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  state.posts = state.posts.filter(p => p.id !== id);
  saveData('posts');
  renderPosts();
  showToast('Post deleted');
}

// ===================== ANALYTICS =====================
let analyticsRange = 6; // months: 1, 3, 6, 12, or 'all'

function setAnalyticsRange(range) {
  analyticsRange = range;
  document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.range-btn[data-range="${range}"]`)?.classList.add('active');
  renderAnalytics();
}

function getRangeStartDate() {
  if (analyticsRange === 'all') {
    if (state.sessions.length === 0) return new Date();
    const dates = state.sessions.map(s => s.date).sort();
    return new Date(dates[0] + 'T00:00:00');
  }
  const d = new Date();
  d.setMonth(d.getMonth() - Number(analyticsRange));
  return d;
}

function lookupSpecificDay() {
  const dateStr = document.getElementById('analytics-day-picker').value;
  const resultDiv = document.getElementById('day-lookup-result');
  if (!dateStr) { resultDiv.style.display = 'none'; return; }
  const daySessions = state.sessions.filter(s => s.date === dateStr);
  const doneSessions = daySessions.filter(s => s.status === 'done');
  const totalMs = doneSessions.reduce((a, s) => a + s.duration, 0);
  const att = state.attendance.find(a => a.date === dateStr);
  const onLeave = state.leaves.some(l => dateStr >= l.startDate && dateStr <= l.endDate);
  const friendlyDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let attendanceText = 'Absent';
  let attendanceColor = 'var(--danger)';
  if (onLeave) { attendanceText = 'On Leave'; attendanceColor = 'var(--warn)'; }
  else if (att && att.status === 'present') { attendanceText = `Present (${att.loginTime || 'â€”'} â†’ ${att.logoutTime || 'still logged in'})`; attendanceColor = 'var(--success)'; }

  const sessionRows = doneSessions.map(s => {
    const subj = state.subjects.find(x => x.id === s.subjectId);
    const c = subj ? colorForSubject(subj) : '#8b80a8';
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
      <span style="color:${c};font-weight:600;font-size:0.85rem;">${escHtml(getSubjectName(s.subjectId))}</span>
      <span style="color:var(--muted);font-size:0.8rem;">${escHtml(s.taskName)}</span>
      <span style="margin-left:auto;font-weight:600;font-size:0.82rem;">${formatHM(s.duration)}</span>
    </div>`;
  }).join('');

  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `<div class="day-lookup-card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
      <div style="font-size:1rem;font-weight:700;font-family:var(--font-display);">${friendlyDate}</div>
      <div style="font-size:0.8rem;font-weight:600;color:${attendanceColor};">â— ${attendanceText}</div>
    </div>
    <div style="display:flex;gap:24px;margin-bottom:${sessionRows ? '14px' : '0'};flex-wrap:wrap;">
      <div><div style="font-size:1.4rem;font-weight:800;color:var(--accent3);font-family:var(--font-display);">${formatHM(totalMs)}</div><div style="font-size:0.72rem;color:var(--muted);">Studied</div></div>
      <div><div style="font-size:1.4rem;font-weight:800;font-family:var(--font-display);">${doneSessions.length}</div><div style="font-size:0.72rem;color:var(--muted);">Sessions</div></div>
    </div>
    ${sessionRows ? `<div>${sessionRows}</div>` : '<div style="font-size:0.82rem;color:var(--muted);">No study sessions recorded this day</div>'}
  </div>`;
}

function renderAnalytics() {
  // Destroy old charts
  Object.values(state.analyticsCharts).forEach(c => { try { c.destroy(); } catch {} });
  state.analyticsCharts = {};

  const cOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#8b80a8', font: { size: 11 } } } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b80a8', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b80a8', font: { size: 10 } }, beginAtZero: true }
    }
  };

  // Subject performance
  const subjCtx = document.getElementById('analytics-subjects-chart');
  if (subjCtx && state.subjects.length > 0) {
    const colors = state.subjects.map(s => colorForSubject(s));
    state.analyticsCharts.subj = new Chart(subjCtx, {
      type: 'bar',
      data: {
        labels: state.subjects.map(s => s.name),
        datasets: [{ label: 'Progress %', data: state.subjects.map(s => calcSubjectProgress(s)), backgroundColor: colors.map(c => c + '99'), borderColor: colors, borderWidth: 1, borderRadius: 5 }]
      },
      options: { ...cOpts, plugins: { ...cOpts.plugins }, scales: { ...cOpts.scales, y: { ...cOpts.scales.y, max: 100 } } }
    });
  }

  // Study hours trend â€” granularity adapts to selected range
  const weekCtx = document.getElementById('analytics-weekly-chart');
  const titleEl = document.getElementById('weekly-chart-title');
  if (weekCtx) {
    const startDate = getRangeStartDate();
    const now = new Date();
    const totalDays = Math.max(1, Math.round((now - startDate) / 86400000));
    let labels = [], data = [];

    if (analyticsRange === 1 || totalDays <= 31) {
      // Daily granularity
      if (titleEl) titleEl.textContent = 'Daily Study Hours (Last 30 Days)';
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = toDateKey(d);
        labels.push(d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
        const ms = state.sessions.filter(s => s.date === key && s.status === 'done').reduce((a, s) => a + s.duration, 0);
        data.push(Math.round(ms / 3600000 * 10) / 10);
      }
    } else if (totalDays <= 200) {
      // Weekly buckets
      if (titleEl) titleEl.textContent = 'Weekly Study Hours';
      const numWeeks = Math.ceil(totalDays / 7);
      for (let w = numWeeks - 1; w >= 0; w--) {
        const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() - (w * 7));
        const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6);
        labels.push(weekStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
        let ms = 0;
        for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
          const key = toDateKey(d);
          ms += state.sessions.filter(s => s.date === key && s.status === 'done').reduce((a, s) => a + s.duration, 0);
        }
        data.push(Math.round(ms / 3600000 * 10) / 10);
      }
    } else {
      // Monthly buckets
      if (titleEl) titleEl.textContent = 'Monthly Study Hours Trend';
      const numMonths = Math.ceil(totalDays / 30);
      for (let i = numMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        const ms = state.sessions.filter(s => s.date.startsWith(key) && s.status === 'done').reduce((a, s) => a + s.duration, 0);
        data.push(Math.round(ms / 3600000 * 10) / 10);
      }
    }

    state.analyticsCharts.week = new Chart(weekCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Hours', data, borderColor: '#9d5cf6', backgroundColor: 'rgba(124,58,237,0.15)', fill: true, tension: 0.3, pointBackgroundColor: '#c084fc', pointRadius: labels.length > 20 ? 0 : 3 }]
      },
      options: cOpts
    });
  }

  // Task breakdown
  const taskCtx = document.getElementById('analytics-tasks-chart');
  if (taskCtx) {
    const done = state.tasks.filter(t => t.status === 'completed').length;
    const pend = state.tasks.filter(t => t.status === 'pending').length;
    const can = state.tasks.filter(t => t.status === 'cancelled').length;
    state.analyticsCharts.tasks = new Chart(taskCtx, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Pending', 'Cancelled'],
        datasets: [{ data: [done, pend, can], backgroundColor: ['rgba(34,197,94,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)'], borderColor: ['#22c55e', '#f59e0b', '#ef4444'], borderWidth: 1 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#8b80a8', font: { size: 11 } } } } }
    });
  }

  // Monthly study â€” respects selected range (capped 3-24 months for readability)
  const monthCtx = document.getElementById('analytics-monthly-chart');
  if (monthCtx) {
    const now = new Date();
    const monthCount = analyticsRange === 'all' ? Math.min(24, Math.max(3, Math.ceil((now - getRangeStartDate()) / 30 / 86400000))) : Math.max(3, Number(analyticsRange) || 6);
    const months = [];
    const data = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      months.push(d.toLocaleDateString('en-US', { month: 'short' }));
      const ms = state.sessions.filter(s => s.date.startsWith(key) && s.status === 'done').reduce((a, s) => a + s.duration, 0);
      data.push(Math.round(ms / 3600000 * 10) / 10);
    }
    state.analyticsCharts.monthly = new Chart(monthCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{ label: 'Hours', data, backgroundColor: 'rgba(56,189,248,0.5)', borderColor: '#38bdf8', borderWidth: 1, borderRadius: 5 }]
      },
      options: cOpts
    });
  }
}

// ===================== OWNER PANEL =====================
let ownerState = {
  selectedStudent: null,
  studentData: null,
  charts: {}
};

function showOwnerPanel() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.remove('visible');
  document.getElementById('owner-panel').classList.add('visible');
  S.set('los_owner_session', true);
  renderOwnerStudentList();
  ownerBackToOverview();
}

function ownerLogout() {
  S.del('los_owner_session');
  document.getElementById('owner-panel').classList.remove('visible');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').textContent = '';
  ownerState = { selectedStudent: null, studentData: null, charts: {} };
}

function toggleOwnerSidebar() {
  document.getElementById('owner-sidebar').classList.toggle('open');
}

function getAllStudentNames() {
  const users = S.get('los_users') || {};
  return Object.keys(users).sort((a, b) => a.localeCompare(b));
}

function loadStudentData(name) {
  return {
    name,
    subjects: S.get(`los_subjects_${name}`) || [],
    tasks: S.get(`los_tasks_${name}`) || [],
    sessions: S.get(`los_sessions_${name}`) || [],
    attendance: S.get(`los_attendance_${name}`) || [],
    leaves: S.get(`los_leaves_${name}`) || [],
    notes: S.get(`los_notes_${name}`) || [],
    activeTimers: S.get(`los_active_timers_${name}`) || [],
    isOnline: !!(S.get('los_user') && S.get('los_user').name === name)
  };
}

function studentOverallProgress(data) {
  if (!data.subjects || data.subjects.length === 0) return 0;
  const sum = data.subjects.reduce((a, s) => a + calcSubjectProgress(s), 0);
  return Math.round(sum / data.subjects.length);
}

function studentTotalStudyMs(data) {
  return data.sessions.filter(s => s.status === 'done').reduce((a, s) => a + s.duration, 0);
}

function renderOwnerStudentList() {
  const search = (document.getElementById('owner-student-search')?.value || '').toLowerCase();
  const names = getAllStudentNames().filter(n => n.toLowerCase().includes(search));
  const list = document.getElementById('owner-student-list');
  if (!list) return;
  if (names.length === 0) {
    list.innerHTML = '<div class="empty-state" style="padding:24px 8px;"><div class="empty-icon" style="font-size:1.6rem;">ðŸ”</div><div class="empty-text">No students found</div></div>';
    return;
  }
  const currentlyOnline = S.get('los_user');
  list.innerHTML = names.map(name => {
    const isActive = ownerState.selectedStudent === name;
    const isOnline = currentlyOnline && currentlyOnline.name === name;
    const initials = name.slice(0, 2).toUpperCase();
    return `<div class="owner-student-card ${isActive ? 'active' : ''}" onclick="ownerSelectStudent('${name.replace(/'/g,"\\'")}')">
      <div class="owner-student-avatar">${escHtml(initials)}</div>
      <div class="owner-student-info">
        <div class="owner-student-name">${escHtml(name)}</div>
        <div class="owner-student-meta">${isOnline ? 'Online now' : 'Offline'}</div>
      </div>
      ${isOnline ? '<div class="owner-student-online-dot"></div>' : ''}
    </div>`;
  }).join('');
}

function ownerBackToOverview() {
  ownerState.selectedStudent = null;
  document.getElementById('owner-view-overview').style.display = 'block';
  document.getElementById('owner-view-student').style.display = 'none';
  renderOwnerStudentList();
  renderOwnerOverview();
  document.getElementById('owner-sidebar').classList.remove('open');
}

function renderOwnerOverview() {
  const names = getAllStudentNames();
  const allData = names.map(n => loadStudentData(n));

  // Summary stat pills
  const totalStudents = names.length;
  const totalStudyMs = allData.reduce((a, d) => a + studentTotalStudyMs(d), 0);
  const avgProgress = totalStudents > 0 ? Math.round(allData.reduce((a, d) => a + studentOverallProgress(d), 0) / totalStudents) : 0;
  const totalTasks = allData.reduce((a, d) => a + d.tasks.length, 0);
  const completedTasks = allData.reduce((a, d) => a + d.tasks.filter(t => t.status === 'completed').length, 0);

  document.getElementById('owner-summary-stats').innerHTML = `
    <div class="stat-pill"><div class="stat-value">${totalStudents}</div><div class="stat-label">Total Students</div></div>
    <div class="stat-pill"><div class="stat-value">${avgProgress}%</div><div class="stat-label">Avg Progress</div></div>
    <div class="stat-pill"><div class="stat-value">${formatHM(totalStudyMs)}</div><div class="stat-label">Total Study Time</div></div>
    <div class="stat-pill"><div class="stat-value">${completedTasks}/${totalTasks}</div><div class="stat-label">Tasks Completed</div></div>
  `;

  // Per-student table
  const table = document.getElementById('owner-overview-table');
  if (totalStudents === 0) {
    table.innerHTML = '<div class="empty-state"><div class="empty-icon">ðŸ‘¥</div><div class="empty-text">No students have logged in yet</div></div>';
    return;
  }
  const currentlyOnline = S.get('los_user');
  table.innerHTML = allData.map(d => {
    const pct = studentOverallProgress(d);
    const isOnline = currentlyOnline && currentlyOnline.name === d.name;
    const doneTasks = d.tasks.filter(t => t.status === 'completed').length;
    return `<div class="owner-overview-row" onclick="ownerSelectStudent('${d.name.replace(/'/g,"\\'")}')">
      <div class="owner-student-avatar" style="margin:0;">${escHtml(d.name.slice(0,2).toUpperCase())}</div>
      <span class="ov-name">${escHtml(d.name)} ${isOnline ? '<span style="color:var(--success);font-size:0.7rem;">â— online</span>' : ''}</span>
      <div class="ov-bar-track"><div class="ov-bar-fill" style="width:${pct}%;"></div></div>
      <span class="ov-pct">${pct}%</span>
      <span class="ov-stat">${formatHM(studentTotalStudyMs(d))}</span>
      <span class="ov-stat">${doneTasks}/${d.tasks.length} tasks</span>
      <button class="btn-icon" style="margin-left:4px;">View â†’</button>
    </div>`;
  }).join('');
}

function ownerSelectStudent(name) {
  ownerState.selectedStudent = name;
  ownerState.studentData = loadStudentData(name);
  document.getElementById('owner-view-overview').style.display = 'none';
  document.getElementById('owner-view-student').style.display = 'block';
  document.getElementById('owner-student-name-title').textContent = name;
  renderOwnerStudentList();
  renderOwnerStudentDetail();
  document.getElementById('owner-sidebar').classList.remove('open');
  document.getElementById('owner-main').scrollTop = 0;
}

function renderOwnerStudentDetail() {
  const d = ownerState.studentData;
  if (!d) return;

  // Meta bar (login info / online status)
  const currentlyOnline = S.get('los_user');
  const isOnline = currentlyOnline && currentlyOnline.name === d.name;
  document.getElementById('owner-dash-meta').innerHTML = `
    <div class="meta-item"><div class="meta-val">${isOnline ? 'ðŸŸ¢ Online' : 'âšª Offline'}</div><div class="meta-lbl">Status</div></div>
    <div class="meta-divider"></div>
    <div class="meta-item"><div class="meta-val">${escHtml(currentlyOnline && isOnline ? currentlyOnline.loginTime : 'â€”')}</div><div class="meta-lbl">Last Login Time</div></div>
    <div class="meta-divider"></div>
    <div class="meta-item"><div class="meta-val">${d.subjects.length}</div><div class="meta-lbl">Subjects</div></div>
    <div class="meta-divider"></div>
    <div class="meta-item"><div class="meta-val">${d.sessions.filter(s=>s.status==='done').length}</div><div class="meta-lbl">Sessions Logged</div></div>
  `;

  // Overall progress ring
  const overall = studentOverallProgress(d);
  ownerSetRoundProgress('owner-overall-circle', 'owner-overall-pct', overall);

  // Attendance ring (current month)
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const daysElapsed = now.getDate();
  const presentDays = d.attendance.filter(a => a.date.startsWith(monthStr) && a.status === 'present').length;
  const leaveDays = d.leaves.filter(l => {
    const s = new Date(l.startDate), e = new Date(l.endDate);
    return s <= now && e >= new Date(monthStr + '-01');
  }).length;
  const attRate = daysElapsed > 0 ? Math.round(((presentDays + leaveDays) / daysElapsed) * 100) : 0;
  ownerSetRoundProgress('owner-att-circle', 'owner-att-pct', Math.min(100, attRate));

  // Subject list
  const subjDiv = document.getElementById('owner-subjects-list');
  if (d.subjects.length === 0) {
    subjDiv.innerHTML = '<div class="empty-state"><div class="empty-icon">ðŸ“š</div><div class="empty-text">No subjects added yet</div></div>';
  } else {
    subjDiv.innerHTML = d.subjects.map(s => {
      const pct = calcSubjectProgress(s);
      const c = colorForSubject(s);
      const total = s.topics ? s.topics.length : 0;
      const done = s.topics ? s.topics.filter(t => t.done).length : 0;
      return `<div class="subject-bar-row" style="cursor:default;">
        <span class="subject-bar-name" style="color:${c};">â— &nbsp;${escHtml(s.name)} <span style="color:var(--muted2);font-size:0.72rem;font-weight:400;">(${done}/${total})</span></span>
        <div class="subject-bar-track"><div class="subject-bar-fill" style="width:${pct}%;background:linear-gradient(90deg, ${c}, ${c}cc);"></div></div>
        <span class="subject-bar-pct">${pct}%</span>
      </div>`;
    }).join('');
  }

  // Task summary
  document.getElementById('owner-total-tasks').textContent = d.tasks.length;
  document.getElementById('owner-done-tasks').textContent = d.tasks.filter(t => t.status === 'completed').length;
  document.getElementById('owner-pending-tasks').textContent = d.tasks.filter(t => t.status === 'pending').length;
  document.getElementById('owner-cancel-tasks').textContent = d.tasks.filter(t => t.status === 'cancelled').length;

  renderOwnerCharts(d);
  renderOwnerAttendanceCalendar(d);
  renderOwnerLeaves(d);
  renderOwnerNotes(d);
  renderOwnerSessionHistory(d);
}

function ownerSetRoundProgress(circleId, pctId, pct) {
  const circle = document.getElementById(circleId);
  const label = document.getElementById(pctId);
  if (!circle || !label) return;
  const r = 58; const circ = 2 * Math.PI * r;
  circle.style.strokeDashoffset = circ - (pct / 100) * circ;
  label.textContent = pct + '%';
}

function renderOwnerCharts(d) {
  Object.values(ownerState.charts).forEach(c => { try { c.destroy(); } catch {} });
  ownerState.charts = {};
  const cOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#8b80a8', font: { size: 11 } } } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b80a8', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b80a8', font: { size: 10 } }, beginAtZero: true }
    }
  };
  const subjCtx = document.getElementById('owner-subjects-chart');
  if (subjCtx && d.subjects.length > 0) {
    const colors = d.subjects.map(s => colorForSubject(s));
    ownerState.charts.subj = new Chart(subjCtx, {
      type: 'bar',
      data: { labels: d.subjects.map(s => s.name), datasets: [{ label: 'Progress %', data: d.subjects.map(s => calcSubjectProgress(s)), backgroundColor: colors.map(c => c + '99'), borderColor: colors, borderWidth: 1, borderRadius: 5 }] },
      options: { ...cOpts, scales: { ...cOpts.scales, y: { ...cOpts.scales.y, max: 100 } } }
    });
  }
  const weekCtx = document.getElementById('owner-weekly-chart');
  if (weekCtx) {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const now = new Date();
    const weekData = days.map((d2, i) => {
      const date = new Date(now);
      const dayOfWeek = now.getDay();
      const diff = i + 1 - (dayOfWeek === 0 ? 7 : dayOfWeek);
      date.setDate(date.getDate() + diff);
      const key = toDateKey(date);
      const ms = d.sessions.filter(s => s.date === key && s.status === 'done').reduce((a, s) => a + s.duration, 0);
      return Math.round(ms / 3600000 * 10) / 10;
    });
    ownerState.charts.week = new Chart(weekCtx, {
      type: 'line',
      data: { labels: days, datasets: [{ label: 'Hours', data: weekData, borderColor: '#9d5cf6', backgroundColor: 'rgba(124,58,237,0.15)', fill: true, tension: 0.3, pointBackgroundColor: '#c084fc' }] },
      options: cOpts
    });
  }
}

function renderOwnerAttendanceCalendar(d) {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  document.getElementById('owner-att-month-title').textContent = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(now);
  const monthStr = `${year}-${String(month+1).padStart(2,'0')}`;
  const leaveDates = new Set();
  d.leaves.forEach(l => {
    let dt = new Date(l.startDate);
    while (dt <= new Date(l.endDate)) { leaveDates.add(toDateKey(dt)); dt.setDate(dt.getDate() + 1); }
  });
  let cal = '';
  for (let i = 0; i < firstDay; i++) cal += '<div class="att-day" style="background:transparent;"></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${monthStr}-${String(day).padStart(2,'0')}`;
    const isFuture = key > todayKey;
    let cls = 'att-day';
    if (isFuture) cls += ' future';
    else if (leaveDates.has(key)) cls += ' leave';
    else if (d.attendance.find(a => a.date === key && a.status === 'present')) cls += ' present';
    else cls += ' absent';
    if (key === todayKey) cls += ' today';
    cal += `<div class="${cls}">${day}</div>`;
  }
  document.getElementById('owner-att-calendar').innerHTML = cal;
}

function renderOwnerLeaves(d) {
  const div = document.getElementById('owner-leave-list');
  if (d.leaves.length === 0) {
    div.innerHTML = '<div class="empty-state"><div class="empty-icon">ðŸ–</div><div class="empty-text">No leaves applied</div></div>';
    return;
  }
  div.innerHTML = [...d.leaves].reverse().map(l => `
    <div class="leave-item">
      <div><div class="leave-dates">ðŸ“… ${l.startDate} â†’ ${l.endDate}</div><div class="leave-reason">${escHtml(l.reason)}</div></div>
      <div class="leave-badge">Leave</div>
    </div>`).join('');
}

function renderOwnerNotes(d) {
  const div = document.getElementById('owner-notes-list');
  if (d.notes.length === 0) {
    div.innerHTML = '<div class="empty-state"><div class="empty-icon">ðŸ—’</div><div class="empty-text">No notes</div></div>';
    return;
  }
  div.innerHTML = [...d.notes].reverse().map(n => {
    const meta = NOTE_TYPE_META[n.type] || NOTE_TYPE_META.note;
    return `<div style="padding:10px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;">
      <div style="font-size:0.85rem;font-weight:600;">${meta.icon} ${escHtml(n.title)}</div>
      ${n.content ? `<div style="font-size:0.78rem;color:var(--muted);margin-top:3px;white-space:pre-wrap;">${escHtml(n.content)}</div>` : ''}
    </div>`;
  }).join('');
}

function renderOwnerSessionHistory(d) {
  const list = document.getElementById('owner-session-history');
  if (d.sessions.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">â±</div><div class="empty-text">No sessions recorded</div></div>';
    return;
  }
  const grouped = {};
  [...d.sessions].reverse().forEach(s => { if (!grouped[s.date]) grouped[s.date] = []; grouped[s.date].push(s); });
  list.innerHTML = Object.entries(grouped).slice(0, 30).map(([date, sessions]) => {
    const totalMs = sessions.filter(s => s.status === 'done').reduce((a, s) => a + s.duration, 0);
    return `<div class="session-day">
      <div class="session-day-header"><span>${formatDateFriendly(date)}</span><span>${formatHM(totalMs)}</span></div>
      ${sessions.map(s => {
        const subj = d.subjects.find(x => x.id === s.subjectId);
        const c = subj ? colorForSubject(subj) : '#8b80a8';
        return `<div class="session-item">
          <div class="session-dot ${s.status}"></div>
          <div class="session-info">
            <div class="session-sub" style="color:${c};">${escHtml(subj ? subj.name : 'General')}</div>
            <div class="session-task">${escHtml(s.taskName)}</div>
          </div>
          <div class="session-dur">${s.status === 'done' ? formatHM(s.duration) : s.status}</div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
}

// ===================== EXPORT =====================
function exportData() {
  const data = {
    exportedAt: new Date().toISOString(),
    user: state.user?.name,
    subjects: state.subjects,
    tasks: state.tasks,
    sessions: state.sessions,
    attendance: state.attendance,
    leaves: state.leaves,
    notes: state.notes || []
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `learnos-backup-${toDateKey(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Data exported successfully', 'success');
}

// ===================== MODALS =====================
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// ===================== TOAST =====================
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ===================== HELPERS =====================
function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function formatHM(ms) {
  const totalMins = Math.floor(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function getSubjectName(id) {
  const s = state.subjects.find(s => s.id === id);
  return s ? s.name : 'General';
}
function formatDateFriendly(dateKey) {
  const d = new Date(dateKey + 'T00:00:00');
  const today = toDateKey(new Date());
  const yesterday = toDateKey(new Date(Date.now() - 86400000));
  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===================== START =====================
init();
