// save.js — persistence layer
// localStorage auto-save + manual export/import via base64 JSON

const Save = (() => {

  let _lastSaveTime = 0;

  return {

    save() {
      try {
        const data = JSON.stringify(State.serialize());
        localStorage.setItem(C.SAVE_KEY, data);
        _lastSaveTime = Date.now();
      } catch(e) {
        console.warn('save failed:', e);
      }
    },

    load() {
      try {
        const raw = localStorage.getItem(C.SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        State.deserialize(data);
        Upgrades.reapply();
        UI.showToast('save loaded.', '');
      } catch(e) {
        console.warn('load failed, starting fresh:', e);
        localStorage.removeItem(C.SAVE_KEY);
        return false;
      }
    },

    maybeAutosave() {
      if (Date.now() - _lastSaveTime >= C.AUTOSAVE_INTERVAL_MS) {
        this.save();
      }
    },

    reset() {
      localStorage.removeItem(C.SAVE_KEY);
      State.deserialize({});   // restores all defaults
      Upgrades.reapply();
      Time.stop();
      Time.start(() => {
        UI.update();
        Save.maybeAutosave();
      });
    },

    exportSave() {
      try {
        const data  = JSON.stringify(State.serialize());
        const b64   = btoa(encodeURIComponent(data));
        // copy to clipboard if available, else prompt
        if (navigator.clipboard) {
          navigator.clipboard.writeText(b64).then(() => {
            UI.showToast('save code copied to clipboard.', 'good');
          });
        } else {
          prompt('copy your save code:', b64);
        }
      } catch(e) {
        console.warn('export failed:', e);
      }
    },

    importSave() {
      const input = prompt('paste your save code:');
      if (!input) return;
      try {
        const data = JSON.parse(decodeURIComponent(atob(input.trim())));
        State.deserialize(data);
        Upgrades.reapply();
        this.save();
        UI.update();
        UI.showToast('save imported.', 'good');
      } catch(e) {
        console.warn('import failed:', e);
        UI.showToast('invalid save code.', 'warn');
      }
    },

  };

})();