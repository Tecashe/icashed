"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"

const ROLE_DASHBOARD: Record<string, string> = {
  COMMUTER: "/dashboard/passenger",
  OPERATOR: "/dashboard/driver",
  SACCO_ADMIN: "/dashboard/sacco",
  ADMIN: "/dashboard/admin",
}

interface AuthFormProps {
  mode: "sign-in" | "sign-up"
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const { signIn, signUp } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "COMMUTER",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      let user
      if (mode === "sign-in") {
        user = await signIn(form.email, form.password)
      } else {
        user = await signUp({
          email: form.email,
          password: form.password,
          name: form.name,
          role: form.role,
        })
      }
      toast.success(mode === "sign-in" ? "Welcome back!" : "Account created!", {
        description: `Signed in as ${user.email}`,
      })
      router.push(ROLE_DASHBOARD[user.role] || "/routes")
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong"
      setError(msg)
      toast.error(mode === "sign-in" ? "Sign in failed" : "Sign up failed", {
        description: msg,
      })
    } finally {
      setLoading(false)
    }
  }

  const isSignUp = mode === "sign-up"

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignUp
              ? "Start tracking your routes today"
              : "Sign in to continue to Radaa"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Kamau"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={
                  isSignUp
                    ? "Min 8 chars, 1 uppercase, 1 number"
                    : "Enter your password"
                }
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="role">I am a</Label>
              <Select
                value={form.role}
                onValueChange={(value) => setForm({ ...form, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMMUTER">
                    <span className="flex flex-col">
                      <span>Commuter / Passenger</span>
                      <span className="text-xs text-muted-foreground">
                        Find routes, track vehicles, share journeys
                      </span>
                    </span>
                  </SelectItem>
                  <SelectItem value="OPERATOR">
                    <span className="flex flex-col">
                      <span>Driver / Vehicle Operator</span>
                      <span className="text-xs text-muted-foreground">
                        Manage vehicles, broadcast position, track earnings
                      </span>
                    </span>
                  </SelectItem>
                  <SelectItem value="SACCO_ADMIN">
                    <span className="flex flex-col">
                      <span>SACCO Administrator</span>
                      <span className="text-xs text-muted-foreground">
                        Manage members, vehicles, routes & collections
                      </span>
                    </span>
                  </SelectItem>
                  <SelectItem value="ADMIN">
                    <span className="flex flex-col">
                      <span>Platform Administrator</span>
                      <span className="text-xs text-muted-foreground">
                        Full platform oversight, analytics & management
                      </span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="mt-2">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isSignUp ? (
            <>
              {"Already have an account? "}
              <Link
                href="/sign-in"
                className="font-medium text-primary hover:underline"
              >
                Sign In
              </Link>
            </>
          ) : (
            <>
              {"Don't have an account? "}
              <Link
                href="/sign-up"
                className="font-medium text-primary hover:underline"
              >
                Get Started
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
