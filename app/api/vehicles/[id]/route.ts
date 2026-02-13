import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        images: { orderBy: { isPrimary: "desc" } },
        routes: { include: { route: { include: { stages: { orderBy: { order: "asc" } } } } } },
        positions: { orderBy: { timestamp: "desc" }, take: 50 },
        owner: { select: { id: true, name: true } },
      },
    })

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    return NextResponse.json({ vehicle })
  } catch (error) {
    console.error("Error fetching vehicle:", error)
    return NextResponse.json({ error: "Failed to fetch vehicle" }, { status: 500 })
  }
}

// PATCH /api/vehicles/[id] — Update vehicle details or toggle live status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const existing = await prisma.vehicle.findUnique({
      where: { id },
      select: { ownerId: true },
    })

    if (!existing || existing.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Vehicle not found or not owned by you" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { nickname, type, capacity, isActive, routeIds } = body

    // Single-live enforcement: when activating a vehicle, deactivate all others
    if (isActive === true) {
      await prisma.vehicle.updateMany({
        where: { ownerId: user.id, id: { not: id } },
        data: { isActive: false },
      })
    }

    // Build update data — only include fields that are provided
    const updateData: Record<string, unknown> = {}
    if (nickname !== undefined) updateData.nickname = nickname || null
    if (type !== undefined) updateData.type = type
    if (capacity !== undefined) updateData.capacity = capacity
    if (isActive !== undefined) updateData.isActive = isActive

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        routes: { include: { route: true } },
      },
    })

    // Update route assignments if provided
    if (routeIds && Array.isArray(routeIds)) {
      // Remove existing route assignments
      await prisma.vehicleRoute.deleteMany({ where: { vehicleId: id } })
      // Create new ones
      if (routeIds.length > 0) {
        await prisma.vehicleRoute.createMany({
          data: routeIds.map((routeId: string) => ({ vehicleId: id, routeId })),
        })
      }
    }

    return NextResponse.json({ vehicle })
  } catch (error) {
    console.error("Error updating vehicle:", error)
    return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 })
  }
}

// DELETE /api/vehicles/[id] — Delete a vehicle
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const existing = await prisma.vehicle.findUnique({
      where: { id },
      select: { ownerId: true, plateNumber: true },
    })

    if (!existing || existing.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Vehicle not found or not owned by you" },
        { status: 404 }
      )
    }

    // Delete cascade: positions, images, routes, reviews all cascade from schema
    await prisma.vehicle.delete({ where: { id } })

    return NextResponse.json({ success: true, plateNumber: existing.plateNumber })
  } catch (error) {
    console.error("Error deleting vehicle:", error)
    return NextResponse.json({ error: "Failed to delete vehicle" }, { status: 500 })
  }
}
