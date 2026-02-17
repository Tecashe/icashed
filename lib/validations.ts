import { z } from "zod"

// ─── Auth ────────────────────────────────────────────────────

export const signUpSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["COMMUTER", "OPERATOR", "ADMIN", "SACCO_ADMIN"]).default("COMMUTER"),
})

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

// ─── Routes ──────────────────────────────────────────────────

export const searchRoutesSchema = z.object({
  query: z.string().optional(),
  county: z.string().optional(),
  active: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

// ─── Vehicles ────────────────────────────────────────────────

export const searchVehiclesSchema = z.object({
  query: z.string().optional(),
  type: z.enum(["MATATU", "BUS", "BODA", "TUK_TUK"]).optional(),
  routeId: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(20),
})

export const registerVehicleSchema = z.object({
  plateNumber: z
    .string()
    .min(5, "Enter a valid plate number")
    .regex(/^K[A-Z]{2}\s?\d{3}[A-Z]$/i, "Must be a valid Kenyan plate (e.g. KAA 123A)"),
  nickname: z.string().optional(),
  type: z.enum(["MATATU", "BUS", "BODA", "TUK_TUK"]).default("MATATU"),
  capacity: z.number().int().positive().default(14),
  routeIds: z.array(z.string()).min(1, "Select at least one route"),
})

// ─── Reports ─────────────────────────────────────────────────

export const createReportSchema = z.object({
  type: z.enum(["SAFETY", "ROUTE_ISSUE", "VEHICLE_ISSUE", "GENERAL"]),
  description: z.string().min(10, "Describe the issue in at least 10 characters"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

// ─── Position Update ─────────────────────────────────────────

export const positionUpdateSchema = z.object({
  vehicleId: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).default(0),
  heading: z.number().min(0).max(360).default(0),
  accuracy: z.number().min(0).optional(),
})

// Type exports for use across web & mobile
export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type SearchRoutesInput = z.infer<typeof searchRoutesSchema>
export type SearchVehiclesInput = z.infer<typeof searchVehiclesSchema>
export type RegisterVehicleInput = z.infer<typeof registerVehicleSchema>
export type CreateReportInput = z.infer<typeof createReportSchema>
export type PositionUpdateInput = z.infer<typeof positionUpdateSchema>
