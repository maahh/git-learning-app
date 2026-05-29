import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const hasXterm = existsSync(path.join(__dirname, "node_modules", "@xterm", "xterm"));
const hasFitAddon = existsSync(path.join(__dirname, "node_modules", "@xterm", "addon-fit"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // StrictMode の dev 二重マウントは pty / WebSocket を二重に張り、
  // 初回接続が「接続中」のまま安定しない原因になるため無効化する。
  reactStrictMode: false,
  outputFileTracingRoot: __dirname,
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      ...(!hasXterm
        ? {
            "@xterm/xterm": path.join(__dirname, "src", "lib", "xterm-build-shim.ts"),
            "@xterm/xterm/css/xterm.css": path.join(
              __dirname,
              "src",
              "lib",
              "xterm-build-shim.css",
            ),
          }
        : {}),
      ...(!hasFitAddon
        ? {
            "@xterm/addon-fit": path.join(__dirname, "src", "lib", "xterm-fit-build-shim.ts"),
          }
        : {}),
    };
    return config;
  },
};

export default nextConfig;
