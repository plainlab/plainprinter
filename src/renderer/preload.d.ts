import { Channels } from 'main/preload';

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        sendMessage(channel: Channels, args: any): void;
        on(
          channel: string,
          func: (...args: any) => void
        ): (() => void) | undefined;
        once(channel: string, func: (...args: unknown[]) => void): void;
        invoke(channel: Channels, args?: any): any;
      };
    };
  }
}

export {};
