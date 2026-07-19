/**
 * Guardrail: join / login / admin must share the same login-ID rules.
 * Run: npm run test:auth
 */
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  loginIdSchema,
  normalizeLoginId,
  passwordSchema,
} from "../src/lib/login-id";

async function main() {
  assert.equal(normalizeLoginId("  Admin  "), "admin");
  assert.equal(
    loginIdSchema.parse("s94002207@gmail.com"),
    "s94002207@gmail.com",
  );
  assert.equal(loginIdSchema.parse("RbAuto"), "rbauto");
  assert.equal(passwordSchema.parse("abc123"), "abc123");

  assert.throws(() => loginIdSchema.parse("a"), /at least 2/);
  assert.throws(() => loginIdSchema.parse("bad id"), /may only contain/);
  assert.throws(() => passwordSchema.parse("12345"), /at least 6/);
  assert.throws(() => passwordSchema.parse("abcdef"), /number/);
  assert.throws(() => passwordSchema.parse("123456"), /letter/);


  const prisma = new PrismaClient();
  try {
    const sample = await prisma.user.findFirst({
      where: { NOT: { email: "admin" } },
      select: { name: true, email: true },
    });
    if (sample) {
      const byEmail = await prisma.user.findUnique({
        where: { email: normalizeLoginId(sample.email) },
      });
      assert.ok(byEmail, "login ID column lookup must work");

      const byName = await prisma.$queryRaw<Array<{ email: string }>>`
        SELECT email FROM User WHERE lower(name) = ${normalizeLoginId(sample.name)} LIMIT 2
      `;
      assert.equal(
        byName.length,
        1,
        "unique display-name fallback must resolve",
      );
      assert.equal(byName[0]!.email, sample.email);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("verify-login-id: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
