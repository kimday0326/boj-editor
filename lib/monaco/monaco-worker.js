self.MonacoEnvironment = {
  baseUrl: new URL('vs/', self.location.href).toString(),
};
importScripts(new URL('vs/base/worker/workerMain.js', self.location.href).toString());
