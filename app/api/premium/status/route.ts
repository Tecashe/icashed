import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/premium/status — Check premium status for user's vehicles
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const vehicleId = searchParams.get("vehicleId")

        // If checking specific vehicle
        if (vehicleId) {
            const vehicle = await prisma.vehicle.findUnique({
                where: { id: vehicleId },
                select: {
                    id: true,
                    plateNumber: true,
                    isPremium: true,
                    ownerId: true,
                },
            })

            if (!vehicle || vehicle.ownerId !== user.id) {
                return NextResponse.json(
                    { error: "Vehicle not found" },
                    { status: 404 }
                )
            }

            // Get latest completed payment
            const latestPayment = await prisma.premiumPayment.findFirst({
                where: {
                    vehicleId,
                    status: "COMPLETED",
                },
                orderBy: { createdAt: "desc" },
                select: {
                    plan: true,
                    amount: true,
                    expiresAt: true,
                    mpesaReceiptNo: true,
                    createdAt: true,
                },
            })

            // Check if any pending payment
            const pendingPayment = await prisma.premiumPayment.findFirst({
                where: {
                    vehicleId,
                    status: "PENDING",
                    createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
                },
                select: {
                    id: true,
                    checkoutRequestId: true,
                    status: true,
                    createdAt: true,
                },
            })

            const isExpired = latestPayment?.expiresAt
                ? new Date() > latestPayment.expiresAt
                : true

            // If premium expired, deactivate
            if (vehicle.isPremium && isExpired && latestPayment) {
                await prisma.vehicle.update({
                    where: { id: vehicleId },
                    data: { isPremium: false },
                })
            }

            return NextResponse.json({
                vehicleId,
                plateNumber: vehicle.plateNumber,
                isPremium: vehicle.isPremium && !isExpired,
                subscription: latestPayment
                    ? {
                        plan: latestPayment.plan,
                        amount: latestPayment.amount,
                        expiresAt: latestPayment.expiresAt?.toISOString() || null,
                        receiptNo: latestPayment.mpesaReceiptNo,
                        activatedAt: latestPayment.createdAt.toISOString(),
                        isExpired,
                    }
                    : null,
                pendingPayment: pendingPayment
                    ? {
                        id: pendingPayment.id,
                        checkoutRequestId: pendingPayment.checkoutRequestId,
                        status: pendingPayment.status,
                    }
                    : null,
            })
        }

        // Otherwise return all user's vehicles with premium status
        const vehicles = await prisma.vehicle.findMany({
            where: { ownerId: user.id },
            select: {
                id: true,
                plateNumber: true,
                nickname: true,
                isPremium: true,
                premiumPayments: {
                    where: { status: "COMPLETED" },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: {
                        plan: true,
                        expiresAt: true,
                    },
                },
            },
        })

        return NextResponse.json({
            vehicles: vehicles.map((v) => {
                const sub = v.premiumPayments[0]
                const isExpired = sub?.expiresAt ? new Date() > sub.expiresAt : true
                return {
                    id: v.id,
                    plateNumber: v.plateNumber,
                    nickname: v.nickname,
                    isPremium: v.isPremium && !isExpired,
                    plan: sub?.plan || null,
                    expiresAt: sub?.expiresAt?.toISOString() || null,
                }
            }),
        })
    } catch (error) {
        console.error("Premium status error:", error)
        return NextResponse.json(
            { error: "Failed to get premium status" },
            { status: 500 }
        )
    }
}
