import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.ts"],
    // Business-logic tests hit a real (test) Postgres and share transactions —
    // run them one at a time to avoid cross-test interference.
    fileParallelism: false,
  },
});
