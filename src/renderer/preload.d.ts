import { Channels } from 'main/preload';

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        sendMessage(channel: Channels, ...args: any[]): void;
        on(channel: string, func: (_event: any, ...args: any[]) => void): any;
        once(channel: string, func: (...args: any[]) => void): void;
        invoke(channel: Channels, ...args: any[]): any;
      };
    };
  }
}

export {};
