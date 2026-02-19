import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { z } from "zod"

const updateUserSchema = z.object({
    role: z.enum(["COMMUTER", "OPERATOR", "SACCO_ADMIN", "ADMIN"]).optional(),
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
})

// PATCH /api/admin/users/[id] — Update user role or details
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || currentUser.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const parsed = updateUserSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            )
        }

        // Prevent admin from demoting themselves
        if (id === currentUser.id && parsed.data.role && parsed.data.role !== "ADMIN") {
            return NextResponse.json(
                { error: "You cannot change your own role" },
                { status: 400 }
            )
        }

        const user = await prisma.user.update({
            where: { id },
            data: parsed.data,
            select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
        })

        return NextResponse.json({ user })
    } catch (error) {
        console.error("Error updating user:", error)
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
    }
}

// DELETE /api/admin/users/[id] — Delete a user
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || currentUser.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        // Prevent admin from deleting themselves
        if (id === currentUser.id) {
            return NextResponse.json(
                { error: "You cannot delete your own account" },
                { status: 400 }
            )
        }

        await prisma.user.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting user:", error)
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
    }
}
