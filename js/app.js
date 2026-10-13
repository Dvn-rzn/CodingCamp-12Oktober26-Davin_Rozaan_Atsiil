/* =====================================================
   app.js  –  Personal Dashboard
   Challenges: Light/Dark mode, Custom name, Change Pomodoro time,
               Prevent duplicate tasks, Sort tasks
   ===================================================== */

'use strict';

/* ── tiny helpers ─────────────────────────────────── */
const $ = (id) => document.getElementById(id);

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function padTwo(n) { return String(n).padStart(2, '0'); }

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════════════════
   1. THEME  (Light / Dark)
══════════════════════════════════════════════════ */
const themeToggle = $('themeToggle');
const themeIcon   = $('themeIcon');
let theme = localStorage.getItem('db_theme') || 'light';

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  themeIcon.textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('db_theme', t);
  theme = t;
}
applyTheme(theme);
themeToggle.addEventListener('click', () => applyTheme(theme === 'dark' ? 'light' : 'dark'));

/* ══════════════════════════════════════════════════
   2. GREETING — clock, date, greeting text
══════════════════════════════════════════════════ */
const clockEl    = $('clock');
const dateStrEl  = $('dateStr');
const greetingEl = $('greeting');

let userName = localStorage.getItem('db_name') || '';

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function getGreetText(h) {
  if (h < 5)  return 'Good Night';
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}

function updateClock() {
  const now = new Date();
  const hh  = padTwo(now.getHours());
  const mm  = padTwo(now.getMinutes());
  const ss  = padTwo(now.getSeconds());

  clockEl.textContent   = `${hh}:${mm}:${ss}`;
  dateStrEl.textContent = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  const base = getGreetText(now.getHours());
  greetingEl.textContent = userName ? `${base}, ${userName}!` : base;
}
updateClock();
setInterval(updateClock, 1000);

/* ══════════════════════════════════════════════════
   3. CUSTOM NAME MODAL
══════════════════════════════════════════════════ */
const nameModal     = $('nameModal');
const nameInput     = $('nameInput');
const nameSaveBtn   = $('nameSaveBtn');
const nameCancelBtn = $('nameCancelBtn');
const nameEditBtn   = $('nameEditBtn');

function openModal()  { nameInput.value = userName; nameModal.classList.remove('hidden'); nameInput.focus(); }
function closeModal() { nameModal.classList.add('hidden'); }

nameEditBtn.addEventListener('click', openModal);
nameCancelBtn.addEventListener('click', closeModal);
nameModal.addEventListener('click', (e) => { if (e.target === nameModal) closeModal(); });

nameSaveBtn.addEventListener('click', () => {
  userName = nameInput.value.trim();
  localStorage.setItem('db_name', userName);
  updateClock();
  closeModal();
});
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter')  nameSaveBtn.click();
  if (e.key === 'Escape') closeModal();
});

/* ══════════════════════════════════════════════════
   4. FOCUS TIMER
══════════════════════════════════════════════════ */
const timerDisplay  = $('timerDisplay');
const timerStart    = $('timerStart');
const timerStop     = $('timerStop');
const timerReset    = $('timerReset');
const timerStatus   = $('timerStatus');
const pomoDuration  = $('pomoDuration');
const applyDuration = $('applyDuration');

const savedMin = parseInt(localStorage.getItem('db_pomo_min'), 10);
let totalSecs  = (!isNaN(savedMin) && savedMin >= 1 ? savedMin : 25) * 60;
let remaining  = totalSecs;
let interval   = null;
let running    = false;

if (!isNaN(savedMin) && savedMin >= 1) pomoDuration.value = savedMin;

function renderTimer() {
  timerDisplay.textContent = `${padTwo(Math.floor(remaining / 60))}:${padTwo(remaining % 60)}`;
}
renderTimer();

function setBtns(r) {
  timerStart.disabled = r;
  timerStop.disabled  = !r;
}

