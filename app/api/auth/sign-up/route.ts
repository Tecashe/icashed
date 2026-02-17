import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { signUpSchema } from "@/lib/validations"
import { hashPassword, createSession } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = signUpSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password, name, role } = parsed.data

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    // Create user
    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: role as "COMMUTER" | "OPERATOR" | "ADMIN" | "SACCO_ADMIN",
      },
    })

    // If SACCO_ADMIN, auto-create a starter SACCO and membership
    if (role === "SACCO_ADMIN") {
      const code = name.replace(/\s+/g, "").substring(0, 6).toUpperCase()
      const sacco = await prisma.sacco.create({
        data: {
          name: `${name}'s SACCO`,
          code: `${code}-${Date.now().toString(36).toUpperCase()}`,
          county: "—",
          town: "—",
          chairman: name,
        },
      })

      await prisma.saccoMembership.create({
        data: {
          userId: user.id,
          saccoId: sacco.id,
          role: "CHAIRMAN",
        },
      })
    }

    // Create session
    await createSession(user.id)

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error signing up:", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
