(() => {
  'use strict';

  const WIDTH = 240;
  const HEIGHT = 160;
  const SAVE_KEY = 'personal-firered-native-save-v01';

  const KEY = {
    a: 1 << 0,
    b: 1 << 1,
    select: 1 << 2,
    start: 1 << 3,
    right: 1 << 4,
    left: 1 << 5,
    up: 1 << 6,
    down: 1 << 7,
    r: 1 << 8,
    l: 1 << 9,
  };

  const keyMap = new Map([
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],
    ['KeyZ', 'a'],
    ['KeyX', 'b'],
    ['Enter', 'start'],
    ['Backspace', 'select'],
    ['KeyA', 'l'],
    ['KeyS', 'r'],
  ]);

  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d', { alpha: false });
  const overlay = document.getElementById('bootOverlay');
  const status = document.getElementById('status');

  ctx.imageSmoothingEnabled = false;

  let instance;
  let memory;
  let u8;
  let u16;
  let u32;
  let image;
  let held = new Set();
  let lastSaveHash = '';

  function refreshViews() {
    u8 = new Uint8Array(memory.buffer);
    u16 = new Uint16Array(memory.buffer);
    u32 = new Uint32Array(memory.buffer);
  }

  function readCString(ptr) {
    let out = '';
    let limit = 4096;
    while (limit-- > 0 && u8[ptr]) out += String.fromCharCode(u8[ptr++]);
    return out;
  }

  function copy(src, dst, count, size, fill) {
    for (let i = 0; i < count; i++) {
      const from = fill ? src : src + i * size;
      u8.set(u8.subarray(from, from + size), dst + i * size);
    }
  }

  function lz77(src, dst) {
    const size = u8[src + 1] | (u8[src + 2] << 8) | (u8[src + 3] << 16);
    let s = src + 4;
    let d = dst;
    const end = dst + size;
    while (d < end) {
      const flags = u8[s++];
      for (let bit = 7; bit >= 0 && d < end; bit--) {
        if (flags & (1 << bit)) {
          const pair = (u8[s] << 8) | u8[s + 1];
          s += 2;
          let length = (pair >> 12) + 3;
          const disp = (pair & 0x0fff) + 1;
          while (length-- && d < end) u8[d++] = u8[d - disp];
        } else {
          u8[d++] = u8[s++];
        }
      }
    }
  }

  function rl(src, dst) {
    const size = u8[src + 1] | (u8[src + 2] << 8) | (u8[src + 3] << 16);
    let s = src + 4;
    let d = dst;
    const end = dst + size;
    while (d < end) {
      const flag = u8[s++];
      if (flag & 0x80) {
        let count = (flag & 0x7f) + 3;
        const value = u8[s++];
        while (count-- && d < end) u8[d++] = value;
      } else {
        let count = (flag & 0x7f) + 1;
        while (count-- && d < end) u8[d++] = u8[s++];
      }
    }
  }

  function readS16(ptr) {
    return (u16[ptr >> 1] << 16) >> 16;
  }

  function readS32(ptr) {
    return (u16[ptr >> 1] | (u16[(ptr + 2) >> 1] << 16)) | 0;
  }

  function writeS16(ptr, value) {
    u16[ptr >> 1] = value & 0xffff;
  }

  function writeS32(ptr, value) {
    u16[ptr >> 1] = value & 0xffff;
    u16[(ptr + 2) >> 1] = (value >> 16) & 0xffff;
  }

  function affineTerms(xScale, yScale, rotation) {
    const angle = rotation * Math.PI * 2 / 0x10000;
    const sin = Math.sin(angle) * 256;
    const cos = Math.cos(angle) * 256;
    return {
      pa: cos * xScale / 256,
      pb: -sin * xScale / 256,
      pc: sin * yScale / 256,
      pd: cos * yScale / 256,
    };
  }

  function bgAffineSet(src, dest, count) {
    for (let i = 0; i < count; i++) {
      const s = src + i * 20;
      const d = dest + i * 16;
      const texX = readS32(s);
      const texY = readS32(s + 4);
      const scrX = readS16(s + 8);
      const scrY = readS16(s + 10);
      const { pa, pb, pc, pd } = affineTerms(readS16(s + 12), readS16(s + 14), u16[(s + 16) >> 1]);
      const a = pa | 0, b = pb | 0, c = pc | 0, e = pd | 0;
      writeS16(d, a); writeS16(d + 2, b); writeS16(d + 4, c); writeS16(d + 6, e);
      writeS32(d + 8, (texX - scrX * a - scrY * b) | 0);
      writeS32(d + 12, (texY - scrX * c - scrY * e) | 0);
    }
  }

  function objAffineSet(src, dest, count, offset) {
    for (let i = 0; i < count; i++) {
      const s = src + i * 6;
      const d = dest + i * offset * 4;
      const { pa, pb, pc, pd } = affineTerms(readS16(s), readS16(s + 2), u16[(s + 4) >> 1]);
      writeS16(d, pa | 0);
      writeS16(d + offset, pb | 0);
      writeS16(d + offset * 2, pc | 0);
      writeS16(d + offset * 3, pd | 0);
    }
  }

  function importsFor(module) {
    const env = {};
    for (const item of WebAssembly.Module.imports(module)) {
      if (item.kind !== 'function') continue;
      env[item.name] = (...args) => {
        switch (item.name) {
          case 'CpuSet':
            return copy(args[0], args[1], args[2] & 0x1fffff, (args[2] >>> 26) & 1 ? 4 : 2, (args[2] >>> 24) & 1);
          case 'CpuFastSet':
            return copy(args[0], args[1], args[2] & 0x1fffff, 4, (args[2] >>> 24) & 1);
          case 'LZ77UnCompWram':
          case 'LZ77UnCompVram':
            return lz77(args[0], args[1]);
          case 'RLUnCompWram':
          case 'RLUnCompVram':
            return rl(args[0], args[1]);
          case 'BgAffineSet':
            return bgAffineSet(args[0], args[1], args[2]);
          case 'ObjAffineSet':
            return objAffineSet(args[0], args[1], args[2], args[3]);
          case 'Div':
            return args[1] ? (args[0] / args[1]) | 0 : 0;
          case 'Sqrt':
            return Math.sqrt(args[0] >>> 0) | 0;
          case 'ArcTan2': {
            const angle = Math.atan2(args[0], args[1]);
            return ((angle / (Math.PI * 2)) * 65536) & 0xffff;
          }
          case 'strcmp':
            return readCString(args[0]).localeCompare(readCString(args[1]));
          default:
            console.debug('Unused WASM import:', item.name);
            return 0;
        }
      };
    }
    return { env };
  }

  function currentKeyMask() {
    let mask = 0;
    for (const name of held) mask |= KEY[name] || 0;
    return mask;
  }

  function syncKeys() {
    if (instance?.exports?.WasmSetKeys) instance.exports.WasmSetKeys(currentKeyMask());
  }

  function setPressed(name, pressed) {
    if (pressed) held.add(name);
    else held.delete(name);
    syncKeys();
    document.querySelectorAll('[data-key="' + name + '"]').forEach((el) => {
      el.classList.toggle('pressed', pressed);
    });
  }

  function bytesToBase64(bytes) {
    let out = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      out += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
    }
    return btoa(out);
  }

  function base64ToBytes(text) {
    const raw = atob(text);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function flashView() {
    if (!instance?.exports?.WasmFlashBuffer) return null;
    const ptr = instance.exports.WasmFlashBuffer();
    const size = instance.exports.WasmFlashBufferSize();
    return new Uint8Array(memory.buffer, ptr, size);
  }

  function loadSave() {
    const flash = flashView();
    if (!flash) return;
    flash.fill(0xff);
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return;
    try {
      const bytes = base64ToBytes(saved);
      flash.set(bytes.subarray(0, flash.length));
      lastSaveHash = saved;
    } catch (error) {
      console.warn('Could not restore save', error);
    }
  }

  function saveIfChanged() {
    const flash = flashView();
    if (!flash) return;
    const encoded = bytesToBase64(flash);
    if (encoded === lastSaveHash) return;
    localStorage.setItem(SAVE_KEY, encoded);
    lastSaveHash = encoded;
  }

  function refreshImage() {
    const ptr = instance.exports.WasmDisplayBuffer();
    const size = instance.exports.WasmDisplayBufferSize();
    image = new ImageData(new Uint8ClampedArray(memory.buffer, ptr, size), WIDTH, HEIGHT);
  }

  function frame() {
    try {
      instance.exports.WasmSetKeys(currentKeyMask());
      instance.exports.WasmRunFrame();
      if (memory.buffer !== u8.buffer) {
        refreshViews();
        refreshImage();
      }
      instance.exports.WasmRenderFrame();
      ctx.putImageData(image, 0, 0);
      requestAnimationFrame(frame);
    } catch (error) {
      console.error(error);
      status.textContent = error.message || String(error);
      overlay.classList.remove('hidden');
    }
  }

  async function boot() {
    try {
      status.textContent = 'Loading FireRed game code…';
      const response = await fetch('pokefirered.wasm', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Native build is not available yet (' + response.status + ').');

      const bytes = await response.arrayBuffer();
      status.textContent = 'Starting game…';
      const module = await WebAssembly.compile(bytes);
      instance = await WebAssembly.instantiate(module, importsFor(module));
      memory = instance.exports.memory;
      refreshViews();
      refreshImage();
      loadSave();
      syncKeys();
      instance.exports.AgbMain();
      instance.exports.WasmRenderFrame();
      ctx.putImageData(image, 0, 0);

      overlay.classList.add('hidden');
      setInterval(saveIfChanged, 2500);
      requestAnimationFrame(frame);
    } catch (error) {
      console.error(error);
      status.textContent = error.message || String(error);
    }
  }

  window.addEventListener('keydown', (event) => {
    const name = keyMap.get(event.code);
    if (!name) return;
    event.preventDefault();
    setPressed(name, true);
  }, { passive: false });

  window.addEventListener('keyup', (event) => {
    const name = keyMap.get(event.code);
    if (!name) return;
    event.preventDefault();
    setPressed(name, false);
  }, { passive: false });

  window.addEventListener('blur', () => {
    held.clear();
    syncKeys();
  });

  window.addEventListener('pagehide', saveIfChanged);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveIfChanged();
  });

  document.querySelectorAll('[data-key]').forEach((button) => {
    const name = button.dataset.key;
    const down = (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      setPressed(name, true);
    };
    const up = (event) => {
      event.preventDefault();
      setPressed(name, false);
    };
    button.addEventListener('pointerdown', down, { passive: false });
    button.addEventListener('pointerup', up, { passive: false });
    button.addEventListener('pointercancel', up, { passive: false });
    button.addEventListener('lostpointercapture', up, { passive: false });
  });

  boot();
})();
