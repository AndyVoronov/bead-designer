/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// Resolve the real filesystem path (worktrees may be NTFS junctions / symlinks)
const realRoot = fs.realpathSync(path.resolve(__dirname));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(realRoot, "src"),
    },
  },
  server: {
    fs: {
      allow: [realRoot],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: [path.resolve(realRoot, "src/test-setup.ts")],
    passWithNoTests: true,
  },
});
