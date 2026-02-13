/**
 * M-Pesa Daraja API Integration
 * Handles STK Push (Lipa Na M-Pesa Online) for premium subscriptions
 */

const DARAJA_BASE_URL =
    process.env.MPESA_ENV === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke"

// ─── Auth ────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
    const credentials = Buffer.from(
        `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64")

    const res = await fetch(
        `${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
        {
            method: "GET",
            headers: { Authorization: `Basic ${credentials}` },
        }
    )

    if (!res.ok) {
        throw new Error(`Failed to get M-Pesa access token: ${res.status}`)
    }

    const data = await res.json()
    return data.access_token
}

// ─── STK Push ────────────────────────────────────────────────

function generateTimestamp(): string {
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function generatePassword(timestamp: string): string {
    const shortcode = process.env.MPESA_SHORTCODE || ""
    const passkey = process.env.MPESA_PASSKEY || ""
    return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64")
}

export interface STKPushResult {
    MerchantRequestID: string
    CheckoutRequestID: string
    ResponseCode: string
    ResponseDescription: string
    CustomerMessage: string
}

export async function initiateSTKPush(
    phone: string,
    amount: number,
    accountReference: string,
    transactionDesc: string = "Radaa Premium"
): Promise<STKPushResult> {
    const token = await getAccessToken()
    const timestamp = generateTimestamp()
    const password = generatePassword(timestamp)

    const payload = {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.ceil(amount),
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
    }

    const res = await fetch(
        `${DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        }
    )

    if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`STK Push failed: ${res.status} — ${errBody}`)
    }

    return res.json()
}

// ─── Phone formatting ────────────────────────────────────────

export function formatKenyanPhone(phone: string): string {
    // Remove spaces, hyphens, parentheses
    let cleaned = phone.replace(/[\s\-()]+/g, "")

    // Handle various formats:
    // 0712345678 → 254712345678
    // +254712345678 → 254712345678
    // 254712345678 → 254712345678
    // 712345678 → 254712345678
    if (cleaned.startsWith("+")) {
        cleaned = cleaned.slice(1)
    }
    if (cleaned.startsWith("0")) {
        cleaned = `254${cleaned.slice(1)}`
    }
    if (cleaned.length === 9 && /^[17]/.test(cleaned)) {
        cleaned = `254${cleaned}`
    }

    // Validate: should be 12 digits starting with 254
    if (!/^254[17]\d{8}$/.test(cleaned)) {
        throw new Error("Invalid Kenyan phone number")
    }

    return cleaned
}

// ─── Plan pricing ────────────────────────────────────────────

export const PREMIUM_PLANS = {
    WEEKLY: { label: "Weekly", price: 200, days: 7 },
    MONTHLY: { label: "Monthly", price: 500, days: 30 },
    QUARTERLY: { label: "Quarterly", price: 1200, days: 90 },
} as const

export type PlanKey = keyof typeof PREMIUM_PLANS

export function getExpiryDate(plan: PlanKey): Date {
    const days = PREMIUM_PLANS[plan].days
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}
