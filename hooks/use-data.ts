import useSWR from "swr"
import { fetcher } from "@/lib/api-client"

// ─── Routes ──────────────────────────────────────────────────

export interface RouteStage {
  id: string
  name: string
  latitude: number
  longitude: number
  order: number
  isTerminal: boolean
  isWaypoint?: boolean
}

export interface RouteData {
  id: string
  name: string
  code: string
  description: string | null
  origin: string
  destination: string
  county: string
  isActive: boolean
  color: string
  createdAt: string
  stages: RouteStage[]
  routePath?: Array<{ latitude: number; longitude: number; order: number }>
  _count: { vehicles: number }
}

interface RoutesResponse {
  routes: RouteData[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export function useRoutes(params?: {
  query?: string
  county?: string
  page?: number
  limit?: number
}) {
  const searchParams = new URLSearchParams()
  if (params?.query) searchParams.set("query", params.query)
  if (params?.county && params.county !== "all")
    searchParams.set("county", params.county)
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))

  const qs = searchParams.toString()
  return useSWR<RoutesResponse>(`/api/routes${qs ? `?${qs}` : ""}`, fetcher)
}

export function useRoute(id: string | null) {
  return useSWR<{ route: RouteData }>(id ? `/api/routes/${id}` : null, fetcher)
}

// ─── Vehicles ────────────────────────────────────────────────

export interface VehiclePosition {
  id: string
  latitude: number
  longitude: number
  speed: number
  heading: number
  timestamp: string
}

export interface VehicleRouteData {
  id: string
  route: { id: string; name: string; color: string }
}

export interface VehicleImage {
  id: string
  url: string
  caption: string | null
  isPrimary: boolean
}

export interface VehicleData {
  id: string
  plateNumber: string
  nickname: string | null
  type: "MATATU" | "BUS" | "BODA" | "TUK_TUK"
  capacity: number
  isActive: boolean
  isPremium: boolean
  rating: number
  totalTrips: number
  ownerId: string
  createdAt: string
  images: VehicleImage[]
  routes: VehicleRouteData[]
  positions: VehiclePosition[]
}

interface VehiclesResponse {
  vehicles: VehicleData[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export function useVehicles(params?: {
  query?: string
  type?: string
  routeId?: string
  page?: number
  limit?: number
}) {
  const searchParams = new URLSearchParams()
  if (params?.query) searchParams.set("query", params.query)
  if (params?.type && params.type !== "all")
    searchParams.set("type", params.type)
  if (params?.routeId) searchParams.set("routeId", params.routeId)
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))

  const qs = searchParams.toString()
  return useSWR<VehiclesResponse>(
    `/api/vehicles${qs ? `?${qs}` : ""}`,
    fetcher
  )
}

export function useVehicle(id: string | null) {
  return useSWR<{ vehicle: VehicleData }>(
    id ? `/api/vehicles/${id}` : null,
    fetcher
  )
}

// ─── Live Positions (polls every 5s) ─────────────────────────

export interface LivePosition {
  vehicleId: string
  plateNumber: string
  nickname: string | null
  type: string
  isPremium: boolean
  imageUrl?: string | null
  position: VehiclePosition
  routes: { id: string; name: string; color: string }[]
}

export function useLivePositions() {
  return useSWR<{ positions: LivePosition[] }>(
    "/api/vehicles/positions",
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
    }
  )
}

// ─── Platform Stats (public, for landing page) ──────────────

export interface PlatformStats {
  totalRoutes: number
  activeRoutes: number
  totalVehicles: number
  activeVehicles: number
  totalStages: number
  totalUsers: number
  recentPositions: number
}

export function usePlatformStats() {
  return useSWR<PlatformStats>("/api/stats", fetcher, {
    refreshInterval: 30000,
  })
}

// ─── Driver Stats ────────────────────────────────────────────

export interface DriverStats {
  totalVehicles: number
  activeVehicles: number
  totalTrips: number
  avgRating: number
  recentPositions: number
  vehicles: {
    id: string
    plateNumber: string
    nickname: string | null
    type: string
    isActive: boolean
    rating: number
    totalTrips: number
    routes: string[]
    lastPosition: VehiclePosition | null
  }[]
}

export function useDriverStats() {
  return useSWR<DriverStats>("/api/driver/stats", fetcher)
}

// ─── My Vehicles (for drivers/operators) ─────────────────────

export function useMyVehicles() {
  return useSWR<{ vehicles: VehicleData[] }>("/api/driver/vehicles", fetcher)
}

// ─── Reports ─────────────────────────────────────────────────

export interface ReportData {
  id: string
  type: string
  description: string
  latitude: number | null
  longitude: number | null
  status: string
  createdAt: string
  user: { id: string; name: string | null; email: string }
}

export function useReports(params?: { status?: string; page?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.status && params.status !== "all")
    searchParams.set("status", params.status)
  if (params?.page) searchParams.set("page", String(params.page))
  const qs = searchParams.toString()
  return useSWR<{
    reports: ReportData[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }>(`/api/admin/reports${qs ? `?${qs}` : ""}`, fetcher)
}

// ─── Admin Stats ─────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number
  totalRoutes: number
  totalVehicles: number
  activeVehicles: number
  totalReports: number
  pendingReports: number
  recentUsers: {
    id: string
    name: string | null
    email: string
    role: string
    createdAt: string
  }[]
}

export function useAdminStats() {
  return useSWR<AdminStats>("/api/admin/stats", fetcher)
}

// ─── Admin Users ─────────────────────────────────────────────

export function useAdminUsers(params?: {
  role?: string
  query?: string
  page?: number
}) {
  const searchParams = new URLSearchParams()
  if (params?.role && params.role !== "all")
    searchParams.set("role", params.role)
  if (params?.query) searchParams.set("query", params.query)
  if (params?.page) searchParams.set("page", String(params.page))
  const qs = searchParams.toString()
  return useSWR<{
    users: {
      id: string
      name: string | null
      email: string
      role: string
      phone: string | null
      createdAt: string
      _count: { vehicles: number; reports: number }
    }[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }>(`/api/admin/users${qs ? `?${qs}` : ""}`, fetcher)
}

// ─── Passenger saved routes ──────────────────────────────────

export function useSavedRoutes() {
  return useSWR<{ savedRoutes: { id: string; route: RouteData }[] }>(
    "/api/passenger/saved-routes",
    fetcher
  )
}

// ─── Passenger reports ───────────────────────────────────────

export function useMyReports() {
  return useSWR<{
    reports: ReportData[]
  }>("/api/passenger/reports", fetcher)
}
