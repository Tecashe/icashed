import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { positionUpdateSchema } from "@/lib/validations"

// POST /api/driver/position - Update vehicle position (authenticated driver)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = positionUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid position data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { vehicleId, latitude, longitude, speed, heading } = parsed.data

    // Verify the vehicle belongs to this driver
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, ownerId: user.id },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found or not owned by you" },
        { status: 403 }
      )
    }

    const position = await prisma.vehiclePosition.create({
      data: { vehicleId, latitude, longitude, speed, heading },
    })

    return NextResponse.json({ position }, { status: 201 })
  } catch (error) {
    console.error("Error updating position:", error)
    return NextResponse.json({ error: "Failed to update position" }, { status: 500 })
  }
}
