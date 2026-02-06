"use client"

import React, { createContext, useContext, useCallback } from "react"
import useSWR from "swr"
import { fetcher, apiPost } from "@/lib/api-client"
import { useRouter } from "next/navigation"

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: "COMMUTER" | "OPERATOR" | "ADMIN"
  phone: string | null
  avatarUrl: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  error: unknown
  signIn: (email: string, password: string) => Promise<AuthUser>
  signUp: (data: {
    email: string
    password: string
    name: string
    role: string
  }) => Promise<AuthUser>
  signOut: () => Promise<void>
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<{ user: AuthUser }>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const user = data?.user ?? null

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await apiPost<{ user: AuthUser }>("/api/auth/sign-in", {
        email,
        password,
      })
      await mutate({ user: result.user }, false)
      return result.user
    },
    [mutate]
  )

  const signUp = useCallback(
    async (data: {
      email: string
      password: string
      name: string
      role: string
    }) => {
      const result = await apiPost<{ user: AuthUser }>("/api/auth/sign-up", data)
      await mutate({ user: result.user }, false)
      return result.user
    },
    [mutate]
  )

  const signOut = useCallback(async () => {
    await apiPost("/api/auth/sign-out", {})
    await mutate(undefined, false)
    router.push("/")
    router.refresh()
  }, [mutate, router])

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return (
    <AuthContext.Provider
      value={{ user, isLoading, error, signIn, signUp, signOut, refresh }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return ctx
}
