import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { uploadToBlob, deleteFromBlob } from "@/lib/blob-storage"
import { randomBytes } from "crypto"

// GET - Get images for a vehicle
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: vehicleId } = await params

        const images = await prisma.vehicleImage.findMany({
            where: { vehicleId },
            orderBy: [
                { isPrimary: "desc" },
                { createdAt: "desc" },
            ],
        })

        return NextResponse.json({ images })
    } catch (error) {
        console.error("Get vehicle images error:", error)
        return NextResponse.json(
            { error: "Failed to get images" },
            { status: 500 }
        )
    }
}

// POST - Upload new image (uses Vercel Blob for cloud storage)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "OPERATOR") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: vehicleId } = await params

        // Verify vehicle ownership
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
        })

        if (!vehicle || vehicle.ownerId !== user.id) {
            return NextResponse.json(
                { error: "Vehicle not found or not owned by you" },
                { status: 404 }
            )
        }

        const formData = await request.formData()
        const file = formData.get("image") as File | null
        const caption = formData.get("caption") as string | null
        const isPrimary = formData.get("isPrimary") === "true"

        if (!file) {
            return NextResponse.json(
                { error: "No image file provided" },
                { status: 400 }
            )
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Only JPEG, PNG, and WebP allowed" },
                { status: 400 }
            )
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: "File too large. Maximum 5MB allowed" },
                { status: 400 }
            )
        }

        // Generate a unique pathname for the blob
        const ext = file.name.split(".").pop() || "jpg"
        const filename = `${vehicleId}-${randomBytes(8).toString("hex")}.${ext}`
        const pathname = `vehicles/${vehicleId}/${filename}`

        // Upload to Vercel Blob
        const { url } = await uploadToBlob(file, pathname)

        // If this is primary, unset other primary images
        if (isPrimary) {
            await prisma.vehicleImage.updateMany({
                where: { vehicleId },
                data: { isPrimary: false },
            })
        }

        // Create database record with the public Blob URL
        const image = await prisma.vehicleImage.create({
            data: {
                vehicleId,
                url,
                caption: caption?.trim() || null,
                isPrimary: isPrimary,
            },
        })

        return NextResponse.json({ image })
    } catch (error) {
        console.error("Upload vehicle image error:", error)
        return NextResponse.json(
            { error: "Failed to upload image" },
            { status: 500 }
        )
    }
}

// DELETE - Delete an image
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "OPERATOR") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: vehicleId } = await params
        const { searchParams } = new URL(request.url)
        const imageId = searchParams.get("imageId")

        if (!imageId) {
            return NextResponse.json(
                { error: "Image ID required" },
                { status: 400 }
            )
        }

        // Verify ownership
        const image = await prisma.vehicleImage.findUnique({
            where: { id: imageId },
            include: { vehicle: true },
        })

        if (!image || image.vehicle.ownerId !== user.id || image.vehicleId !== vehicleId) {
            return NextResponse.json(
                { error: "Image not found or not owned by you" },
                { status: 404 }
            )
        }

        // Delete from Vercel Blob storage (handles both blob URLs and legacy local URLs)
        if (image.url.startsWith("https://")) {
            try {
                await deleteFromBlob(image.url)
            } catch (e) {
                console.warn("Failed to delete blob, continuing with DB cleanup:", e)
            }
        }

        // Delete from database
        await prisma.vehicleImage.delete({
            where: { id: imageId },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Delete vehicle image error:", error)
        return NextResponse.json(
            { error: "Failed to delete image" },
            { status: 500 }
        )
    }
}
