const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('save-records', async (_event, data) => {
  try {
    // Write to a writable user data directory so packaged apps can persist data.
    const filePath = path.join(app.getPath('userData'), 'records.json');
    const json = JSON.stringify(data, null, 2) + '\n';
    await fs.writeFile(filePath, json, 'utf8');
    return { ok: true, path: filePath };
  } catch (err) {
    console.error('Failed to write records.json:', err);
    throw err;
  }
});

ipcMain.handle('load-records', async () => {
  try {
    const userPath = path.join(app.getPath('userData'), 'records.json');
    // Prefer user-data-stored records if present
    try {
      const content = await fs.readFile(userPath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      // if not present, fall back to the packaged records.json next to the app
      try {
        const packaged = path.join(__dirname, 'records.json');
        const content = await fs.readFile(packaged, 'utf8');
        return JSON.parse(content);
      } catch (e2) {
        return [];
      }
    }
  } catch (err) {
    console.error('Failed to load records.json:', err);
    return [];
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
