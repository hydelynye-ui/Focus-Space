const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_KEY = 'focus-space-state-v2';
const nowISO = () => new Date().toISOString();
const dayKey = value => new Date(value).toISOString().slice(0, 10);
const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const scenes = [
  { id: 'warm', name: 'Warm Study', desc: 'Soft light · steady pace', img: '/assets/warm-study.svg' },
  { id: 'deep', name: 'Deep Work', desc: 'Low light · low noise', img: '/assets/deep-work.svg' },
  { id: 'reading', name: 'Reading Room', desc: 'Quiet pages · open mind', img: '/assets/reading-room.svg' },
  { id: 'rainy', name: 'Rainy Retreat', desc: 'Slow weather · clear thoughts', img: '/assets/rainy-retreat.svg' },
  { id: 'morning', name: 'Morning Planning', desc: 'Bright start · gentle momentum', img: '/assets/morning-planning.svg' }
];
const DEFAULT_LAYOUT = ['timer', 'tasks', 'schedule', 'notes', 'stats', 'clock'];
const defaultState = {
  theme: 'light', scene: 'warm', timerStyle: 'circular', clockStyle: 'digital', preset: 25,
  encouragement: true, reduceMotion: false, layoutOrder: DEFAULT_LAYOUT, layoutHidden: [],
  tasks: [], schedule: [], notes: '', fullNote: '', sessions: [],
  timer: { mode: 'focus', phase: 'idle', duration: 1500, startedAt: null, elapsedBeforeStart: 0, sessionId: null }
};
const LOCAL_DB_NAME = 'focus-space-local-v1';
const LOCAL_STORE = 'workspace';
let localDbPromise;
function openLocalDb() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  if (!localDbPromise) localDbPromise = new Promise(resolve => {
    const request = indexedDB.open(LOCAL_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(LOCAL_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return localDbPromise;
}
async function readIndexedState() {
  try {
    const db = await openLocalDb(); if (!db) return null;
    return await new Promise(resolve => { const tx = db.transaction(LOCAL_STORE, 'readonly'); const request = tx.objectStore(LOCAL_STORE).get('current'); request.onsuccess = () => resolve(request.result || null); request.onerror = () => resolve(null); });
  } catch { return null; }
}
async function writeIndexedState(value) {
  try {
    const db = await openLocalDb(); if (!db) return;
    await new Promise(resolve => { const tx = db.transaction(LOCAL_STORE, 'readwrite'); tx.objectStore(LOCAL_STORE).put(value, 'current'); tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); });
  } catch { /* localStorage remains the fallback */ }
}
async function hydrateIndexedState() {
  const indexed = await readIndexedState();
  if (indexed) {
    state = { ...state, ...indexed, timer: { ...defaultState.timer, ...(indexed.timer || {}) } };
    renderAll();
  } else {
    writeIndexedState(state);
  }
}
let state = loadState();
let tickHandle = null;
let toastTimer = null;
let editingLayout = false;
let layoutDraft = null;

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem('focus-space-state-v1') || '{}');
    const migratedTimerStyle = raw.timerStyle === 'hourglass';
    const next = {
      ...defaultState, ...raw,
      timerStyle: migratedTimerStyle ? 'circular' : (raw.timerStyle || defaultState.timerStyle),
      layoutOrder: Array.isArray(raw.layoutOrder) ? raw.layoutOrder : DEFAULT_LAYOUT,
      layoutHidden: Array.isArray(raw.layoutHidden) ? raw.layoutHidden : [],
      timer: { ...defaultState.timer, ...(raw.timer || {}) }
    };
    if (migratedTimerStyle) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return structuredClone(defaultState);
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  writeIndexedState(state);
  updateSync(navigator.onLine ? 'Local saved' : 'Offline · local saved', navigator.onLine ? 'local' : 'offline');
}
function updateSync(label, mode = 'local') {
  const text = $('#syncText');
  const dot = $('.sync-dot');
  if (text) text.textContent = label;
  if (dot) dot.style.background = mode === 'sync' ? '#c6a56b' : mode === 'offline' ? '#ad8b75' : mode === 'failed' ? '#b66754' : '#719c84';
}
function showToast(message) {
  $('#toastText').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2200);
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function formatTime(seconds) {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`;
}
function currentElapsed() {
  const timer = state.timer;
  return Math.max(0, timer.elapsedBeforeStart + (timer.phase === 'running' && timer.startedAt ? (Date.now() - timer.startedAt) / 1000 : 0));
}
function timerProgress() { return Math.min(1, currentElapsed() / Math.max(1, state.timer.duration)); }

function renderTimerVisual() {
  const stage = $('#timerStage');
  const visualArea = $('#timerVisualArea');
  if (!stage || !visualArea) return;
  const style = state.timerStyle;
  const templates = {
    minimal: `<div class="timer-shell minimal-shell"><div class="timer-readout" id="timerReadout"></div></div>`,
    circular: `<div class="timer-shell circular-shell"><div class="inner-orbit"></div><div class="timer-readout" id="timerReadout"></div></div>`,
    flip: `<div class="timer-shell flip-shell"><div class="flip-panel" id="flipMinutes">25</div><div class="flip-colon">:</div><div class="flip-panel" id="flipSeconds">00</div></div>`,
    analog: `<div class="timer-shell analog-shell"><div class="analog-face"></div><div class="analog-hand" id="analogHand"></div><div class="timer-readout" id="timerReadout"></div></div>`,
    radial: `<div class="timer-shell radial-shell"><div class="radial-progress"></div><div class="timer-readout" id="timerReadout"></div></div>`,
    glass: `<div class="timer-shell glass-shell"><div class="timer-readout" id="timerReadout"></div></div>`
  };
  stage.dataset.style = style;
  visualArea.innerHTML = templates[style] || templates.circular;
}
function renderTimer() {
  if (!$('#timerVisualArea')?.firstElementChild) renderTimerVisual();
  const timer = state.timer;
  const elapsed = currentElapsed();
  const remaining = Math.max(0, timer.duration - elapsed);
  const text = formatTime(timer.phase === 'idle' && elapsed === 0 ? timer.duration : remaining);
  const readout = $('#timerReadout');
  if (readout) readout.textContent = text;
  if ($('#flipMinutes')) $('#flipMinutes').textContent = text.split(':')[0];
  if ($('#flipSeconds')) $('#flipSeconds').textContent = text.split(':')[1];
  if ($('#overlayTimer')) $('#overlayTimer').textContent = text;
  const label = timer.mode === 'focus' ? 'Deep work' : timer.mode === 'short' ? 'Short break' : 'Long break';
  $('#timerModeLabel').textContent = label;
  $('#timerStatus').textContent = timer.phase === 'running' ? 'In focus' : timer.phase === 'paused' ? 'Paused' : 'Ready to focus';
  $('#startLabel').textContent = timer.phase === 'running' ? 'Pause' : timer.phase === 'paused' ? 'Resume' : 'Start focus';
  $('#startIcon').textContent = timer.phase === 'running' ? 'Ⅱ' : '▶';
  $('#overlayStart').textContent = timer.phase === 'running' ? 'Ⅱ Pause' : timer.phase === 'paused' ? '▶ Resume' : '▶ Start focus';
  const progress = Math.round(timerProgress() * 360);
  $('#timerStage')?.style.setProperty('--progress', `${progress}deg`);
  $('#timerStage')?.style.setProperty('--pct', timerProgress());
  $('#analogHand')?.style.setProperty('--hand-angle', `${Math.round(timerProgress() * 360)}deg`);
  const caption = timer.phase === 'running' ? (state.encouragement ? 'Stay with this one thing.' : '') : timer.phase === 'paused' ? 'Paused. Come back when you are ready.' : 'A quiet start is still a start.';
  if ($('#timerCaption')) $('#timerCaption').textContent = caption || 'A quiet start is still a start.';
  if ($('#overlayCaption')) $('#overlayCaption').textContent = caption;
}
function timerLoop() {
  renderTimer();
  if (state.timer.phase === 'running') {
    if (currentElapsed() >= state.timer.duration) return completeSession(true);
    tickHandle = requestAnimationFrame(timerLoop);
  }
}
function startPause() {
  const timer = state.timer;
  if (timer.phase === 'running') {
    timer.elapsedBeforeStart = currentElapsed(); timer.startedAt = null; timer.phase = 'paused';
    cancelAnimationFrame(tickHandle); saveState(); renderTimer(); showToast('Focus paused'); return;
  }
  if (timer.phase === 'paused') { timer.startedAt = Date.now(); timer.phase = 'running'; saveState(); timerLoop(); showToast('Back to focus'); return; }
  timer.startedAt = Date.now(); timer.phase = 'running'; timer.sessionId ||= uid('session'); saveState(); timerLoop(); showToast('Focus started');
}
function resetTimer(force = false) {
  if (!force && currentElapsed() > 1 && state.timer.phase !== 'idle') return openConfirmReset();
  state.timer = { ...state.timer, phase: 'idle', startedAt: null, elapsedBeforeStart: 0, sessionId: null };
  saveState(); renderTimer(); showToast('Timer reset');
}
function stopTimer() { if (state.timer.phase === 'idle') return showToast('Nothing to stop yet'); completeSession(false); }
function completeSession(auto) {
  const timer = state.timer;
  const actual = Math.max(0, Math.round(currentElapsed()));
  if (timer.mode === 'focus' && actual > 0) {
    const session = {
      id: timer.sessionId || uid('session'), startedAt: new Date(Date.now() - actual * 1000).toISOString(), endedAt: nowISO(), date: dayKey(Date.now()),
      plannedSeconds: timer.duration, actualSeconds: Math.min(actual, timer.duration), intention: '', outcome: '', mood: '', interruptions: '', nextStep: '', reflection: '', createdAt: nowISO(), updatedAt: nowISO()
    };
    state.sessions.unshift(session);
    state.timer = { ...timer, phase: 'idle', startedAt: null, elapsedBeforeStart: 0, sessionId: null };
    saveState(); renderAll(); openReflection(session, auto); return;
  }
  state.timer = { ...timer, phase: 'idle', startedAt: null, elapsedBeforeStart: 0, sessionId: null }; saveState(); renderTimer();
}
function setMode(mode) {
  if (state.timer.phase === 'running') return showToast('Pause the timer before changing mode');
  const durations = { focus: state.preset * 60, short: 5 * 60, long: 15 * 60 };
  state.timer = { ...state.timer, mode, duration: durations[mode], elapsedBeforeStart: 0, startedAt: null, phase: 'idle', sessionId: null };
  $$('.seg-button').forEach(button => button.classList.toggle('active', button.dataset.mode === mode)); saveState(); renderTimer();
}
function setPreset(value) {
  if (value === 'custom') return openCustomDuration();
  state.preset = Number(value);
  if (state.timer.phase === 'idle' || state.timer.phase === 'paused') state.timer.duration = state.timer.mode === 'focus' ? state.preset * 60 : state.timer.mode === 'short' ? 300 : 900;
  saveState(); renderTimer();
}

function renderTasks(root) {
  if (!root) return;
  root.innerHTML = state.tasks.length ? state.tasks.map(task => `<div class="task-row ${task.done ? 'done' : ''}" data-id="${task.id}"><button class="task-check" aria-label="Toggle task">✓</button><span class="task-title">${escapeHtml(task.title)}</span><span class="task-tag">${escapeHtml(task.tag || '')}</span></div>`).join('') : '<div class="empty-list">No tasks yet.<br><button data-add-task>＋ Add the first task</button></div>';
  $$('.task-row', root).forEach(row => $('.task-check', row).addEventListener('click', () => {
    const task = state.tasks.find(item => item.id === row.dataset.id); if (!task) return; task.done = !task.done; saveState(); renderAll(); showToast(task.done ? 'Task completed' : 'Task reopened');
  }));
}
function renderSchedule(root) {
  if (!root) return;
  root.innerHTML = state.schedule.length ? state.schedule.map(item => `<div class="schedule-item"><div class="schedule-time">${escapeHtml(item.time)}</div><div class="schedule-title"><span class="schedule-line"></span><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.meta || '')}</span></div></div>`).join('') : '<div class="empty-list">Nothing scheduled yet.<br><button data-add-schedule>＋ Add to your day</button></div>';
}
function lastDays(count) { return Array.from({ length: count }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (count - 1 - index)); return dayKey(date); }); }
function renderStats() {
  const sessions = state.sessions, today = dayKey(Date.now()), todaySeconds = sessions.filter(item => item.date === today).reduce((sum, item) => sum + item.actualSeconds, 0);
  $('#todayMinutes').textContent = `${Math.round(todaySeconds / 60)}m`; $('#weekSessions').textContent = sessions.length; $('#streakDays').textContent = sessions.length ? Math.min(7, new Set(sessions.map(item => item.date)).size) : 0;
  const values = lastDays(7).map(date => sessions.filter(item => item.date === date).reduce((sum, item) => sum + item.actualSeconds, 0)); const max = Math.max(...values, 1800);
  $('#weeklyBars').innerHTML = values.map((value, index) => `<i class="${index === 6 ? 'today' : ''} ${value ? 'active' : ''}" style="height:${Math.max(10, Math.round(value / max * 100))}%"></i>`).join('');
}
function renderJourney() {
  const total = state.sessions.reduce((sum, item) => sum + item.actualSeconds, 0); $('#journeyTotal').textContent = `${Math.floor(total / 3600)}h ${Math.round(total % 3600 / 60)}m`; $('#journeyCount').textContent = `${state.sessions.length} session${state.sessions.length === 1 ? '' : 's'}`;
  const values = lastDays(7).map(date => state.sessions.filter(item => item.date === date).reduce((sum, item) => sum + item.actualSeconds, 0)); const max = Math.max(...values, 1800);
  $('#largeBars').innerHTML = values.map((value, index) => `<i class="${index === 6 ? 'today' : ''} ${value ? 'active' : ''}" style="height:${Math.max(8, Math.round(value / max * 100))}%"></i>`).join('');
  $('#sessionHistory').innerHTML = state.sessions.length ? state.sessions.slice(0, 8).map(session => `<div class="session-row"><div><strong>${escapeHtml(session.outcome || 'Focused session')}</strong><span>${new Date(session.endedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })} · ${Math.round(session.actualSeconds / 60)} min</span></div><span>${escapeHtml(session.mood || '—')}</span></div>`).join('') : '<div class="empty-state">Complete a focus session to see your reflections here.</div>';
}
function sceneCard(scene, popover = false) {
  if (popover) return `<article class="scene-popover-card ${state.scene === scene.id ? 'selected' : ''} ${state.scene === scene.id ? 'favorite' : ''}" data-scene="${scene.id}"><img src="${scene.img}" alt="${scene.name} scene"><span class="scene-popover-check">✓</span><span class="scene-popover-label">${scene.name}</span><button class="favorite-scene" aria-label="Favorite ${scene.name}">${state.scene === scene.id ? '★' : '☆'}</button></article>`;
  return `<article class="scene-card ${state.scene === scene.id ? 'selected' : ''}" data-scene="${scene.id}"><img src="${scene.img}" alt="${scene.name} scene"><span class="scene-check">✓</span><div class="scene-info"><h3>${scene.name}</h3><p>${scene.desc}</p></div></article>`;
}
function renderScenes(filter = '') {
  const matches = scenes.filter(scene => `${scene.name} ${scene.desc}`.toLowerCase().includes(filter.toLowerCase()));
  $('#sceneGrid').innerHTML = scenes.map(scene => sceneCard(scene)).join('');
  $('#scenePopoverGrid').innerHTML = matches.map(scene => sceneCard(scene, true)).join('');
  $('#sceneResultCount').textContent = `${matches.length} scene${matches.length === 1 ? '' : 's'}`;
  $$('.scene-card, .scene-popover-card').forEach(card => card.addEventListener('click', event => {
    if (event.target.closest('.favorite-scene')) event.preventDefault();
    state.scene = card.dataset.scene; saveState(); applyScene(); renderScenes($('#sceneSearch')?.value || ''); showToast(`${scenes.find(scene => scene.id === state.scene).name} applied`);
  }));
}
function applyScene() {
  const scene = scenes.find(item => item.id === state.scene) || scenes[0];
  $('#overlayScene').textContent = scene.name;
  const timerCard = $('.timer-card');
  if (timerCard) { timerCard.style.backgroundImage = `linear-gradient(145deg,rgba(255,255,253,.89),rgba(247,249,244,.7)),url(${scene.img})`; timerCard.style.backgroundSize = 'cover'; timerCard.style.backgroundPosition = 'center'; }
}

function renderClockVisual() {
  const visual = $('#clockVisual'); if (!visual) return;
  const templates = {
    digital: `<div class="clock-face"><div class="clock-time" id="clockTime"></div><div class="clock-meta" id="clockMeta"></div></div>`,
    analog: `<div class="clock-visual analog-clock"><div class="clock-hand hour" id="clockHour"></div><div class="clock-hand minute" id="clockMinute"></div><div class="clock-hand second" id="clockSecond"></div><div class="clock-center"></div></div>`,
    hybrid: `<div class="hybrid-clock"><div class="clock-visual analog-clock"><div class="clock-hand hour" id="clockHour"></div><div class="clock-hand minute" id="clockMinute"></div><div class="clock-hand second" id="clockSecond"></div><div class="clock-center"></div></div><div class="clock-face"><div class="clock-time" id="clockTime"></div><div class="clock-meta" id="clockMeta"></div></div></div>`,
    dot: `<div class="dot-clock" id="dotClock"></div>`
  };
  visual.innerHTML = templates[state.clockStyle] || templates.digital;
  $('#clockStyleSelect').value = state.clockStyle;
  updateClock();
}
function updateClock() {
  const date = new Date();
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const seconds = date.getSeconds();
  const meta = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  if ($('#todayLabel')) $('#todayLabel').textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  if ($('#clockTime')) $('#clockTime').textContent = time;
  if ($('#clockMeta')) $('#clockMeta').textContent = meta;
  const angle = (value, max) => `${Math.round(value / max * 360)}deg`;
  $('#clockHour')?.style.setProperty('--angle', angle((date.getHours() % 12) + date.getMinutes() / 60, 12));
  $('#clockMinute')?.style.setProperty('--angle', angle(date.getMinutes() + seconds / 60, 60));
  $('#clockSecond')?.style.setProperty('--angle', angle(seconds, 60));
  if ($('#dotClock')) {
    const glyphs = { '0': ['111','101','101','101','111'], '1': ['010','110','010','010','111'], '2': ['111','001','111','100','111'], '3': ['111','001','111','001','111'], '4': ['101','101','111','001','001'], '5': ['111','100','111','001','111'], '6': ['111','100','111','101','111'], '7': ['111','001','010','010','010'], '8': ['111','101','111','101','111'], '9': ['111','101','111','001','111'], ':': ['0','1','0','1','0'] };
    const chars = time.replace(':', ':').split(''); const rows = Array.from({ length: 5 }, (_, row) => chars.map(char => glyphs[char][row]).join('0')).join('|');
    $('#dotClock').innerHTML = rows.split('|').map(row => `<div class="dot-row">${[...row].map(cell => `<i class="dot-cell ${cell === '1' ? 'on' : ''}"></i>`).join('')}</div>`).join('');
  }
}

function applyLayout() {
  const grid = $('#workspaceGrid'); if (!grid) return;
  state.layoutOrder.forEach((widget, index) => { const element = grid.querySelector(`[data-widget="${widget}"]`); if (element) { element.style.order = index; element.style.display = state.layoutHidden.includes(widget) ? 'none' : ''; } });
}
function renderLayoutToolbar() {
  const toolbar = $('#layoutToolbar'); if (!toolbar) return;
  const labels = { timer: 'Timer', tasks: 'Tasks', schedule: 'Schedule', notes: 'Notes', stats: 'Stats', clock: 'Clock' };
  toolbar.innerHTML = `<span class="toolbar-title">Edit home layout · drag cards to reorder</span>${state.layoutOrder.map(widget => `<button class="toolbar-widget ${state.layoutHidden.includes(widget) ? 'hidden' : ''}" data-toggle-widget="${widget}">${state.layoutHidden.includes(widget) ? '＋ ' : '− '}${labels[widget]}</button>`).join('')}<div class="toolbar-actions"><button class="secondary-button" id="resetLayout">Reset</button><button class="secondary-button" id="cancelLayout">Cancel</button><button class="primary-button" id="saveLayout">Save layout</button></div>`;
  $$('.toolbar-widget', toolbar).forEach(button => button.addEventListener('click', () => { const widget = button.dataset.toggleWidget; state.layoutHidden = state.layoutHidden.includes(widget) ? state.layoutHidden.filter(item => item !== widget) : [...state.layoutHidden, widget]; applyLayout(); renderLayoutToolbar(); }));
  $('#resetLayout').addEventListener('click', () => { state.layoutOrder = [...DEFAULT_LAYOUT]; state.layoutHidden = []; applyLayout(); renderLayoutToolbar(); });
  $('#cancelLayout').addEventListener('click', () => { state.layoutOrder = [...layoutDraft.order]; state.layoutHidden = [...layoutDraft.hidden]; exitLayoutEdit(false); });
  $('#saveLayout').addEventListener('click', () => { saveState(); exitLayoutEdit(true); });
}
function enterLayoutEdit() {
  editingLayout = true; layoutDraft = { order: [...state.layoutOrder], hidden: [...state.layoutHidden] }; document.body.classList.add('layout-editing'); $('#layoutToolbar').hidden = false; renderLayoutToolbar();
  $$('#workspaceGrid > .surface').forEach(card => { card.draggable = true; card.addEventListener('dragstart', onDragStart); card.addEventListener('dragover', onDragOver); card.addEventListener('drop', onDrop); addWidgetTool(card); });
  $('#editLayoutButton').textContent = 'Done editing';
}
function exitLayoutEdit(saved) {
  editingLayout = false; document.body.classList.remove('layout-editing'); $('#layoutToolbar').hidden = true; $('#layoutToolbar').innerHTML = '';
  $$('#workspaceGrid > .surface').forEach(card => { card.draggable = false; $('.widget-tools', card)?.remove(); card.removeEventListener('dragstart', onDragStart); card.removeEventListener('dragover', onDragOver); card.removeEventListener('drop', onDrop); });
  $('#editLayoutButton').innerHTML = 'Edit layout <span>⌘K</span>'; applyLayout(); if (saved) showToast('Layout saved locally');
}
function addWidgetTool(card) { const tools = document.createElement('div'); tools.className = 'widget-tools'; const button = document.createElement('button'); button.textContent = 'Hide'; button.addEventListener('click', event => { event.stopPropagation(); const widget = card.dataset.widget; state.layoutHidden = [...new Set([...state.layoutHidden, widget])]; applyLayout(); renderLayoutToolbar(); }); tools.append(button); card.append(tools); }
let draggedWidget = null;
function onDragStart(event) { draggedWidget = event.currentTarget.dataset.widget; event.dataTransfer.effectAllowed = 'move'; }
function onDragOver(event) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }
function onDrop(event) { event.preventDefault(); const target = event.currentTarget.dataset.widget; if (!draggedWidget || draggedWidget === target) return; const order = [...state.layoutOrder]; const from = order.indexOf(draggedWidget); const to = order.indexOf(target); order.splice(from, 1); order.splice(to, 0, draggedWidget); state.layoutOrder = order; applyLayout(); renderLayoutToolbar(); }

function openModal(html) { $('#modalCard').innerHTML = html; $('#modal').classList.add('open'); $('#modal').setAttribute('aria-hidden', 'false'); }
function closeModal() { $('#modal').classList.remove('open'); $('#modal').setAttribute('aria-hidden', 'true'); }
function openConfirmReset() { openModal(`<h3>Reset this session?</h3><p>You have already spent ${Math.round(currentElapsed() / 60)} minutes here. Resetting clears this in-progress session without creating a reflection.</p><div class="modal-actions"><button class="secondary-button" data-close-modal>Keep going</button><button class="primary-button" id="confirmReset">Reset session</button></div>`); $('#confirmReset').addEventListener('click', () => { closeModal(); resetTimer(true); }); }
function openCustomDuration() { openModal(`<h3>Make a custom focus block</h3><p>Choose a duration that fits the work in front of you.</p><div class="modal-form"><label>Focus minutes<input id="customFocus" type="number" min="1" max="180" value="25"></label><label>Break minutes<input id="customBreak" type="number" min="1" max="60" value="5"></label></div><div class="modal-actions"><button class="secondary-button" data-close-modal>Cancel</button><button class="primary-button" id="saveCustom">Use this preset</button></div>`); $('#saveCustom').addEventListener('click', () => { const focus = Math.max(1, Math.min(180, Number($('#customFocus').value) || 25)); state.preset = focus; state.timer.duration = state.timer.mode === 'focus' ? focus * 60 : Math.max(1, Number($('#customBreak').value) || 5) * 60; saveState(); closeModal(); renderTimer(); showToast('Custom preset ready'); }); }
function openReflection(session, auto) { openModal(`<p class="eyebrow">${auto ? 'SESSION COMPLETE' : 'SESSION ENDED'}</p><h3>What did this time make possible?</h3><p>Your ${Math.round(session.actualSeconds / 60)} minute focus block is saved.</p><div class="modal-form"><label>Outcome<textarea id="reflectionOutcome" placeholder="What moved forward?"></textarea></label><label>Mood<select id="reflectionMood"><option value="">Choose one</option><option>Clear</option><option>Steady</option><option>Restless</option><option>Surprised</option></select></label><label>Next step<input id="reflectionNext" placeholder="What comes next?"></label></div><div class="modal-actions"><button class="secondary-button" id="skipReflection">Skip for now</button><button class="primary-button" id="saveReflection">Save reflection</button></div>`); $('#skipReflection').addEventListener('click', () => { closeModal(); showToast('Session saved'); }); $('#saveReflection').addEventListener('click', () => { session.outcome = $('#reflectionOutcome').value.trim(); session.mood = $('#reflectionMood').value; session.nextStep = $('#reflectionNext').value.trim(); session.updatedAt = nowISO(); saveState(); closeModal(); renderAll(); showToast('Reflection saved'); }); }
function openAddTask() { openModal(`<h3>Add a task</h3><p>Keep it small enough to start.</p><div class="modal-form"><label>Task<input id="newTaskTitle" autofocus placeholder="What needs your attention?"></label><label>Area<select id="newTaskTag"><option>Work</option><option>Personal</option><option>Inbox</option></select></label></div><div class="modal-actions"><button class="secondary-button" data-close-modal>Cancel</button><button class="primary-button" id="saveTask">Add task</button></div>`); $('#saveTask').addEventListener('click', () => { const title = $('#newTaskTitle').value.trim(); if (!title) return; state.tasks.push({ id: uid('task'), title, tag: $('#newTaskTag').value, done: false }); saveState(); closeModal(); renderAll(); showToast('Task added'); }); }
function openAddSchedule() { openModal(`<h3>Add to your day</h3><p>Give the next block a gentle shape.</p><div class="modal-form"><label>Title<input id="newScheduleTitle" autofocus placeholder="e.g. Review the brief"></label><label>Time<input id="newScheduleTime" type="time" value="11:00"></label><label>Duration<input id="newScheduleMeta" placeholder="Focus / 45 min" value="Focus / 45 min"></label></div><div class="modal-actions"><button class="secondary-button" data-close-modal>Cancel</button><button class="primary-button" id="saveSchedule">Add to schedule</button></div>`); $('#saveSchedule').addEventListener('click', () => { const title = $('#newScheduleTitle').value.trim(); if (!title) return; state.schedule.push({ id: uid('schedule'), title, time: $('#newScheduleTime').value || '11:00', meta: $('#newScheduleMeta').value.trim() }); state.schedule.sort((a, b) => a.time.localeCompare(b.time)); saveState(); closeModal(); renderAll(); showToast('Schedule updated'); }); }
function openRitual() { openModal(`<p class="eyebrow">FOCUS RITUAL</p><h3>Arrive before you begin.</h3><p>Take 30 seconds to settle your space. This is optional and will not create a session.</p><div class="ritual-steps"><div>1 <span>Clear one small surface</span></div><div>2 <span>Take three slow breaths</span></div><div>3 <span>Choose one thing to move forward</span></div></div><div class="modal-actions"><button class="secondary-button" data-close-modal>Skip</button><button class="primary-button" id="ritualDone">I’m ready</button></div>`); $('#ritualDone').addEventListener('click', () => { closeModal(); showToast('Your space is ready'); }); }
function toggleScenes(force) { const popover = $('#scenesPopover'); const open = typeof force === 'boolean' ? force : !popover.classList.contains('open'); popover.classList.toggle('open', open); popover.setAttribute('aria-hidden', String(!open)); if (open) $('#sceneSearch').focus(); }
function navigate(view) { if (view === 'scenes') { navigate('workspace'); toggleScenes(true); return; } $$('.view').forEach(section => section.classList.toggle('active', section.id === `${view}View`)); $$('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view)); if (view !== 'workspace') toggleScenes(false); window.scrollTo({ top: 0, behavior: state.reduceMotion ? 'auto' : 'smooth' }); }
function toggleFullscreen() { const overlay = $('#focusOverlay'); overlay.classList.toggle('open'); overlay.setAttribute('aria-hidden', String(!overlay.classList.contains('open'))); }
function renderAll() {
  renderTimerVisual(); renderTasks($('#taskList')); renderTasks($('#taskListPage')); renderSchedule($('#scheduleList')); renderSchedule($('#scheduleListPage')); renderStats(); renderJourney(); renderScenes($('#sceneSearch')?.value || ''); renderClockVisual(); renderTimer(); applyLayout(); applyScene();
  $('#taskCount').textContent = state.tasks.filter(task => !task.done).length; $('#quickNote').value = state.notes || ''; $('#fullNote').value = state.fullNote || state.notes || ''; $('#noteCount').textContent = `${(state.notes || '').length} / 500`; $('#fullNoteCount').textContent = `${(state.fullNote || '').length} / 5000`;
}
function bind() {
  document.addEventListener('click', event => {
    if (event.target.closest('[data-close-modal]')) return closeModal();
    if (event.target.closest('[data-add-task]')) return openAddTask();
    if (event.target.closest('[data-add-schedule]')) return openAddSchedule();
    const view = event.target.closest('[data-view], [data-view-target]'); if (view) navigate(view.dataset.view || view.dataset.viewTarget);
  });
  $('#startButton').addEventListener('click', startPause); $('#overlayStart').addEventListener('click', startPause); $('#resetButton').addEventListener('click', () => resetTimer()); $('#overlayReset').addEventListener('click', () => resetTimer()); $('#overlayStop').addEventListener('click', stopTimer); $('#fullscreenButton').addEventListener('click', toggleFullscreen); $('#exitFullscreen').addEventListener('click', toggleFullscreen);
  $('#themeToggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; document.body.classList.toggle('dark', state.theme === 'dark'); saveState(); });
  $('#ritualButton').addEventListener('click', openRitual); $('#scenesButton').addEventListener('click', () => toggleScenes()); $('#closeScenes').addEventListener('click', () => toggleScenes(false)); $('#sceneSearch').addEventListener('input', event => renderScenes(event.target.value));
  $('#addTaskButton').addEventListener('click', openAddTask); $('#addTaskButtonPage').addEventListener('click', openAddTask); $('#addScheduleButton').addEventListener('click', openAddSchedule); $('#addScheduleButtonPage').addEventListener('click', openAddSchedule); $('#openNotesButton').addEventListener('click', () => navigate('notes')); $('#newNoteButton').addEventListener('click', () => $('#fullNote').focus());
  $('#presetSelect').addEventListener('change', event => setPreset(event.target.value)); $('#styleSelect').addEventListener('change', event => { state.timerStyle = event.target.value; saveState(); renderTimerVisual(); renderTimer(); showToast('Timer style changed'); }); $('#clockStyleSelect').addEventListener('change', event => { state.clockStyle = event.target.value; saveState(); renderClockVisual(); showToast('Clock style changed'); }); $$('.seg-button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $('#quickNote').addEventListener('input', event => { state.notes = event.target.value.slice(0, 500); $('#noteCount').textContent = `${state.notes.length} / 500`; saveState(); }); $('#fullNote').addEventListener('input', event => { state.fullNote = event.target.value.slice(0, 5000); $('#fullNoteCount').textContent = `${state.fullNote.length} / 5000`; saveState(); }); $('#encouragementToggle').addEventListener('change', event => { state.encouragement = event.target.checked; saveState(); }); $('#motionToggle').addEventListener('change', event => { state.reduceMotion = event.target.checked; document.body.classList.toggle('reduce-motion', state.reduceMotion); saveState(); });
  $('#editLayoutButton').addEventListener('click', () => editingLayout ? exitLayoutEdit(true) : enterLayoutEdit());
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('#focusOverlay').classList.contains('open')) toggleFullscreen(); if (event.key === 'Escape' && $('#scenesPopover').classList.contains('open')) toggleScenes(false); if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); editingLayout ? exitLayoutEdit(true) : enterLayoutEdit(); } });
  window.addEventListener('online', () => updateSync('Local saved · online')); window.addEventListener('offline', () => updateSync('Offline · local saved', 'offline'));
}
function init() {
  document.body.classList.toggle('dark', state.theme === 'dark'); document.body.classList.toggle('reduce-motion', state.reduceMotion); $('#encouragementToggle').checked = state.encouragement; $('#motionToggle').checked = state.reduceMotion; $('#presetSelect').value = String(state.preset); $('#styleSelect').value = state.timerStyle; $('#timerStage').dataset.style = state.timerStyle; bind(); renderAll(); setInterval(updateClock, 1000); if (state.timer.phase === 'running') timerLoop(); if (!navigator.onLine) updateSync('Offline · local saved', 'offline'); if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}
init();
