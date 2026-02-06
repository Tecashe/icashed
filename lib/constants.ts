// ─── Kenyan Map Defaults ─────────────────────────────────────

export const NAIROBI_CENTER = {
  lat: -1.2921,
  lng: 36.8219,
} as const

export const DEFAULT_MAP_ZOOM = 13

// ─── Kenyan Counties (for route filtering) ───────────────────

export const KENYAN_COUNTIES = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Kiambu",
  "Machakos",
  "Kajiado",
  "Murang'a",
  "Nyeri",
  "Uasin Gishu",
  "Kilifi",
  "Nyandarua",
  "Laikipia",
  "Trans Nzoia",
  "Bungoma",
  "Kakamega",
  "Kericho",
  "Bomet",
  "Narok",
  "Nandi",
] as const

// ─── Vehicle Types ───────────────────────────────────────────

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  MATATU: "Matatu",
  BUS: "Bus",
  BODA: "Boda Boda",
  TUK_TUK: "Tuk Tuk",
}

export const VEHICLE_TYPE_CAPACITY: Record<string, number> = {
  MATATU: 14,
  BUS: 50,
  BODA: 1,
  TUK_TUK: 3,
}

// ─── App ─────────────────────────────────────────────────────

export const APP_NAME = "Radaa"
export const APP_DESCRIPTION =
  "Real-time public transport visibility for Kenya. See live routes, vehicles, and stages."
export const APP_URL = "https://radaa.co.ke"
