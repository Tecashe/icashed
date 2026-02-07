import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function verify() {
    const routes = await prisma.route.findMany({
        select: {
            code: true,
            name: true,
            _count: {
                select: { stages: true },
            },
        },
        orderBy: { code: "asc" },
    })

    console.log("\n📊 SEEDED ROUTES VERIFICATION\n")
    console.log("Code\tStages\tRoute Name")
    console.log("────\t──────\t──────────")

    let totalStages = 0
    for (const route of routes) {
        console.log(`${route.code}\t${route._count.stages}\t${route.name}`)
        totalStages += route._count.stages
    }

    console.log(`\n✅ Total: ${routes.length} routes with ${totalStages} stages\n`)
    await prisma.$disconnect()
}

verify()
