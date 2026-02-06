import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { positionUpdateSchema } from "@/lib/validations"

// GET /api/vehicles/positions - Get latest positions for all active vehicles
export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { isActive: true },
      include: {
        positions: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        routes: {
          include: { route: { select: { id: true, name: true, color: true } } },
        },
      },
    })

    const positions = vehicles
      .filter((v: any) => v.positions.length > 0)
      .map((v: any) => ({
        vehicleId: v.id,
        plateNumber: v.plateNumber,
        nickname: v.nickname,
        type: v.type,
        isPremium: v.isPremium,
        position: v.positions[0],
        routes: v.routes.map((vr: any) => vr.route),
      }))

    return NextResponse.json({ positions })
  } catch (error) {
    console.error("Error fetching positions:", error)
    return NextResponse.json(
      { error: "Failed to fetch positions" },
      { status: 500 }
    )
  }
}

// POST /api/vehicles/positions - Update vehicle position(for operators/drivers)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = positionUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid position data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { vehicleId, latitude, longitude, speed, heading } = parsed.data

    const position = await prisma.vehiclePosition.create({
      data: {
        vehicleId,
        latitude,
        longitude,
        speed,
        heading,
      },
    })

    return NextResponse.json({ position }, { status: 201 })
  } catch (error) {
    console.error("Error updating position:", error)
    return NextResponse.json(
      { error: "Failed to update position" },
      { status: 500 }
    )
  }
}
