import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getExpiryDate } from "@/lib/mpesa"
import type { PremiumPlan } from "@prisma/client"

// POST /api/premium/callback — M-Pesa Daraja callback
// This is called by Safaricom's servers after customer completes (or cancels) payment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Daraja callback structure
        const callback = body?.Body?.stkCallback
        if (!callback) {
            return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
        }

        const {
            MerchantRequestID,
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
        } = callback

        // Find the pending payment
        const payment = await prisma.premiumPayment.findUnique({
            where: { checkoutRequestId: CheckoutRequestID },
        })

        if (!payment) {
            console.error(`Callback: Payment not found for ${CheckoutRequestID}`)
            return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
        }

        if (ResultCode === 0) {
            // Payment successful
            // Extract M-Pesa receipt number from callback metadata
            const metadata = callback.CallbackMetadata?.Item || []
            const receiptNo = metadata.find(
                (item: { Name: string; Value?: string }) => item.Name === "MpesaReceiptNumber"
            )?.Value as string | undefined

            const expiresAt = getExpiryDate(payment.plan as PremiumPlan)

            // Update payment and vehicle in a transaction
            await prisma.$transaction([
                prisma.premiumPayment.update({
                    where: { id: payment.id },
                    data: {
                        status: "COMPLETED",
                        mpesaReceiptNo: receiptNo || null,
                        expiresAt,
                    },
                }),
                prisma.vehicle.update({
                    where: { id: payment.vehicleId },
                    data: { isPremium: true },
                }),
            ])

            console.log(
                `Premium activated: Vehicle ${payment.vehicleId}, Receipt ${receiptNo}, Expires ${expiresAt.toISOString()}`
            )
        } else {
            // Payment failed or cancelled
            await prisma.premiumPayment.update({
                where: { id: payment.id },
                data: {
                    status: ResultCode === 1032 ? "CANCELLED" : "FAILED",
                },
            })

            console.log(
                `Premium payment failed: ${CheckoutRequestID}, Code ${ResultCode}, ${ResultDesc}`
            )
        }

        // Safaricom expects this response format
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
    } catch (error) {
        console.error("M-Pesa callback error:", error)
        // Still return success to Safaricom to prevent retries
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
    }
}
