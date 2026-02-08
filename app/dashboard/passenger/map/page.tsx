"use client"

import { LiveMapView } from "@/components/map/live-map-view"

export default function PassengerMapPage() {
  return (
    <div className="-m-4 lg:-m-6 h-[calc(100vh-64px)]"> {/* Add explicit height */}
      <LiveMapView />
    </div>
  )
}

// export default function PassengerMapPage() {
//   return (
//     <div className="-m-4 lg:-m-6">
//       <LiveMapView />
//     </div>
//   )
// }
