// main.js — entry point, wires everything together

document.addEventListener('DOMContentLoaded', () => {

  // 1. Load save (or start fresh)
  const hasSave = Save.load();

  // 2. Init UI (caches elements, wires shelf toggle)
  UI.init();

  // 2a. Confirm load after UI is ready
  if (hasSave) UI.showToast('save loaded.', '');

  // 3. Start the clock — UI.update runs every tick
  Time.start(() => {
    UI.update();
    Save.maybeAutosave();
  });

  // 4. Wire up the overtime button
  document.getElementById('btn-primary').addEventListener('click', () => {
    if (!State.trainingComplete) return;
    if (!Time.isOTWindow()) return;
    if (Time.otActive()) return;
    if (Time.otCompletedToday()) return;
    if (Time.otSkippedToday()) return;

    const activated = Time.activateOT();
    if (activated) {
      UI.showToast('overtime started. good luck.', 'good');
      UI.bounceCharacter();
    }
  });

  // 5. Save buttons
  document.getElementById('btn-save').addEventListener('click', () => {
    Save.save();
    UI.showToast('saved.', 'good');
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    Save.exportSave();
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    Save.importSave();
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!confirm('reset everything and start over?')) return;
    Save.reset();
    UI.showToast('see you monday.', '');
    UI.update();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-primary'))   return;
    if (e.target.closest('#event-choices')) return;
    if (e.target.closest('#upgrade-shelf')) return;
    if (e.target.closest('#log-bar'))       return;
    if (e.target.closest('#shelf-toggle'))   return;

    if (e.target.closest('#character-wrap')) {
        UI.showClickQuip();
        return;
    }

    Time.clickTick();
  });

  // 6. Initial render
  UI.update();

});