function startTimer() {
  if (running) return;
  running = true;
  setBtns(true);
  timerStatus.textContent = 'Focusing… 🔥';
  if (Notification.permission === 'default') Notification.requestPermission();

  interval = setInterval(() => {
    remaining--;
    renderTimer();
    if (remaining <= 0) {
      clearInterval(interval);
      running = false;
      setBtns(false);
      timerDisplay.textContent = '00:00';
      timerStatus.textContent  = '✅ Done! Time for a break.';
      if (Notification.permission === 'granted')
        new Notification('🍅 Focus session complete!', { body: 'Take a short break.' });
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(interval);
  running = false;
  setBtns(false);
  timerStatus.textContent = 'Paused.';
}

function resetTimer() {
  clearInterval(interval);
  running   = false;
  remaining = totalSecs;
  renderTimer();
  setBtns(false);
  timerStatus.textContent = '';
}

timerStart.addEventListener('click', startTimer);
timerStop.addEventListener('click', stopTimer);
timerReset.addEventListener('click', resetTimer);

applyDuration.addEventListener('click', () => {
  const v = parseInt(pomoDuration.value, 10);
  if (isNaN(v) || v < 1 || v > 120) {
    timerStatus.textContent = '⚠️ Enter 1–120 minutes.';
    return;
  }
  totalSecs = v * 60;
  localStorage.setItem('db_pomo_min', v);
  resetTimer();
  timerStatus.textContent = `Set to ${v} min.`;
});

/* ══════════════════════════════════════════════════
   5. TO-DO LIST
   Challenges: prevent duplicates, sort tasks
══════════════════════════════════════════════════ */
const todoInput = $('todoInput');
const todoAdd   = $('todoAdd');
const todoList  = $('todoList');
const todoSort  = $('todoSort');

let tasks = loadJSON('db_tasks', []); // [{id, text, done}]

function saveTasks() { saveJSON('db_tasks', tasks); }

function getSorted() {
  const copy = [...tasks];
  switch (todoSort.value) {
    case 'az':   return copy.sort((a, b) => a.text.localeCompare(b.text));
    case 'za':   return copy.sort((a, b) => b.text.localeCompare(a.text));
    case 'done': return copy.sort((a, b) => Number(a.done) - Number(b.done));
    default:     return copy;
  }
}

function renderTasks() {
  todoList.innerHTML = '';
  const sorted = getSorted();
  if (!sorted.length) {
    todoList.innerHTML = '<li class="empty-state">No tasks yet — add one! 🎯</li>';
    return;
  }

  sorted.forEach((task) => {
    const li = document.createElement('li');
    li.className = `task-item${task.done ? ' done' : ''}`;
    li.dataset.id = task.id;

    // checkbox
    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.checked = task.done;
    cb.setAttribute('aria-label', 'Mark done');
    cb.addEventListener('change', () => {
      const t = tasks.find(t => t.id === task.id);
      if (t) { t.done = !t.done; saveTasks(); renderTasks(); }
    });

    // text span
    const span = document.createElement('span');
    span.className   = 'task-text';
    span.textContent = task.text;

    // edit btn
    const editBtn = document.createElement('button');
    editBtn.className   = 'btn-edit';
    editBtn.textContent = '✏️';
    editBtn.title       = 'Edit task';
    editBtn.addEventListener('click', () => enterEdit(li, task));

    // delete btn
    const delBtn = document.createElement('button');
    delBtn.className   = 'btn-delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks();
      renderTasks();
    });

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    actions.append(editBtn, delBtn);

    li.append(cb, span, actions);
    todoList.appendChild(li);
  });
}

function enterEdit(li, task) {
  const span   = li.querySelector('.task-text');
  const actions = li.querySelector('.task-actions');

  const inp = document.createElement('input');
  inp.type      = 'text';
  inp.className = 'task-edit-input';
  inp.value     = task.text;
  inp.maxLength = 120;

  const saveBtn = document.createElement('button');
  saveBtn.className   = 'btn-save-edit';
  saveBtn.textContent = '💾 Save';

  span.replaceWith(inp);
  actions.innerHTML = '';
  actions.appendChild(saveBtn);
  inp.focus();

  function commit() {
    const val = inp.value.trim();
    if (!val) return;
    const dup = tasks.some(t => t.id !== task.id && t.text.toLowerCase() === val.toLowerCase());
    if (dup) { inp.style.borderColor = '#e05252'; return; }
    const t = tasks.find(t => t.id === task.id);
    if (t) { t.text = val; saveTasks(); }
    renderTasks();
  }
  saveBtn.addEventListener('click', commit);
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') renderTasks();
  });
}

