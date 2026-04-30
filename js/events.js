// events.js — random workplace events that interrupt the loop

const Events = (() => {

  const COOLDOWN_TICKS  = 3;    // ticks between events
  const TRIGGER_CHANCE  = 1.0;   // TEST: guaranteed trigger every eligible tick

  // ── Event definitions ─────────────────────────────────────
  const DEFS = [

    {
      id:   'multitask',
      face: '(ง˘ᵕ˘)ง',
      text: 'three windows open. all of them productive. something has shifted in you.',
      choices: [
        { label: "let's go",
          resolve: () => _applyMod('doubleWH', 2, 'double output. for now.', 'good', 'good') },
      ],
      trigger: () => (Time.isWorkHours() || Time.otActive()) && !Time.isLunch(),
    },

    {
      id:   'work_call',
      face: '(^‿^)',
      text: "your boss just texted. 'free this evening?' you're not free. you say yes.",
      choices: [
        { label: 'of course',
          resolve: () => _applyMod('workCallActive', 2, 'handling it.', '', 'good') },
      ],
      trigger: () => !Time.isWorkHours() && !Time.otActive() && !Time.isOTWindow()
                     && !State.flags.outsourceSleep && State.trainingComplete
                     && State.hour >= 7 && State.hour < 22,
    },

    {
      id:   'broken_clock',
      face: '(¬‿¬)',
      text: 'the clock on the wall stopped. nobody noticed. time is a construct anyway.',
      choices: [
        { label: "don't tell anyone",
          resolve: () => _applyMod('clockPaused', 2, 'time stands still.', 'good', 'good') },
      ],
      trigger: () => (Time.isWorkHours() || Time.otActive()) && !Time.isLunch(),
    },

    {
      id:   'pizza_party',
      face: '( ˘_˘)',
      text: 'mandatory celebration in the break room. someone ordered pizza. attendance is required.',
      choices: [
        { label: 'i guess i have to go',
          resolve: () => _applyMod('noEarnings', 2, 'pizza acquired. productivity lost.', 'warn', 'bad') },
      ],
      trigger: () => Time.isWorkHours() && !Time.otActive() && !Time.isLunch(),
    },

    {
      id:   'mandatory_pto',
      face: '(╥_╥)',
      text: "HR has noticed. you are being asked — told — to take the day.",
      choices: [
        { label: '...fine',
          resolve: () => _skipToNextDay() },
      ],
      trigger: () => Time.isWorkHours() && !Time.otActive() && State.week > 1,
    },

    {
      id:   'system_error',
      face: '(⊙_⊙)',
      text: 'something crashed. diagnostics running. this could go either way.',
      choices: [
        { label: 'reboot',
          resolve: () => _resolveSystemError() },
      ],
      trigger: () => (Time.isWorkHours() || Time.otActive()) && State.trainingComplete,
    },

  ];

  // ── Internal state ─────────────────────────────────────────
  // Duration is stored in "normal-tick units" (1 unit = 1 game-hour at 60 min/tick).
  // Decremented proportionally to current tick size so game-hour duration stays
  // consistent whether the player is in normal work (60 min/tick) or OT (1 min/tick).
  let _modDuration    = 0;
  let _modDurationMax = 0;
  let _eventTimer     = null;   // auto-dismiss timeout for event cards

  // ── Helpers ───────────────────────────────────────────────

  function _clearMods() {
    const m = State.eventMods;
    m.doubleWH = m.noEarnings = m.clockPaused =
    m.systemBonus = m.systemPenalty = m.workCallActive = false;
  }

  function _applyMod(key, duration, toastMsg, toastType, effect) {
    _clearMods();
    State.eventMods[key] = true;
    _modDuration         = duration;
    _modDurationMax      = duration;
    State.activeEvent    = null;
    State.eventCooldown  = COOLDOWN_TICKS;
    if (toastMsg)          UI.showToast(toastMsg, toastType ?? '');
    if (effect === 'good') UI.showConfetti();
    if (effect === 'bad')  UI.showTears();
  }

  function _skipToNextDay() {
    State.activeEvent   = null;
    State.eventCooldown = COOLDOWN_TICKS;
    State.dayIndex      = (State.dayIndex + 1) % 7;
    if (State.dayIndex === 0) State.week++;
    State.hour   = C.WORK_START;
    State.minute = 0;
    Time.resetDailyOT();
    UI.showTears();
    UI.showToast('day lost. see you tomorrow.', 'warn');
  }

  function _resolveSystemError() {
    const bonus         = Math.random() < 0.5;
    State.activeEvent   = null;
    State.eventCooldown = COOLDOWN_TICKS;

    UI.showSpinWheel(bonus, () => {
      _clearMods();
      const dur = 4;
      if (bonus) {
        State.eventMods.systemBonus = true;
        _modDuration    = dur;
        _modDurationMax = dur;
        UI.showConfetti();
        UI.showToast('system restored. somehow better than before.', 'good');
      } else {
        State.eventMods.systemPenalty = true;
        _modDuration    = dur;
        _modDurationMax = dur;
        UI.showTears();
        UI.showToast('partial recovery. productivity halved.', 'warn');
      }
    });
  }

  function _tryTrigger() {
    if (State.activeEvent)          return;
    if (State.eventCooldown > 0)    return;
    if (_modDuration > 0)           return;
    // if (State.workHoursLifetime < 1) return;   // TEST: disabled
    if (Math.random() > TRIGGER_CHANCE) return;

    const eligible = DEFS.filter(d => d.trigger());
    if (!eligible.length) return;

    const def        = eligible[Math.floor(Math.random() * eligible.length)];
    State.activeEvent = {
      id:      def.id,
      text:    def.text,
      face:    def.face,
      choices: def.choices,
    };

    // Auto-dismiss after 3 real seconds if player doesn't respond
    clearTimeout(_eventTimer);
    _eventTimer = setTimeout(() => {
      if (State.activeEvent) {
        State.activeEvent   = null;
        State.eventCooldown = COOLDOWN_TICKS;
        _eventTimer         = null;
        UI.update();
      }
    }, 3000);
  }

  // ── Public API ────────────────────────────────────────────

  return {

    tick() {
      // Scale decrement by current tick size so 1 unit = 1 game-hour regardless of speed.
      // Only counts down during earning time; pauses outside work hours and OT.
      if (_modDuration > 0 && (Time.isWorkHours() || Time.otActive())) {
        _modDuration -= Time.currentMins() / C.MINS_PER_TICK;
        if (_modDuration <= 0) {
          _modDuration = 0;
          _clearMods();
          UI.showToast('back to normal.', '');
        }
      }
      _tryTrigger();
    },

    resolve(choiceIndex) {
      clearTimeout(_eventTimer);
      _eventTimer = null;
      if (!State.activeEvent) return;
      const def    = DEFS.find(d => d.id === State.activeEvent.id);
      if (!def) return;
      const choice = def.choices[choiceIndex];
      if (choice) {
        choice.resolve();
        UI.update();
      }
    },

    // Returns a short status string when a mod is active, null otherwise
    activeModLabel() {
      const m = State.eventMods ?? {};
      if (m.doubleWH)        return 'fully in the zone.';
      if (m.workCallActive)  return 'handling something real quick.';
      if (m.clockPaused)     return 'the clock says 5:00. still.';
      if (m.noEarnings)      return 'mandatory fun in progress.';
      if (m.systemBonus)     return 'system: somehow better than before.';
      if (m.systemPenalty)   return 'system: partial recovery.';
      return null;
    },

    // Returns { fraction: 0-1, isGood: bool } for any active timed mod, else null
    modBarInfo() {
      const m = State.eventMods;
      const active = m.doubleWH || m.workCallActive || m.clockPaused
                  || m.noEarnings || m.systemBonus || m.systemPenalty;
      if (!active || _modDurationMax === 0) return null;
      const isGood = m.doubleWH || m.workCallActive || m.clockPaused || m.systemBonus;
      return {
        fraction: Math.max(0, _modDuration / _modDurationMax),
        isGood,
      };
    },

  };

})();
