import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/sacco/[id]/vehicles
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { searchParams } = new URL(request.url)
        const query = searchParams.get("query") || ""
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "20")
        const skip = (page - 1) * limit

        const where: Record<string, unknown> = { saccoId: id }
        if (query) {
            where.OR = [
                { plateNumber: { contains: query, mode: "insensitive" } },
                { nickname: { contains: query, mode: "insensitive" } },
            ]
        }

        const [vehicles, total] = await Promise.all([
            prisma.vehicle.findMany({
                where,
                include: {
                    owner: { select: { id: true, name: true, email: true, phone: true } },
                    routes: { include: { route: { select: { id: true, name: true, code: true } } } },
                    images: { where: { isPrimary: true }, take: 1 },
                    _count: { select: { positions: true, reviews: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.vehicle.count({ where }),
        ])

        return NextResponse.json({
            vehicles,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        })
    } catch (error) {
        console.error("Error fetching SACCO vehicles:", error)
        return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 })
    }
}

// POST /api/sacco/[id]/vehicles - Assign vehicle to SACCO
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user || (user.role !== "ADMIN" && user.role !== "SACCO_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { vehicleId } = body

        if (!vehicleId) {
            return NextResponse.json({ error: "vehicleId is required" }, { status: 400 })
        }

        const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
        if (!vehicle) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
        }

        if (vehicle.saccoId) {
            return NextResponse.json(
                { error: "Vehicle is already assigned to a SACCO" },
                { status: 409 }
            )
        }

        const updated = await prisma.vehicle.update({
            where: { id: vehicleId },
            data: { saccoId: id },
            include: {
                owner: { select: { id: true, name: true, email: true } },
            },
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Error assigning vehicle to SACCO:", error)
        return NextResponse.json({ error: "Failed to assign vehicle" }, { status: 500 })
    }
}
