declare module "@xterm/xterm" {
  export type IDisposable = {
    dispose(): void;
  };

  export class Terminal {
    cols: number;
    rows: number;
    constructor(options?: Record<string, unknown>);
    loadAddon(addon: { activate?(terminal: Terminal): void; dispose?(): void }): void;
    open(parent: HTMLElement): void;
    focus(): void;
    write(data: string): void;
    writeln(data: string): void;
    onData(callback: (data: string) => void): IDisposable;
    dispose(): void;
  }
}

declare module "@xterm/addon-fit" {
  export class FitAddon {
    activate?(): void;
    dispose?(): void;
    fit(): void;
  }
}

declare module "@xterm/xterm/css/xterm.css";
