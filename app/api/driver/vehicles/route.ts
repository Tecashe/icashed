import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { registerVehicleSchema } from "@/lib/validations"

// GET /api/driver/vehicles - Get vehicles owned by current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { ownerId: user.id },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        routes: { include: { route: true } },
        positions: { orderBy: { timestamp: "desc" }, take: 1 },
        _count: { select: { positions: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ vehicles })
  } catch (error) {
    console.error("Error fetching driver vehicles:", error)
    return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 })
  }
}

// POST /api/driver/vehicles - Register a new vehicle
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = registerVehicleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { plateNumber, nickname, type, capacity, routeIds } = parsed.data

    // Check if plate already registered
    const existing = await prisma.vehicle.findUnique({
      where: { plateNumber: plateNumber.toUpperCase().replace(/\s/g, " ") },
    })
    if (existing) {
      return NextResponse.json(
        { error: "A vehicle with this plate number is already registered" },
        { status: 409 }
      )
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        plateNumber: plateNumber.toUpperCase(),
        nickname,
        type,
        capacity,
        ownerId: user.id,
        routes: {
          create: routeIds.map((routeId) => ({ routeId })),
        },
      },
      include: {
        routes: { include: { route: true } },
      },
    })

    return NextResponse.json({ vehicle }, { status: 201 })
  } catch (error) {
    console.error("Error registering vehicle:", error)
    return NextResponse.json({ error: "Failed to register vehicle" }, { status: 500 })
  }
}
