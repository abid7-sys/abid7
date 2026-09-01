const App = (() => {
  const STORAGE_KEY = 'adm-prep-tracker-v1';
  const TRACKS = {
    engineering: 'Engineering Prep',
    varsity: 'Varsity A-Unit',
  };

  const DEFAULT_SUBJECTS = {
    engineering: ['Math', 'Physics', 'Chemistry'],
    varsity: ['Physics', 'Chemistry', 'Math', 'English'],
  };

  const elements = {
    todayDate: document.getElementById('todayDate'),
    trackTabs: document.getElementById('trackTabs'),
    trackButtons: document.querySelectorAll('[data-track]'),
    universityForm: document.getElementById('universityForm'),
    universityName: document.getElementById('universityName'),
    universityDate: document.getElementById('universityDate'),
    universityList: document.getElementById('universityList'),
    subjectList: document.getElementById('subjectList'),
    timerDisplay: document.getElementById('timerDisplay'),
    timerLength: document.getElementById('timerLength'),
    timerSessions: document.getElementById('timerSessions'),
    timerStatus: document.getElementById('timerStatus'),
    dailyFocusTotal: document.getElementById('dailyFocusTotal'),
    timerCustom: document.getElementById('timerCustom'),
    setCustomTimer: document.getElementById('setCustomTimer'),
    startTimer: document.getElementById('startTimer'),
    pauseTimer: document.getElementById('pauseTimer'),
    resetTimer: document.getElementById('resetTimer'),
    resetDailyStats: document.getElementById('resetDailyStats'),
    historyDate: document.getElementById('historyDate'),
    historySummary: document.getElementById('historySummary'),
    notesForm: document.getElementById('notesForm'),
    noteInput: document.getElementById('noteInput'),
    noteList: document.getElementById('noteList'),
    goalsForm: document.getElementById('goalsForm'),
    goalInput: document.getElementById('goalInput'),
    taskSubject: document.getElementById('taskSubject'),
    taskPriority: document.getElementById('taskPriority'),
    taskDate: document.getElementById('taskDate'),
    taskCount: document.getElementById('taskCount'),
    taskFilters: document.getElementById('taskFilters'),
    goalList: document.getElementById('goalList'),
    exportData: document.getElementById('exportData'),
    importTrigger: document.getElementById('importTrigger'),
    importInput: document.getElementById('importInput'),
  };

  let timerInterval = null;
  let countdownInterval = null;

  const createSubjectState = (subjects) =>
    subjects.reduce((result, subject) => {
      result[subject] = { target: 20, solved: 0 };
      return result;
    }, {});

  const createTrackState = (track) => ({
    universities: [
      {
        id: `${track}-default`,
        name: track === 'engineering' ? 'BUET' : 'DU',
        targetDate: Utils.toISODate(new Date(new Date().setMonth(new Date().getMonth() + 3))),
      },
    ],
    subjects: createSubjectState(DEFAULT_SUBJECTS[track]),
    timer: {
      duration: 1500,
      remaining: 1500,
      running: false,
      completedMinutes: 0,
      sessions: 0,
      customMinutes: 25,
    },
  });

  const defaultState = {
    activeTrack: 'engineering',
    tracks: {
      engineering: createTrackState('engineering'),
      varsity: createTrackState('varsity'),
    },
    history: {},
    goals: [],
    notes: [],
    activeTaskFilter: 'all',
  };

  const hydrateTrack = (trackKey, storedTrack) => {
    const result = createTrackState(trackKey);
    if (!storedTrack) return result;

    if (Array.isArray(storedTrack.universities)) {
      result.universities = storedTrack.universities.map((item) => ({
        id: item.id || `uni-${Date.now()}-${Math.random()}`,
        name: item.name || 'University',
        targetDate: Utils.toISODate(item.targetDate || new Date()),
      }));
    }

    if (storedTrack.subjects && typeof storedTrack.subjects === 'object') {
      Object.keys(result.subjects).forEach((subject) => {
        const source = storedTrack.subjects[subject];
        if (source) {
          result.subjects[subject].target = Math.max(0, Number(source.target) || 0);
          result.subjects[subject].solved = Math.max(0, Number(source.solved) || 0);
        }
      });
    }

    if (storedTrack.timer && typeof storedTrack.timer === 'object') {
      result.timer.duration = Math.max(60, Number(storedTrack.timer.duration) || result.timer.duration);
      result.timer.remaining = Math.max(0, Number(storedTrack.timer.remaining) || result.timer.duration);
      result.timer.completedMinutes = Math.max(0, Number(storedTrack.timer.completedMinutes) || 0);
      result.timer.sessions = Math.max(0, Number(storedTrack.timer.sessions) || 0);
      result.timer.customMinutes = Math.max(1, Number(storedTrack.timer.customMinutes) || result.timer.customMinutes);
      result.timer.running = false;
    }

    return result;
  };

  const loadState = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(defaultState));

    try {
      const parsed = JSON.parse(raw);
      const state = JSON.parse(JSON.stringify(defaultState));
      if (parsed.activeTrack && TRACKS[parsed.activeTrack]) {
        state.activeTrack = parsed.activeTrack;
      }
      if (parsed.tracks) {
        state.tracks.engineering = hydrateTrack('engineering', parsed.tracks.engineering);
        state.tracks.varsity = hydrateTrack('varsity', parsed.tracks.varsity);
      }
      if (parsed.history && typeof parsed.history === 'object') {
        state.history = parsed.history;
      }
      if (Array.isArray(parsed.goals)) {
        state.goals = parsed.goals.map((goal) => ({
          id: goal.id || `goal-${Date.now()}-${Math.random()}`,
          text: goal.text || '',
          done: !!goal.done,
          subject: goal.subject || 'Physics',
          priority: goal.priority || 'Medium',
          dueDate: Utils.toISODate(goal.dueDate || new Date()),
        }));
      }
      if (parsed.activeTaskFilter && ['all', 'pending', 'completed'].includes(parsed.activeTaskFilter)) {
        state.activeTaskFilter = parsed.activeTaskFilter;
      }
      if (Array.isArray(parsed.notes)) {
        state.notes = parsed.notes.map((note) => ({
          id: note.id || `note-${Date.now()}-${Math.random()}`,
          text: note.text || '',
          done: !!note.done,
        }));
      }
      return state;
    } catch (error) {
      return JSON.parse(JSON.stringify(defaultState));
    }
  };

  const state = loadState();

  const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const getTodayKey = () => Utils.toISODate(new Date());

  const getCurrentTrack = () => state.tracks[state.activeTrack];

  const formatClock = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const formatHours = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (hours) return `${hours}h ${remaining}m`;
    return `${remaining}m`;
  };

  const formatCountdown = (dateString) => {
    const target = new Date(dateString);
    const diffSeconds = Math.max(0, Math.round((target - new Date()) / 1000));
    const days = Math.floor(diffSeconds / 86400);
    const hours = Math.floor((diffSeconds % 86400) / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  };

  const updateTodayHistory = () => {
    const today = getTodayKey();
    if (!state.history[today]) {
      state.history[today] = { subjects: {}, focusMinutes: 0 };
    }
    const subjects = {};
    Object.values(state.tracks).forEach((track) => {
      Object.entries(track.subjects).forEach(([subject, data]) => {
        subjects[subject] = (subjects[subject] || 0) + data.solved;
      });
    });
    state.history[today].subjects = subjects;
    saveState();
  };

  const renderTodayDate = () => {
    if (elements.todayDate) {
      elements.todayDate.textContent = Utils.formatDate(new Date());
    }
  };

  const renderTrackTabs = () => {
    elements.trackButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.track === state.activeTrack);
    });
  };

  const renderUniversityCards = () => {
    const track = getCurrentTrack();
    elements.universityList.innerHTML = '';

    if (!track.universities.length) {
      elements.universityList.innerHTML = '<div class="empty-state">No university countdowns yet. Add one to get started.</div>';
      return;
    }

    track.universities.forEach((university) => {
      const card = document.createElement('article');
      card.className = 'uni-card';
      card.dataset.id = university.id;
      card.innerHTML = `
        <div class="uni-card-header">
          <div>
            <p class="uni-title">${university.name}</p>
            <span class="tag">${TRACKS[state.activeTrack]}</span>
          </div>
          <button type="button" class="icon-button uni-delete" title="Remove university">×</button>
        </div>
        <label class="field-label">
          Exam day
          <input type="date" class="uni-date" value="${university.targetDate}" />
        </label>
        <label class="field-label">
          Examnpm run dev
           name
          <input type="text" class="uni-name" value="${university.name}" />
        </label>
        <div class="countdown">
          <span>Countdown</span>
          <strong>${formatCountdown(university.targetDate)}</strong>
        </div>
      `;
      elements.universityList.appendChild(card);
    });
  };

  const refreshCountdowns = () => {
    document.querySelectorAll('.uni-card').forEach((card) => {
      const id = card.dataset.id;
      const track = getCurrentTrack();
      const university = track.universities.find((item) => item.id === id);
      if (!university) return;
      const countdown = card.querySelector('.countdown strong');
      if (countdown) {
        countdown.textContent = formatCountdown(university.targetDate);
      }
    });
  };

  const renderSubjects = () => {
    const track = getCurrentTrack();
    elements.subjectList.innerHTML = '';

    Object.entries(track.subjects).forEach(([subject, data]) => {
      const progress = data.target > 0 ? Math.min(100, Math.round((data.solved / data.target) * 100)) : 0;
      const card = document.createElement('article');
      card.className = 'subject-card';
      card.dataset.subject = subject;
      card.innerHTML = `
        <div class="subject-card-header">
          <h3>${subject}</h3>
          <span class="subject-target">Target: <input type="number" min="0" class="subject-target-input" data-subject="${subject}" value="${data.target}" /></span>
        </div>
        <div class="subject-count">
          <div>
            <span class="subtitle">Solved</span>
            <strong class="subject-solved-value" data-subject="${subject}">${data.solved}</strong>
          </div>
          <div class="subject-buttons">
            <button type="button" class="secondary-button subject-action" data-action="decrement" data-subject="${subject}">-1</button>
            <button type="button" class="secondary-button subject-action" data-action="increment" data-subject="${subject}">+1</button>
            <button type="button" class="secondary-button subject-action" data-action="increment5" data-subject="${subject}">+5</button>
          </div>
        </div>
        <div class="subject-input-row">
          <label>
            Set solved
            <input type="number" min="0" class="subject-solved-input" data-subject="${subject}" value="${data.solved}" />
          </label>
        </div>
        <div class="progress-wrap">
          <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
          <span>${data.solved} / ${data.target} problems</span>
        </div>
      `;
      elements.subjectList.appendChild(card);
    });
  };

  const getTotalDailyFocus = () =>
    Object.values(state.tracks).reduce((sum, track) => sum + track.timer.completedMinutes, 0);

  const renderTimer = () => {
    const timer = getCurrentTrack().timer;
    elements.timerDisplay.textContent = formatClock(timer.remaining);
    elements.timerLength.textContent = `${Math.round(timer.duration / 60)} min`;
    elements.timerSessions.textContent = timer.sessions;
    elements.timerStatus.textContent = timer.running ? 'Running' : 'Paused';
    elements.dailyFocusTotal.textContent = formatHours(getTotalDailyFocus());
    elements.timerCustom.value = timer.customMinutes;
    document.querySelectorAll('[data-timer]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.timer) === Math.round(timer.duration / 60));
    });
  };

  const renderHistorySummary = () => {
    const selectedDate = elements.historyDate.value || getTodayKey();
    const record = state.history[selectedDate] || { subjects: {}, focusMinutes: 0 };
    const solvedTotal = Object.values(record.subjects).reduce((sum, amount) => sum + amount, 0);
    const subjectRows = Object.entries(record.subjects)
      .sort((a, b) => b[1] - a[1])
      .map(([subject, amount]) => `<li><span>${subject}</span><strong>${amount}</strong></li>`)
      .join('');

    elements.historySummary.innerHTML = `
      <div class="history-card">
        <div class="history-card-header">
          <div>
            <h3>${Utils.formatDate(new Date(selectedDate))}</h3>
            <p>${record.focusMinutes > 0 ? formatHours(record.focusMinutes) : 'No focus time logged'}</p>
          </div>
        </div>
        <div class="history-grid">
          <div class="history-stat">
            <span>Problems solved</span>
            <strong>${solvedTotal}</strong>
          </div>
          <div class="history-stat">
            <span>Focus time</span>
            <strong>${formatHours(record.focusMinutes)}</strong>
          </div>
        </div>
        <ul class="history-list">
          ${subjectRows || '<li class="empty-state-item">No subject records for this date.</li>'}
        </ul>
      </div>
    `;
  };

  const renderNotes = () => {
    if (!state.notes.length) {
      elements.noteList.innerHTML = '<li class="empty-state">No revision notes yet.</li>';
      return;
    }

    elements.noteList.innerHTML = state.notes
      .map(
        (note) => `
        <li class="note-item ${note.done ? 'done' : ''}" data-id="${note.id}">
          <label>
            <input type="checkbox" class="note-toggle" ${note.done ? 'checked' : ''} />
            <span>${note.text}</span>
          </label>
          <button type="button" class="icon-button note-delete" aria-label="Delete note">×</button>
        </li>
      `
      )
      .join('');
  };

  const filterGoals = () => {
    if (state.activeTaskFilter === 'completed') {
      return state.goals.filter((goal) => goal.done);
    }
    if (state.activeTaskFilter === 'pending') {
      return state.goals.filter((goal) => !goal.done);
    }
    return state.goals;
  };

  const setTaskFilter = (filter) => {
    state.activeTaskFilter = filter;
    saveState();
    document.querySelectorAll('.filter-button').forEach((button) => {
      button.classList.toggle('active', button.dataset.filter === filter);
    });
    renderGoals();
  };

  const renderGoals = () => {
    const pendingCount = state.goals.filter((goal) => !goal.done).length;
    elements.taskCount.textContent = `${pendingCount} pending`;
    document.querySelectorAll('.filter-button').forEach((button) => {
      button.classList.toggle('active', button.dataset.filter === state.activeTaskFilter);
    });
    const visibleGoals = filterGoals();

    if (!state.goals.length) {
      elements.goalList.innerHTML = '<li class="empty-state">No tasks yet. Add your first study goal.</li>';
      return;
    }

    if (!visibleGoals.length) {
      const message = state.activeTaskFilter === 'completed'
        ? 'No completed tasks yet.'
        : 'No pending tasks. Great job!';
      elements.goalList.innerHTML = `<li class="empty-state">${message}</li>`;
      return;
    }

    elements.goalList.innerHTML = visibleGoals
      .map(
        (goal) => `
        <li class="note-item ${goal.done ? 'done' : ''}" data-id="${goal.id}">
          <div class="goal-meta-block">
            <label>
              <input type="checkbox" class="goal-toggle" ${goal.done ? 'checked' : ''} />
              <div>
                <span class="goal-text">${goal.text}</span>
                <div class="goal-tags">
                  <span class="meta-chip">${goal.subject}</span>
                  <span class="meta-chip priority-chip ${goal.priority.toLowerCase()}">${goal.priority}</span>
                  ${goal.dueDate ? `<span class="meta-chip due-chip">${goal.dueDate}</span>` : ''}
                </div>
              </div>
            </label>
          </div>
          <button type="button" class="icon-button goal-delete" aria-label="Delete goal">×</button>
        </li>
      `
      )
      .join('');
  };

  const renderAll = () => {
    renderTodayDate();
    renderTrackTabs();
    renderUniversityCards();
    renderSubjects();
    renderTimer();
    renderHistorySummary();
    renderNotes();
    renderGoals();
  };

  const pauseCurrentTimer = () => {
    const timer = getCurrentTrack().timer;
    if (!timer.running) return;
    timer.running = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    saveState();
  };

  const setActiveTrack = (track) => {
    if (!TRACKS[track] || track === state.activeTrack) return;
    pauseCurrentTimer();
    state.activeTrack = track;
    saveState();
    renderAll();
  };

  const addUniversity = (event) => {
    event.preventDefault();
    const name = elements.universityName.value.trim();
    const targetDate = elements.universityDate.value;

    if (!name || !targetDate) {
      Utils.showToast('Enter a university name and exam day.');
      return;
    }

    getCurrentTrack().universities.push({
      id: `uni-${Date.now()}-${Math.random()}`,
      name,
      targetDate,
    });

    elements.universityForm.reset();
    saveState();
    renderUniversityCards();
    Utils.showToast('University countdown added.');
  };

  const updateUniversity = (id, field, value) => {
    const university = getCurrentTrack().universities.find((item) => item.id === id);
    if (!university) return;
    university[field] = field === 'name' ? value : value;
    saveState();
    renderUniversityCards();
  };

  const removeUniversity = (id) => {
    state.tracks[state.activeTrack].universities = getCurrentTrack().universities.filter((item) => item.id !== id);
    saveState();
    renderUniversityCards();
    Utils.showToast('University removed.');
  };

  const updateSubject = (subject, values) => {
    const item = getCurrentTrack().subjects[subject];
    if (!item) return;
    if (values.target !== undefined) {
      item.target = Math.max(0, Number(values.target) || 0);
    }
    if (values.solved !== undefined) {
      item.solved = Math.max(0, Number(values.solved) || 0);
    }
    saveState();
    updateTodayHistory();
    renderSubjects();
    renderHistorySummary();
  };

  const adjustSubject = (subject, action) => {
    const item = getCurrentTrack().subjects[subject];
    if (!item) return;
    if (action === 'increment') {
      item.solved += 1;
    } else if (action === 'increment5') {
      item.solved += 5;
    } else if (action === 'decrement') {
      item.solved = Math.max(0, item.solved - 1);
    }
    saveState();
    updateTodayHistory();
    renderSubjects();
    renderHistorySummary();
  };

  const applyTimerPreset = (minutes) => {
    const timer = getCurrentTrack().timer;
    timer.running = false;
    timer.duration = minutes * 60;
    timer.remaining = timer.duration;
    timer.customMinutes = minutes;
    saveState();
    renderTimer();
  };

  const applyCustomTimer = () => {
    const minutes = Math.max(1, Number(elements.timerCustom.value) || 0);
    if (minutes < 1) {
      Utils.showToast('Enter a valid custom duration.');
      return;
    }
    const timer = getCurrentTrack().timer;
    timer.running = false;
    timer.duration = minutes * 60;
    timer.remaining = timer.duration;
    timer.customMinutes = minutes;
    saveState();
    renderTimer();
    Utils.showToast(`Custom focus set to ${minutes} min.`);
  };

  const ensureAudioContext = () => {
    if (window.__trackerAudioContext) {
      return window.__trackerAudioContext;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;

    const context = new AudioContext();
    window.__trackerAudioContext = context;
    if (context.state === 'suspended') {
      context.resume().catch(() => {});
    }
    return context;
  };

  const playSynthTone = ({ frequency = 880, frequency2 = 1320, duration = 0.12, type = 'sine', type2 = 'triangle', volume = 0.04, sweep = 1.45, delay = 0 } = {}) => {
    const context = ensureAudioContext();
    if (!context) return;

    const now = context.currentTime + delay;
    const osc1 = context.createOscillator();
    const osc2 = context.createOscillator();
    const gain = context.createGain();

    osc1.type = type;
    osc2.type = type2;
    osc1.frequency.setValueAtTime(frequency, now);
    osc1.frequency.exponentialRampToValueAtTime(frequency * sweep, now + duration);
    osc2.frequency.setValueAtTime(frequency2, now);
    osc2.frequency.exponentialRampToValueAtTime(frequency2 * sweep, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(context.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  };

  const playTimerSound = (kind = 'start') => {
    if (kind === 'complete') {
      const alarmBeep = (frequency, duration, delay = 0) => {
        const context = ensureAudioContext();
        if (!context) return;

        const now = context.currentTime + delay;
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(context.destination);

        osc.start(now);
        osc.stop(now + duration);
      };

      for (let index = 0; index < 3; index += 1) {
        alarmBeep(880, 0.12, index * 0.16);
        alarmBeep(1180, 0.1, index * 0.16 + 0.06);
      }
      return;
    }
  };

  const completeTimerSession = () => {
    pauseCurrentTimer();
    const timer = getCurrentTrack().timer;
    const sessionMinutes = Math.round(timer.duration / 60);
    timer.completedMinutes += sessionMinutes;
    timer.sessions += 1;
    const today = getTodayKey();
    if (!state.history[today]) {
      state.history[today] = { subjects: {}, focusMinutes: 0 };
    }
    state.history[today].focusMinutes += sessionMinutes;
    timer.remaining = timer.duration;
    saveState();
    renderTimer();
    renderHistorySummary();
    Utils.showToast(`Session complete • ${sessionMinutes} min logged.`);
    playTimerSound('complete');
  };

  const startTimer = () => {
    const timer = getCurrentTrack().timer;
    if (timer.running) return;
    if (timer.remaining <= 0) {
      timer.remaining = timer.duration;
    }
    timer.running = true;
    saveState();
    renderTimer();
    playTimerSound('start');

    timerInterval = setInterval(() => {
      const currentTimer = getCurrentTrack().timer;
      if (!currentTimer.running) {
        clearInterval(timerInterval);
        timerInterval = null;
        return;
      }
      if (currentTimer.remaining > 0) {
        currentTimer.remaining -= 1;
        elements.timerDisplay.textContent = formatClock(currentTimer.remaining);
      }
      if (currentTimer.remaining <= 0) {
        completeTimerSession();
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }, 1000);
  };

  const pauseTimer = () => {
    const timer = getCurrentTrack().timer;
    if (!timer.running) return;
    timer.running = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    saveState();
    renderTimer();
  };

  const resetTimer = () => {
    const timer = getCurrentTrack().timer;
    timer.running = false;
    timer.remaining = timer.duration;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    saveState();
    renderTimer();
  };

  const resetDailyStats = () => {
    if (!window.confirm("Reset today's sessions and streak time? History will be kept.")) return;

    Object.values(state.tracks).forEach((track) => {
      track.timer.running = false;
      track.timer.completedMinutes = 0;
      track.timer.sessions = 0;
    });
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    saveState();
    renderTimer();
    Utils.showToast("Today's session counters were reset. History is unchanged.");
  };

  const exportBackup = () => {
    const backup = JSON.stringify(state, null, 2);
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'admission_prep_backup.json';
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    Utils.showToast('Backup exported.');
  };

  const importBackup = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const importedState = loadImportedState(parsed);
        Object.assign(state, importedState);
        saveState();
        renderAll();
        Utils.showToast('Backup restored successfully.');
      } catch (error) {
        Utils.showToast('Unable to restore backup.');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  const loadImportedState = (incoming) => {
    const stateCopy = JSON.parse(JSON.stringify(defaultState));
    if (incoming.activeTrack && TRACKS[incoming.activeTrack]) {
      stateCopy.activeTrack = incoming.activeTrack;
    }
    if (incoming.tracks) {
      stateCopy.tracks.engineering = hydrateTrack('engineering', incoming.tracks.engineering);
      stateCopy.tracks.varsity = hydrateTrack('varsity', incoming.tracks.varsity);
    }
    if (incoming.history && typeof incoming.history === 'object') {
      stateCopy.history = incoming.history;
    }
    if (Array.isArray(incoming.notes)) {
      stateCopy.notes = incoming.notes.map((note) => ({
        id: note.id || `note-${Date.now()}-${Math.random()}`,
        text: note.text || '',
        done: !!note.done,
      }));
    }
    if (Array.isArray(incoming.goals)) {
      stateCopy.goals = incoming.goals.map((goal) => ({
        id: goal.id || `goal-${Date.now()}-${Math.random()}`,
        text: goal.text || '',
        done: !!goal.done,
        subject: goal.subject || 'Physics',
        priority: goal.priority || 'Medium',
        dueDate: Utils.toISODate(goal.dueDate || ''),
      }));
    }
    return stateCopy;
  };

  const addGoal = (event) => {
    event.preventDefault();
    const text = elements.goalInput.value.trim();
    const subject = elements.taskSubject.value;
    const priority = elements.taskPriority.value;
    const dueDate = elements.taskDate.value;
    if (!text) return;
    state.goals.push({
      id: `goal-${Date.now()}-${Math.random()}`,
      text,
      done: false,
      subject,
      priority,
      dueDate: dueDate ? Utils.toISODate(dueDate) : '',
    });
    elements.goalInput.value = '';
    elements.taskDate.value = '';
    saveState();
    renderGoals();
    Utils.showToast('Task added to today.');
  };

  const toggleGoal = (id) => {
    const goal = state.goals.find((item) => item.id === id);
    if (!goal) return;
    goal.done = !goal.done;
    saveState();
    renderGoals();
  };

  const deleteGoal = (id) => {
    state.goals = state.goals.filter((item) => item.id !== id);
    saveState();
    renderGoals();
  };

  const addNote = (event) => {
    event.preventDefault();
    const text = elements.noteInput.value.trim();
    if (!text) return;
    state.notes.push({
      id: `note-${Date.now()}-${Math.random()}`,
      text,
      done: false,
    });
    elements.noteInput.value = '';
    saveState();
    renderNotes();
    Utils.showToast('Revision note added.');
  };

  const toggleNote = (id) => {
    const note = state.notes.find((item) => item.id === id);
    if (!note) return;
    note.done = !note.done;
    saveState();
    renderNotes();
  };

  const deleteNote = (id) => {
    state.notes = state.notes.filter((item) => item.id !== id);
    saveState();
    renderNotes();
  };

  const wireEvents = () => {
    elements.trackTabs.addEventListener('click', (event) => {
      const button = event.target.closest('[data-track]');
      if (!button) return;
      setActiveTrack(button.dataset.track);
    });

    elements.universityForm.addEventListener('submit', addUniversity);

    elements.universityList.addEventListener('input', (event) => {
      const card = event.target.closest('.uni-card');
      if (!card) return;
      const id = card.dataset.id;
      if (event.target.classList.contains('uni-name')) {
        updateUniversity(id, 'name', event.target.value);
      }
      if (event.target.classList.contains('uni-date')) {
        updateUniversity(id, 'targetDate', event.target.value);
      }
    });

    elements.universityList.addEventListener('click', (event) => {
      const remove = event.target.closest('.uni-delete');
      if (!remove) return;
      const card = event.target.closest('.uni-card');
      removeUniversity(card.dataset.id);
    });

    elements.subjectList.addEventListener('click', (event) => {
      const button = event.target.closest('.subject-action');
      if (!button) return;
      adjustSubject(button.dataset.subject, button.dataset.action);
    });

    elements.subjectList.addEventListener('change', (event) => {
      if (event.target.classList.contains('subject-target-input')) {
        updateSubject(event.target.dataset.subject, { target: Number(event.target.value) || 0 });
      }
    });

    elements.subjectList.addEventListener('input', (event) => {
      if (event.target.classList.contains('subject-solved-input')) {
        updateSubject(event.target.dataset.subject, { solved: Number(event.target.value) || 0 });
      }
    });

    document.querySelectorAll('[data-timer]').forEach((button) => {
      button.addEventListener('click', () => applyTimerPreset(Number(button.dataset.timer)));
    });

    elements.setCustomTimer.addEventListener('click', applyCustomTimer);
    elements.timerCustom.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyCustomTimer();
      }
    });

    elements.startTimer.addEventListener('click', startTimer);
    elements.pauseTimer.addEventListener('click', pauseTimer);
    elements.resetTimer.addEventListener('click', resetTimer);
    elements.resetDailyStats.addEventListener('click', resetDailyStats);

    elements.historyDate.addEventListener('change', renderHistorySummary);

    elements.exportData.addEventListener('click', exportBackup);
    elements.importTrigger.addEventListener('click', () => elements.importInput.click());
    elements.importInput.addEventListener('change', (event) => {
      if (event.target.files.length) {
        importBackup(event.target.files[0]);
      }
      event.target.value = '';
    });

    elements.notesForm.addEventListener('submit', addNote);
    elements.noteList.addEventListener('click', (event) => {
      const noteItem = event.target.closest('.note-item');
      if (!noteItem) return;
      if (event.target.classList.contains('note-toggle')) {
        toggleNote(noteItem.dataset.id);
      }
      if (event.target.closest('.note-delete')) {
        deleteNote(noteItem.dataset.id);
      }
    });

    elements.goalsForm.addEventListener('submit', addGoal);
    elements.goalList.addEventListener('click', (event) => {
      const goalItem = event.target.closest('.note-item');
      if (!goalItem) return;
      if (event.target.classList.contains('goal-toggle')) {
        toggleGoal(goalItem.dataset.id);
      }
      if (event.target.closest('.goal-delete')) {
        deleteGoal(goalItem.dataset.id);
      }
    });

    elements.taskFilters.addEventListener('click', (event) => {
      const filterButton = event.target.closest('.filter-button');
      if (!filterButton) return;
      setTaskFilter(filterButton.dataset.filter);
    });
  };

  const startCountdownLoop = () => {
    refreshCountdowns();
    countdownInterval = setInterval(refreshCountdowns, 1000);
  };

  const init = () => {
    elements.historyDate.value = getTodayKey();
    renderAll();
    wireEvents();
    startCountdownLoop();
  };

  return { init };
})();

window.addEventListener('DOMContentLoaded', () => App.init());
