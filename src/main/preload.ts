import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = string;

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    sendMessage(channel: Channels, args: unknown[]) {
      ipcRenderer.send(channel, args);
    },
    invoke(channel: Channels, ...args: unknown[]) {
      return ipcRenderer.invoke(channel, ...args);
    },
    on(
      channel: Channels,
      func: (_event: IpcRendererEvent, ...args: unknown[]) => void
    ) {
      return ipcRenderer.on(channel, func);
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
});
