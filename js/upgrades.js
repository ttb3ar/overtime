// upgrades.js — tiered upgrade definitions and apply logic
//
// Tiers: each upgrade group is an ordered array of tiers.
// State.tiers maps groupId → current tier index (0 = unpurchased).
// Buying a tier advances the index and applies the effect.
// The card always displays the NEXT unpurchased tier.

const Upgrades = (() => {

  // ── Tier group definitions ────────────────────────────────
  // currency: 'wh' = workHours, 'ot' = overtime hours
  // unlock: fn() → bool — when the group appears in the shelf
  // tiers: ordered array; buying tier[n] advances tiers[group] to n+1

  const GROUPS = [

    {
      id: 'promote',
      unlock: () => true,   // always visible from shelf unlock
      tiers: [
        {
          name:     'get promoted',
          desc:     'you\'re an intern. put in a good word for yourself.',
          cost:     10,
          currency: 'wh',
          apply() {
            State.trainingComplete = true;
          },
          cardName: 'intern → employee',
        },
        {
          name:     'recognition',
          desc:     'employee of the month. still no raise.',
          cost:     5,
          currency: 'ot',
          apply() {
            State.clickMinutes = 2;
          },
          cardName: 'employee → recognized',
        },
        // room for manager, director, etc.
      ],
    },

    {
      id: 'lunch',
      unlock: () => State.trainingComplete,
      tiers: [
        {
          name:     'shorten lunch',
          desc:     'ask for a shorter lunch break. they say yes.',
          cost:     8,
          currency: 'wh',
          apply() {
            State.lunchReduction = (State.lunchReduction ?? 0) + 10;
          },
          cardName: 'shorten lunch i',
        },
        {
          name:     'shorten lunch',
          desc:     'push it further. you eat at your desk.',
          cost:     14,
          currency: 'wh',
          apply() {
            State.lunchReduction = (State.lunchReduction ?? 0) + 10;
          },
          cardName: 'shorten lunch ii',
        },
        {
          name:     'skip lunch',
          desc:     'lunch is a social construct.',
          cost:     22,
          currency: 'wh',
          apply() {
            State.flags.skipLunch = true;
            State.lunchReduction  = 60;
          },
          cardName: 'skip lunch',
        },
        // tier 3 purchased → card becomes coffee machine (handled by nextGroup)
      ],
      // after all tiers bought, morph into coffee machine group display
      morphsInto: 'coffee',
    },

    {
      id: 'coffee',
      unlock: () => (State.tiers?.lunch ?? 0) >= 3,   // lunch fully upgraded
      tiers: [
        {
          name:     'coffee machine',
          desc:     '+1h overtime. the machine appears overnight.',
          cost:     3,
          currency: 'ot',
          apply() { Time.setOTCap(Time.otMaxHours() + 1); },
          cardName: 'coffee machine',
        },
        {
          name:     'better coffee',
          desc:     '+1h overtime. someone replaced the beans.',
          cost:     6,
          currency: 'ot',
          apply() { Time.setOTCap(Time.otMaxHours() + 1); },
          cardName: 'better coffee',
        },
        {
          name:     'less milk',
          desc:     '+1h overtime. you\'re getting serious.',
          cost:     10,
          currency: 'ot',
          apply() { Time.setOTCap(Time.otMaxHours() + 1); },
          cardName: 'less milk',
        },
        {
          name:     'americano',
          desc:     '+1h overtime. no milk. no mercy.',
          cost:     16,
          currency: 'ot',
          apply() { Time.setOTCap(Time.otMaxHours() + 1); },
          cardName: 'americano',
        },
        {
          name:     'drip',
          desc:     '+1h overtime. you\'ve stopped tasting it.',
          cost:     24,
          currency: 'ot',
          apply() { Time.setOTCap(Time.otMaxHours() + 1); },
          cardName: 'drip',
        },
        {
          name:     'espresso shots',
          desc:     '+1h overtime. plural.',
          cost:     35,
          currency: 'ot',
          apply() { Time.setOTCap(Time.otMaxHours() + 1); },
          cardName: 'espresso shots',
        },
        {
          name:     '???',
          desc:     'you don\'t know what\'s in it anymore.',
          cost:     50,
          currency: 'ot',
          apply() {
            State.autoMultiplier *= 1.5;
          },
          cardName: '???',
        },
        {
          name:     'outsource sleep',
          desc:     'all hours count as working. you\'ve given up.',
          cost:     80,
          currency: 'ot',
          apply() {
            State.flags.outsourceSleep = true;
            Time.setOTCap(24);
          },
          cardName: 'outsource sleep',
        },
      ],
    },

  ];

  // ── Helpers ───────────────────────────────────────────────

  function _getTierIndex(groupId) {
    return State.tiers?.[groupId] ?? 0;
  }

  function _getGroup(id) {
    return GROUPS.find(g => g.id === id);
  }

  // ── Public API ────────────────────────────────────────────

  return {

    all() {
      return GROUPS;
    },

    // Returns the next unpurchased tier for a group, or null if complete
    nextTier(groupId) {
      const g = _getGroup(groupId);
      if (!g) return null;
      const idx = _getTierIndex(groupId);
      return g.tiers[idx] ?? null;
    },

    // Is the group visible in the shelf?
    isUnlocked(groupId) {
      const g = _getGroup(groupId);
      if (!g) return false;
      return g.unlock();
    },

    // Is the group fully purchased?
    isComplete(groupId) {
      const g = _getGroup(groupId);
      if (!g) return true;
      return _getTierIndex(groupId) >= g.tiers.length;
    },

    // Buy the next tier of a group
    buy(groupId) {
      const g = _getGroup(groupId);
      if (!g) return false;
      const idx  = _getTierIndex(groupId);
      const tier = g.tiers[idx];
      if (!tier) return false;

      const cost = tier.cost;
      const cur  = tier.currency;

      if (cur === 'wh') {
        if (!State.spendWorkHours(cost)) return false;
      } else {
        if (!State.spendOT(cost)) return false;
      }

      tier.apply();
      if (!State.tiers) State.tiers = {};
      State.tiers[groupId] = idx + 1;
      return true;
    },

    // Re-apply all purchased tiers from scratch (used after loading a save)
    reapply() {
      State.autoMultiplier         = 1;
      State.lunchReduction         = 0;
      State.flags.skipLunch        = false;
      State.flags.sacrificeWeekend = false;
      State.flags.outsourceSleep   = false;
      State.flags.autoOT           = false;
      State.flags.openDoor         = false;

      const otCapBase = 2;
      let   otCapExtra = 0;

      for (const g of GROUPS) {
        const count = _getTierIndex(g.id);
        for (let i = 0; i < count; i++) {
          const tier = g.tiers[i];
          if (!tier) break;
          // OT cap is additive — track separately to avoid double-setting
          if (g.id === 'coffee' && i < 6) {
            otCapExtra++;
          } else {
            tier.apply();
          }
        }
      }
      Time.setOTCap(otCapBase + otCapExtra);
    },
  };

})();