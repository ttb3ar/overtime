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
  const FACES = {
    normal:       '( ˘ᵕ˘)',
    working:      '( •_•)',
    lunch:        '( ˘^ ˘)',
    waiting:      '( •_•)',
    ot:           '(ง •_•)ง',
    done:         '( ˘ᵕ˘)',
    unproductive: '(._. )',
    weekend:      '( ˘ω˘)',
    asleep:       '(-.-)zzz',
    groggy:       '(\'\'\'_‸_)'
  };

  const SPEECH = {
    normal:       null,
    working:      null,
    lunch:        'i could be working right now...',
    waiting:      null,
    ot:           'billing extra hours...',
    done:         null,
    unproductive: '...i could have stayed.',
    weekend:      null,
    asleep:       null,
    groggy:       'a "productive" weekend awaits!',
  };

  const WORK_QUIPS = [
    'pretending to read emails.',
    'awaiting further instructions.',
    'in a meeting about meetings.',
    'cc\'d on something ominous.',
    'spreadsheet open. eyes closed.',
  ];

  const LUNCH_QUIPS = [
    'i could be working right now...',
    'eating a sad desk lunch.',
    'checking plack between bites.',
    'this sandwich cost $18.',
    'technically this is networking.',
  ];

  const CLICK_QUIPS = [
    'please. i\'m busy.',
    'do you mind?',
    'that doesn\'t help.',
    'i\'m not a toy.',
    'i can feel that.',
    'okay. okay. okay.',
    'yes. still here.',
    'noted.',
    '...',
    'you again.',
    'stop. i\'m concentrating.',
    'i see you.',
  ];

  // ── Internal state ────────────────────────────────────────
  let _lastMood   = null;
  let _quipTimer  = 0;
  let _shelfOpen  = false;
  let _lastRank   = null;
  let _lastClick = { x: 0, y: 0 };
  let _accrualFloatTick = 0;

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
  }

  // ── Character ─────────────────────────────────────────────

  function _updateCharacter() {
    const mood = Time.mood();

    el.character.textContent = FACES[mood] ?? FACES.normal;

    if (mood !== _lastMood) {
      el.character.className = '';
      if (mood === 'ot')           el.character.classList.add('happy');
      if (mood === 'unproductive') el.character.classList.add('tired');
      if (mood === 'asleep')       el.character.classList.add('tired');
      if (mood === 'lunch')        el.character.classList.add('guilty');
      _lastMood = mood;

      const speech = SPEECH[mood];
      if (speech) {
        el.speechBubble.textContent = speech;
        _show(el.speechBubble);
        if (mood === 'ot' || mood === 'unproductive') {
          setTimeout(() => _hide(el.speechBubble), 5000);
        }
      } else {
        _hide(el.speechBubble);
      }
    }

    if (mood === 'working') {
      _quipTimer++;
      if (_quipTimer >= 45) {
        _quipTimer = 0;
        const q = WORK_QUIPS[Math.floor(Math.random() * WORK_QUIPS.length)];
        el.speechBubble.textContent = q;
        _show(el.speechBubble);
        setTimeout(() => _hide(el.speechBubble), 6000);
      }
    } else if (mood === 'lunch') {
      _quipTimer++;
      if (_quipTimer >= 60) {
        _quipTimer = 0;
        const q = LUNCH_QUIPS[Math.floor(Math.random() * LUNCH_QUIPS.length)];
        el.speechBubble.textContent = q;
        _show(el.speechBubble);
      }
    } else {
      _quipTimer = 0;
    }
  }

  function _updateAccrualFloat() {
    if (Time.otActive()) {
      const gained = (C.AUTO_OT_BASE * State.autoMultiplier).toFixed(2);
      _spawnCharacterFloat(`+${gained}✦`, 'ot');
    } else if (Time.isWorkHours()) {
      const gained = (C.MINS_PER_TICK / 60).toFixed(2);
      _spawnCharacterFloat(`+${gained}⧗`, 'wh');
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
      waiting:      'stay late?',
      ot:           `overtime until ${C.WORK_END + Time.otMaxHours()}:00.`,
      done:         `${State.dayName()} evening.`,
      unproductive: `${State.dayName()} evening.`,
      weekend:      'weekend.',
      asleep:       'sleeping.',
      normal:       `${State.dayName()}. work starts at ${C.WORK_START}:00.`,
      groggy: 'it\'s early. but you\'re here.',
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

    if (mood === 'ot') {
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
    _show(el.upgradeShelf);
    el.upgradeGrid.className = _shelfOpen ? 'open' : '';

    const allUpgrades = Upgrades.all();
    if (!allUpgrades.length) return;

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

      card.innerHTML = `
        <div class="u-name">${tier.name}</div>
        <div class="u-cost">${symbol} ${tier.cost.toFixed(1)}${cur === 'wh' ? 'h wh' : 'h ot'}</div>
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

    init() {
      _cache();

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

    showClickQuip() {
        const q = CLICK_QUIPS[Math.floor(Math.random() * CLICK_QUIPS.length)];
        el.speechBubble.textContent = q;
        _show(el.speechBubble);
        clearTimeout(el.speechBubble._quipTimeout);
        el.speechBubble._quipTimeout = setTimeout(() => _hide(el.speechBubble), 3000);
        // bounce
        el.character.classList.remove('happy');
        void el.character.offsetWidth; // force reflow
        el.character.classList.add('happy');

        // floating +Xm text
        const mins = State.clickMinutes ?? 1;
        const float = document.createElement('div');
        float.className = 'click-float';
        float.textContent = `+${mins}m`;
        float.style.left = _lastClick.x + 'px';
        float.style.top  = _lastClick.y + 'px';
        document.body.appendChild(float);
        setTimeout(() => float.remove(), 800);
    },
  };

})();