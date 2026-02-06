import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { searchVehiclesSchema } from "@/lib/validations"

// GET /api/vehicles - List vehicles with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = searchVehiclesSchema.safeParse({
      query: searchParams.get("query") || undefined,
      type: searchParams.get("type") || undefined,
      routeId: searchParams.get("routeId") || undefined,
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 20,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { query, type, routeId, page, limit } = parsed.data
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (query) {
      where.OR = [
        { plateNumber: { contains: query, mode: "insensitive" } },
        { nickname: { contains: query, mode: "insensitive" } },
      ]
    }

    if (type) where.type = type
    if (routeId) {
      where.routes = { some: { routeId } }
    }

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          routes: { include: { route: true } },
          positions: { orderBy: { timestamp: "desc" }, take: 1 },
        },
        orderBy: [{ isPremium: "desc" }, { rating: "desc" }],
        skip,
        take: limit,
      }),
      prisma.vehicle.count({ where }),
    ])

    return NextResponse.json({
      vehicles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching vehicles:", error)
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    )
  }
}
