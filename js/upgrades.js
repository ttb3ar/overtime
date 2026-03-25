// upgrades.js — upgrade definitions and apply logic

const Upgrades = (() => {

  // ── Upgrade definitions ───────────────────────────────────
  // unlock: fn(State) → bool — when the upgrade appears in the shelf
  const DEFS = [
    {
      id:     'auto_ot',
      name:   'auto overtime',
      desc:   'no button needed. you stay late automatically.',
      cost:   5,
      unlock: () => State.trainingComplete,
      apply() {
        State.flags.autoOT = true;
      },
    },
    {
      id:     'skip_lunch',
      name:   'skip lunch',
      desc:   'lunch is for the weak. noon counts as work.',
      cost:   3,
      unlock: () => State.trainingComplete,
      apply() {
        State.flags.skipLunch = true;
      },
    },
    {
      id:     'extra_hour',
      name:   'reply all at 11pm',
      desc:   'extends your overtime window by 1 hour.',
      cost:   8,
      unlock: () => State.bought.has('auto_ot'),
      apply() {
        Time.setOTCap(Time.otMaxHours() + 1);
      },
    },
    {
      id:     'sacrifice_weekend',
      name:   'sacrifice weekend',
      desc:   'weekends are now counted as working days.',
      cost:   15,
      unlock: () => State.bought.has('skip_lunch'),
      apply() {
        State.flags.sacrificeWeekend = true;
      },
    },
    {
      id:     'hire_intern',
      name:   'hire intern',
      desc:   'doubles overtime earned per session.',
      cost:   20,
      unlock: () => State.otLifetime >= 10,
      apply() {
        State.autoMultiplier *= 2;
      },
    },
    {
      id:     'better_chair',
      name:   'ergonomic chair',
      desc:   '+25% overtime earned. your back thanks you.',
      cost:   10,
      unlock: () => State.trainingComplete,
      apply() {
        State.autoMultiplier *= 1.25;
      },
    },
    {
      id:     'coffee_machine',
      name:   'coffee machine',
      desc:   '+10% overtime earned. it\'s the good stuff.',
      cost:   6,
      unlock: () => State.trainingComplete,
      apply() {
        State.autoMultiplier *= 1.1;
      },
    },
    {
      id:     'open_door',
      name:   'open door policy',
      desc:   'more random events. for better or worse.',
      cost:   4,
      unlock: () => State.trainingComplete,
      apply() {
        State.flags.openDoor = true;
      },
    },
    {
      id:     'outsource_sleep',
      name:   'outsource sleep',
      desc:   'all hours count as working. you\'ve given up.',
      cost:   50,
      unlock: () => State.bought.has('sacrifice_weekend') && State.bought.has('extra_hour'),
      apply() {
        State.flags.outsourceSleep = true;
        Time.setOTCap(24);
      },
    },
  ];

  return {

    all() {
      return DEFS;
    },

    isUnlocked(id) {
      const def = DEFS.find(u => u.id === id);
      if (!def) return false;
      if (State.bought.has(id)) return true;   // always show purchased
      return def.unlock(State);
    },

    apply(id) {
      const def = DEFS.find(u => u.id === id);
      if (!def || State.bought.has(id)) return;
      State.bought.add(id);
      def.apply();
    },

    // Re-apply all bought upgrades from scratch (used after loading a save)
    reapply() {
      // Reset derived values first
      State.autoMultiplier = 1;
      State.flags.autoOT          = false;
      State.flags.skipLunch       = false;
      State.flags.sacrificeWeekend = false;
      State.flags.outsourceSleep  = false;
      State.flags.openDoor        = false;

      for (const id of State.bought) {
        const def = DEFS.find(u => u.id === id);
        if (def) def.apply();
      }
    },
  };

})();