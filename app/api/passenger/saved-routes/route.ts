import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/passenger/saved-routes - Get saved routes for current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const savedRoutes = await prisma.savedRoute.findMany({
      where: { userId: user.id },
      include: {
        route: {
          include: {
            stages: { orderBy: { order: "asc" } },
            _count: { select: { vehicles: true } },
          },
        },
      },
    })

    return NextResponse.json({ savedRoutes })
  } catch (error) {
    console.error("Error fetching saved routes:", error)
    return NextResponse.json({ error: "Failed to fetch saved routes" }, { status: 500 })
  }
}

// POST /api/passenger/saved-routes - Save a route
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { routeId } = await request.json()

    if (!routeId) {
      return NextResponse.json({ error: "routeId is required" }, { status: 400 })
    }

    // Check if already saved
    const existing = await prisma.savedRoute.findUnique({
      where: { userId_routeId: { userId: user.id, routeId } },
    })

    if (existing) {
      // Unsave
      await prisma.savedRoute.delete({ where: { id: existing.id } })
      return NextResponse.json({ saved: false })
    }

    // Save
    await prisma.savedRoute.create({
      data: { userId: user.id, routeId },
    })

    return NextResponse.json({ saved: true }, { status: 201 })
  } catch (error) {
    console.error("Error saving route:", error)
    return NextResponse.json({ error: "Failed to save route" }, { status: 500 })
  }
}
