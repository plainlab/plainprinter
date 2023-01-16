/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  dialog,
  nativeImage,
  screen,
  FileFilter,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { promisify } from 'util';
import fs from 'fs';
import nodeurl from 'url';

import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

const screenshot = require('screenshot-desktop');
const PDFDocument = require('pdfkit');
const robot = require('@jitsi/robotjs');
const Store = require('electron-store');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

const store = new Store({
  hotkey: String,
});

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let screenWindow: BrowserWindow | null = null;
let stopPrinting = false;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
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

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 400,
    maximizable: false,
    fullscreen: false,
    fullscreenable: false,
    resizable: false,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Handler React calls
 */

ipcMain.handle(
  'open-file',
  async (_event, filters: FileFilter[], type: 'path' | 'buffer') => {
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
  async (_event, { defaultPath, content, encoding }) => {
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
        contextIsolation: true,
        preload: app.isPackaged
          ? path.join(__dirname, 'preload.js')
          : path.join(__dirname, '../../.erb/dll/preload.js'),
      },
    });
  }
  screenWindow.loadURL(
    `${resolveHtmlPath('index.html')}?page=screen&select=${select}`
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

ipcMain.handle('close-screen', (_event, coord) => {
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
        // eslint-disable-next-line no-await-in-loop
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
        // eslint-disable-next-line no-await-in-loop
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
    } catch (e: any) {
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

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
