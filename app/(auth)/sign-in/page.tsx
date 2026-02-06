import type { Metadata } from "next"
import { AuthForm } from "@/components/auth/auth-form"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Radaa account.",
}

export default function SignInPage() {
  return <AuthForm mode="sign-in" />
}
