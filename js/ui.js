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
    el.whDisplay        = document.getElementById('wh-display');
    el.whCount          = document.getElementById('wh-count');
    el.sysErrBar        = document.getElementById('sys-err-bar');
    el.sysErrFill       = document.getElementById('sys-err-fill');
    el.eventCountdown   = document.getElementById('event-countdown-fill');
    el.otCountdownWrap  = document.getElementById('ot-countdown-wrap');
    el.otCountdown      = document.getElementById('ot-countdown-fill');
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
  let _lastMood      = null;
  let _quipTimer     = 0;
  let _shelfOpen     = false;
  let _lastRank      = null;
  let _lastOTWaiting = false;
  let _lastEventId   = null;

  // ── Helpers ───────────────────────────────────────────────

  function _show(e)  { e.classList.remove('hidden'); }
  function _hide(e)  { e.classList.add('hidden'); }

  // Restart a CSS animation by clearing and re-applying it
  function _restartAnim(elem, anim) {
    elem.style.animation = 'none';
    void elem.offsetWidth;
    elem.style.animation = anim;
  }

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

    let face = FACES[mood] ?? FACES.normal;
    if (State.activeEvent?.face) {
      face = State.activeEvent.face;
    } else if (Time.isWorkHours() || Time.otActive()) {
      const mods = State.eventMods ?? {};
      if (mods.doubleWH)        face = '(ง˘ᵕ˘)ง';
      if (mods.workCallActive)  face = '(^‿^)';
      if (mods.clockPaused)     face = '(¬‿¬)';
      if (mods.noEarnings)      face = '( ˘_˘)';
      if (mods.systemBonus)     face = '( ˘ᵕ˘)✦';
      if (mods.systemPenalty)   face = '(;-;)';
    }
    el.character.textContent = face;

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

    const modLabel = Events.activeModLabel();
    if (modLabel) { el.statusLine.textContent = modLabel; return; }

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
      // Restart countdown bar only when the OT prompt first appears
      if (!_lastOTWaiting) {
        _restartAnim(el.otCountdown, 'countdown-shrink 3s linear forwards');
      }
      _show(el.otCountdownWrap);
      _lastOTWaiting = true;
      return;
    }

    _hide(btn);
    _hide(el.otCountdownWrap);
    _lastOTWaiting = false;
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
      // Restart 3-second countdown bar for this new event
      _restartAnim(el.eventCountdown, 'countdown-shrink 3s linear forwards');
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

  // ── System-error duration bar ─────────────────────────────

  function _updateModBar() {
    const info = Events.modBarInfo();
    if (!info) {
      _hide(el.sysErrBar);
      return;
    }
    _show(el.sysErrBar);
    el.sysErrFill.style.width = `${info.fraction * 100}%`;
    el.sysErrFill.className   = info.isGood ? 'bonus' : 'penalty';
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
      _updateModBar();
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
    },

    showConfetti() {
      const rect = el.character.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const COLORS = ['#4caf78', '#6b8cff', '#1a1a1a', '#f5c518', '#ffb3c6'];
      for (let i = 0; i < 24; i++) {
        const bit = document.createElement('div');
        bit.className = 'confetti-bit';
        const angle = Math.random() * Math.PI * 2;
        const dist  = 50 + Math.random() * 130;
        const tx    = Math.cos(angle) * dist;
        const ty    = Math.sin(angle) * dist - 50;
        const size  = 5 + Math.random() * 7;
        const dur   = 0.65 + Math.random() * 0.55;
        const rot   = (Math.random() - 0.5) * 900;
        Object.assign(bit.style, {
          left:         `${cx}px`,
          top:          `${cy}px`,
          width:        `${size}px`,
          height:       `${size}px`,
          background:   COLORS[Math.floor(Math.random() * COLORS.length)],
          borderRadius: Math.random() > 0.45 ? '50%' : '2px',
        });
        document.body.appendChild(bit);
        bit.animate([
          { opacity: 1, transform: 'translate(0,0) rotate(0deg)' },
          { opacity: 0, transform: `translate(${tx}px,${ty}px) rotate(${rot}deg)` },
        ], { duration: dur * 1000, easing: 'ease-out', fill: 'forwards' });
        setTimeout(() => bit.remove(), (dur + 0.15) * 1000);
      }
    },

    showTears() {
      const rect = el.character.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      for (let i = 0; i < 8; i++) {
        const drop = document.createElement('div');
        drop.className = 'tear-drop';
        const xOff  = (Math.random() - 0.5) * 34;
        const dur   = 1.0 + Math.random() * 0.9;
        const delay = Math.random() * 0.7;
        const ty    = 55 + Math.random() * 65;
        Object.assign(drop.style, {
          left: `${cx + xOff}px`,
          top:  `${cy + 4}px`,
        });
        document.body.appendChild(drop);
        drop.animate([
          { opacity: 0.8, transform: 'translateY(0) scaleX(1)' },
          { opacity: 0,   transform: `translateY(${ty}px) scaleX(0.7)` },
        ], { duration: dur * 1000, delay: delay * 1000, easing: 'ease-in', fill: 'both' });
        setTimeout(() => drop.remove(), (dur + delay + 0.15) * 1000);
      }
    },

    showSpinWheel(isBonus, callback) {
      const overlay = document.createElement('div');
      overlay.className = 'spin-overlay';
      overlay.innerHTML = `
        <div class="spin-card">
          <div class="spin-card-title">rebooting...</div>
          <div class="spin-wheel-wrap">
            <div class="spin-pointer">▼</div>
            <div class="spin-wheel"></div>
          </div>
          <div class="spin-result"></div>
        </div>`;
      document.body.appendChild(overlay);

      const wheel  = overlay.querySelector('.spin-wheel');
      const result = overlay.querySelector('.spin-result');

      // green at pointer (top) when wheel is rotated ~270°; red at ~90°
      const spins = 6 * 360;
      const land  = isBonus
        ? spins + 270 + (Math.random() * 60 - 30)   // green under pointer
        : spins + 90  + (Math.random() * 60 - 30);  // red under pointer

      // Double rAF: first frame establishes rotate(0deg) as the "from" state,
      // second frame sets the target so the CSS transition actually fires.
      requestAnimationFrame(() => {
        wheel.style.transform = 'rotate(0deg)';
        requestAnimationFrame(() => {
          wheel.style.transition = 'transform 2.6s cubic-bezier(0.1, 0.85, 0.3, 1)';
          wheel.style.transform  = `rotate(${land}deg)`;
        });
      });

      // reveal result label after wheel settles
      setTimeout(() => {
        result.textContent = isBonus ? 'good luck.' : 'not today.';
        result.className   = `spin-result ${isBonus ? 'good' : 'bad'}`;
      }, 2750);

      // close and fire callback
      setTimeout(() => {
        overlay.classList.add('closing');
        setTimeout(() => { overlay.remove(); callback(); }, 500);
      }, 3300);
    },
  };

})();