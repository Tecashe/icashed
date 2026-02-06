import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { z } from "zod"

const createRouteSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional(),
  origin: z.string().min(2),
  destination: z.string().min(2),
  county: z.string().min(2),
  color: z.string().default("#10B981"),
  stages: z.array(
    z.object({
      name: z.string().min(1),
      latitude: z.number(),
      longitude: z.number(),
      order: z.number().int().min(0),
      isTerminal: z.boolean().default(false),
    })
  ).min(2, "A route must have at least 2 stages"),
})

// POST /api/admin/routes - Create a new route (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createRouteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { stages, ...routeData } = parsed.data

    // Check unique code
    const existing = await prisma.route.findUnique({
      where: { code: routeData.code },
    })
    if (existing) {
      return NextResponse.json(
        { error: "A route with this code already exists" },
        { status: 409 }
      )
    }

    const route = await prisma.route.create({
      data: {
        ...routeData,
        stages: { create: stages },
      },
      include: { stages: { orderBy: { order: "asc" } } },
    })

    return NextResponse.json({ route }, { status: 201 })
  } catch (error) {
    console.error("Error creating route:", error)
    return NextResponse.json({ error: "Failed to create route" }, { status: 500 })
  }
}
