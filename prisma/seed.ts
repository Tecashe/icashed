/**
 * Production Database Seed Script for Radaa
 * 
 * This script seeds the database with real Kenyan matatu routes.
 * Data is based on actual routes verified against Digital Matatus project
 * and official route designations.
 * 
 * Run with: npx prisma db seed
 */

import { PrismaClient, VehicleType } from "@prisma/client"

const prisma = new PrismaClient()

// ============================================================================
// PRODUCTION ROUTES DATA
// ============================================================================

interface StageData {
  name: string
  latitude: number
  longitude: number
  isTerminal: boolean
}

interface RouteData {
  code: string
  name: string
  description: string
  origin: string
  destination: string
  county: string
  color: string
  stages: StageData[]
}

const PRODUCTION_ROUTES: RouteData[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // THIKA ROAD CORRIDOR
  // ─────────────────────────────────────────────────────────────────────────
  {
    code: "237",
    name: "Nairobi CBD - Thika",
    description: "Main route connecting Nairobi CBD to Thika Town via Thika Superhighway",
    origin: "Nairobi CBD (Ronald Ngala)",
    destination: "Thika Town (Kwa Junction)",
    county: "Nairobi/Kiambu",
    color: "#EF4444", // Red
    stages: [
      { name: "Ronald Ngala / OTC", latitude: -1.2833, longitude: 36.8273, isTerminal: true },
      { name: "Pangani", latitude: -1.2669, longitude: 36.8364, isTerminal: false },
      { name: "Muthaiga Roundabout", latitude: -1.2567, longitude: 36.8389, isTerminal: false },
      { name: "Safari Park Hotel", latitude: -1.2321, longitude: 36.8494, isTerminal: false },
      { name: "Kasarani Stadium", latitude: -1.2214, longitude: 36.8879, isTerminal: false },
      { name: "Roysambu", latitude: -1.2183, longitude: 36.8869, isTerminal: false },
      { name: "Kahawa West", latitude: -1.1891, longitude: 36.9186, isTerminal: false },
      { name: "Githurai 44", latitude: -1.1846, longitude: 36.9244, isTerminal: false },
      { name: "Githurai 45", latitude: -1.1790, longitude: 36.9310, isTerminal: false },
      { name: "Zimmerman", latitude: -1.1706, longitude: 36.9089, isTerminal: false },
      { name: "Kahawa Sukari", latitude: -1.1627, longitude: 36.9439, isTerminal: false },
      { name: "Kenyatta University (KU)", latitude: -1.1802, longitude: 36.9355, isTerminal: false },
      { name: "Ruiru Bypass", latitude: -1.1497, longitude: 36.9611, isTerminal: false },
      { name: "Ruiru Town", latitude: -1.1455, longitude: 36.9606, isTerminal: false },
      { name: "Juja Town", latitude: -1.1050, longitude: 37.0133, isTerminal: false },
      { name: "JKUAT Gate", latitude: -1.0991, longitude: 37.0147, isTerminal: false },
      { name: "Thika Town (Kwa Junction)", latitude: -1.0333, longitude: 37.0693, isTerminal: true },
    ],
  },
  {
    code: "44",
    name: "Nairobi CBD - Kahawa/KU",
    description: "Route serving Kahawa, Kahawa Sukari, and Kenyatta University",
    origin: "Nairobi CBD (Kencom)",
    destination: "Kahawa Sukari",
    county: "Nairobi/Kiambu",
    color: "#F97316", // Orange
    stages: [
      { name: "Kencom (Moi Avenue)", latitude: -1.2864, longitude: 36.8246, isTerminal: true },
      { name: "Globe Roundabout", latitude: -1.2700, longitude: 36.8304, isTerminal: false },
      { name: "Pangani", latitude: -1.2669, longitude: 36.8364, isTerminal: false },
      { name: "Thika Road Mall (TRM)", latitude: -1.2193, longitude: 36.8883, isTerminal: false },
      { name: "Roysambu", latitude: -1.2183, longitude: 36.8869, isTerminal: false },
      { name: "Kahawa Wendani", latitude: -1.1920, longitude: 36.9253, isTerminal: false },
      { name: "Kahawa Sukari", latitude: -1.1627, longitude: 36.9439, isTerminal: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // KIKUYU / WAIYAKI WAY CORRIDOR
  // ─────────────────────────────────────────────────────────────────────────
  {
    code: "105",
    name: "Nairobi CBD - Kikuyu",
    description: "Main route to Kikuyu via Waiyaki Way through Westlands and Kangemi",
    origin: "Nairobi CBD (Railways)",
    destination: "Kikuyu Town",
    county: "Nairobi/Kiambu",
    color: "#22C55E", // Green
    stages: [
      { name: "Railways Bus Station", latitude: -1.2890, longitude: 36.8267, isTerminal: true },
      { name: "Uhuru Highway / Kenyatta Avenue", latitude: -1.2850, longitude: 36.8220, isTerminal: false },
      { name: "Museum Hill", latitude: -1.2735, longitude: 36.8117, isTerminal: false },
      { name: "Westlands (Sarit Centre)", latitude: -1.2617, longitude: 36.8022, isTerminal: false },
      { name: "Kangemi", latitude: -1.2638, longitude: 36.7472, isTerminal: false },
      { name: "Mountain View", latitude: -1.2594, longitude: 36.7361, isTerminal: false },
      { name: "Uthiru", latitude: -1.2497, longitude: 36.7172, isTerminal: false },
      { name: "Kinoo", latitude: -1.2403, longitude: 36.6956, isTerminal: false },
      { name: "Zambezi", latitude: -1.2306, longitude: 36.6806, isTerminal: false },
      { name: "Kikuyu Town", latitude: -1.2444, longitude: 36.6594, isTerminal: true },
    ],
  },
  {
    code: "102",
    name: "Nairobi CBD - Kikuyu (via Dagoretti)",
    description: "Alternative route to Kikuyu via Ngong Road and Dagoretti Corner",
    origin: "Nairobi CBD (Kencom)",
    destination: "Kikuyu Town",
    county: "Nairobi/Kiambu",
    color: "#10B981", // Emerald
    stages: [
      { name: "Kencom (Moi Avenue)", latitude: -1.2864, longitude: 36.8246, isTerminal: true },
      { name: "Kenyatta Avenue", latitude: -1.2860, longitude: 36.8170, isTerminal: false },
      { name: "Ngong Road / Prestige Plaza", latitude: -1.3001, longitude: 36.7856, isTerminal: false },
      { name: "Dagoretti Corner", latitude: -1.2978, longitude: 36.7528, isTerminal: false },
      { name: "The Junction Mall", latitude: -1.2985, longitude: 36.7492, isTerminal: false },
      { name: "Karen Roundabout", latitude: -1.3189, longitude: 36.7089, isTerminal: false },
      { name: "Kikuyu Town", latitude: -1.2444, longitude: 36.6594, isTerminal: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RONGAI / LANG'ATA CORRIDOR
  // ─────────────────────────────────────────────────────────────────────────
  {
    code: "125",
    name: "Nairobi CBD - Ongata Rongai",
    description: "Main route to Ongata Rongai via Langata Road",
    origin: "Nairobi CBD (Railways)",
    destination: "Ongata Rongai",
    county: "Nairobi/Kajiado",
    color: "#8B5CF6", // Purple
    stages: [
      { name: "Railways Bus Station", latitude: -1.2890, longitude: 36.8267, isTerminal: true },
      { name: "Nyayo Stadium", latitude: -1.3047, longitude: 36.8256, isTerminal: false },
      { name: "Carnivore Restaurant", latitude: -1.3136, longitude: 36.7944, isTerminal: false },
      { name: "Wilson Airport", latitude: -1.3216, longitude: 36.8159, isTerminal: false },
      { name: "Langata Cemetery", latitude: -1.3333, longitude: 36.7639, isTerminal: false },
      { name: "Kenya Wildlife Service (KWS)", latitude: -1.3428, longitude: 36.7522, isTerminal: false },
      { name: "Bomas of Kenya", latitude: -1.3458, longitude: 36.7456, isTerminal: false },
      { name: "Galleria Mall", latitude: -1.3556, longitude: 36.7564, isTerminal: false },
      { name: "Tumaini Estate", latitude: -1.3667, longitude: 36.7472, isTerminal: false },
      { name: "Maasai Lodge", latitude: -1.3775, longitude: 36.7361, isTerminal: false },
      { name: "Nazarene University", latitude: -1.3861, longitude: 36.7331, isTerminal: false },
      { name: "Ongata Rongai Town", latitude: -1.3958, longitude: 36.7444, isTerminal: true },
    ],
  },
  {
    code: "126",
    name: "Nairobi CBD - Kiserian",
    description: "Extended route from Rongai to Kiserian via Magadi Road",
    origin: "Nairobi CBD (Railways)",
    destination: "Kiserian Town",
    county: "Nairobi/Kajiado",
    color: "#A855F7", // Fuchsia
    stages: [
      { name: "Railways Bus Station", latitude: -1.2890, longitude: 36.8267, isTerminal: true },
      { name: "Nyayo Stadium", latitude: -1.3047, longitude: 36.8256, isTerminal: false },
      { name: "Carnivore Restaurant", latitude: -1.3136, longitude: 36.7944, isTerminal: false },
      { name: "Bomas of Kenya", latitude: -1.3458, longitude: 36.7456, isTerminal: false },
      { name: "Ongata Rongai Town", latitude: -1.3958, longitude: 36.7444, isTerminal: false },
      { name: "Rimpa", latitude: -1.4083, longitude: 36.7389, isTerminal: false },
      { name: "Kiserian Town", latitude: -1.4217, longitude: 36.6833, isTerminal: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MOMBASA ROAD CORRIDOR
  // ─────────────────────────────────────────────────────────────────────────
  {
    code: "110",
    name: "Nairobi CBD - Kitengela",
    description: "Major route to Kitengela via Mombasa Road through Mlolongo and Athi River",
    origin: "Nairobi CBD (Railways)",
    destination: "Kitengela Town",
    county: "Nairobi/Machakos/Kajiado",
    color: "#3B82F6", // Blue
    stages: [
      { name: "Railways Bus Station", latitude: -1.2890, longitude: 36.8267, isTerminal: true },
      { name: "Nyayo Stadium", latitude: -1.3047, longitude: 36.8256, isTerminal: false },
      { name: "Bellevue / GM", latitude: -1.3175, longitude: 36.8319, isTerminal: false },
      { name: "Cabanas / South B", latitude: -1.3233, longitude: 36.8353, isTerminal: false },
      { name: "General Motors (GM)", latitude: -1.3236, longitude: 36.8361, isTerminal: false },
      { name: "Sameer Industrial Park", latitude: -1.3394, longitude: 36.8494, isTerminal: false },
      { name: "JKIA Interchange", latitude: -1.3375, longitude: 36.9064, isTerminal: false },
      { name: "Mlolongo", latitude: -1.3803, longitude: 36.9475, isTerminal: false },
      { name: "Athi River / Mavoko", latitude: -1.4531, longitude: 36.9825, isTerminal: false },
      { name: "EPZ / Export Processing Zone", latitude: -1.4603, longitude: 36.9697, isTerminal: false },
      { name: "Kitengela Town", latitude: -1.4731, longitude: 36.9611, isTerminal: true },
    ],
  },
  {
    code: "34",
    name: "Nairobi CBD - JKIA/Embakasi",
    description: "Route serving Jomo Kenyatta International Airport and Embakasi",
    origin: "Nairobi CBD (Kencom)",
    destination: "JKIA Terminal",
    county: "Nairobi",
    color: "#06B6D4", // Cyan
    stages: [
      { name: "Kencom (Moi Avenue)", latitude: -1.2864, longitude: 36.8246, isTerminal: true },
      { name: "Nyayo Stadium", latitude: -1.3047, longitude: 36.8256, isTerminal: false },
      { name: "City Stadium", latitude: -1.3017, longitude: 36.8350, isTerminal: false },
      { name: "Donholm", latitude: -1.2886, longitude: 36.8828, isTerminal: false },
      { name: "Embakasi Village", latitude: -1.3144, longitude: 36.8975, isTerminal: false },
      { name: "Pipeline", latitude: -1.3256, longitude: 36.9050, isTerminal: false },
      { name: "Fedha Estate", latitude: -1.3289, longitude: 36.9072, isTerminal: false },
      { name: "JKIA Terminal", latitude: -1.3192, longitude: 36.9275, isTerminal: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NGONG ROAD CORRIDOR
  // ─────────────────────────────────────────────────────────────────────────
  {
    code: "111",
    name: "Nairobi CBD - Ngong Town",
    description: "Route to Ngong Town via Ngong Road",
    origin: "Nairobi CBD (Kencom)",
    destination: "Ngong Town",
    county: "Nairobi/Kajiado",
    color: "#14B8A6", // Teal
    stages: [
      { name: "Kencom (Moi Avenue)", latitude: -1.2864, longitude: 36.8246, isTerminal: true },
      { name: "Uhuru Gardens", latitude: -1.3027, longitude: 36.8008, isTerminal: false },
      { name: "Prestige Plaza", latitude: -1.3001, longitude: 36.7856, isTerminal: false },
      { name: "Adams Arcade", latitude: -1.3014, longitude: 36.7778, isTerminal: false },
      { name: "Hurlingham", latitude: -1.2986, longitude: 36.7892, isTerminal: false },
      { name: "Kilimani (Yaya Centre)", latitude: -1.2919, longitude: 36.7883, isTerminal: false },
      { name: "Ngong Road Forest", latitude: -1.3306, longitude: 36.7556, isTerminal: false },
      { name: "Karen Roundabout", latitude: -1.3189, longitude: 36.7089, isTerminal: false },
      { name: "Ngong Town", latitude: -1.3614, longitude: 36.6581, isTerminal: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EASTLANDS CORRIDOR
  // ─────────────────────────────────────────────────────────────────────────
  {
    code: "33",
    name: "Nairobi CBD - Kayole",
    description: "Route serving Kayole and Eastlands through Jogoo Road",
    origin: "Nairobi CBD (Machakos Country Bus)",
    destination: "Kayole Spine Road",
    county: "Nairobi",
    color: "#F59E0B", // Amber
    stages: [
      { name: "Machakos Country Bus", latitude: -1.2875, longitude: 36.8403, isTerminal: true },
      { name: "Burma Market", latitude: -1.2889, longitude: 36.8506, isTerminal: false },
      { name: "Shauri Moyo", latitude: -1.2908, longitude: 36.8564, isTerminal: false },
      { name: "Jogoo Road / Makadara", latitude: -1.2969, longitude: 36.8678, isTerminal: false },
      { name: "Hamza Estate", latitude: -1.2958, longitude: 36.8747, isTerminal: false },
      { name: "Donholm Roundabout", latitude: -1.2886, longitude: 36.8828, isTerminal: false },
      { name: "Saika Estate", latitude: -1.2831, longitude: 36.8928, isTerminal: false },
      { name: "Kayole Junction", latitude: -1.2778, longitude: 36.9028, isTerminal: false },
      { name: "Kayole Spine Road", latitude: -1.2694, longitude: 36.9094, isTerminal: true },
    ],
  },
  {
    code: "58",
    name: "Nairobi CBD - Umoja",
    description: "Route to Umoja estates via Jogoo Road",
    origin: "Nairobi CBD (Tom Mboya)",
    destination: "Umoja Innercore",
    county: "Nairobi",
    color: "#EC4899", // Pink
    stages: [
      { name: "Tom Mboya Street", latitude: -1.2847, longitude: 36.8281, isTerminal: true },
      { name: "Machakos Country Bus", latitude: -1.2875, longitude: 36.8403, isTerminal: false },
      { name: "Gikomba Market", latitude: -1.2856, longitude: 36.8444, isTerminal: false },
      { name: "Shauri Moyo", latitude: -1.2908, longitude: 36.8564, isTerminal: false },
      { name: "Makadara Station", latitude: -1.2969, longitude: 36.8678, isTerminal: false },
      { name: "Buruburu Phase 1", latitude: -1.2861, longitude: 36.8833, isTerminal: false },
      { name: "Umoja 1", latitude: -1.2750, longitude: 36.8978, isTerminal: false },
      { name: "Umoja Innercore", latitude: -1.2728, longitude: 36.8992, isTerminal: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LIMURU ROAD CORRIDOR
  // ─────────────────────────────────────────────────────────────────────────
  {
    code: "106",
    name: "Nairobi CBD - Limuru",
    description: "Route to Limuru Town via Limuru Road",
    origin: "Nairobi CBD (Railways)",
    destination: "Limuru Town",
    county: "Nairobi/Kiambu",
    color: "#84CC16", // Lime
    stages: [
      { name: "Railways Bus Station", latitude: -1.2890, longitude: 36.8267, isTerminal: true },
      { name: "Westlands (Sarit Centre)", latitude: -1.2617, longitude: 36.8022, isTerminal: false },
      { name: "Parklands", latitude: -1.2611, longitude: 36.8150, isTerminal: false },
      { name: "Muthaiga", latitude: -1.2528, longitude: 36.8239, isTerminal: false },
      { name: "Gigiri (UN Office)", latitude: -1.2350, longitude: 36.8033, isTerminal: false },
      { name: "Runda", latitude: -1.2169, longitude: 36.8000, isTerminal: false },
      { name: "Rosslyn", latitude: -1.2075, longitude: 36.7861, isTerminal: false },
      { name: "Banana Hill", latitude: -1.1742, longitude: 36.7528, isTerminal: false },
      { name: "Limuru Town", latitude: -1.1139, longitude: 36.6422, isTerminal: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RUAKA / KIAMBU CORRIDOR
  // ─────────────────────────────────────────────────────────────────────────
  {
    code: "107",
    name: "Nairobi CBD - Ruaka",
    description: "Route to Ruaka via Northern Bypass",
    origin: "Nairobi CBD (Kencom)",
    destination: "Ruaka Town",
    county: "Nairobi/Kiambu",
    color: "#6366F1", // Indigo
    stages: [
      { name: "Kencom (Moi Avenue)", latitude: -1.2864, longitude: 36.8246, isTerminal: true },
      { name: "Westlands (Sarit Centre)", latitude: -1.2617, longitude: 36.8022, isTerminal: false },
      { name: "Kangemi Flyover", latitude: -1.2638, longitude: 36.7472, isTerminal: false },
      { name: "Two Rivers Mall", latitude: -1.2181, longitude: 36.8039, isTerminal: false },
      { name: "Rosslyn", latitude: -1.2075, longitude: 36.7861, isTerminal: false },
      { name: "Ruaka Town", latitude: -1.2092, longitude: 36.7783, isTerminal: true },
    ],
  },
  {
    code: "108",
    name: "Nairobi CBD - Kiambu Town",
    description: "Route to Kiambu Town via Muthaiga",
    origin: "Nairobi CBD (Railways)",
    destination: "Kiambu Town",
    county: "Nairobi/Kiambu",
    color: "#0EA5E9", // Sky Blue
    stages: [
      { name: "Railways Bus Station", latitude: -1.2890, longitude: 36.8267, isTerminal: true },
      { name: "Globe Roundabout", latitude: -1.2700, longitude: 36.8304, isTerminal: false },
      { name: "Muthaiga Roundabout", latitude: -1.2567, longitude: 36.8389, isTerminal: false },
      { name: "CID Headquarters", latitude: -1.2428, longitude: 36.8544, isTerminal: false },
      { name: "Ridgeways", latitude: -1.2289, longitude: 36.8483, isTerminal: false },
      { name: "Kiambu Road Junction", latitude: -1.2047, longitude: 36.8403, isTerminal: false },
      { name: "Karuri", latitude: -1.1722, longitude: 36.8306, isTerminal: false },
      { name: "Kiambu Town", latitude: -1.1736, longitude: 36.8350, isTerminal: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SOUTH C / NAIROBI WEST CORRIDOR
  // ─────────────────────────────────────────────────────────────────────────
  {
    code: "15",
    name: "Nairobi CBD - South C",
    description: "Route serving South C, South B, and Nairobi West",
    origin: "Nairobi CBD (Kencom)",
    destination: "South C Shopping Centre",
    county: "Nairobi",
    color: "#DC2626", // Red-600
    stages: [
      { name: "Kencom (Moi Avenue)", latitude: -1.2864, longitude: 36.8246, isTerminal: true },
      { name: "Nyayo Stadium", latitude: -1.3047, longitude: 36.8256, isTerminal: false },
      { name: "Nairobi West", latitude: -1.3142, longitude: 36.8194, isTerminal: false },
      { name: "South B Shopping Centre", latitude: -1.3139, longitude: 36.8317, isTerminal: false },
      { name: "Akiba Estate", latitude: -1.3197, longitude: 36.8236, isTerminal: false },
      { name: "South C Shopping Centre", latitude: -1.3225, longitude: 36.8203, isTerminal: true },
    ],
  },
]

// ============================================================================
// SEED FUNCTION
// ============================================================================

async function seedRoutes() {
  console.log("🌱 Starting to seed production routes...")

  for (const routeData of PRODUCTION_ROUTES) {
    const { stages, ...routeInfo } = routeData

    // Check if route already exists
    const existingRoute = await prisma.route.findUnique({
      where: { code: routeInfo.code },
    })

    if (existingRoute) {
      console.log(`⏭️  Route ${routeInfo.code} already exists, skipping...`)
      continue
    }

    // Create the route with its stages
    const route = await prisma.route.create({
      data: {
        ...routeInfo,
        stages: {
          create: stages.map((stage, index) => ({
            name: stage.name,
            latitude: stage.latitude,
            longitude: stage.longitude,
            order: index + 1,
            isTerminal: stage.isTerminal,
          })),
        },
      },
      include: {
        stages: true,
      },
    })

    console.log(
      `✅ Created route: ${route.code} - ${route.name} (${route.stages.length} stages)`
    )
  }

  console.log("\n🎉 Seeding completed successfully!")
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  console.log("╔══════════════════════════════════════════╗")
  console.log("║   RADAA Production Database Seeder       ║")
  console.log("║   Real Kenyan Matatu Routes              ║")
  console.log("╚══════════════════════════════════════════╝\n")

  try {
    await seedRoutes()
  } catch (error) {
    console.error("❌ Error seeding database:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
