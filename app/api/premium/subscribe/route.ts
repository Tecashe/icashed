import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import {
    initiateSTKPush,
    formatKenyanPhone,
    PREMIUM_PLANS,
    type PlanKey,
} from "@/lib/mpesa"

// POST /api/premium/subscribe — Initiate M-Pesa STK Push for premium
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { vehicleId, phone, plan } = body as {
            vehicleId: string
            phone: string
            plan: PlanKey
        }

        if (!vehicleId || !phone || !plan) {
            return NextResponse.json(
                { error: "vehicleId, phone, and plan are required" },
                { status: 400 }
            )
        }

        // Validate plan
        if (!PREMIUM_PLANS[plan]) {
            return NextResponse.json(
                { error: "Invalid plan. Use WEEKLY, MONTHLY, or QUARTERLY" },
                { status: 400 }
            )
        }

        // Verify vehicle ownership
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
            select: { id: true, ownerId: true, plateNumber: true, isPremium: true },
        })

        if (!vehicle || vehicle.ownerId !== user.id) {
            return NextResponse.json(
                { error: "Vehicle not found or not owned by you" },
                { status: 404 }
            )
        }

        // Format phone
        let formattedPhone: string
        try {
            formattedPhone = formatKenyanPhone(phone)
        } catch {
            return NextResponse.json(
                { error: "Invalid phone number. Use format 07XXXXXXXX" },
                { status: 400 }
            )
        }

        const planDetails = PREMIUM_PLANS[plan]

        // Initiate STK Push
        const stkResult = await initiateSTKPush(
            formattedPhone,
            planDetails.price,
            `RADAA-${vehicle.plateNumber}`,
            `Radaa Premium ${planDetails.label} — ${vehicle.plateNumber}`
        )

        if (stkResult.ResponseCode !== "0") {
            return NextResponse.json(
                { error: stkResult.ResponseDescription || "STK Push failed" },
                { status: 400 }
            )
        }

        // Create pending payment record
        const payment = await prisma.premiumPayment.create({
            data: {
                userId: user.id,
                vehicleId,
                amount: planDetails.price,
                phone: formattedPhone,
                merchantRequestId: stkResult.MerchantRequestID,
                checkoutRequestId: stkResult.CheckoutRequestID,
                plan,
                status: "PENDING",
            },
        })

        return NextResponse.json({
            payment: {
                id: payment.id,
                checkoutRequestId: payment.checkoutRequestId,
                amount: planDetails.price,
                plan: planDetails.label,
            },
            message: stkResult.CustomerMessage || "Check your phone for M-Pesa prompt",
        }, { status: 201 })
    } catch (error) {
        console.error("Premium subscribe error:", error)
        return NextResponse.json(
            { error: "Failed to initiate payment" },
            { status: 500 }
        )
    }
}
