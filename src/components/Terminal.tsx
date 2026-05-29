"use client";

import "@xterm/xterm/css/xterm.css";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ConditionCheck } from "@/lib/conditions/types";

type TerminalProps = {
  chapter?: number;
  track?: "chapter" | "drill";
  id?: number;
  wsQuery?: string;
  mountKey: number;
  onChecks?: (checks: ConditionCheck[]) => void;
  onResetDone?: () => void;
};

export type TerminalHandle = {
  reset: () => void;
};

type ConnectionStatus = "connecting" | "connected" | "closed" | "error";

function websocketUrl(query: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host || "localhost:3000";
  return `${protocol}//${host}/pty?${query}`;
}

const Terminal = forwardRef<TerminalHandle, TerminalProps>(function Terminal(
  { chapter, track = "chapter", id, wsQuery, mountKey, onChecks, onResetDone },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");

  // onChecks / onResetDone は親の再描画で参照が変わり得る。
  // これらを useEffect の依存に入れると、状態更新のたびに WebSocket を張り直して
  // 「接続中」のまま安定しなくなるため、ref 経由で最新を参照し、依存からは外す。
  const onChecksRef = useRef(onChecks);
  const onResetDoneRef = useRef(onResetDone);
  onChecksRef.current = onChecks;
  onResetDoneRef.current = onResetDone;
  const query =
    wsQuery ??
    (track === "drill"
      ? `track=drill&id=${id ?? chapter ?? 1}`
      : `chapter=${chapter ?? id ?? 1}`);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        const socket = socketRef.current;
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "reset" }));
        }
      },
    }),
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cleanup: (() => void) | undefined;
    let disposed = false;
    setConnectionStatus("connecting");

    void (async () => {
      const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);

      if (disposed) {
        return;
      }

      const term = new XTerm({
        cursorBlink: true,
        convertEol: true,
        fontFamily: '"JetBrains Mono", "SFMono-Regular", Menlo, ui-monospace, monospace',
        fontSize: 14,
        lineHeight: 1.25,
        theme: {
          background: "#050705",
          foreground: "#dff7e7",
          cursor: "#6ee7a8",
          selectionBackground: "#255f3a",
          black: "#050705",
          green: "#6ee7a8",
          brightGreen: "#8df3be",
        },
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(container);
      fitAddon.fit();
      term.focus();

      const socket = new WebSocket(websocketUrl(query));
      socketRef.current = socket;

      const sendResize = () => {
        fitAddon.fit();
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "resize",
              cols: term.cols,
              rows: term.rows,
            }),
          );
        }
      };

      socket.addEventListener("open", () => {
        setConnectionStatus("connected");
        sendResize();
      });

      socket.addEventListener("message", (event: MessageEvent<string>) => {
        try {
          const message = JSON.parse(event.data) as {
            type?: string;
            data?: string;
            message?: string;
            checks?: ConditionCheck[];
          };
          if (message.type === "data" && typeof message.data === "string") {
            term.write(message.data);
          } else if (message.type === "error" && message.message) {
            setConnectionStatus("error");
            term.writeln(`\r\n${message.message}`);
          } else if (message.type === "state" && Array.isArray(message.checks)) {
            onChecksRef.current?.(message.checks);
          } else if (message.type === "reset_done") {
            onResetDoneRef.current?.();
          }
        } catch {
          term.write(event.data);
        }
      });

      socket.addEventListener("close", () => {
        setConnectionStatus((current) => (current === "error" ? current : "closed"));
      });

      socket.addEventListener("error", () => {
        setConnectionStatus("error");
      });

      const dataDisposable = term.onData((data) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "data", data }));
        }
      });

      const resizeObserver = new ResizeObserver(() => {
        sendResize();
      });
      resizeObserver.observe(container);

      cleanup = () => {
        resizeObserver.disconnect();
        dataDisposable.dispose();
        socketRef.current = null;
        socket.close();
        term.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [mountKey, query]);

  const statusLabel =
    connectionStatus === "connected"
      ? "接続中"
      : connectionStatus === "connecting"
        ? "接続中..."
        : connectionStatus === "error"
          ? "接続エラー"
          : "切断されました（再読み込みで再接続）";

  return (
    <div className="relative min-h-0 flex-1">
      <div
        className="absolute right-3 top-3 z-10 rounded border border-[#284234] bg-[#07100b]/90 px-2 py-1 text-[11px] font-medium text-[#a7f3d0]"
        aria-live="polite"
      >
        {statusLabel}
      </div>
      <div
        ref={containerRef}
        className="h-full min-h-0 overflow-hidden rounded-md border border-[#1d2b22] bg-black p-2"
        role="application"
        aria-label="Git 練習用ターミナル"
      />
    </div>
  );
});

export default Terminal;
