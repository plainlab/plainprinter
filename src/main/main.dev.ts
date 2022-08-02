/* eslint-disable no-await-in-loop */
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
  nativeImage,
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
const robot = require('robotjs');

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
    maximizable: false,
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
      minimizable: false,
      maximizable: false,
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

interface Coord {
  select: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Screenshot {
  frameCoord: Coord;
  nextCoord: Coord;
  pages: number;
  delay: number;
}

ipcMain.handle('stop-printing', () => {
  stopPrinting = true;
});

ipcMain.handle(
  'start-printing',
  async (_, { frameCoord, nextCoord, pages, delay }: Screenshot) => {
    // Calculate x, y
    let x = frameCoord.x0 > frameCoord.x1 ? frameCoord.x1 : frameCoord.x0;
    let y = frameCoord.x0 > frameCoord.x1 ? frameCoord.y1 : frameCoord.y0;
    let width = Math.abs(frameCoord.x0 - frameCoord.x1);
    let height = Math.abs(frameCoord.y0 - frameCoord.y1);

    // For retina screen and the like
    const factor = screen.getPrimaryDisplay().scaleFactor;
    x *= factor;
    y *= factor;
    width *= factor;
    height *= factor;

    const doc = new PDFDocument({ autoFirstPage: false });
    const pdfPath = path.join(app.getPath('temp'), 'preview.pdf');
    doc.pipe(fs.createWriteStream(pdfPath));

    try {
      for (let p = 0; p < pages; p += 1) {
        // Screenshot
        const buff: Buffer = await screenshot({ format: 'png' });
        const image = nativeImage.createFromBuffer(buff);
        const png = image.crop({ x, y, height, width }).toPNG();

        // Create pdf
        doc.addPage({ size: [width, height] });
        doc.image(png, 0, 0);
        doc.save();

        // Click
        if (nextCoord) {
          const nextX = (nextCoord.x0 + nextCoord.x1) / 2;
          const nextY = (nextCoord.y0 + nextCoord.y1) / 2;
          robot.moveMouse(nextX, nextY);
          robot.mouseClick();
        }

        // Send progress
        mainWindow?.webContents.send('print-progress', {
          page: p + 1,
          done: p + 1 === pages,
        });

        // Sleep
        await new Promise((resolve) => setTimeout(resolve, 1000 * delay));

        if (stopPrinting) {
          stopPrinting = false;
          mainWindow?.webContents.send('print-progress', {
            page: p + 1,
            done: true,
          });
          break;
        }
      }

      doc.end();
      openPdf(pdfPath);
    } catch (e) {
      dialog.showErrorBox(e.message, e.stack);
      console.error(e);
    }
  }
);

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
