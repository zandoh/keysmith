/**
 * Size budget check, run in CI. Budgets live in docs/SPEC.md section 4;
 * amend the spec before amending the numbers here.
 */

import { gzipSync } from "node:zlib";

// Minimal Bun surface, declared locally rather than pulling @types/bun
// into the global environment (it redefines DOM globals the tests rely on).
declare const Bun: {
  build(options: {
    entrypoints: string[];
    minify: boolean;
    target: string;
    external: string[];
  }): Promise<{ outputs: { arrayBuffer(): Promise<ArrayBuffer> }[] }>;
};

interface Budget {
  label: string;
  external: string[];
  limit: number;
}

const BUDGETS: Budget[] = [
  { label: "standalone (tsbus external)", external: ["@zandoh/tsbus"], limit: 5632 }, // 5.5 kB
  { label: "with tsbus bundled", external: [], limit: 7680 }, // 7.5 kB
];

let failed = false;

for (const budget of BUDGETS) {
  const result = await Bun.build({
    entrypoints: ["src/index.ts"],
    minify: true,
    target: "browser",
    external: budget.external,
  });
  const output = result.outputs[0];
  if (!output) throw new Error("no build output");
  const gzipped = gzipSync(Buffer.from(await output.arrayBuffer())).length;

  const status = gzipped <= budget.limit ? "ok" : "OVER BUDGET";
  console.log(`${budget.label}: ${gzipped} B min+gzip (limit ${budget.limit} B) ${status}`);
  if (gzipped > budget.limit) failed = true;
}

process.exit(failed ? 1 : 0);
