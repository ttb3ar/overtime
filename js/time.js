// time.js — the game clock and OT accrual logic
// Drives everything: one setInterval, one tick per second.

const Time = (() => {

  let _intervalId   = null;
  let _onTick       = null;
  let _currentDelay = null;  // tracks active interval delay to avoid needless restarts

  // ── OT session state ──────────────────────────────────────
  let _otActive         = false;
  let _otStartHour      = null;
  let _otMaxHours       = 2;
  let _otCompletedToday = false;
  let _otSkippedToday   = false;

  // ── Character mood ────────────────────────────────────────
  let _mood = 'normal';

  // ── Tick size + OT-wait timer ─────────────────────────────
  let _lastMins      = C.MINS_PER_TICK;  // game-minutes for the most recent tick
  let _wasOTWaiting  = false;
  let _otWaitTimer   = null;

  // ──────────────────────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────────────────────

  function _isWeekend() {
    return C.WEEKEND.includes(State.dayIndex);
  }

  function _isWorkHours() {
    if (State.eventMods?.workCallActive) return true;
    const h = State.hour;
    if (_isWeekend()) {
      const until = State.dayIndex === 5
        ? State.weekendWork.satUntil
        : State.weekendWork.sunUntil;
      return State.hour >= C.WORK_START && State.hour < until;
    }
    if (State.flags.outsourceSleep) return true;
    if (h < C.WORK_START || h >= C.WORK_END) return false;
    if (!State.flags.skipLunch && h >= C.LUNCH_START && h < C.LUNCH_END) return false;
    return true;
  }

  function _isLunch() {
    if (State.flags.skipLunch) return false;
    if (State.flags.outsourceSleep) return false;
    if (_isWeekend() && !State.flags.sacrificeWeekend) return false;
    const h = State.hour;
    const effectiveEnd = C.LUNCH_START + (60 - (State.lunchReduction ?? 0)) / 60;
    return h >= C.LUNCH_START && h < effectiveEnd;
  }

  function _isOTWindow() {
    if (!State.trainingComplete) return false;
    if (_isWeekend()) return false;
    if (State.flags.outsourceSleep) return false;
    const h = State.hour;
    return h >= C.WORK_END && h < C.WORK_END + _otMaxHours;
  }

  function _otHoursElapsed() {
    if (_otStartHour === null) return 0;
    return (State.hour + State.minute / 60) - _otStartHour;
  }

  function _resetDailyOT() {
    _otActive         = false;
    _otStartHour      = null;
    _otCompletedToday = false;
    _otSkippedToday   = false;
  }

  function _deriveMood() {
    if (State.flags.outsourceSleep) return 'ot';

    const h      = State.hour;
    const isWknd = _isWeekend();

    if (isWknd) {
      const until = State.dayIndex === 5
        ? State.weekendWork.satUntil
        : State.weekendWork.sunUntil;
      const hasWeekendWork = until > 0;
      if (h >= until || h < C.WORK_START) {
        if (h >= 22 || h < 7) return 'asleep';
        if (hasWeekendWork && h < C.WORK_START) return 'groggy';
        return 'weekend';
      }
      return 'working';
    }
    if (!isWknd && (h < 7 || h >= 22)) return 'asleep';

    if (_isLunch()) return 'lunch';

    if (_otActive && _isOTWindow()) return 'ot';
    if (!_otActive && !_otCompletedToday && _isOTWindow()) return 'waiting';
    if (_otSkippedToday && h >= C.WORK_END + _otMaxHours) return 'unproductive';
    if (_otCompletedToday && h >= C.WORK_END + _otMaxHours) return 'done';
    if (h >= C.WORK_START && h < C.WORK_END) return 'working';
    if (h >= C.WORK_END) return 'done';
    return 'normal';
  }

  // Restart the interval with a new delay only if it has changed
  function _setTickDelay(ms) {
    if (_currentDelay === ms) return;
    _currentDelay = ms;
    clearInterval(_intervalId);
    _intervalId = setInterval(_processTick, ms);
  }

  // ──────────────────────────────────────────────────────────
  // Per-tick logic
  // ──────────────────────────────────────────────────────────

  function _isOTWaiting() {
    return _isOTWindow() && !_otActive && !_otCompletedToday && !_otSkippedToday;
  }

  function _processTick() {
    const prevDay = State.dayIndex;
    const mods    = State.eventMods ?? {};

    // Pause all time advancement and accrual while:
    //   • an event card is waiting for player input, OR
    //   • the overtime prompt is showing (player deciding whether to start OT)
    const timePaused = State.activeEvent !== null || _isOTWaiting();
    _lastMins = 0;

    // ── OT-prompt 3-second auto-skip ──────────────────────────
    const nowOTWaiting = _isOTWaiting();
    if (nowOTWaiting && !_wasOTWaiting) {
      clearTimeout(_otWaitTimer);
      _otWaitTimer = setTimeout(() => {
        if (_isOTWaiting()) _otSkippedToday = true;
        _otWaitTimer = null;
      }, 3000);
    } else if (!nowOTWaiting && _otWaitTimer) {
      clearTimeout(_otWaitTimer);
      _otWaitTimer = null;
    }
    _wasOTWaiting = nowOTWaiting;

    if (!timePaused) {
      const slowTick = _isLunch() || (_otActive && _isOTWindow());
      const mins     = slowTick ? 1 : C.MINS_PER_TICK;
      _lastMins      = mins;

      // OT accrual
      if (_otActive && _isOTWindow() && !mods.noEarnings) {
        let gained = C.AUTO_OT_BASE * State.autoMultiplier * (mins / C.MINS_PER_TICK);
        if (mods.systemBonus)   gained *= 2;
        if (mods.systemPenalty) gained *= 0.5;
        State.addOT(gained);
      }

      // Work hour accrual
      if (_isWorkHours() && !_otActive && !mods.noEarnings) {
        let fraction = mins / 60;
        if (mods.doubleWH)      fraction *= 2;
        if (mods.systemPenalty) fraction *= 0.5;
        if (mods.systemBonus) {
          State.addOT(fraction);
        } else {
          State.addWorkHours(fraction);
        }
      }

      // Advance game time (frozen during broken-clock event)
      if (!mods.clockPaused) {
        State.minute += mins;
        while (State.minute >= 60) {
          State.minute -= 60;
          State.hour++;
        }
        if (State.hour >= 24) {
          State.hour -= 24;
          State.dayIndex++;
        }
        if (State.dayIndex >= 7) {
          State.dayIndex = 0;
          State.week++;
        }
        if (State.dayIndex !== prevDay) _resetDailyOT();

        // OT window closed while active — mark completed
        if (_otActive && !_isOTWindow() && State.hour >= C.WORK_END + _otMaxHours) {
          _otActive         = false;
          _otCompletedToday = true;
        }
        // OT window closed and player never clicked — mark skipped
        if (!_otActive && !_otCompletedToday && !_otSkippedToday
            && State.trainingComplete
            && State.hour >= C.WORK_END + _otMaxHours) {
          _otSkippedToday = true;
        }
      }
    }

    if (State.eventCooldown > 0) State.eventCooldown--;

    _mood = _deriveMood();

    State.otPerHour = _otActive
      ? (C.AUTO_OT_BASE * State.autoMultiplier).toFixed(1)
      : 0;

    const nowSlow = !timePaused && (_isLunch() || (_otActive && _isOTWindow()));
    _setTickDelay(nowSlow ? C.TICK_MS / 10 : C.TICK_MS);

    if (_onTick) _onTick();
  }

  // ──────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────

  return {

    start(onTickCallback) {
      _onTick = onTickCallback;
      clearInterval(_intervalId);
      _currentDelay = C.TICK_MS;
      _intervalId = setInterval(_processTick, C.TICK_MS);
    },

    stop() {
      clearInterval(_intervalId);
      _intervalId   = null;
      _currentDelay = null;
    },

    activateOT() {
      if (!State.trainingComplete)  return false;
      if (_otActive)                return false;
      if (_otCompletedToday)        return false;
      if (_otSkippedToday)          return false;
      if (!_isOTWindow())           return false;
      _otActive    = true;
      _otStartHour = C.WORK_END;
      return true;
    },

    setOTCap(hours) {
      _otMaxHours = hours;
    },

    mood()             { return _mood; },
    otActive()         { return _otActive; },
    otCompletedToday() { return _otCompletedToday; },
    otSkippedToday()   { return _otSkippedToday; },
    isOTWindow()       { return _isOTWindow(); },
    isWorkHours()      { return _isWorkHours(); },
    isLunch()          { return _isLunch(); },

    otProgress() {
      if (!_otActive) return 0;
      return Math.min(_otHoursElapsed() / _otMaxHours, 1);
    },

    shiftProgress() {
      const h = State.hour + State.minute / 60;
      if (h < C.WORK_START) return 0;
      if (h >= C.WORK_END)  return 1;
      return (h - C.WORK_START) / (C.WORK_END - C.WORK_START);
    },

    lunchProgress() {
      const h = State.hour + State.minute / 60;
      if (h < C.LUNCH_START) return 0;
      if (h >= C.LUNCH_END)  return 1;
      return (h - C.LUNCH_START) / (C.LUNCH_END - C.LUNCH_START);
    },

    otMaxHours()    { return _otMaxHours; },
    resetDailyOT()  { _resetDailyOT(); },
    currentMins()   { return _lastMins; },
    otWaiting()     { return _isOTWaiting(); },

    clickTick() {
      if (State.activeEvent || _isOTWaiting()) return;
      const prevDay = State.dayIndex;

      State.minute += State.clickMinutes ?? 1;
      while (State.minute >= 60) {
      State.minute -= 60;
      State.hour++;
      }
      if (State.hour >= 24) {
      State.hour -= 24;
      State.dayIndex++;
      }
      if (State.dayIndex >= 7) {
      State.dayIndex = 0;
      State.week++;
      }
      if (State.eventCooldown > 0) State.eventCooldown--;
      if (State.dayIndex !== prevDay) _resetDailyOT();

      _mood = _deriveMood();
      if (_onTick) _onTick();
    },
 };

})();