"use client"

import { useState, useCallback, useEffect } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import {
    Crown,
    Check,
    Zap,
    TrendingUp,
    Eye,
    BarChart3,
    Loader2,
    Smartphone,
    ChevronRight,
    Shield,
    Star,
    Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Plan data ───────────────────────────────────────────────

const PLANS = [
    {
        key: "WEEKLY",
        label: "Weekly",
        price: 200,
        period: "week",
        popular: false,
        savings: null,
    },
    {
        key: "MONTHLY",
        label: "Monthly",
        price: 500,
        period: "month",
        popular: true,
        savings: "Save 38%",
    },
    {
        key: "QUARTERLY",
        label: "Quarterly",
        price: 1200,
        period: "3 months",
        popular: false,
        savings: "Save 54%",
    },
] as const

const BENEFITS = [
    {
        icon: Eye,
        title: "Priority Visibility",
        desc: "Your vehicle appears first in search results and on the map",
    },
    {
        icon: Crown,
        title: "Gold Premium Badge",
        desc: "Stand out with a premium badge visible to all passengers",
    },
    {
        icon: TrendingUp,
        title: "Featured on Map",
        desc: "Highlighted marker with glow effect on the live map",
    },
    {
        icon: BarChart3,
        title: "Ride Analytics",
        desc: "Track your performance with detailed insights",
    },
    {
        icon: Star,
        title: "Review Boost",
        desc: "Premium vehicles appear higher in reviews and ratings",
    },
    {
        icon: Shield,
        title: "Verified Status",
        desc: "Build trust with passengers through verified status",
    },
]

// ─── Types ───────────────────────────────────────────────────

interface VehicleStatus {
    id: string
    plateNumber: string
    nickname: string | null
    isPremium: boolean
    plan: string | null
    expiresAt: string | null
}

interface PremiumStatusData {
    vehicles: VehicleStatus[]
}

// ─── Component ───────────────────────────────────────────────

export default function PremiumPage() {
    const { user } = useAuth()
    const [selectedPlan, setSelectedPlan] = useState<string>("MONTHLY")
    const [selectedVehicle, setSelectedVehicle] = useState<string>("")
    const [phone, setPhone] = useState(user?.phone || "")
    const [paying, setPaying] = useState(false)
    const [paymentStatus, setPaymentStatus] = useState<"idle" | "waiting" | "success" | "failed">("idle")

    const { data, mutate } = useSWR<PremiumStatusData>("/api/premium/status", fetcher)
    const vehicles = data?.vehicles || []

    // Auto-select first non-premium vehicle
    useEffect(() => {
        if (vehicles.length > 0 && !selectedVehicle) {
            const nonPremium = vehicles.find((v) => !v.isPremium)
            setSelectedVehicle(nonPremium?.id || vehicles[0].id)
        }
    }, [vehicles, selectedVehicle])

    const selectedVehicleData = vehicles.find((v) => v.id === selectedVehicle)
    const activePlan = PLANS.find((p) => p.key === selectedPlan)

    const handleSubscribe = useCallback(async () => {
        if (!selectedVehicle || !phone || !selectedPlan) {
            toast.error("Please fill in all fields")
            return
        }

        setPaying(true)
        setPaymentStatus("waiting")

        try {
            const res = await fetch("/api/premium/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vehicleId: selectedVehicle,
                    phone,
                    plan: selectedPlan,
                }),
            })

            const result = await res.json()

            if (!res.ok) {
                toast.error(result.error || "Payment failed")
                setPaymentStatus("failed")
                return
            }

            toast.success("📱 Check your phone!", {
                description: result.message || "Enter your M-Pesa PIN to complete",
            })

            // Poll for payment completion
            const checkoutId = result.payment.checkoutRequestId
            let attempts = 0
            const maxAttempts = 30

            const pollInterval = setInterval(async () => {
                attempts++
                try {
                    const statusRes = await fetch(`/api/premium/status?vehicleId=${selectedVehicle}`)
                    const statusData = await statusRes.json()

                    if (statusData.isPremium) {
                        clearInterval(pollInterval)
                        setPaymentStatus("success")
                        toast.success("🎉 Premium Activated!", {
                            description: "Your vehicle is now premium",
                        })
                        mutate()
                    } else if (statusData.pendingPayment?.status === "FAILED" || statusData.pendingPayment?.status === "CANCELLED") {
                        clearInterval(pollInterval)
                        setPaymentStatus("failed")
                        toast.error("Payment was not completed")
                    }
                } catch {
                    // Continue polling
                }

                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval)
                    setPaymentStatus("idle")
                    toast.info("Payment status unclear — check your M-Pesa messages")
                    mutate()
                }
            }, 5000)
        } catch {
            toast.error("Network error — please try again")
            setPaymentStatus("failed")
        } finally {
            setPaying(false)
        }
    }, [selectedVehicle, phone, selectedPlan, mutate])

    // Expiry countdown for premium vehicles
    const getExpiryText = (expiresAt: string | null) => {
        if (!expiresAt) return null
        const diff = new Date(expiresAt).getTime() - Date.now()
        if (diff <= 0) return "Expired"
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        if (days > 1) return `${days} days left`
        const hours = Math.floor(diff / (1000 * 60 * 60))
        return `${hours}h left`
    }

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            {/* ─── Hero Section ─────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/5 border border-amber-500/20 p-8 text-center">
                {/* Decorative elements */}
                <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl" />

                <div className="relative">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
                        <Crown className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="font-display text-3xl font-bold text-foreground">
                        Go Premium
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Get more passengers, more visibility, and more earnings
                    </p>
                </div>
            </div>

            {/* ─── Active Premium Vehicles ───────────────────────────── */}
            {vehicles.some((v) => v.isPremium) && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Your Premium Vehicles
                    </h2>
                    {vehicles
                        .filter((v) => v.isPremium)
                        .map((v) => (
                            <Card key={v.id} className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500">
                                        <Crown className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-foreground">{v.plateNumber}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {v.plan} plan · {getExpiryText(v.expiresAt)}
                                        </p>
                                    </div>
                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                                        Active
                                    </Badge>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            )}

            {/* ─── Benefits Grid ─────────────────────────────────────── */}
            <div className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Premium Benefits
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {BENEFITS.map((b) => (
                        <div
                            key={b.title}
                            className="group flex flex-col items-center rounded-2xl border border-border bg-card p-4 text-center transition-all hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5"
                        >
                            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition-colors group-hover:bg-amber-500/20">
                                <b.icon className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-medium text-foreground">{b.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── Pricing Cards ─────────────────────────────────────── */}
            <div className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Choose Your Plan
                </h2>
                <div className="grid grid-cols-3 gap-3">
                    {PLANS.map((plan) => (
                        <button
                            key={plan.key}
                            onClick={() => setSelectedPlan(plan.key)}
                            className={cn(
                                "relative flex flex-col items-center rounded-2xl border-2 p-5 transition-all",
                                selectedPlan === plan.key
                                    ? "border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10"
                                    : "border-border bg-card hover:border-amber-500/30"
                            )}
                        >
                            {plan.popular && (
                                <Badge className="absolute -top-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-2 py-0.5 border-0">
                                    Most Popular
                                </Badge>
                            )}
                            {plan.savings && (
                                <span className="mb-2 text-[10px] font-semibold text-green-500">
                                    {plan.savings}
                                </span>
                            )}
                            <p className="text-sm font-medium text-muted-foreground">{plan.label}</p>
                            <p className="mt-1 text-2xl font-bold text-foreground">
                                <span className="text-sm font-normal text-muted-foreground">KES </span>
                                {plan.price}
                            </p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">per {plan.period}</p>

                            {selectedPlan === plan.key && (
                                <div className="mt-3 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500">
                                    <Check className="h-3.5 w-3.5 text-white" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Payment Form ────────────────────────────────────── */}
            <Card className="border-border">
                <CardContent className="space-y-5 p-6">
                    <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                        <Smartphone className="h-5 w-5 text-primary" />
                        Complete Payment
                    </h2>

                    {/* Vehicle selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Vehicle</label>
                        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select vehicle..." />
                            </SelectTrigger>
                            <SelectContent>
                                {vehicles.map((v) => (
                                    <SelectItem key={v.id} value={v.id} disabled={v.isPremium}>
                                        {v.plateNumber}
                                        {v.nickname ? ` — ${v.nickname}` : ""}
                                        {v.isPremium ? " ✓ Premium" : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Phone input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            M-Pesa Phone Number
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="tel"
                                placeholder="0712 345 678"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            You'll receive an STK Push prompt on this number
                        </p>
                    </div>

                    {/* Summary */}
                    {activePlan && (
                        <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    {activePlan.label} Premium
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {selectedVehicleData?.plateNumber || "Select vehicle"}
                                </p>
                            </div>
                            <p className="text-xl font-bold text-foreground">
                                KES {activePlan.price}
                            </p>
                        </div>
                    )}

                    {/* Pay button */}
                    {paymentStatus === "waiting" ? (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <div className="relative">
                                <div className="h-16 w-16 rounded-full border-4 border-amber-500/30" />
                                <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-amber-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground">
                                Waiting for M-Pesa confirmation...
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Check your phone and enter your PIN
                            </p>
                        </div>
                    ) : paymentStatus === "success" ? (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                                <Check className="h-8 w-8 text-green-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground">
                                🎉 Premium Activated!
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Your vehicle is now premium
                            </p>
                        </div>
                    ) : (
                        <Button
                            className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 h-12 text-base"
                            onClick={handleSubscribe}
                            disabled={paying || !selectedVehicle || !phone || selectedVehicleData?.isPremium}
                        >
                            {paying ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <Zap className="h-5 w-5" />
                                    Pay KES {activePlan?.price || 0} via M-Pesa
                                    <ChevronRight className="h-4 w-4 ml-auto" />
                                </>
                            )}
                        </Button>
                    )}

                    {paymentStatus === "failed" && (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setPaymentStatus("idle")}
                        >
                            Try Again
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* ─── Trust banner ────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pb-8">
                <Shield className="h-3.5 w-3.5" />
                <span>Secured by Safaricom M-Pesa · Instant activation</span>
            </div>
        </div>
    )
}
