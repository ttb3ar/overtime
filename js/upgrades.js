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
      baseRank: 'intern',
      unlock: () => true,   // always visible from shelf unlock
      tiers: [
        {
          name:     'get promoted',
          rank:     'employee',
          desc:     'you\'re an intern. put in a good word for yourself. unlocks OVERTIME',
          cost:     36,
          currency: 'wh',
          apply() {
            State.trainingComplete = true;
          },
          cardName: 'intern → employee',
        },
        {
          name:     'recognition',
          rank:     'recognized employee',
          desc:     'employee of the month. still no raise. at least your time is worth more?',
          cost:     70,
          currency: 'wh',
          apply() {
            State.clickMinutes = 2;
          },
          cardName: 'employee → recognized',
        },
        // room for manager, director, etc.
      ],
    },

    {
      id: 'weekend',
      unlock: () => (State.tiers?.lunch ?? 0) >= 3,
      tiers: [
        {
          name:     'saturday morning',
          desc:     '"voluntarily staying productive."',
          cost:     28,
          currency: 'wh',
          apply()   { State.weekendWork.satUntil = Math.max(State.weekendWork.satUntil, 12); },
        },
        {
          name:     'sunday morning',
          desc:     '"happy to help out."',
          cost:     28,
          currency: 'wh',
          apply()   { State.weekendWork.sunUntil = Math.max(State.weekendWork.sunUntil, 12); },
        },
        {
          name:     'saturday afternoon',
          desc:     '"at my own discretion."',
          cost:     40,
          currency: 'wh',
          apply()   { State.weekendWork.satUntil = Math.max(State.weekendWork.satUntil, 15.5); },
        },
        {
          name:     'sunday afternoon',
          desc:     '"as requested."',
          cost:     40,
          currency: 'ot',
          apply()   { State.weekendWork.sunUntil = Math.max(State.weekendWork.sunUntil, 15.5); },
        },
        {
          name:     'saturday evening',
          desc:     '"per leadership\'s guidance."',
          cost:     55,
          currency: 'ot',
          apply()   { State.weekendWork.satUntil = Math.max(State.weekendWork.satUntil, 17); },
        },
        {
          name:     'sunday evening',
          desc:     '"as discussed."',
          cost:     55,
          currency: 'ot',
          apply()   { State.weekendWork.sunUntil = Math.max(State.weekendWork.sunUntil, 17); },
        },
        {
          name:     'saturday night',
          desc:     '"this is fine."',
          cost:     80,
          currency: 'ot',
          apply()   { State.weekendWork.satUntil = Math.max(State.weekendWork.satUntil, 24); },
        },
        {
          name:     'sunday night',
          desc:     '"it\'s what\'s best for the company."',
          cost:     80,
          currency: 'ot',
          apply()   { State.weekendWork.sunUntil = Math.max(State.weekendWork.sunUntil, 24); },
        },
      ],
    },


    {
      id: 'lunch',
      unlock: () => State.trainingComplete,
      tiers: [
        {
          name:     'shorten lunch',
          desc:     'ask for a shorter lunch break. they say yes.',
          cost:     14,
          currency: 'wh',
          apply() {
            State.lunchReduction = (State.lunchReduction ?? 0) + 20;
          },
          cardName: 'shorten lunch i',
        },
        {
          name:     'shorten lunch',
          desc:     'push it further. you eat at your desk.',
          cost:     20.2,
          currency: 'wh',
          apply() {
            State.lunchReduction = (State.lunchReduction ?? 0) + 10;
          },
          cardName: 'shorten lunch ii',
        },
        {
          name:     'skip lunch',
          desc:     'lunch is a social construct.',
          cost:     35,
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
      morphsInto: 'weekend',
    },

    {
      id: 'coffee',
      unlock: () => State.otLifetime > 0,
      tiers: [
        {
          name:     'coffee machine',
          desc:     'the machine appears overnight. +1h overtime.',
          cost:     100,
          currency: 'wh',
          apply() { Time.setOTCap(Time.otMaxHours() + 1); },
          cardName: 'coffee machine',
        },
        {
          name:     'cappuccino',
          desc:     'no more instant coffee. +1h overtime.',
          cost:     180,
          currency: 'wh',
          apply() { Time.setOTCap(Time.otMaxHours() + 1); },
          cardName: 'cappuccino',
        },
        {
          name:     'latte',
          desc:     'you\'re getting serious. +1h overtime.',
          cost:     215,
          currency: 'ot',
          apply() { Time.setOTCap(Time.otMaxHours() + 1); },
          cardName: 'latte',
        },
        {
          name:     'americano',
          desc:     'no milk. no mercy. +1h overtime.',
          cost:     245,
          currency: 'ot',
          apply() { Time.setOTCap(Time.otMaxHours() + 1); },
          cardName: 'americano',
        },
        {
          name:     'drip',
          desc:     'you\'ve stopped tasting it. +1h overtime.',
          cost:     270,
          currency: 'ot',
          apply() { Time.setOTCap(Time.otMaxHours() + 1); },
          cardName: 'drip',
        },
        {
          name:     'espresso shots',
          desc:     'plural. +1h overtime.',
          cost:     321,
          currency: 'ot',
          apply() { Time.setOTCap(Time.otMaxHours() + 1); },
          cardName: 'espresso shots',
        },
        {
          name:     '???',
          desc:     '+1h overtime.',
          cost:     372,
          currency: 'ot',
          apply() {
            State.autoMultiplier *= 1.5;
          },
          cardName: '???',
        },
        {
          name:     'outsource sleep',
          desc:     'you\'re happier this way. for the company.',
          cost:     424,
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
      State.weekendWork = { satUntil: 0, sunUntil: 0 };
      State.autoMultiplier         = 1;
      State.lunchReduction         = 0;
      State.flags.skipLunch        = false;
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
    rankLabel() {
      const g   = GROUPS.find(grp => grp.id === 'promote');
      const idx = State.tiers?.promote ?? 0;
      if (idx === 0) return g.baseRank;
      return g.tiers[idx - 1]?.rank ?? g.baseRank;
    },
  };

})();