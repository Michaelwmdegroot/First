const WIDTH = 240;
const HEIGHT = 160;
const SAVE_KEY = 'firered.native.v01.flash';
const buttons = {
  a: 1 << 0, b: 1 << 1, select: 1 << 2, start: 1 << 3,
  right: 1 << 4, left: 1 << 5, up: 1 << 6, down: 1 << 7,
  r: 1 << 8, l: 1 << 9,
};
const keyMap = new Map([
  ['KeyZ','a'],['KeyX','b'],['Enter','start'],['ShiftLeft','select'],['ShiftRight','select'],
  ['ArrowRight','right'],['ArrowLeft','left'],['ArrowUp','up'],['ArrowDown','down'],
  ['KeyS','r'],['KeyA','l'],
]);

const canvas = document.querySelector('#screen');
const ctx = canvas.getContext('2d', { alpha: false });
const status = document.querySelector('#status');
const pressed = new Set();
const image = ctx.createImageData(WIDTH, HEIGHT);

let instance;
let memory;
let u8;
let u16;
let savePtr = 0;
let saveSize = 0;
let framePtr = 0;
let lastSaveHash = 0;
let lastSaveCheck = 0;

function heldMask() {
  let mask = 0;
  for (const name of pressed) mask |= buttons[name] || 0;
  return mask;
}

function setPressed(name, down) {
  if (down) pressed.add(name); else pressed.delete(name);
  if (instance) instance.exports.WasmSetKeys(heldMask());
  document.querySelectorAll(`[data-key="${name}"]`).forEach(el => el.classList.toggle('pressed', down));
}

function hash(bytes) {
  let h = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function encode(bytes) {
  let s = '';
  for (let i=0;i<bytes.length;i+=0x8000) s += String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(s);
}

function decode(s) {
  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i=0;i<raw.length;i++) out[i]=raw.charCodeAt(i);
  return out;
}

function loadSave() {
  const target = u8.subarray(savePtr, savePtr + saveSize);
  target.fill(0xff);
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    if (stored) {
      const bytes = decode(stored);
      if (bytes.length === saveSize) target.set(bytes);
    }
  } catch {}
  lastSaveHash = hash(target);
}

function persistSave(force=false) {
  if (!instance || !saveSize) return;
  const now = performance.now();
  if (!force && now-lastSaveCheck < 1000 && !instance.exports.WasmTakeSaveDirty()) return;
  lastSaveCheck = now;
  const bytes = u8.subarray(savePtr, savePtr + saveSize);
  const nextHash = hash(bytes);
  if (!force && nextHash === lastSaveHash) return;
  try {
    localStorage.setItem(SAVE_KEY, encode(bytes));
    lastSaveHash = nextHash;
  } catch {}
}

function render() {
  instance.exports.WasmRenderFrame();
  const src = new Uint16Array(memory.buffer, framePtr, WIDTH * HEIGHT);
  const out = image.data;
  for (let i=0, j=0; i<src.length; i++, j+=4) {
    const px = src[i];
    out[j]   = (px & 31) << 3;
    out[j+1] = ((px >> 5) & 31) << 3;
    out[j+2] = ((px >> 10) & 31) << 3;
    out[j+3] = 255;
  }
  ctx.putImageData(image,0,0);
}

function defaultImports(module) {
  const env = {};
  for (const item of WebAssembly.Module.imports(module)) {
    if (item.kind === 'function') env[item.name] = () => 0;
  }
  return { env };
}

async function boot() {
  try {
    status.textContent = 'Loading native FireRed…';
    const response = await fetch('pokefirered.wasm', { cache: 'no-store' });
    if (!response.ok) throw new Error(`WASM HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    const module = await WebAssembly.compile(bytes);
    instance = await WebAssembly.instantiate(module, defaultImports(module));
    memory = instance.exports.memory;
    u8 = new Uint8Array(memory.buffer);
    u16 = new Uint16Array(memory.buffer);

    framePtr = instance.exports.WasmFrameBuffer();
    savePtr = instance.exports.WasmSaveBuffer();
    saveSize = instance.exports.WasmSaveSize();
    loadSave();

    instance.exports.WasmSetKeys(0);
    instance.exports.AgbMain();
    status.textContent = 'FireRed V0.1 — native browser build';

    const tick = () => {
      instance.exports.WasmSetKeys(heldMask());
      instance.exports.WasmRunFrame();
      render();
      persistSave();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } catch (error) {
    console.error(error);
    status.textContent = `V0.1 build error: ${error.message}`;
  }
}

addEventListener('keydown', event => {
  const name = keyMap.get(event.code);
  if (!name) return;
  event.preventDefault();
  setPressed(name,true);
});
addEventListener('keyup', event => {
  const name = keyMap.get(event.code);
  if (!name) return;
  event.preventDefault();
  setPressed(name,false);
});
addEventListener('blur', () => {
  pressed.clear();
  if (instance) instance.exports.WasmSetKeys(0);
});
addEventListener('pagehide', () => persistSave(true));
addEventListener('beforeunload', () => persistSave(true));

document.querySelectorAll('[data-key]').forEach(button => {
  const name = button.dataset.key;
  button.addEventListener('pointerdown', e => {
    e.preventDefault();
    button.setPointerCapture?.(e.pointerId);
    setPressed(name,true);
  });
  const release = e => {
    e.preventDefault();
    setPressed(name,false);
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
});

boot();
