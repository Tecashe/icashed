import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/admin/routes/[id]/path — Fetch route path coordinates
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const pathPoints = await prisma.routePath.findMany({
            where: { routeId: id },
            orderBy: { order: "asc" },
            select: { id: true, latitude: true, longitude: true, order: true },
        })

        return NextResponse.json({ routeId: id, path: pathPoints })
    } catch (error) {
        console.error("Get route path error:", error)
        return NextResponse.json(
            { error: "Failed to fetch route path" },
            { status: 500 }
        )
    }
}

// POST /api/admin/routes/[id]/path — Save route path coordinates
// Body: { points: Array<{ lat: number, lng: number }> }
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Admin only" }, { status: 403 })
        }

        const { id } = await params
        const body = await request.json()
        const { points } = body as { points: Array<{ lat: number; lng: number }> }

        if (!points || !Array.isArray(points) || points.length < 2) {
            return NextResponse.json(
                { error: "At least 2 points are required" },
                { status: 400 }
            )
        }

        // Verify route exists
        const route = await prisma.route.findUnique({ where: { id } })
        if (!route) {
            return NextResponse.json({ error: "Route not found" }, { status: 404 })
        }

        // Replace existing path: delete old, insert new
        await prisma.$transaction([
            prisma.routePath.deleteMany({ where: { routeId: id } }),
            prisma.routePath.createMany({
                data: points.map((p, index) => ({
                    routeId: id,
                    latitude: p.lat,
                    longitude: p.lng,
                    order: index,
                })),
            }),
        ])

        return NextResponse.json({
            routeId: id,
            pointCount: points.length,
            message: "Route path saved",
        }, { status: 201 })
    } catch (error) {
        console.error("Save route path error:", error)
        return NextResponse.json(
            { error: "Failed to save route path" },
            { status: 500 }
        )
    }
}

// DELETE /api/admin/routes/[id]/path — Clear route path
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Admin only" }, { status: 403 })
        }

        const { id } = await params
        await prisma.routePath.deleteMany({ where: { routeId: id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Delete route path error:", error)
        return NextResponse.json(
            { error: "Failed to delete route path" },
            { status: 500 }
        )
    }
}
