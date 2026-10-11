import { spawnSync } from "node:child_process";

export default async function globalSetup() {
  const result = spawnSync("pnpm", ["exec", "tsx", "tests/e2e/manage-data.ts", "setup"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(result.stderr || "E2E data setup failed.");
}
