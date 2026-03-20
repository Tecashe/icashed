"use client"

import { LiveMapView } from "@/components/map/google-live-map-view"

export default function PassengerMapPage() {
  return (
    <div className="-m-4 lg:-m-6 h-[calc(100vh-64px)]">
      <LiveMapView />
    </div>
  )
}

