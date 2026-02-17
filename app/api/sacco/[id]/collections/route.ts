import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/sacco/[id]/collections
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const { searchParams } = new URL(request.url)
        const vehicleId = searchParams.get("vehicleId") || ""
        const from = searchParams.get("from") || ""
        const to = searchParams.get("to") || ""
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "20")
        const skip = (page - 1) * limit

        const where: Record<string, unknown> = { saccoId: id }
        if (vehicleId) where.vehicleId = vehicleId
        if (from || to) {
            where.date = {}
            if (from) (where.date as Record<string, unknown>).gte = new Date(from)
            if (to) (where.date as Record<string, unknown>).lte = new Date(to)
        }

        const [collections, total, aggregate] = await Promise.all([
            prisma.saccoCollection.findMany({
                where,
                include: {
                    vehicle: { select: { id: true, plateNumber: true, nickname: true } },
                },
                orderBy: { date: "desc" },
                skip,
                take: limit,
            }),
            prisma.saccoCollection.count({ where }),
            prisma.saccoCollection.aggregate({
                where,
                _sum: { amount: true },
            }),
        ])

        return NextResponse.json({
            collections,
            totalAmount: aggregate._sum.amount || 0,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        })
    } catch (error) {
        console.error("Error fetching collections:", error)
        return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 })
    }
}

// POST /api/sacco/[id]/collections - Record a new collection
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
        const { vehicleId, amount, date, description } = body

        if (!vehicleId || !amount) {
            return NextResponse.json(
                { error: "vehicleId and amount are required" },
                { status: 400 }
            )
        }

        // Verify vehicle belongs to this SACCO
        const vehicle = await prisma.vehicle.findFirst({
            where: { id: vehicleId, saccoId: id },
        })
        if (!vehicle) {
            return NextResponse.json(
                { error: "Vehicle not found in this SACCO" },
                { status: 404 }
            )
        }

        const collection = await prisma.saccoCollection.create({
            data: {
                saccoId: id,
                vehicleId,
                amount: parseFloat(amount),
                date: date ? new Date(date) : new Date(),
                description,
                recordedBy: user.id,
            },
            include: {
                vehicle: { select: { id: true, plateNumber: true, nickname: true } },
            },
        })

        return NextResponse.json(collection, { status: 201 })
    } catch (error) {
        console.error("Error recording collection:", error)
        return NextResponse.json({ error: "Failed to record collection" }, { status: 500 })
    }
}
