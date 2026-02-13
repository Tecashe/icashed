import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { searchRoutesSchema } from "@/lib/validations"

// GET /api/routes - List routes with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = searchRoutesSchema.safeParse({
      query: searchParams.get("query") || undefined,
      county: searchParams.get("county") || undefined,
      active: searchParams.get("active") === "true" ? true : undefined,
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 20,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { query, county, active, page, limit } = parsed.data
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
        { origin: { contains: query, mode: "insensitive" } },
        { destination: { contains: query, mode: "insensitive" } },
      ]
    }

    if (county) where.county = county
    if (active !== undefined) where.isActive = active

    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where,
        include: {
          stages: { orderBy: { order: "asc" } },
          routePath: { orderBy: { order: "asc" }, select: { latitude: true, longitude: true, order: true } },
          _count: { select: { vehicles: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.route.count({ where }),
    ])

    return NextResponse.json({
      routes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching routes:", error)
    return NextResponse.json(
      { error: "Failed to fetch routes" },
      { status: 500 }
    )
  }
}
