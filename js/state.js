// state.js — single source of truth
// All game logic reads from and writes to State.*
// Nothing else stores game data.

const State = {

  // ── Time ──────────────────────────────────────────────────
  week:       2,      // current week number (1-indexed)
  dayIndex:   0,      // 0=monday … 6=sunday
  hour:       9,      // 0–23
  minute:     0,      // 0–59

  // ── Progression ──────────────────────────────────────────
  trainingComplete: false,
  tiers: {},          // groupId → tier index purchased
  lunchReduction: 0,  // minutes removed from lunch window
  clickMinutes: 1,

  // ── Overtime ──────────────────────────────────────────────
  ot:         0,      // spendable overtime hours
  otLifetime: 0,      // total ever earned (for stats)
  otPerHour:  0,      // current auto-rate (display only)
  workHours:         0,   // spendable work hours (early-game currency)
  workHoursLifetime: 0,   // total ever earned

  // ── Upgrades ─────────────────────────────────────────────
  // bought is a Set of upgrade IDs
  bought: new Set(),

  // ── Modifiers (derived from upgrades + events) ───────────
  // Each modifier is { id, label, multiplier?, effect? }
  modifiers: [],

  // ── Events ────────────────────────────────────────────────
  activeEvent:  null,   // current event object or null
  eventCooldown: 0,     // ticks until next event can trigger

  // ── Event modifiers (set/cleared by events.js) ───────────
  eventMods: {
    doubleWH:      false,   // multitask: 2× work-hour accrual
    noEarnings:    false,   // pizza party: no WH or OT accrual
    clockPaused:   false,   // broken clock: time frozen, earning continues
    systemBonus:   false,   // system error (good): WH→OT, OT×2
    systemPenalty: false,   // system error (bad): all earning ×0.5
    workCallActive: false,  // work call: non-work hours count as work
  },

  // ── Flags (upgrade effects toggle these) ─────────────────
  flags: {
    skipLunch:      false,  // lunch hours count as work
    //sacrificeWeekend: false,// weekends count as work
    weekendWork: { satUntil: 0, sunUntil: 0 },
    outsourceSleep: false,  // all hours count as work
    autoOT:         false,  // passive OT accrual
    openDoor:       false,  // higher event frequency
  },

  // ── Auto-OT multiplier (stacks from upgrades) ────────────
  autoMultiplier: 1,

  // ── Helpers ───────────────────────────────────────────────

  /** Is the current game-time a "working" period? */
  isWorkingTime() {
    const { dayIndex, hour, flags } = this;
    if (flags.outsourceSleep) return true;
    const isWeekend = C.WEEKEND.includes(dayIndex);
    if (isWeekend) {
      const until = dayIndex === 5 ? this.weekendWork.satUntil : this.weekendWork.sunUntil;
      return hour >= C.WORK_START && hour < until;
    }
    if (hour >= C.WORK_START && hour < C.WORK_END) {
      // lunch break
      if (!flags.skipLunch && hour >= C.LUNCH_START && hour < C.LUNCH_END) {
        return false;
      }
      return true;
    }
    return false;
  }, 

  /** Current day name */
  dayName() {
    return C.DAYS[this.dayIndex];
  },

  /** Formatted time string e.g. "14:05" */
  timeString() {
    const h = String(this.hour).padStart(2, '0');
    const m = String(this.minute).padStart(2, '0');
    return `${h}:${m}`;
  },

  /** Training progress 0–1
   * Training is now completed via an upgrade
  trainingProgress() {
    if (this.trainingComplete) return 1;
    // training completes after 1 full week (week 2 starts)
    const totalMinsInWeek = 7 * 24 * 60;
    const elapsed = ((this.week - 1) * 7 * 24 * 60)
                  + (this.dayIndex * 24 * 60)
                  + (this.hour * 60)
                  + this.minute;
    return Math.min(elapsed / totalMinsInWeek, 1);
  }, */

  /** Advance time by one tick's worth of game-minutes */
  tick() {
    this.minute += C.MINS_PER_TICK;
    if (this.minute >= 60) {
      this.minute -= 60;
      this.hour++;
    }
    if (this.hour >= 24) {
      this.hour -= 24;
      this.dayIndex++;
    }
    if (this.dayIndex >= 7) {
      this.dayIndex = 0;
      this.week++;
    }
    // decrement event cooldown
    if (this.eventCooldown > 0) this.eventCooldown--;
  },

  /** Add overtime hours */
  addOT(amount) {
    this.ot        += amount;
    this.otLifetime += amount;
  },

  addWorkHours(amount) {
    this.workHours         += amount;
    this.workHoursLifetime += amount;
  },

  /** Spend overtime hours — returns false if insufficient */
  spendOT(amount) {
    if (this.ot < amount) return false;
    this.ot -= amount;
    return true;
  },

  spendWorkHours(amount) {
    if (this.workHours < amount) return false;
    this.workHours -= amount;
    return true;
  },

  /** Snapshot for saving (plain object, no functions) */
  serialize() {
    return {
      week:             this.week,
      dayIndex:         this.dayIndex,
      hour:             this.hour,
      minute:           this.minute,
      trainingComplete: this.trainingComplete,
      ot:               this.ot,
      otLifetime:       this.otLifetime,
      //bought:           [...this.bought],
      flags:            { ...this.flags },
      weekendWork:      { ...this.weekendWork },
      autoMultiplier:   this.autoMultiplier,
      clickMultiplier:  this.clickMultiplier,
      eventCooldown:    this.eventCooldown,
      workHours:        this.workHours,
      workHoursLifetime:this.workHoursLifetime,
      tiers:         { ...this.tiers },
      lunchReduction: this.lunchReduction,
      clickMinutes:  this.clickMinutes,
    };
  },

  /** Restore from a plain object */
  deserialize(data) {
    this.week             = data.week             ?? 1;
    this.dayIndex         = data.dayIndex         ?? 0;
    this.hour             = data.hour             ?? 9;
    this.minute           = data.minute           ?? 0;
    this.trainingComplete = data.trainingComplete ?? false;
    this.ot               = data.ot               ?? 0;
    this.otLifetime       = data.otLifetime       ?? 0;
    //this.bought           = new Set(data.bought   ?? []);
    this.flags            = { ...this.flags, ...(data.flags ?? {}) };
    this.autoMultiplier   = data.autoMultiplier   ?? 1;
    this.clickMultiplier  = data.clickMultiplier  ?? 1;
    this.eventCooldown    = data.eventCooldown    ?? 0;
    this.eventMods = { doubleWH: false, noEarnings: false, clockPaused: false,
                       systemBonus: false, systemPenalty: false, workCallActive: false };
    this.workHours         = data.workHours       ?? 0;
    this.workHoursLifetime = data.workHoursLifetime ?? 0;
    this.tiers         = data.tiers         ?? {};
    this.lunchReduction = data.lunchReduction ?? 0;
    this.clickMinutes  = data.clickMinutes   ?? 1;
    this.weekendWork = data.weekendWork ?? { satUntil: 0, sunUntil: 0 };
    // re-derive modifiers from bought upgrades
    this.modifiers = [];
  },
};