function addTask() {
  const text = todoInput.value.trim();
  if (!text) return;

  // Duplicate check
  if (tasks.some(t => t.text.toLowerCase() === text.toLowerCase())) {
    todoInput.style.outline = '2px solid #e05252';
    todoInput.placeholder   = '⚠️ Task already exists!';
    setTimeout(() => {
      todoInput.style.outline = '';
      todoInput.placeholder   = 'Add a new task…';
    }, 1800);
    return;
  }

  tasks.push({ id: Date.now().toString(), text, done: false });
  saveTasks();
  todoInput.value = '';
  renderTasks();
}

todoAdd.addEventListener('click', addTask);
todoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
todoSort.addEventListener('change', renderTasks);
renderTasks();

/* ══════════════════════════════════════════════════
   6. QUICK LINKS
══════════════════════════════════════════════════ */
const linkLabel = $('linkLabel');
const linkUrl   = $('linkUrl');
const linkAdd   = $('linkAdd');
const linkGrid  = $('linkGrid');

let links = loadJSON('db_links', []); // [{id, label, url}]
function saveLinks() { saveJSON('db_links', links); }

function getFavicon(url) {
  try { return `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(new URL(url).origin)}`; }
  catch { return null; }
}

function renderLinks() {
  linkGrid.innerHTML = '';
  if (!links.length) {
    linkGrid.innerHTML = '<p class="empty-state">No links yet. Add your favourites! 🌐</p>';
    return;
  }

  links.forEach((link) => {
    const a = document.createElement('a');
    a.href      = link.url;
    a.target    = '_blank';
    a.rel       = 'noopener noreferrer';
    a.className = 'link-chip';

    const fav = getFavicon(link.url);
    if (fav) {
      const img = document.createElement('img');
      img.src    = fav;
      img.alt    = '';
      img.onerror = () => img.remove();
      a.appendChild(img);
    }

    const label = document.createElement('span');
    label.textContent = link.label;
    a.appendChild(label);

    const del = document.createElement('button');
    del.className   = 'link-chip-del';
    del.textContent = '✕';
    del.title       = 'Remove';
    del.setAttribute('aria-label', `Remove ${link.label}`);
    del.addEventListener('click', (e) => {
      e.preventDefault();
      links = links.filter(l => l.id !== link.id);
      saveLinks();
      renderLinks();
    });
    a.appendChild(del);

    linkGrid.appendChild(a);
  });
}

function addLink() {
  const label = linkLabel.value.trim();
  let   url   = linkUrl.value.trim();
  if (!label || !url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try { new URL(url); } catch {
    linkUrl.style.outline = '2px solid #e05252';
    setTimeout(() => linkUrl.style.outline = '', 1800);
    return;
  }
  links.push({ id: Date.now().toString(), label, url });
  saveLinks();
  linkLabel.value = '';
  linkUrl.value   = '';
  renderLinks();
}

linkAdd.addEventListener('click', addLink);
linkLabel.addEventListener('keydown', (e) => { if (e.key === 'Enter') addLink(); });
linkUrl.addEventListener('keydown',   (e) => { if (e.key === 'Enter') addLink(); });
renderLinks();
