import { spawnSync } from "node:child_process";

const port = String(process.env.PORT || "8080");
const hostname = "0.0.0.0";

console.log(`[start-prod] Preparing database…`);
const push = spawnSync("npx", ["prisma", "db", "push"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});
if (push.status !== 0) {
  console.error(`[start-prod] prisma db push failed with code ${push.status}`);
  process.exit(push.status ?? 1);
}

console.log(`[start-prod] Starting Next.js on ${hostname}:${port}`);
const next = spawnSync(
  "npx",
  ["next", "start", "--hostname", hostname, "--port", port],
  {
    stdio: "inherit",
    shell: true,
    env: process.env,
  },
);
process.exit(next.status ?? 1);
