import { defineConfig } from "vite";

export default defineConfig({
  base: "/keysmith/",
  build: { outDir: "dist", target: "es2023" },
});
