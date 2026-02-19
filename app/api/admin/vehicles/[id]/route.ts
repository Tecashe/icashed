import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { z } from "zod"

const updateVehicleSchema = z.object({
    isActive: z.boolean().optional(),
    capacity: z.number().int().min(1).optional(),
    type: z.enum(["MATATU", "BUS", "BODA", "TUK_TUK"]).optional(),
    nickname: z.string().optional(),
})

// PATCH /api/admin/vehicles/[id] — Toggle active, update details
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
        const parsed = updateVehicleSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            )
        }

        const vehicle = await prisma.vehicle.update({
            where: { id },
            data: parsed.data,
            include: {
                routes: { include: { route: { select: { id: true, name: true, color: true } } } },
            },
        })

        return NextResponse.json({ vehicle })
    } catch (error) {
        console.error("Error updating vehicle:", error)
        return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 })
    }
}

// DELETE /api/admin/vehicles/[id] — Delete a vehicle
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
        await prisma.vehicle.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting vehicle:", error)
        return NextResponse.json({ error: "Failed to delete vehicle" }, { status: 500 })
    }
}
