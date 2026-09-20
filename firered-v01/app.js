(() => {
  'use strict';

  const EXPECTED_SHA256 = '3d0c79f1627022e18765766f6cb5ea067f6b5bf7dca115552189ad65a5c3a8ac';
  const EXPECTED_SIZE = 16 * 1024 * 1024;
  const CDN_DATA = 'https://cdn.emulatorjs.org/stable/data/';

  const launcher = document.getElementById('launcher');
  const playArea = document.getElementById('playArea');
  const romInput = document.getElementById('romInput');
  const romStatus = document.getElementById('romStatus');
  const dropZone = document.getElementById('dropZone');
  const reloadButton = document.getElementById('reloadButton');
  const loadedRomName = document.getElementById('loadedRomName');
  const protocolWarning = document.getElementById('protocolWarning');

  let booting = false;

  if (location.protocol === 'file:') {
    protocolWarning.hidden = false;
  }

  function setStatus(message, state = 'idle') {
    romStatus.innerHTML = '';
    const dot = document.createElement('span');
    dot.className = `status-dot ${state}`;
    dot.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = message;
    romStatus.append(dot, text);
  }

  async function sha256Hex(buffer) {
    if (!crypto?.subtle) return null;
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function readAscii(bytes, start, length) {
    return String.fromCharCode(...bytes.slice(start, start + length));
  }

  async function inspectRom(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const gameCode = bytes.length >= 0xB0 ? readAscii(bytes, 0xAC, 4) : '';
    const hash = await sha256Hex(buffer);
    return {
      size: bytes.length,
      gameCode,
      hash,
      exact: bytes.length === EXPECTED_SIZE && gameCode === 'BPRE' && hash === EXPECTED_SHA256
    };
  }

  function bootEmulator(file) {
    window.EJS_player = '#game';
    window.EJS_core = 'gba';
    window.EJS_gameUrl = file;
    window.EJS_gameName = file.name.replace(/\.gba$/i, '');
    window.EJS_pathtodata = CDN_DATA;
    window.EJS_startOnLoaded = true;
    window.EJS_fullscreenOnLoaded = false;
    window.EJS_controlScheme = 'gba';
    window.EJS_threads = false;
    window.EJS_askBeforeExit = true;
    window.EJS_color = '#dc2626';

    const script = document.createElement('script');
    script.src = `${CDN_DATA}loader.js`;
    script.async = true;
    script.onerror = () => {
      playArea.hidden = true;
      launcher.hidden = false;
      booting = false;
      setStatus('The emulator files could not be loaded. Check your internet connection, then try again.', 'warning');
    };
    document.body.appendChild(script);
  }

  async function handleRom(file) {
    if (!file || booting) return;
    if (!file.name.toLowerCase().endsWith('.gba')) {
      setStatus('Please choose the extracted .gba file, not the ZIP archive.', 'warning');
      return;
    }

    booting = true;
    setStatus('Checking the ROM…', 'loading');

    try {
      const info = await inspectRom(file);
      if (info.exact) {
        setStatus('FireRed v1.0 recognized. Starting the game…', 'good');
      } else if (info.gameCode === 'BPRE') {
        setStatus('A FireRed ROM was detected, but it is not the exact V0.1 base ROM. Starting anyway…', 'warning');
      } else {
        setStatus('This does not look like the expected FireRed BPRE ROM. Starting as a GBA ROM anyway…', 'warning');
      }

      loadedRomName.textContent = file.name;
      launcher.hidden = true;
      playArea.hidden = false;
      bootEmulator(file);
    } catch (error) {
      console.error(error);
      booting = false;
      setStatus('The ROM could not be read. Try selecting the .gba file again.', 'warning');
    }
  }

  romInput.addEventListener('change', () => handleRom(romInput.files?.[0]));

  for (const eventName of ['dragenter', 'dragover']) {
    dropZone.addEventListener(eventName, event => {
      event.preventDefault();
      dropZone.classList.add('dragging');
    });
  }
  for (const eventName of ['dragleave', 'drop']) {
    dropZone.addEventListener(eventName, event => {
      event.preventDefault();
      dropZone.classList.remove('dragging');
    });
  }
  dropZone.addEventListener('drop', event => handleRom(event.dataTransfer?.files?.[0]));

  reloadButton.addEventListener('click', () => location.reload());
})();
