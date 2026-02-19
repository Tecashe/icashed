import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { z } from "zod"

const updateRouteSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    origin: z.string().min(2).optional(),
    destination: z.string().min(2).optional(),
    county: z.string().min(2).optional(),
    color: z.string().optional(),
    isActive: z.boolean().optional(),
})

// PATCH /api/admin/routes/[id] — Update route details or toggle active
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const parsed = updateRouteSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            )
        }

        const route = await prisma.route.update({
            where: { id },
            data: parsed.data,
            include: { stages: { orderBy: { order: "asc" } }, _count: { select: { vehicles: true } } },
        })

        return NextResponse.json({ route })
    } catch (error) {
        console.error("Error updating route:", error)
        return NextResponse.json({ error: "Failed to update route" }, { status: 500 })
    }
}

// DELETE /api/admin/routes/[id] — Delete a route (cascades stages)
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        await prisma.route.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting route:", error)
        return NextResponse.json({ error: "Failed to delete route" }, { status: 500 })
    }
}
