const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, protocol, Notification, nativeTheme } = require('electron');
const path = require('path');
const Store = require('electron-store');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ─── Config ───────────────────────────────────────────────────────────────────
const VERCEL_URL = process.env.VERCEL_URL || 'https://your-app.vercel.app';
const IS_DEV = process.argv.includes('--dev');
const store = new Store();

// ─── Globals ──────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let isQuitting = false;
let unreadCount = 0;

// ─── Single Instance Lock ─────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// ─── Deep Link Protocol ───────────────────────────────────────────────────────
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('baaat', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('baaat');
}

// ─── Window State Helpers ─────────────────────────────────────────────────────
function getWindowState() {
  return store.get('windowState', {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined,
    isMaximized: false,
  });
}

function saveWindowState(win) {
  if (win.isMaximized()) {
    store.set('windowState.isMaximized', true);
    return;
  }
  const bounds = win.getBounds();
  store.set('windowState', {
    ...bounds,
    isMaximized: false,
  });
}

// ─── Create Main Window ───────────────────────────────────────────────────────
function createWindow() {
  const state = getWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 800,
    minHeight: 600,
    title: 'Baaat',
    icon: getAppIcon(),
    backgroundColor: '#1a1a2e',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  if (state.isMaximized) mainWindow.maximize();

  // Persist window state on move/resize
  ['resize', 'move'].forEach(event => {
    mainWindow.on(event, () => saveWindowState(mainWindow));
  });

  // Minimize to tray on close (instead of quitting)
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Show window once ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Uncomment to open DevTools manually: mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  loadApp();
}

// ─── Load App / Offline Handling ─────────────────────────────────────────────
function isOnline() {
  // Electron 22+ — net.isOnline() or check via simple require
  try {
    return require('electron').net ? true : true;
  } catch {
    return true;
  }
}

function loadApp() {
  if (!mainWindow) return;

  // Check network via IPC from preload after page loads
  // For launch-time check, attempt to load and handle failure
  mainWindow.loadURL(VERCEL_URL).catch(() => {
    loadOfflinePage();
  });

  // Handle load failures (no internet, DNS failure, etc.)
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, _errorDesc, validatedURL) => {
    // Ignore subframe failures and aborted navigations
    if (errorCode === -3) return;
    if (validatedURL !== VERCEL_URL && !validatedURL.startsWith(VERCEL_URL)) return;
    loadOfflinePage();
  });

  // After successful load, inject the offline/online detector
  mainWindow.webContents.on('did-finish-load', () => {
    injectOfflineDetector();
  });
}

function loadOfflinePage() {
  if (!mainWindow) return;
  mainWindow.loadFile(path.join(__dirname, 'offline.html'));
}

function reloadApp() {
  if (!mainWindow) return;
  mainWindow.loadURL(VERCEL_URL).catch(() => loadOfflinePage());
}

// Inject a thin script into the Vercel page to monitor online/offline events
function injectOfflineDetector() {
  if (!mainWindow) return;

  const script = `
    (function() {
      // Avoid double-injection
      if (window.__baaatOfflineInjected) return;
      window.__baaatOfflineInjected = true;

      function updateStatus() {
        window.electronAPI && window.electronAPI.setOnlineStatus(navigator.onLine);
      }
      window.addEventListener('online', updateStatus);
      window.addEventListener('offline', updateStatus);
      updateStatus();

      // Expose for manual trigger from main
      window.__baaatCheckOnline = updateStatus;
    })();
  `;

  mainWindow.webContents.executeJavaScript(script).catch(() => {});
}

// Inject / remove the offline overlay banner inside the loaded page
function showOfflineBanner(show) {
  if (!mainWindow) return;

  const script = show ? `
    (function() {
      if (document.getElementById('__baaat-offline-banner')) return;
      const banner = document.createElement('div');
      banner.id = '__baaat-offline-banner';
      banner.style.cssText = [
        'position:fixed',
        'top:0',
        'left:0',
        'right:0',
        'z-index:2147483647',
        'background:linear-gradient(135deg,#1a1a2e,#16213e)',
        'color:#e94560',
        'text-align:center',
        'padding:8px 16px',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        'font-size:13px',
        'font-weight:600',
        'letter-spacing:0.5px',
        'box-shadow:0 2px 8px rgba(0,0,0,0.5)',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'gap:8px',
      ].join(';');
      banner.innerHTML = '<span style="font-size:16px">⚡</span> No internet connection — reconnecting...';
      document.body.appendChild(banner);
    })();
  ` : `
    (function() {
      const b = document.getElementById('__baaat-offline-banner');
      if (b) b.remove();
    })();
  `;

  mainWindow.webContents.executeJavaScript(script).catch(() => {});
}

