// time.js — the game clock and OT accrual logic
// Drives everything: one setInterval, one tick per second.

const Time = (() => {

  let _intervalId = null;
  let _onTick     = null;   // callback registered by main.js

  // ── OT session state ──────────────────────────────────────
  // Separate from State so it resets each day cleanly
  let _otActive      = false;   // player clicked "do overtime" today
  let _otStartHour   = null;    // hour OT began (always WORK_END)
  let _otMaxHours    = 2;       // base cap; upgrades raise this via Time.setOTCap()
  let _otDoneToday   = false;   // true once this day's OT window has closed

  // ── Character mood ────────────────────────────────────────
  // 'normal' | 'working' | 'ot' | 'unproductive' | 'weekend' | 'asleep'
  let _mood = 'normal';

  // ──────────────────────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────────────────────

  function _isWeekend() {
    return C.WEEKEND.includes(State.dayIndex);
  }

  function _isWorkHours() {
    const h = State.hour;
    if (_isWeekend()) return State.flags.sacrificeWeekend;
    if (State.flags.outsourceSleep) return true;
    if (h < C.WORK_START || h >= C.WORK_END) return false;
    if (!State.flags.skipLunch && h >= C.LUNCH_START && h < C.LUNCH_END) return false;
    return true;
  }

  function _isOTWindow() {
    // The OT window opens at WORK_END and lasts _otMaxHours
    if (!State.trainingComplete) return false;
    if (_isWeekend() && !State.flags.sacrificeWeekend) return false;
    if (State.flags.outsourceSleep) return false; // already always-on
    const h = State.hour;
    return h >= C.WORK_END && h < C.WORK_END + _otMaxHours;
  }

  function _otHoursElapsed() {
    if (_otStartHour === null) return 0;
    return (State.hour + State.minute / 60) - _otStartHour;
  }

  function _resetDailyOT() {
    _otActive    = false;
    _otStartHour = null;
    _otDoneToday = false;
  }

  function _deriveMood() {
    if (State.flags.outsourceSleep) return 'ot';   // always grinding

    const h = State.hour;
    const isWknd = _isWeekend();

    if (isWknd && !State.flags.sacrificeWeekend) {
      return h >= 22 || h < 7 ? 'asleep' : 'weekend';
    }
    if (!isWknd && (h < C.WORK_START || h >= 22)) return 'asleep';
    if (_otActive && _isOTWindow()) return 'ot';
    if (!_otActive && h >= C.WORK_END && h < 22) return 'unproductive';
    if (_isWorkHours()) return 'working';
    if (h >= C.WORK_END) return 'unproductive';
    return 'normal';
  }

  // ──────────────────────────────────────────────────────────
  // Per-tick logic
  // ──────────────────────────────────────────────────────────

  function _processTick() {
    const prevDay = State.dayIndex;

    State.tick();   // advances minute/hour/day/week

    // Day rolled over — reset daily OT state
    if (State.dayIndex !== prevDay) {
      _resetDailyOT();
    }

    // Auto-accrue OT if player opted in and window is open
    if (_otActive && _isOTWindow()) {
      const gained = C.AUTO_OT_BASE * State.autoMultiplier;
      State.addOT(gained);
    }

    // OT window just closed — mark done, deactivate
    if (_otActive && !_isOTWindow() && State.hour >= C.WORK_END + _otMaxHours) {
      _otActive    = false;
      _otDoneToday = true;
    }

    _mood = _deriveMood();

    // update auto-rate display
    State.otPerHour = _otActive
      ? (C.AUTO_OT_BASE * State.autoMultiplier * 60).toFixed(2)
      : 0;

    if (_onTick) _onTick();
  }

  // ──────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────

  return {

    start(onTickCallback) {
      _onTick = onTickCallback;
      if (_intervalId) clearInterval(_intervalId);
      _intervalId = setInterval(_processTick, C.TICK_MS);
    },

    stop() {
      clearInterval(_intervalId);
      _intervalId = null;
    },

    /** Called by UI when player clicks the overtime button */
    activateOT() {
      if (!State.trainingComplete)   return false;
      if (_otActive)                 return false;
      if (_otDoneToday)              return false;
      if (!_isOTWindow() && State.hour < C.WORK_END) return false;
      _otActive    = true;
      _otStartHour = C.WORK_END;
      return true;
    },

    /** Upgrades call this to extend the OT window */
    setOTCap(hours) {
      _otMaxHours = hours;
    },

    // ── Queries for UI ─────────────────────────────────────

    mood()         { return _mood; },
    otActive()     { return _otActive; },
    otDoneToday()  { return _otDoneToday; },
    isOTWindow()   { return _isOTWindow(); },
    isWorkHours()  { return _isWorkHours(); },

    /** 0–1 progress through today's OT window */
    otProgress() {
      if (!_otActive) return 0;
      return Math.min(_otHoursElapsed() / _otMaxHours, 1);
    },

    /** 0–1 progress through the current work shift (09:00–17:00) */
    shiftProgress() {
      const h = State.hour + State.minute / 60;
      if (h < C.WORK_START) return 0;
      if (h >= C.WORK_END)  return 1;
      return (h - C.WORK_START) / (C.WORK_END - C.WORK_START);
    },

    otMaxHours() { return _otMaxHours; },
  };

})();