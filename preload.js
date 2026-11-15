// Tiny bridge: lets the page ask the main process to resize the window so
// the current tool page (plus the credits footer) fits without scrolling.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wytFitPage', (contentHeight) => {
    if (Number.isFinite(contentHeight)) ipcRenderer.send('wyt:fit-window', contentHeight);
});

// Real app version for the header/footer display (falls back to static text
// in the page when running outside Electron).
contextBridge.exposeInMainWorld('wytGetVersion', () => ipcRenderer.invoke('wyt:app-version'));
