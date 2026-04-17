import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrador',
      username: 'admin',
      password: hashedPassword,
      email: 'admin@villasmayen.com',
      role: 'ADMIN',
      active: true,
    },
  })
  console.log('Created admin user:', admin.username)

  // Create test users for each role (used by Playwright tests)
  const testRoleUsers = [
    { username: 'recepcionista', name: 'Recepcionista Test', role: 'RECEPCIONISTA', email: 'recepcionista@villasmayen.com', password: 'recepcionista123' },
    { username: 'finanzas', name: 'Finanzas Test', role: 'FINANZAS', email: 'finanzas@villasmayen.com', password: 'finanzas123' },
    { username: 'almacen', name: 'Almacen Test', role: 'ALMACEN', email: 'almacen@villasmayen.com', password: 'almacen123' },
    { username: 'visual', name: 'Visual Test', role: 'VISUAL', email: 'visual@villasmayen.com', password: 'visual123' },
    { username: 'encargado', name: 'Encargado Test', role: 'ENCARGADO_EVENTO', email: 'encargado@villasmayen.com', password: 'encargado123' },
  ]

  for (const u of testRoleUsers) {
    const hashed = await bcrypt.hash(u.password, 10)
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        name: u.name,
        username: u.username,
        password: hashed,
        email: u.email,
        role: u.role as any,
        active: true,
      },
    })
    console.log(`Created user: ${u.username}`)
  }

  // Create free areas
  const freeAreas = [
    { name: 'Pérgola', capacity: 80, description: 'Espacio techado al aire libre' },
    { name: 'Plaza Jerusalén', capacity: 150, description: 'Plaza principal para eventos grandes' },
    { name: 'Bautisterio', capacity: 50, description: 'Área especial para ceremonias' },
    { name: 'Rancho 1', capacity: 60, description: 'Espacio tipo rancho' },
    { name: 'Rancho 2', capacity: 60, description: 'Espacio tipo rancho' },
    { name: 'Rancho 3', capacity: 60, description: 'Espacio tipo rancho' },
    { name: 'Rancho 4', capacity: 60, description: 'Espacio tipo rancho' },
    { name: 'Monte Bienaventuranzas', capacity: 120, description: 'Área natural para eventos' },
    { name: 'Las Mariposas', capacity: 90, description: 'Jardín temático' },
  ]

  for (const area of freeAreas) {
    await prisma.freeArea.upsert({
      where: { name: area.name },
      update: {},
      create: area,
    })
  }
  console.log('Created free areas')

  // Create dining rooms
  const diningRooms = [
    { name: 'Nehemías 1', capacity: 100, description: 'Comedor principal sección 1' },
    { name: 'Nehemías 2', capacity: 100, description: 'Comedor principal sección 2' },
    { name: 'Josefa', capacity: 70, description: 'Comedor intermedio' },
    { name: 'Magdalena', capacity: 70, description: 'Comedor intermedio' },
  ]

  for (const room of diningRooms) {
    await prisma.diningRoom.upsert({
      where: { name: room.name },
      update: {},
      create: room,
    })
  }
  console.log('Created dining rooms')

  // Create halls
  const halls = [
    { name: 'Josefa', capacity: 70, type: 'Interior' },
    { name: 'Magdalena', capacity: 70, type: 'Interior' },
    { name: 'Timoteo', capacity: 80, type: 'Interior' },
    { name: 'Salem', capacity: 100, type: 'Interior grande' },
    { name: 'Nehemías', capacity: 100, type: 'Interior grande' },
    { name: 'Israel', capacity: 60, type: 'Interior' },
    { name: 'Esther', capacity: 60, type: 'Interior' },
    { name: 'Jacob', capacity: 60, type: 'Interior' },
    { name: 'Sansón', capacity: 60, type: 'Interior' },
  ]

  for (const hall of halls) {
    await prisma.hall.upsert({
      where: { name: hall.name },
      update: {},
      create: hall,
    })
  }
  console.log('Created halls')

  // Create buildings and rooms
  const buildings = [
    { name: 'Belén' },
    { name: 'Bethel' },
  ]

  for (const building of buildings) {
    await prisma.building.upsert({
      where: { name: building.name },
      update: {},
      create: {
        name: building.name,
        floors: {
          create: [
            { level: 1 },
            { level: 2 },
          ],
        },
      },
    })
  }
  console.log('Created buildings with floors')

  // Create some rooms
  const belenFloors = await prisma.floor.findMany({
    where: { building: { name: 'Belén' } },
  })

  for (const floor of belenFloors) {
    const roomCount = floor.level === 1 ? 5 : 4
    for (let i = 1; i <= roomCount; i++) {
      const roomNumber = `${floor.level}0${i}`
      await prisma.room.upsert({
        where: { floorId_number: { floorId: floor.id, number: roomNumber } },
        update: {},
        create: {
          floorId: floor.id,
          number: roomNumber,
          capacity: 4,
          bedType: 'MATRIMONIAL',
          pricePerNight: 800,
          status: 'DISPONIBLE',
        },
      })
    }
  }

  const bethelFloors = await prisma.floor.findMany({
    where: { building: { name: 'Bethel' } },
  })

  for (const floor of bethelFloors) {
    const roomCount = floor.level === 1 ? 6 : 5
    for (let i = 1; i <= roomCount; i++) {
      const roomNumber = `${floor.level}0${i}`
      await prisma.room.upsert({
        where: { floorId_number: { floorId: floor.id, number: roomNumber } },
        update: {},
        create: {
          floorId: floor.id,
          number: roomNumber,
          capacity: 4,
          bedType: 'QUEEN',
          pricePerNight: 900,
          status: 'DISPONIBLE',
        },
      })
    }
  }
  console.log('Created rooms')

  // Create gardens
  const gardens = [
    { name: 'Sharon', capacity: 100, description: 'Jardín principal' },
    { name: 'Juda', capacity: 100, description: 'Jardín secundario' },
  ]

  for (const garden of gardens) {
    await prisma.garden.upsert({
      where: { name: garden.name },
      update: {},
      create: garden,
    })
  }
  console.log('Created gardens')

  // Create some sample furniture
  const furnitureItems = [
    { inventoryNumber: 'SILLA-001', name: 'Silla Tiffany Blanca', category: 'SILLAS', purchaseValue: 250, depreciationRate: 10, status: 'BUENO' },
    { inventoryNumber: 'SILLA-002', name: 'Silla Tiffany Negra', category: 'SILLAS', purchaseValue: 250, depreciationRate: 10, status: 'BUENO' },
    { inventoryNumber: 'MESA-001', name: 'Mesa Redonda 90cm', category: 'MESAS', purchaseValue: 450, depreciationRate: 10, status: 'BUENO' },
    { inventoryNumber: 'MESA-002', name: 'Mesa Redonda 120cm', category: 'MESAS', purchaseValue: 550, depreciationRate: 10, status: 'BUENO' },
    { inventoryNumber: 'MANTEL-001', name: 'Mantel Blanco 90x90', category: 'MANTELES', purchaseValue: 150, depreciationRate: 10, status: 'BUENO' },
    { inventoryNumber: 'MANTEL-002', name: 'Mantel Blanco 120x120', category: 'MANTELES', purchaseValue: 180, depreciationRate: 10, status: 'BUENO' },
    { inventoryNumber: 'CARPA-001', name: 'Carpa 10x10', category: 'CARPAS', purchaseValue: 3500, depreciationRate: 10, status: 'BUENO' },
    { inventoryNumber: 'CARPA-002', name: 'Carpa 20x10', category: 'CARPAS', purchaseValue: 5500, depreciationRate: 10, status: 'BUENO' },
  ]

  const now = new Date()
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

  for (const item of furnitureItems) {
    await prisma.furniture.upsert({
      where: { inventoryNumber: item.inventoryNumber },
      update: {},
      create: {
        ...item,
        currentValue: item.purchaseValue * 0.9, // 1 year depreciation
        purchaseDate: oneYearAgo,
        location: 'Almacén Principal',
      },
    })
  }
  console.log('Created sample furniture')

  // Create sample products for quotes
  const products = [
    { name: 'Filete de Res', category: 'COMIDA_MENU', unitPrice: 180, unitMeasure: 'PERSONA', description: 'Filete de res con acompañamiento' },
    { name: 'Pollorostizado', category: 'COMIDA_MENU', unitPrice: 150, unitMeasure: 'PERSONA', description: 'Pollo rostizado con verduras' },
    { name: 'Sopa de Mariscos', category: 'COMIDA_MENU', unitPrice: 120, unitMeasure: 'PERSONA', description: 'Sopa de mariscos tradicional' },
    { name: 'Silla Tiffany', category: 'MOBILIARIO', unitPrice: 50, unitMeasure: 'PIEZA', description: 'Silla Tiffany para eventos' },
    { name: 'Mesa Redonda', category: 'MOBILIARIO', unitPrice: 80, unitMeasure: 'PIEZA', description: 'Mesa redonda para 8 personas' },
    { name: 'Mantel', category: 'MOBILIARIO', unitPrice: 30, unitMeasure: 'PIEZA', description: 'Mantel para mesa' },
    { name: 'Centro de Mesa Floral', category: 'ADORNOS_DECORACION', unitPrice: 250, unitMeasure: 'PIEZA', description: 'Arreglo floral decorativo' },
    { name: 'Globos Decorativos', category: 'ADORNOS_DECORACION', unitPrice: 150, unitMeasure: 'EVENTO', description: 'Pack de globos decorativos' },
    { name: 'DJ - Sonido Básico', category: 'SERVICIOS_ADICIONALES', unitPrice: 2000, unitMeasure: 'EVENTO', description: 'Servicio de DJ con equipo básico' },
    { name: 'Fotógrafo', category: 'SERVICIOS_ADICIONALES', unitPrice: 1500, unitMeasure: 'EVENTO', description: 'Cobertura fotográfica del evento' },
    { name: 'Mesero', category: 'SERVICIOS_ADICIONALES', unitPrice: 350, unitMeasure: 'HORA', description: 'Servicio de mesero por hora' },
    { name: 'Valet Parking', category: 'SERVICIOS_ADICIONALES', unitPrice: 800, unitMeasure: 'EVENTO', description: 'Servicio de valet parking' },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { name_category: { name: product.name, category: product.category } },
      update: {},
      create: product,
    })
  }
  console.log('Created sample products')

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })