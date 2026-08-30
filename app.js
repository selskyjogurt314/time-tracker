// --- DATA ---
let activities = JSON.parse(localStorage.getItem('activities')) || [];
let history = JSON.parse(localStorage.getItem('history')) || [];
let activeActivity = null;
let timerInterval = null;

// --- ELEMENTY ---
const activityList = document.getElementById('activity-list');
const newActivityInput = document.getElementById('new-activity-input');
const addActivityBtn = document.getElementById('add-activity-btn');
const currentName = document.getElementById('current-name');
const currentTimer = document.getElementById('current-timer');
const summaryList = document.getElementById('summary-list');
const timeline = document.getElementById('timeline');
const screenTracker = document.getElementById('screen-tracker');
const screenSummary = document.getElementById('screen-summary');
const navTracker = document.getElementById('nav-tracker');
const navSummary = document.getElementById('nav-summary');

// --- RESET DNE ---
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function checkDayReset() {
  const lastOpen = localStorage.getItem('lastOpen');
  const today = getTodayString();

  if (lastOpen !== today) {
    activities = activities.map(a => ({ ...a, totalSeconds: 0 }));
    saveActivities();
    history = [];
    saveHistory();
    localStorage.setItem('lastOpen', today);
    localStorage.removeItem('activeActivityIndex');
    localStorage.removeItem('activityStartTime');
  }
}

// --- NAVIGACE ---
navTracker.addEventListener('click', () => showScreen('tracker'));
navSummary.addEventListener('click', () => showScreen('summary'));

function showScreen(screen) {
  if (screen === 'tracker') {
    screenTracker.classList.remove('hidden');
    screenSummary.classList.add('hidden');
    navTracker.classList.add('active');
    navSummary.classList.remove('active');
  } else {
    screenTracker.classList.add('hidden');
    screenSummary.classList.remove('hidden');
    navTracker.classList.remove('active');
    navSummary.classList.add('active');
    renderTimeline();
    renderSummary();
  }
}

