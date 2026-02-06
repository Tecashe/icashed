// Seed script for Radaa database
// Run: npx tsx prisma/seed.ts
// Requires DATABASE_URL to be set

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding Radaa database...")

  // Create routes
  const routes = [
    {
      name: "CBD - Rongai",
      code: "NRB-101",
      description: "Main route connecting Nairobi CBD to Rongai via Langata Road",
      origin: "Kencom (CBD)",
      destination: "Rongai Town",
      county: "Nairobi",
      color: "#10B981",
      stages: [
        { name: "Kencom", latitude: -1.2864, longitude: 36.8237, order: 0, isTerminal: true },
        { name: "Railways", latitude: -1.2913, longitude: 36.8236, order: 1, isTerminal: false },
        { name: "Nyayo Stadium", latitude: -1.3044, longitude: 36.8175, order: 2, isTerminal: false },
        { name: "T-Mall", latitude: -1.3185, longitude: 36.7977, order: 3, isTerminal: false },
        { name: "Bomas", latitude: -1.3407, longitude: 36.7764, order: 4, isTerminal: false },
        { name: "Rongai Town", latitude: -1.3963, longitude: 36.7587, order: 5, isTerminal: true },
      ],
    },
    {
      name: "CBD - Westlands",
      code: "NRB-102",
      description: "Quick route to Westlands via Uhuru Highway and Waiyaki Way",
      origin: "Kencom (CBD)",
      destination: "Westlands",
      county: "Nairobi",
      color: "#3B82F6",
      stages: [
        { name: "Kencom", latitude: -1.2864, longitude: 36.8237, order: 0, isTerminal: true },
        { name: "University Way", latitude: -1.2794, longitude: 36.8173, order: 1, isTerminal: false },
        { name: "Museum Hill", latitude: -1.2718, longitude: 36.8115, order: 2, isTerminal: false },
        { name: "Westlands", latitude: -1.2634, longitude: 36.8029, order: 3, isTerminal: true },
      ],
    },
    {
      name: "CBD - Thika Road",
      code: "NRB-103",
      description: "Thika Superhighway route through Roysambu and Kasarani",
      origin: "Kencom (CBD)",
      destination: "Thika Town",
      county: "Kiambu",
      color: "#F59E0B",
      stages: [
        { name: "Kencom", latitude: -1.2864, longitude: 36.8237, order: 0, isTerminal: true },
        { name: "Pangani", latitude: -1.2685, longitude: 36.8342, order: 1, isTerminal: false },
        { name: "Muthaiga", latitude: -1.2533, longitude: 36.8391, order: 2, isTerminal: false },
        { name: "Roysambu", latitude: -1.2188, longitude: 36.8732, order: 3, isTerminal: false },
        { name: "Kasarani", latitude: -1.2015, longitude: 36.8924, order: 4, isTerminal: false },
        { name: "Ruiru", latitude: -1.1456, longitude: 36.9603, order: 5, isTerminal: false },
        { name: "Thika Town", latitude: -1.0396, longitude: 37.0754, order: 6, isTerminal: true },
      ],
    },
  ]

  for (const routeData of routes) {
    const { stages, ...route } = routeData
    const created = await prisma.route.upsert({
      where: { code: route.code },
      update: route,
      create: route,
    })

    for (const stage of stages) {
      await prisma.stage.upsert({
        where: { routeId_order: { routeId: created.id, order: stage.order } },
        update: { ...stage, routeId: created.id },
        create: { ...stage, routeId: created.id },
      })
    }

    console.log(`  Route: ${created.name} (${stages.length} stages)`)
  }

  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
