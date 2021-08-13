/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build:main`, this file is compiled to
 * `./src/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  screen,
  shell,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { FileFilter, IpcMainInvokeEvent } from 'electron/main';
import fs from 'fs';
import { promisify } from 'util';
import nodeurl from 'url';

import MenuBuilder from './menu';

const screenshot = require('screenshot-desktop');
const PDFDocument = require('pdfkit');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

const Store = require('electron-store');

const store = new Store({
  hotkey: String,
});

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let screenWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

let stopPrinting = false;

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 512,
    height: 364,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.webContents.on('before-input-event', (_event, ipnut) => {
    if (ipnut.key === 'Escape') {
      stopPrinting = true;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Handlers events from React
 */

// This method return a Buffer, if you want to convert to string
// use Buffer.from(buffer).toString()
ipcMain.handle(
  'open-file',
  async (
    _event: IpcMainInvokeEvent,
    filters: FileFilter[],
    type: 'path' | 'buffer'
  ) => {
    const files = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters,
    });

    let content;
    if (files) {
      const fpath = files.filePaths[0];
      if (type === 'path') {
        content = fpath;
      } else {
        content = await readFile(fpath);
      }
    }
    return content;
  }
);

ipcMain.handle(
  'save-file',
  async (_event: IpcMainInvokeEvent, { defaultPath, content, encoding }) => {
    const file = await dialog.showSaveDialog({
      defaultPath,
    });

    if (!file || !file.filePath) return;

    await writeFile(file.filePath, content, {
      encoding,
    });
  }
);

const createScreenWindow = (select: string) => {
  if (screenWindow == null) {
    screenWindow = new BrowserWindow({
      frame: false,
      transparent: true,
      parent: mainWindow || undefined,
      width: screen.getPrimaryDisplay().size.width,
      height: screen.getPrimaryDisplay().size.height,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });
  }
  screenWindow.loadURL(
    `file://${__dirname}/index.html?page=screen&select=${select}`
  );

  screenWindow.webContents.on('did-finish-load', () => {
    screenWindow?.show();
    screenWindow?.webContents.send('screen-show');
  });

  screenWindow.webContents.on('before-input-event', (_event, ipnut) => {
    if (ipnut.key === 'Escape') {
      screenWindow?.close();
    }
  });

  screenWindow.on('closed', () => {
    screenWindow = null;
  });
};

const openPdf = (pdfPath: string) => {
  const win = new BrowserWindow({
    title: 'Preview',
    width: 512,
    height: 768,
    webPreferences: {
      plugins: true,
      contextIsolation: false,
    },
  });
  win.loadURL(nodeurl.pathToFileURL(pdfPath).toString());
};

ipcMain.handle('open-screen', async (_, { select }) => {
  createScreenWindow(select);
});

ipcMain.handle('get-store', (_event, { key }) => {
  return store.get(key);
});

ipcMain.handle('close-screen', (_, coord) => {
  mainWindow?.webContents.send('close-screen', coord);
  screenWindow?.close();
});

ipcMain.handle('start-printing', (_, { frameCoord, nextCoord, pages }) => {
  console.log('Print with params', frameCoord, nextCoord, pages);

  const doc = new PDFDocument();
  const pdfPath = path.join(app.getPath('temp'), 'preview.pdf');
  const jpgPath = path.join(app.getPath('temp'), 'preview.jpg');

  doc.pipe(fs.createWriteStream(pdfPath));

  screenshot({ filename: jpgPath })
    .then((filename: string) => {
      doc.image(filename);
      doc.save();
      return doc.end();
    })
    .then(() => {
      return openPdf(pdfPath);
    })
    .catch(console.error);

  if (stopPrinting) {
    console.log('Stop now');
  }
});

/**
 * Add event listeners...
 */
app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.whenReady().then(createWindow).catch(console.log);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
