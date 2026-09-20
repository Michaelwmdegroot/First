Module.preRun = Module.preRun || [];
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
