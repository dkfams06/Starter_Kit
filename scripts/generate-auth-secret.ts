import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const path = ".env.local";
const current = existsSync(path) ? readFileSync(path, "utf8") : "";
const existing = current.match(/^AUTH_SECRET=["']?([^\r\n"']*)["']?$/m)?.[1];

if (existing && existing !== "__GENERATE_LOCALLY__") {
  console.log("AUTH_SECRET is already configured in .env.local.");
  process.exit(0);
}

const secret = randomBytes(48).toString("base64url");
const nextLine = `AUTH_SECRET="${secret}"`;
const next = /^AUTH_SECRET=.*$/m.test(current)
  ? current.replace(/^AUTH_SECRET=.*$/m, nextLine)
  : `${current}${current && !current.endsWith("\n") ? "\n" : ""}${nextLine}\n`;

writeFileSync(path, next, { mode: 0o600 });
console.log("Generated AUTH_SECRET in ignored .env.local.");
