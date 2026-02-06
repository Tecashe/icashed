import React from "react"
import Link from "next/link"
import { MapPin } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <MapPin className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-display text-2xl font-bold text-foreground">
          Radaa
        </span>
      </Link>
      {children}
    </div>
  )
}
