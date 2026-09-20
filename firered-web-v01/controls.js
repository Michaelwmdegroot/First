(() => {
  'use strict';

  const root = document.querySelector('[data-game-controls]');
  if (!root) return;

  const activePointers = new Map();
  let mask = 0;
  let audioUnlocked = false;

  const apply = () => {
    if (typeof Module !== 'undefined' && typeof Module._WebSetKeys === 'function') {
      Module._WebSetKeys(mask);
    }
  };

  const unlockAudio = () => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    if (typeof Module !== 'undefined' && typeof Module._WebUnlockAudio === 'function') {
      Module._WebUnlockAudio();
    }
  };

  const recalculate = () => {
    let next = 0;
    for (const value of activePointers.values()) next |= value;
    mask = next;
    apply();
  };

  root.querySelectorAll('[data-key-mask]').forEach((button) => {
    const value = Number(button.dataset.keyMask) || 0;

    button.addEventListener('contextmenu', (event) => event.preventDefault());

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      unlockAudio();
      button.setPointerCapture?.(event.pointerId);
      activePointers.set(event.pointerId, value);
      button.classList.add('pressed');
      recalculate();
    });

    const release = (event) => {
      activePointers.delete(event.pointerId);
      button.classList.remove('pressed');
      recalculate();
    };

    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  window.addEventListener('blur', () => {
    activePointers.clear();
    mask = 0;
    root.querySelectorAll('.pressed').forEach((node) => node.classList.remove('pressed'));
    apply();
  });

  window.addEventListener('pagehide', () => {
    if (typeof Module !== 'undefined' && typeof Module._WebFlushSave === 'function') {
      Module._WebFlushSave();
    }
  });

  window.FireRedApplyTouchState = apply;
})();
