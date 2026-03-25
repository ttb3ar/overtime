// constants.js — all magic numbers live here

const C = {
  // ── Time ──────────────────────────────────────────────────
  TICK_MS:        1000,   // real ms per tick
  MINS_PER_TICK:  60,      // game minutes per tick (1 real sec = 1 game min)

  WORK_START:     9,      // 09:00
  WORK_END:       17,     // 17:00  (exclusive — 17:00 is "after hours")
  LUNCH_START:    12,
  LUNCH_END:      13,

  DAYS:           ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
  WORKDAYS:       [0,1,2,3,4],   // indices into DAYS
  WEEKEND:        [5,6],

  TRAINING_WEEKS: 1,      // how many weeks before OT unlocks

  // ── Overtime accrual ─────────────────────────────────────
  AUTO_OT_BASE:   1,   // hours per tick from auto-overtime (base)

  // ── Save ──────────────────────────────────────────────────
  AUTOSAVE_INTERVAL_MS: 30_000,
  SAVE_KEY: 'overtime_save',
};