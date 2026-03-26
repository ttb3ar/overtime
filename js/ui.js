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
    el.logLatest    = document.getElementById('log-latest');
    el.toastLayer   = document.getElementById('toast-layer');
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
  };

  // Occasional idle quips during working hours
  const WORK_QUIPS = [
    'pretending to read emails.',
    'awaiting further instructions.',
    'in a meeting about meetings.',
    'cc\'d on something ominous.',
    'spreadsheet open. eyes closed.',
  ];

  // Guilty quips cycled during lunch
  const LUNCH_QUIPS = [
    'i could be working right now...',
    'eating a sad desk lunch.',
    'checking flack between bites.',
    'this sandwich cost $18.',
    'technically this is networking.',
  ];

  // ── Internal state ────────────────────────────────────────
  let _lastMood       = null;
  let _quipTimer      = 0;
  let _shelfOpen      = false;
  let _logEntries     = [];

  // ── Helpers ───────────────────────────────────────────────

  function _show(el)  { el.classList.remove('hidden'); }
  function _hide(el)  { el.classList.add('hidden'); }

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

    // update face
    el.character.textContent = FACES[mood] ?? FACES.normal;

    // swap css class for animations
    if (mood !== _lastMood) {
      el.character.className = '';
      if (mood === 'ot')           el.character.classList.add('happy');
      if (mood === 'unproductive') el.character.classList.add('tired');
      if (mood === 'asleep')       el.character.classList.add('tired');
      if (mood === 'lunch')        el.character.classList.add('guilty');
      _lastMood = mood;

      // speech bubble on mood change
      const speech = SPEECH[mood];
      if (speech) {
        el.speechBubble.textContent = speech;
        _show(el.speechBubble);
        // transient moods: hide after a few seconds
        if (mood === 'ot' || mood === 'unproductive') {
          setTimeout(() => _hide(el.speechBubble), 5000);
        }
        // lunch speech persists and is refreshed by quip timer below
      } else {
        _hide(el.speechBubble);
      }
    }

    // occasional working quips
    if (mood === 'working') {
      _quipTimer++;
      if (_quipTimer >= 45) {  // every ~45 ticks
        _quipTimer = 0;
        const q = WORK_QUIPS[Math.floor(Math.random() * WORK_QUIPS.length)];
        el.speechBubble.textContent = q;
        _show(el.speechBubble);
        setTimeout(() => _hide(el.speechBubble), 6000);
      }
    } else if (mood === 'lunch') {
      // rotate guilty quips every ~20 real seconds during lunch
      _quipTimer++;
      if (_quipTimer >= 20) {
        _quipTimer = 0;
        const q = LUNCH_QUIPS[Math.floor(Math.random() * LUNCH_QUIPS.length)];
        el.speechBubble.textContent = q;
        _show(el.speechBubble);
      }
    } else {
      _quipTimer = 0;
    }
  }

  // ── Status line ───────────────────────────────────────────

  function _updateStatus() {
    const mood = Time.mood();
    const h    = State.hour;

    if (!State.trainingComplete) {
      const pct = Math.round(State.trainingProgress() * 100);
      el.statusLine.textContent = `week one. ${pct}% through training.`;
      return;
    }

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
    };

    el.statusLine.textContent = map[mood] ?? '';
  }

  // ── Progress bar ──────────────────────────────────────────

  function _updateProgress() {
    const mood = Time.mood();

    if (!State.trainingComplete) {
      _show(el.progressWrap);
      _setProgress(State.trainingProgress());
      return;
    }

    if (mood === 'working') {
      _show(el.progressWrap);
      _setProgress(Time.shiftProgress());
      return;
    }

    if (mood === 'lunch') {
      _show(el.progressWrap);
      // muted grey bar — this time doesn't count
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
    const btn  = el.btnPrimary;

    // hide button during training or active event
    if (!State.trainingComplete || State.activeEvent) {
      _hide(btn);
      return;
    }

    const inOTWindow = Time.isOTWindow();
    const otActive   = Time.otActive();
    const autoOT     = State.flags.autoOT;

    // auto-OT upgrade: button never needed
    if (autoOT) {
      _hide(btn);
      return;
    }

    if (inOTWindow && !otActive && !Time.otCompletedToday() && !Time.otSkippedToday()) {
      // the one click of the day
      btn.textContent = 'OVERTIME';
      btn.classList.add('ot-available');
      btn.disabled = false;
      _show(btn);
      return;
    }

    // nothing actionable right now
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

    // only rebuild choices if they changed
    if (el.eventChoices.dataset.eventId !== ev.id) {
      el.eventChoices.dataset.eventId = ev.id;
      el.eventChoices.innerHTML = '';
      ev.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = 'event-btn';
        btn.textContent = choice.label;
        btn.addEventListener('click', () => {
          Events.resolve(i);
        });
        el.eventChoices.appendChild(btn);
      });
    }
  }

  // ── Upgrade shelf ─────────────────────────────────────────

  function _updateUpgradeShelf() {
    if (!State.trainingComplete) {
      _hide(el.upgradeShelf);
      return;
    }
    _show(el.upgradeShelf);

    // rebuild grid contents (only when bought set changes)
    const allUpgrades = Upgrades.all();
    if (!allUpgrades.length) return;

    el.upgradeGrid.innerHTML = '';
    let anyVisible = false;

    allUpgrades.forEach(u => {
      if (!Upgrades.isUnlocked(u.id)) return;
      anyVisible = true;

      const bought     = State.bought.has(u.id);
      const affordable = !bought && State.ot >= u.cost;

      const card = document.createElement('div');
      card.className = 'upgrade-card'
        + (bought     ? ' bought'     : '')
        + (affordable ? ' affordable' : '')
        + (!affordable && !bought ? ' locked' : '');

      card.innerHTML = `
        <div class="u-name">${u.name}</div>
        <div class="u-cost ${bought ? 'bought-label' : ''}">${bought ? '✓ purchased' : u.cost.toFixed(1) + 'h'}</div>
        <div class="u-desc">${u.desc}</div>
      `;

      if (!bought) {
        card.addEventListener('click', () => {
          if (State.spendOT(u.cost)) {
            Upgrades.apply(u.id);
            UI.log(`purchased: ${u.name}`, 'upgrade');
            UI.showToast(`${u.name} unlocked.`, 'good');
            _renderUpgradeGrid();
          } else {
            UI.showToast('not enough overtime.', 'warn');
          }
        });
      }

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

  // ── Public API ────────────────────────────────────────────

  return {

    init() {
      _cache();  // must come first — populates el.*

      // shelf toggle
      el.shelfToggle.addEventListener('click', () => {
        _shelfOpen = !_shelfOpen;
        el.upgradeGrid.className = _shelfOpen ? 'open' : '';
        el.shelfToggle.textContent = `upgrades  ${_shelfOpen ? '↑' : '↓'}`;
      });
    },

    /** Called every tick */
    update() {
      _updateHeader();
      _updateCharacter();
      _updateStatus();
      _updateProgress();
      _updateButton();
      _updateEvent();
      _updateUpgradeShelf();
    },

    /** Trigger a bounce animation on the character */
    bounceCharacter() {
      el.character.classList.remove('happy');
      void el.character.offsetWidth; // force reflow
      el.character.classList.add('happy');
    },

    /** Push a line to the log — clears after 6s unless permanent */
    log(text, type = '', permanent = false) {
      _logEntries.unshift({ text, type });
      if (_logEntries.length > 50) _logEntries.pop();
      el.logLatest.textContent = text;
      el.logLatest.className   = type;
      if (!permanent) {
        setTimeout(() => {
          if (el.logLatest.textContent === text) {
            el.logLatest.textContent = '';
            el.logLatest.className = '';
          }
        }, 6000);
      }
    },

    /** Show a toast notification */
    showToast(text, type = '') {
      const t = document.createElement('div');
      t.className = `toast${type ? ' ' + type : ''}`;
      t.textContent = text;
      el.toastLayer.appendChild(t);
      setTimeout(() => t.remove(), 3000);
    },
  };

})();