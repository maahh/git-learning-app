import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "/private/tmp/claude-git-app-v5-vitest-cache",
  test: {
    environment: "node",
    env: {
      CLAUDE_GIT_APP_SANDBOX_ROOT: "/private/tmp/claude-git-app-v5-test-sandbox",
    },
    include: ["tests/unit/**/*.test.ts"],
  },
});
