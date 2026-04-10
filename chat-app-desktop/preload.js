const { contextBridge, ipcRenderer } = require('electron');

// ─── Expose safe API to renderer (Vercel page) ────────────────────────────────
contextBridge.exposeInMainWorld('electronAPI', {

  // Online/offline status
  setOnlineStatus: (isOnline) => {
    ipcRenderer.send('online-status-changed', isOnline);
  },

  // Send a native notification from the web app
  notify: (payload) => {
    ipcRenderer.send('notify', payload);
  },

  // Update the unread badge count
  setUnreadCount: (count) => {
    ipcRenderer.send('set-unread-count', count);
  },

  // Trigger app reload (e.g. after reconnect)
  reloadApp: () => {
    ipcRenderer.send('reload-app');
  },

  // Open an external URL in the default browser
  openExternal: (url) => {
    ipcRenderer.send('open-external', url);
  },

  // Auto-launch settings
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enable) => ipcRenderer.invoke('set-auto-launch', enable),

  // Listen for events from main process
  onDeepLink: (callback) => {
    ipcRenderer.on('deep-link', (_event, url) => callback(url));
  },

  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },

  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (_event, progress) => callback(progress));
  },

  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },

  // Check if running inside Electron
  isElectron: true,
  platform: process.platform,
});

// ─── Monitor online/offline from within the page context ─────────────────────
window.addEventListener('DOMContentLoaded', () => {
  function sendStatus() {
    ipcRenderer.send('online-status-changed', navigator.onLine);
  }

  window.addEventListener('online', sendStatus);
  window.addEventListener('offline', sendStatus);
  sendStatus(); // Send initial status
});