// ─── System Tray ──────────────────────────────────────────────────────────────
function createTray() {
  const icon = getTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Baaat');

  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;
  const contextMenu = Menu.buildFromTemplate([
    {
      label: unreadCount > 0 ? `Open Baaat (${unreadCount} unread)` : 'Open Baaat',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Start on Login',
      type: 'checkbox',
      checked: store.get('autoLaunch', false),
      click: (menuItem) => toggleAutoLaunch(menuItem.checked),
    },
    { type: 'separator' },
    {
      label: 'Quit Baaat',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

// ─── Auto Launch ──────────────────────────────────────────────────────────────
let autoLauncher = null;

async function initAutoLaunch() {
  try {
    const AutoLaunch = require('auto-launch');
    autoLauncher = new AutoLaunch({ name: 'Baaat', isHidden: false });
    const isEnabled = store.get('autoLaunch', false);
    const currentlyEnabled = await autoLauncher.isEnabled();
    if (isEnabled && !currentlyEnabled) await autoLauncher.enable();
    if (!isEnabled && currentlyEnabled) await autoLauncher.disable();
  } catch (err) {
    console.error('AutoLaunch init failed:', err.message);
  }
}

async function toggleAutoLaunch(enable) {
  store.set('autoLaunch', enable);
  if (!autoLauncher) return;
  try {
    if (enable) {
      await autoLauncher.enable();
    } else {
      await autoLauncher.disable();
    }
  } catch (err) {
    console.error('AutoLaunch toggle failed:', err.message);
  }
  updateTrayMenu();
}

// ─── Notifications ────────────────────────────────────────────────────────────
function showNotification({ title, body, chatId }) {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title: title || 'Baaat',
    body: body || 'You have a new message',
    icon: getAppIcon(),
    silent: false,
  });

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      // Navigate to the specific chat if chatId provided
      if (chatId) {
        mainWindow.webContents.executeJavaScript(
          `window.location.hash = '/chat/${chatId}';`
        ).catch(() => {});
      }
    }
  });

  notification.show();
}

// ─── Badge / Unread Count ─────────────────────────────────────────────────────
function setUnreadCount(count) {
  unreadCount = count;

  // macOS dock badge
  if (process.platform === 'darwin') {
    app.dock.setBadge(count > 0 ? String(count) : '');
  }

  // Windows taskbar overlay icon
  if (process.platform === 'win32' && mainWindow) {
    if (count > 0) {
      const badgeIcon = createBadgeIcon(count);
      mainWindow.setOverlayIcon(badgeIcon, `${count} unread messages`);
    } else {
      mainWindow.setOverlayIcon(null, '');
    }
  }

  updateTrayMenu();
}

function createBadgeIcon(count) {
  // Create a simple colored circle badge as NativeImage
  const size = 20;
  const label = count > 99 ? '99+' : String(count);
  // Use a red circle — electron supports canvas-like data URI for NativeImage
  const dataURL = `data:image/svg+xml;charset=utf-8,
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="%23e94560"/>
      <text x="50%25" y="50%25" dy=".35em" text-anchor="middle"
        font-family="Arial" font-size="${label.length > 1 ? 8 : 11}"
        font-weight="bold" fill="white">${label}</text>
    </svg>`;
  return nativeImage.createFromDataURL(dataURL);
}

// ─── Icon Helpers ─────────────────────────────────────────────────────────────
function getAppIcon() {
  const ext = process.platform === 'win32' ? 'ico' : process.platform === 'darwin' ? 'icns' : 'png';
  const iconPath = path.join(__dirname, 'assets', `icon.${ext}`);
  try {
    return nativeImage.createFromPath(iconPath);
  } catch {
    return nativeImage.createEmpty();
  }
}

function getTrayIcon() {
  const trayPath = path.join(__dirname, 'assets', 'tray.png');
  try {
    const img = nativeImage.createFromPath(trayPath);
    if (!img.isEmpty()) return img;
  } catch {}
  // Fallback to app icon
  return getAppIcon();
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.on('online-status-changed', (_event, isOnlineNow) => {
  if (!isOnlineNow) {
    showOfflineBanner(true);
  } else {
    showOfflineBanner(false);
  }
});

ipcMain.on('notify', (_event, payload) => {
  if (!mainWindow || !mainWindow.isFocused()) {
    showNotification(payload);
  }
});

ipcMain.on('set-unread-count', (_event, count) => {
  setUnreadCount(count);
});

ipcMain.on('reload-app', () => {
  reloadApp();
});

ipcMain.on('open-external', (_event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('get-auto-launch', () => store.get('autoLaunch', false));
ipcMain.handle('set-auto-launch', (_event, enable) => toggleAutoLaunch(enable));

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Auto-updater (stub — no update server yet)
  setupUpdater();

  createWindow();
  createTray();
  await initAutoLaunch();

  // macOS — re-create window if dock icon clicked
  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  // Keep running in tray; only quit on explicit Quit action
  if (process.platform !== 'darwin') {
    // Don't quit — we have a tray
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// Handle deep link on macOS (open-url event)
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    // Forward URL to renderer for routing
    mainWindow.webContents.send('deep-link', url);
  }
});

// Handle deep link on Windows/Linux (second-instance argv)
app.on('second-instance', (_event, argv) => {
  const deepLink = argv.find(arg => arg.startsWith('baaat://'));
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    if (deepLink) mainWindow.webContents.send('deep-link', deepLink);
  }
});

// ─── Auto Updater Stub ────────────────────────────────────────────────────────
function setupUpdater() {
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.logger = null; // silent for now
    autoUpdater.autoDownload = false;

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
      if (mainWindow) {
        mainWindow.webContents.send('update-available', info);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info.version);
      if (mainWindow) {
        mainWindow.webContents.send('update-downloaded', info);
      }
    });

    autoUpdater.on('error', (err) => {
      // Silently ignore in dev / when no update server
      if (IS_DEV) console.log('Updater error (expected in dev):', err.message);
    });

    // Only check for updates in production
    if (!IS_DEV) {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }
  } catch (err) {
    console.log('electron-updater not available:', err.message);
  }
}
