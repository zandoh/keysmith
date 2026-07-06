import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte()],
  // Svelte 5 ships separate client/server builds; without the browser
  // condition Node resolves the server one, where onMount is unavailable.
  resolve: { conditions: ["browser"] },
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.ts", "tests/frameworks/**/*.test.ts"],
  },
});
