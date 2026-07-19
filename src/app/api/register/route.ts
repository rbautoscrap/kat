import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loginIdSchema, passwordSchema } from "@/lib/login-id";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  // Accept legacy "email" field name from the form; value is the login ID.
  email: loginIdSchema,
  password: passwordSchema,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const loginId = data.email;

    const exists = await prisma.user.findUnique({ where: { email: loginId } });
    if (exists) {
      return NextResponse.json(
        { error: "This ID is already registered" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: loginId,
        passwordHash,
        role: "MEMBER",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      ok: true,
      loginId,
      status: "PENDING",
      message: "Account created. Waiting for administrator approval.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
