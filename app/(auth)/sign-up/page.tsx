import type { Metadata } from "next"
import { AuthForm } from "@/components/auth/auth-form"

export const metadata: Metadata = {
  title: "Get Started",
  description: "Create your Radaa account. Start as a commuter or register as a vehicle operator.",
}

export default function SignUpPage() {
  return <AuthForm mode="sign-up" />
}
