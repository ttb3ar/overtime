// ui.js — reads State + Time, paints the DOM
// Called every tick by main.js. Never stores game data.

const UI = (() => {

  // ── Element cache ─────────────────────────────────────────
  const el = {};
  function _cache() {
    el.gameTime     = document.getElementById('game-time');
    el.otDisplay    = document.getElementById('ot-display');
    el.otCount      = document.getElementById('ot-count');
    el.weekDisplay  = document.getElementById('week-display');
    el.character    = document.getElementById('character');
    el.speechBubble = document.getElementById('speech-bubble');
    el.statusLine   = document.getElementById('status-line');
    el.progressWrap = document.getElementById('progress-wrap');
    el.progressFill = document.getElementById('progress-fill');
    el.progressLabel= document.getElementById('progress-label');
    el.btnPrimary   = document.getElementById('btn-primary');
    el.eventCard    = document.getElementById('event-card');
    el.eventText    = document.getElementById('event-text');
    el.eventChoices = document.getElementById('event-choices');
    el.upgradeShelf = document.getElementById('upgrade-shelf');
    el.upgradeGrid  = document.getElementById('upgrade-grid');
    el.shelfToggle  = document.getElementById('shelf-toggle');
    el.rankDisplay  = document.getElementById('rank-display');
    el.toastLayer   = document.getElementById('toast-layer');
    el.whDisplay    = document.getElementById('wh-display');
    el.whCount      = document.getElementById('wh-count');
  }

  // ── Character faces per mood ──────────────────────────────
  function _getFace(mood) {
    const map = {
      normal:       '( ˘ᵕ˘)',
      working:      '( •_•)',
      lunch:        '( ˘^ ˘)',
      waiting:      State.flags.autoOT ? '(._.)' : '( •_•)',
      ot:           '(ง •_•)ง',
      ot_auto:      '(ง-.-)ง',
      done:         '( ˘ᵕ˘)',
      done_late:    '( _ _)',
      unproductive: '(._. )',
      weekend:      '( ˘ω˘)',
      asleep:       '(-.-)zzz',
      groggy:       '(\'\'\'_‸_)'
    };
    return map[mood] ?? map.normal;
  }

  function _getSpeech(mood) {
    const map = {
      waiting:      State.flags.autoOT ? 'sigh...' : null,
      done:         'all in a day\'s work.',
      unproductive: '...i could have stayed.',
      groggy:       'so tired...',
      lunch:        'i could be working right now...',
    };
    return map[mood] ?? null;
  }

  const WORK_QUIPS = [
    'pretending to read emails.',
    'awaiting further instructions.',
    'in a meeting about meetings.',
    'cc\'d on something ominous.',
    'spreadsheet open. eyes closed.',
    'moved a task to "in progress".',
    'wrote a long email. deleted it. sent nothing.',
  ];

  const LUNCH_QUIPS = [
    'i could be working right now...',
    'eating a sad desk lunch.',
    'checking plack between bites.',
    'this sandwich cost $18.',
    'technically this is networking.',
    'the microwave smells like someone else\'s regret.',
    'eating alone by choice. obviously.',
    'checked work email twice during lunch.',
  ];

  const OT_QUIPS = [
    'the cleaning crew just arrived.',
    'sent an email at 9pm. no regrets.',
    'the office is quieter now. better.',
    'billing this hour. and this one.',
    'the vending machine is fully stocked.',
    'security just waved. we have an understanding.',
    'ordered dinner. expensed it.',
    'the silence is productive.',
  ];

  const WEEKEND_QUIPS_FREE = [
    'not thinking about work',
    'a well earned break',
    'recahrging to take on the week',
    'inner peace',
    'zen',
    'two whole days of freedom',
    'finding fufilment in "hobbies"',
    'unreachable',
    'not my problem until monday',
    'breathing air, touching grass.'
  ];

  const WEEKEND_QUIPS_GUILT = [
    'definetley not thinking about work.',
    'what if they call?...',
    'i could get a head start on next week...',
    'it\'s fine. everything is fine.',
    'technically unreachable right now.',
    'the laptop is right there though.',
    'enjoying the weekend. probably.',
    'not checking email. not checking email.',
    'thought about a spreadsheet just now.',
    'what if i just opened my laptop for a second.',
  ];

  const CLICK_QUIPS_WORKING = [
    'please. i\'m busy.',
    'do you mind?',
    'that doesn\'t help.',
    'i\'m not a toy.',
    'i can feel that.',
    'okay. okay. okay.',
    'yes. still here.',
    'noted.',
    '...',
    'i see you.',
    'not now.',
    'i\'m in the zone.',
    'stop. i\'m concentrating.',
  ];

  const CLICK_QUIPS_LUNCH = [
    'i\'m on lunch.',
    'this is my time.',
    'can it wait until 13:00?',
    'i\'m eating.',
    'please. just let me have this.',
    'even machines get a break.',
  ];

  const CLICK_QUIPS_OT = [
    'still here...',
    'Sisyphys is happy.',
    'you again.',
    'anything for the company.',
    'this fufils me.',
    'i\'m billing this.',
    'noted.',
    'it\'s the name of the game.',
    'hating both the player and the game.',
    'the meter is running.',
    'every. single. hour.',
    'yes. still here.',
    'only sleep waits at home anyways.',
    'the meaning of life.'
  ];

  const CLICK_QUIPS_WEEKEND = [
    'it\'s the weekend.',
    'i\'m not here right now.',
    'this is my time.',
    'officially unreachable.',
    'leave me alone.',
    'do not disturb.',
    'please, just let me have this.',
    'even machines get a break.',
  ];

  const CLICK_QUIPS_ASLEEP = [
    'zzz...',
    '...mm.',
    'not now.',
    '...five more minutes.',
    'zz...',
    '...hm?',
  ];

  // ── Internal state ────────────────────────────────────────
  let _lastMood   = null;
  let _quipTimer  = null;
  let _shelfOpen  = false;
  let _lastRank   = null;
  let _lastClick = { x: 0, y: 0 };
  let _isClickTick = false;
  let _lastTiersKey = '';

  // ── Helpers ───────────────────────────────────────────────

  function _show(e)  { e.classList.remove('hidden'); }
  function _hide(e)  { e.classList.add('hidden'); }

  function _setProgress(pct, color) {
    const p = Math.round(pct * 100);
    el.progressFill.style.width = `${p}%`;
    el.progressLabel.textContent = `${p}%`;
    el.progressFill.style.background = color || '';
  }

  // ── Header ────────────────────────────────────────────────

  function _updateHeader() {
    el.gameTime.textContent = `${State.dayName().slice(0,3)}  ${State.timeString()}`;
    el.weekDisplay.textContent = `wk ${State.week}`;

    // Work hours — visible from week 1 onward
    if (State.workHoursLifetime > 0) {
      _show(el.whDisplay);
      el.whCount.textContent = State.workHours.toFixed(1);
    } else {
      _hide(el.whDisplay);
    }

    // Overtime — visible once training complete and OT earned
    if (State.trainingComplete && State.otLifetime > 0) {
      _show(el.otDisplay);
      el.otCount.textContent = State.ot.toFixed(1);
    } else {
      _hide(el.otDisplay);
    }
    document.title = `overtime — ${State.dayName().slice(0,3)} ${State.timeString()}`;
  }

  function _updateFavicon() {
    const canvas = document.getElementById('favicon-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    ctx.font = '11px DM Mono, monospace';
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText('(•_•)', 0, 20);
    const link = document.querySelector("link[rel='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.href = canvas.toDataURL();
    document.head.appendChild(link);
  }

  // ── Quip ─────────────────────────────────────────────────────

  const QUIP_DISPLAY_MS = 3500;
  const CYCLING_MOODS   = ['working', 'lunch', 'ot', 'ot_auto', 'weekend'];

  const QUIP_LISTS = {
    working: WORK_QUIPS,
    lunch:   LUNCH_QUIPS,
    ot:      OT_QUIPS,
    ot_auto: OT_QUIPS,
    get weekend() { return Time.workedWeekend() ? WEEKEND_QUIPS_GUILT : WEEKEND_QUIPS_FREE; },
  };

  function _randomInterval() {
    return 1000 + Math.random() * 2000;
  }

  function _showQuip(q) {
    clearTimeout(el.speechBubble._quipTimeout);
    clearInterval(el.speechBubble._moodWatch);
    el.speechBubble.textContent = q;
    _show(el.speechBubble);
    el.speechBubble.classList.remove('fading');

    const shownMood = Time.mood();
    const duration = q === 'i could be working right now...' ? 1750 : QUIP_DISPLAY_MS;

    el.speechBubble._moodWatch = setInterval(() => {
      if (Time.mood() !== shownMood) {
        clearInterval(el.speechBubble._moodWatch);
        clearTimeout(el.speechBubble._quipTimeout);
        _fadeQuip();
        if (CYCLING_MOODS.includes(Time.mood())) _scheduleCyclingQuip(Time.mood());
      }
    }, 200);

    el.speechBubble._quipTimeout = setTimeout(() => {
      clearInterval(el.speechBubble._moodWatch);
      _fadeQuip();
      if (CYCLING_MOODS.includes(Time.mood())) _scheduleCyclingQuip(Time.mood());
    }, duration);
  }

  function _fadeQuip() {
    _hide(el.speechBubble);  // adds .hidden → triggers opacity:0 transition
    setTimeout(() => {
      el.speechBubble.textContent = '';
    }, 300);  // clear text after transition completes
  }

  function _msUntilMoodChange() {
    const h     = State.hour + State.minute / 60;
    const mood  = Time.mood();

    // 1 game-hour = 1 real-second = 1000ms (during normal ticks)
    if (mood === 'working') {
      const nextBoundary = (h < C.LUNCH_START) ? C.LUNCH_START : C.WORK_END;
      return (nextBoundary - h) * 1000;
    }
    if (mood === 'lunch') {
      const lunchDuration = (60 - (State.lunchReduction ?? 0)) / 60;
      const lunchEnd = (Time.lunchStartTime() ?? C.LUNCH_START) + lunchDuration;
      return (lunchEnd - h) * 1000;
    }
    if (mood === 'ot' || mood === 'ot_auto') {
      return (1 - Time.otProgress()) * Time.otMaxHours() * 1000;
    }
    if (mood === 'weekend') {
      // don't fire a quip in the last second before midnight
      const h = State.hour + State.minute / 60;
      return (24 - h) * 1000;
    }
    return Infinity;
  }

  function _scheduleCyclingQuip(mood) {
    clearTimeout(_quipTimer);
    const rate = mood === 'weekend'
      ? (Time.workedWeekend() ? 0.6 : 1.6)
      : 1;
    _quipTimer = setTimeout(() => {
      const currentMood = Time.mood();
      if (!CYCLING_MOODS.includes(currentMood)) return;
      if (mood !== 'lunch' && _msUntilMoodChange() < 1000) {
        _scheduleCyclingQuip(currentMood);
        return;
      }
      const list = QUIP_LISTS[currentMood];
      _showQuip(list[Math.floor(Math.random() * list.length)]);
    }, _randomInterval() * rate);
  }

  // ── Character ─────────────────────────────────────────────

  function _updateCharacter() {
    const mood = Time.mood();

    el.character.textContent = _getFace(mood);

    if (mood !== _lastMood) {
      const prev = _lastMood;
      _lastMood = mood;

      // character class
      el.character.className = '';
      if (mood === 'ot')           el.character.classList.add('happy');
      if (mood === 'ot_auto')      el.character.classList.add('tired');
      if (mood === 'unproductive') el.character.classList.add('tired');
      if (mood === 'asleep')       el.character.classList.add('tired');
      if (mood === 'lunch')        el.character.classList.add('guilty');
      if (mood === 'done_late')    el.character.classList.add('tired');
      if (mood === 'waiting' && State.flags.autoOT) el.character.classList.add('tired');

      // stop cycling if leaving a cycling mood
      if (CYCLING_MOODS.includes(prev) && !CYCLING_MOODS.includes(mood)) {
        clearTimeout(_quipTimer);
        _quipTimer = null;
      }

      // start cycling if entering a cycling mood
      if (CYCLING_MOODS.includes(mood) && !CYCLING_MOODS.includes(prev)) {
        _scheduleCyclingQuip(mood);
      }

      // conditional one-shot quips on mood entry
      const speech = _getSpeech(mood);
      if (speech) {
        _showQuip(speech);
      } else if (!CYCLING_MOODS.includes(mood)) {
        // non-cycling, no speech — clear bubble
        clearTimeout(el.speechBubble._quipTimeout);
        _fadeQuip();
      }
      // if entering a cycling mood, let the existing bubble finish naturally
    }
  }

  let _whFloatBuffer = 0;

  function _updateAccrualFloat() {
    const { wh, ot } = Time.lastAccrual();
    if (ot > 0) {
      _spawnCharacterFloat(`+${ot.toFixed(2)}✦`, 'ot');
    } else if (wh > 0) {
      _whFloatBuffer += wh;
      if (_whFloatBuffer >= (C.MINS_PER_TICK / 60) - 0.001) {
        _spawnCharacterFloat(`+${_whFloatBuffer.toFixed(2)}⧗`, 'wh');
        _whFloatBuffer = 0;
      }
    } else {
      _whFloatBuffer = 0;
    }
  }

  function _spawnCharacterFloat(text, type) {
    const float = document.createElement('div');
    float.className = `accrual-float${type ? ' ' + type : ''}`;
    float.textContent = text;
    el.character.parentElement.appendChild(float);
    setTimeout(() => float.remove(), 2000);
  }

  // ── Status line ───────────────────────────────────────────

  function _updateStatus() {
    const mood = Time.mood();

    /*if (!State.trainingComplete) {
        const pct = Math.round(State.trainingProgress() * 100);
        if (mood === 'lunch')   { el.statusLine.textContent = "lunch break. 13:00 can't come soon enough."; return; }
        if (mood === 'asleep')  { el.statusLine.textContent = 'sleeping.'; return; }
        if (mood === 'weekend') { el.statusLine.textContent = 'weekend.'; return; }
        //el.statusLine.textContent = `week one. ${pct}% through training.`;
        return;
    }*/

    if (State.activeEvent) {
      el.statusLine.textContent = '';
      return;
    }

    const map = {
      working:      `${State.dayName()}. keep it up.`,
      lunch:        'lunch break. 13:00 can\'t come soon enough.',
      waiting:      State.flags.autoOT ? 'you already know.' : 'stay late?',
      ot:           `overtime until ${Time.otEndTime() < C.WORK_END ? 'tomorrow ' : ''}${Time.otEndTime()}:00.`,
      ot_auto:      `overtime until ${Time.otEndTime() < C.WORK_END ? 'tomorrow ' : ''}${Time.otEndTime()}:00.`,
      done_late: C.WEEKEND.includes(State.dayIndex)
        ? '"enjoying" the weekend.'
        : 'survived another day.',
      done:         `${State.dayName()} evening.`,
      unproductive: `${State.dayName()} evening.`,
      weekend:      'weekend.',
      asleep:       'sleeping.',
      normal:       `${State.dayName()}. work starts at ${C.WORK_START}:00.`,
      groggy:       'it\'s early. but you\'re here.',
    };

    el.statusLine.textContent = map[mood] ?? '';
  }

  // ── Progress bar ──────────────────────────────────────────

  function _updateProgress() {
    const mood = Time.mood();

    /*
    if (!State.trainingComplete) {
      _show(el.progressWrap);
      _setProgress(State.trainingProgress());
      return;
    }*/

    if (mood === 'working') {
      _show(el.progressWrap);
      _setProgress(Time.shiftProgress());
      return;
    }

    if (mood === 'lunch') {
      _show(el.progressWrap);
      _setProgress(Time.lunchProgress(), 'var(--mid)');
      return;
    }

    if (mood === 'ot' || mood === 'ot_auto') {
      _show(el.progressWrap);
      _setProgress(Time.otProgress(), 'var(--accent)');
      return;
    }

    _hide(el.progressWrap);
    el.progressFill.style.background = '';
  }

  // ── Primary button ────────────────────────────────────────

  function _updateButton() {
    const btn = el.btnPrimary;
 
    const shelfUnlocked = State.week > 1 || State.dayIndex >= 1;
    if (!shelfUnlocked) {
        _hide(el.upgradeShelf);
        return;
    }

    const inOTWindow = Time.isOTWindow();
    const otActive   = Time.otActive();
    const autoOT     = State.flags.autoOT;

    if (autoOT) {
      _hide(btn);
      return;
    }

    if (inOTWindow && !otActive && !Time.otCompletedToday() && !Time.otSkippedToday()) {
      btn.textContent = 'OVERTIME';
      btn.classList.add('ot-available');
      btn.disabled = false;
      _show(btn);
      return;
    }

    _hide(btn);
    btn.classList.remove('ot-available');
  }

  // ── Event card ────────────────────────────────────────────

  function _updateEvent() {
    if (!State.activeEvent) {
      _hide(el.eventCard);
      return;
    }

    const ev = State.activeEvent;
    _show(el.eventCard);
    el.eventText.textContent = ev.text;

    if (el.eventChoices.dataset.eventId !== ev.id) {
      el.eventChoices.dataset.eventId = ev.id;
      el.eventChoices.innerHTML = '';
      ev.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = 'event-btn';
        btn.textContent = choice.label;
        btn.addEventListener('click', () => Events.resolve(i));
        el.eventChoices.appendChild(btn);
      });
    }
  }

  // ── Upgrade shelf ─────────────────────────────────────────

  function _updateUpgradeShelf() {
    const shelfUnlocked = State.week > 1 || State.dayIndex >= 1;
    if (!shelfUnlocked) {
      _hide(el.upgradeShelf);
      return;
    }
    if (el.upgradeShelf.classList.contains('hidden')) {
      el.upgradeShelf.classList.remove('hidden');
      el.upgradeGrid.className = '';
      el.shelfToggle.classList.add('shelf-new');
      el.shelfToggle.addEventListener('click', () => {
        el.shelfToggle.classList.remove('shelf-new');
      }, { once: true });
    } else {
      _show(el.upgradeShelf);
    }
    el.upgradeGrid.className = _shelfOpen ? 'open' : '';

    const allUpgrades = Upgrades.all();
    if (!allUpgrades.length) return;

    const tiersKey = JSON.stringify(State.tiers) + (State.otLifetime > 0);
    if (tiersKey === _lastTiersKey) {
      el.upgradeGrid.querySelectorAll('.upgrade-card').forEach(card => {
        const cur = card.dataset.currency;
        const cost = parseFloat(card.dataset.cost);
        const balance = cur === 'wh' ? State.workHours : State.ot;
        card.classList.toggle('affordable', balance >= cost);
      });
      return;
    }
    _lastTiersKey = tiersKey;
    el.upgradeGrid.innerHTML = '';
    let anyVisible = false;

      const groups = Upgrades.all();
      groups.forEach(g => {
        if (!Upgrades.isUnlocked(g.id)) return;
        if (Upgrades.isComplete(g.id)) return;

        const tier = Upgrades.nextTier(g.id);
        if (!tier) return;
        anyVisible = true;

        const cur       = tier.currency;
        const balance   = cur === 'wh' ? State.workHours : State.ot;
        const affordable = balance >= tier.cost;
        const symbol    = cur === 'wh' ? '⧗' : '✦';

        const card = document.createElement('div');
        card.className = 'upgrade-card' + (affordable ? ' affordable' : '');
        card.dataset.currency = cur;
        card.dataset.cost = tier.cost;

        card.innerHTML = `
          <div class="u-name">${tier.name}</div>
          <div class="u-cost ${cur === 'wh' ? 'wh' : ''}">${symbol} ${tier.cost.toFixed(1)}${cur === 'wh' ? 'h wh' : 'h ot'}</div>
          <div class="u-desc">${tier.desc}</div>
        `;

        card.addEventListener('click', () => {
          if (Upgrades.buy(g.id)) {
            UI.showToast(`${tier.name} unlocked.`, 'good');
            _renderUpgradeGrid();
          } else {
            UI.showToast('not enough hours.', 'warn');
          }
        });

        el.upgradeGrid.appendChild(card);
      });

      el.shelfToggle.textContent = anyVisible
        ? `upgrades  ${_shelfOpen ? '↑' : '↓'}`
        : 'upgrades  —';

      el.upgradeGrid.className = _shelfOpen ? 'open' : '';
    }

  function _renderUpgradeGrid() {
    _lastTiersKey = '';
    _updateUpgradeShelf();
  }

  function _updateRank() {
    if (!el.rankDisplay) return;
    const label = Upgrades.rankLabel();
    if (label === _lastRank) return;
    _lastRank = label;
    el.rankDisplay.textContent = label;
    el.rankDisplay.classList.remove('rank-updated');
    void el.rankDisplay.offsetWidth;
    el.rankDisplay.classList.add('rank-updated');
  }

  // ── Public API ────────────────────────────────────────────

  return {
    setLastClick(x, y) { _lastClick = { x, y }; },
    setClickTick(val) { _isClickTick = val; },

    init() {
      _cache();
      _updateFavicon();

      el.shelfToggle.addEventListener('click', () => {
        _shelfOpen = !_shelfOpen;
        el.upgradeGrid.className = _shelfOpen ? 'open' : '';
        el.shelfToggle.textContent = `upgrades  ${_shelfOpen ? '↑' : '↓'}`;
      });
    },

    update() {
      _updateHeader();
      _updateCharacter();
      _updateStatus();
      _updateProgress();
      _updateButton();
      _updateEvent();
      _updateUpgradeShelf();
      _updateRank();
      _updateAccrualFloat(); 
    },

    bounceCharacter() {
      el.character.classList.remove('happy');
      void el.character.offsetWidth;
      el.character.classList.add('happy');
    },

    showToast(text, type = '') {
      const t = document.createElement('div');
      t.className = `toast${type ? ' ' + type : ''}`;
      t.textContent = text;
      el.toastLayer.appendChild(t);
      setTimeout(() => t.remove(), 3000);
    },

    showCursorFloat() {
      const { wh, ot } = Time.lastAccrual();
      const float = document.createElement('div');
      float.className = 'click-float';

      if (ot > 0) {
        float.textContent = `+${ot.toFixed(2)}✦`;
        float.style.color = 'var(--accent)';
      } else if (wh > 0) {
        float.textContent = `+${wh.toFixed(2)}⧗`;
        float.style.color = 'var(--accent2)';
      } else {
        float.textContent = `+${State.clickMinutes ?? 1}m`;
        float.style.color = '';
      }

      float.style.left = _lastClick.x + 'px';
      float.style.top  = _lastClick.y + 'px';
      document.body.appendChild(float);
      setTimeout(() => float.remove(), 1000);
    },

    showClickQuip() {
      clearTimeout(_quipTimer);
      const mood = Time.mood();
      const map = {
        working:  CLICK_QUIPS_WORKING,
        lunch:    CLICK_QUIPS_LUNCH,
        ot:       CLICK_QUIPS_OT,
        ot_auto:  CLICK_QUIPS_OT,
        weekend:  CLICK_QUIPS_WEEKEND,
        asleep:   CLICK_QUIPS_ASLEEP,
      };
      const list = map[mood] ?? CLICK_QUIPS;
      const q = list[Math.floor(Math.random() * list.length)];
      el.speechBubble.textContent = q;
      _show(el.speechBubble);
      clearTimeout(el.speechBubble._quipTimeout);
      el.speechBubble._quipTimeout = setTimeout(() => {
        el.speechBubble.style.opacity = '0';
        setTimeout(() => {
          el.speechBubble.style.opacity = '';
          _hide(el.speechBubble);
          if (CYCLING_MOODS.includes(Time.mood())) {
            _scheduleCyclingQuip(Time.mood());
          }
        }, 300);
      }, 3000);
      if (mood !== 'asleep') {
        el.character.classList.remove('happy', 'guilty');
        void el.character.offsetWidth;
        el.character.classList.add('happy');
        if (mood === 'lunch') {
          setTimeout(() => el.character.classList.add('guilty'), 500);
        }
      }
    },
  };

})();