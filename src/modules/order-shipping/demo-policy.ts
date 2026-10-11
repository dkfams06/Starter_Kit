export function assertDemoDatabase(env: Record<string, string | undefined>, actualDatabase: string, applyReset = false) {
  if (env.DEMO_MODE !== "true" || !env.DEMO_DATABASE_NAME || !env.DEMO_DATABASE_HOST || !env.DATABASE_URL) throw new Error("Explicit demo database identity is required.");
  const url = new URL(env.DATABASE_URL);
  if (actualDatabase !== env.DEMO_DATABASE_NAME || decodeURIComponent(url.pathname.slice(1)) !== actualDatabase || url.hostname !== env.DEMO_DATABASE_HOST) throw new Error("Demo database identity mismatch.");
  if (applyReset && env.DEMO_RESET_CONFIRM !== `RESET:${actualDatabase}`) throw new Error("Explicit reset confirmation is required.");
}
