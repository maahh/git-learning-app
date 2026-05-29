type Disposable = {
  dispose(): void;
};

export class Terminal {
  cols = 80;
  rows = 24;
  private element: HTMLPreElement | null = null;
  private dataHandler: ((data: string) => void) | null = null;

  constructor(_options?: Record<string, unknown>) {}

  loadAddon(_addon: unknown): void {}

  open(parent: HTMLElement): void {
    const element = document.createElement("pre");
    element.textContent = "xterm.js package is not installed in this sandbox build.\n";
    element.style.margin = "0";
    element.style.height = "100%";
    element.style.whiteSpace = "pre-wrap";
    parent.appendChild(element);
    this.element = element;
  }

  focus(): void {}

  write(data: string): void {
    if (this.element) {
      this.element.textContent += data;
    }
  }

  writeln(data: string): void {
    this.write(`${data}\n`);
  }

  onData(callback: (data: string) => void): Disposable {
    this.dataHandler = callback;
    return {
      dispose: () => {
        this.dataHandler = null;
      },
    };
  }

  dispose(): void {
    this.element?.remove();
  }
}
