import type { Metadata } from "next"
import { MapPageClient } from "./client"

export const metadata: Metadata = {
  title: "Live Map",
  description:
    "See real-time vehicle positions across Kenya. Track matatus, buses, and more on the live map.",
}

export default function MapPage() {
  return <MapPageClient />
}
