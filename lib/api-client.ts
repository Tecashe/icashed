// Shared API fetcher for SWR -- works on web and will be reused in Expo mobile app
const API_BASE = ""

export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.error || "Request failed", res.status, body.details)
  }
  return res.json()
}

export async function apiPost<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(body.error || "Request failed", res.status, body.details)
  }
  return body
}

export async function apiPut<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(body.error || "Request failed", res.status, body.details)
  }
  return body
}

export async function apiPatch<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(body.error || "Request failed", res.status, body.details)
  }
  return body
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, { method: "DELETE" })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(body.error || "Request failed", res.status, body.details)
  }
  return body
}
