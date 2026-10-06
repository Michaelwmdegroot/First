Module.preRun = Module.preRun || [];

Module.fireRedSaveSyncState = Module.fireRedSaveSyncState || {
  inFlight: false,
  pending: false,
};

Module.fireRedRequestSaveSync = function () {
  const state = Module.fireRedSaveSyncState;
  state.pending = true;

  if (state.inFlight)
    return;

  const flush = () => {
    if (!state.pending)
      return;

    state.pending = false;
    state.inFlight = true;

    FS.syncfs(false, function (error) {
      state.inFlight = false;

      if (error) {
        console.error('FireRed save sync failed', error);
        const status = document.getElementById('status');
        if (status) {
          const detail = error?.message || String(error);
          status.textContent = 'Save sync error: ' + detail.slice(0, 140);
          status.title = detail;
          status.classList.add('error');
        }
      } else {
        console.log('[FireRed save] IDBFS sync complete');
      }

      if (state.pending)
        flush();
    });
  };

  flush();
};
Module.preRun.push(function () {
  try {
    FS.mkdir('/save');
  } catch (error) {
    // Directory can already exist during a reload.
  }

  FS.mount(IDBFS, {}, '/save');
  addRunDependency('firered-save');

  FS.syncfs(true, function (error) {
    if (error) {
      console.error('Could not restore FireRed browser save', error);
    }
    removeRunDependency('firered-save');
  });
});
