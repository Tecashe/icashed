import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { order: "asc" } },
        _count: { select: { vehicles: true, savedBy: true } },
        vehicles: {
          include: {
            vehicle: {
              include: {
                positions: { orderBy: { timestamp: "desc" }, take: 1 },
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
      },
    })

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 })
    }

    return NextResponse.json({ route })
  } catch (error) {
    console.error("Error fetching route:", error)
    return NextResponse.json({ error: "Failed to fetch route" }, { status: 500 })
  }
}
