import { spawnSync } from "node:child_process";

const port = String(process.env.PORT || "8080");
const hostname = "0.0.0.0";

function mustEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`[start-prod] Missing required env: ${name}`);
    return false;
  }
  return true;
}

console.log("[start-prod] Boot checks");
console.log(`[start-prod] NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}`);
console.log(`[start-prod] PORT=${port}`);
console.log(
  `[start-prod] AUTH_URL=${process.env.AUTH_URL ?? "(unset)"}`,
);
console.log(
  `[start-prod] DATABASE_URL=${process.env.DATABASE_URL ? "(set)" : "(unset)"}`,
);
console.log(
  `[start-prod] AUTH_SECRET=${process.env.AUTH_SECRET ? "(set)" : "(MISSING)"}`,
);

if (!mustEnv("AUTH_SECRET") || !mustEnv("DATABASE_URL")) {
  process.exit(1);
}

console.log("[start-prod] Running prisma db push…");
const push = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});
if (push.status !== 0) {
  console.error(`[start-prod] prisma db push failed with code ${push.status}`);
  process.exit(push.status ?? 1);
}

console.log(`[start-prod] Starting Next.js on http://${hostname}:${port}`);
const next = spawnSync(
  "npx",
  ["next", "start", "--hostname", hostname, "--port", port],
  {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      PORT: port,
      HOSTNAME: hostname,
    },
  },
);
process.exit(next.status ?? 1);