// --- ČASOVAČ ---
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function formatClock(timestamp) {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getElapsedSeconds() {
  const startTime = localStorage.getItem('activityStartTime');
  if (!startTime) return 0;
  return Math.floor((Date.now() - parseInt(startTime)) / 1000);
}

function startTimerDisplay() {
  stopTimerDisplay();
  timerInterval = setInterval(() => {
    currentTimer.textContent = formatTime(getElapsedSeconds());
  }, 1000);
}

function stopTimerDisplay() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// --- HISTORIE ---
function saveHistory() {
  localStorage.setItem('history', JSON.stringify(history));
}

// Barvy pro aktivity podle indexu
const COLORS = [
  '#007aff', '#34c759', '#ff9500', '#ff3b30',
  '#af52de', '#5ac8fa', '#ffcc00', '#ff2d55'
];

function getColor(activityName) {
  const index = activities.findIndex(a => a.name === activityName);
  return COLORS[index % COLORS.length];
}

// --- AKTIVITY ---
function saveActivities() {
  localStorage.setItem('activities', JSON.stringify(activities));
}

function renderActivities() {
  activityList.innerHTML = '';
  activities.forEach((activity, index) => {
    const row = document.createElement('div');
    row.classList.add('activity-row');

    const btn = document.createElement('button');
    btn.classList.add('activity-btn');
    btn.textContent = activity.name;
    if (activeActivity === index) btn.classList.add('active');
    btn.addEventListener('click', () => startActivity(index));

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', () => deleteActivity(index));

    row.appendChild(btn);
    row.appendChild(deleteBtn);
    activityList.appendChild(row);
  });
}

function addActivity() {
  const name = newActivityInput.value.trim();
  if (name === '') return;
  activities.push({ name: name, totalSeconds: 0 });
  newActivityInput.value = '';
  saveActivities();
  renderActivities();
}

function deleteActivity(index) {
  const wasMazingActive = activeActivity === index;

  if (activeActivity !== null && index < activeActivity) {
    activeActivity--;
    localStorage.setItem('activeActivityIndex', activeActivity);
  }

  activities.splice(index, 1);
  saveActivities();

  if (wasMazingActive) {
    stopTimerDisplay();
    activeActivity = null;
    localStorage.removeItem('activeActivityIndex');
    localStorage.removeItem('activityStartTime');
    currentName.textContent = 'Žádná aktivita';
    currentTimer.textContent = '00:00:00';
  }

  renderActivities();
}

function startActivity(index) {
  const startTime = localStorage.getItem('activityStartTime');

  // Uložíme předchozí aktivitu do historie
  if (activeActivity !== null && startTime) {
    const elapsed = getElapsedSeconds();
    activities[activeActivity].totalSeconds += elapsed;
    saveActivities();

    history.push({
      name: activities[activeActivity].name,
      start: parseInt(startTime),
      end: Date.now()
    });
    saveHistory();
  }

  // Spustíme novou aktivitu
  activeActivity = index;
  localStorage.setItem('activeActivityIndex', index);
  localStorage.setItem('activityStartTime', Date.now().toString());

  currentName.textContent = activities[index].name;
  currentTimer.textContent = '00:00:00';
  startTimerDisplay();
  renderActivities();
}

function restoreSession() {
  const savedIndex = localStorage.getItem('activeActivityIndex');
  const savedStart = localStorage.getItem('activityStartTime');

  if (savedIndex !== null && savedStart !== null) {
    activeActivity = parseInt(savedIndex);
    currentName.textContent = activities[activeActivity].name;
    currentTimer.textContent = formatTime(getElapsedSeconds());
    startTimerDisplay();
  }
}

// --- ČASOVÁ OSA ---
function renderTimeline() {
  timeline.innerHTML = '';

  // Sestavíme položky – historie + případně běžící aktivita
  const items = [...history];
  if (activeActivity !== null) {
    const startTime = localStorage.getItem('activityStartTime');
    if (startTime) {
      items.push({
        name: activities[activeActivity].name,
        start: parseInt(startTime),
        end: null // stále běží
      });
    }
  }

  if (items.length === 0) {
    timeline.innerHTML = '<p style="color:#8e8e93">Dnes ještě žádná data.</p>';
    return;
  }

  items.forEach(item => {
    const color = getColor(item.name);
    const endLabel = item.end ? formatClock(item.end) : 'nyní';

    const el = document.createElement('div');
    el.classList.add('timeline-item');
    el.innerHTML = `
      <div class="timeline-dot" style="background-color: ${color}"></div>
      <div class="timeline-info">
        <span class="timeline-name">${item.name}</span>
        <span class="timeline-time">${formatClock(item.start)} – ${endLabel}</span>
      </div>
    `;
    timeline.appendChild(el);
  });
}

// --- PŘEHLED ---
function renderSummary() {
  summaryList.innerHTML = '';

  const activitiesWithCurrent = activities.map((a, i) => {
    if (i === activeActivity) {
      return { ...a, totalSeconds: a.totalSeconds + getElapsedSeconds() };
    }
    return a;
  });

  const total = activitiesWithCurrent.reduce((sum, a) => sum + a.totalSeconds, 0);

  if (total === 0) {
    summaryList.innerHTML = '<p style="color:#8e8e93">Dnes ještě žádná data.</p>';
    return;
  }

  const sorted = [...activitiesWithCurrent]
    .filter(a => a.totalSeconds > 0)
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  sorted.forEach(activity => {
    const percent = Math.round((activity.totalSeconds / total) * 100);
    const color = getColor(activity.name);
    const item = document.createElement('div');
    item.classList.add('summary-item-wrap');
    item.innerHTML = `
      <div class="summary-item">
        <span class="summary-item-name">${activity.name}</span>
        <span class="summary-item-time" style="color: ${color}">${formatTime(activity.totalSeconds)}</span>
      </div>
      <div class="summary-bar-wrap">
        <div class="summary-bar" style="width: ${percent}%; background-color: ${color}"></div>
      </div>
    `;
    summaryList.appendChild(item);
  });
}

// --- UDÁLOSTI ---
addActivityBtn.addEventListener('click', addActivity);

// --- START ---
checkDayReset();
restoreSession();
renderActivities();