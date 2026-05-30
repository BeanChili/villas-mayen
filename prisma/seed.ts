import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed v2...')

  // ==================== USUARIOS ====================
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { name: 'Administrador', username: 'admin', password: hashedPassword, email: 'admin@villasmayen.com', role: 'ADMIN', active: true },
  })
  console.log('Created admin:', admin.username)

  const testRoleUsers = [
    { username: 'recepcionista', name: 'Recepcionista Test', role: 'RECEPCIONISTA', password: 'recepcionista123' },
    { username: 'finanzas', name: 'Finanzas Test', role: 'FINANZAS', password: 'finanzas123' },
    { username: 'almacen', name: 'Almacen Test', role: 'ALMACEN', password: 'almacen123' },
    { username: 'visual', name: 'Visual Test', role: 'VISUAL', password: 'visual123' },
    { username: 'encargado', name: 'Encargado Test', role: 'ENCARGADO_EVENTO', password: 'encargado123' },
  ]

  for (const u of testRoleUsers) {
    const hashed = await bcrypt.hash(u.password, 10)
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { name: u.name, username: u.username, password: hashed, email: `${u.username}@villasmayen.com`, role: u.role as any, active: true },
    })
    console.log(`  ${u.username}`)
  }

  // ==================== UBICACIONES (unificadas) ====================
  const locations = [
    // FREE_AREA
    { name: 'Pérgola', type: 'FREE_AREA', capacity: 80, description: 'Espacio techado al aire libre', unitPrice: 2500 },
    { name: 'Plaza Jerusalén', type: 'FREE_AREA', capacity: 150, description: 'Plaza principal', unitPrice: 5000 },
    { name: 'Bautisterio', type: 'FREE_AREA', capacity: 50, description: 'Área para ceremonias', unitPrice: 1500 },
    { name: 'Rancho 1', type: 'FREE_AREA', capacity: 60, description: 'Rancho', unitPrice: 2000 },
    { name: 'Rancho 2', type: 'FREE_AREA', capacity: 60, description: 'Rancho', unitPrice: 2000 },
    { name: 'Monte Bienaventuranzas', type: 'FREE_AREA', capacity: 120, description: 'Área natural', unitPrice: 4000 },
    { name: 'Las Mariposas', type: 'FREE_AREA', capacity: 90, description: 'Jardín temático', unitPrice: 3000 },
    // DINING_ROOM
    { name: 'Nehemías 1', type: 'DINING_ROOM', capacity: 100, description: 'Comedor sección 1', unitPrice: 3500 },
    { name: 'Nehemías 2', type: 'DINING_ROOM', capacity: 100, description: 'Comedor sección 2', unitPrice: 3500 },
    { name: 'Josefa', type: 'DINING_ROOM', capacity: 70, description: 'Comedor intermedio', unitPrice: 2500 },
    { name: 'Magdalena', type: 'DINING_ROOM', capacity: 70, description: 'Comedor intermedio', unitPrice: 2500 },
    // HALL
    { name: 'Timoteo', type: 'HALL', capacity: 80, description: 'Salón Timoteo', unitPrice: 3000 },
    { name: 'Salem', type: 'HALL', capacity: 100, description: 'Salón grande', unitPrice: 4000 },
    { name: 'Israel', type: 'HALL', capacity: 60, description: 'Salón', unitPrice: 2500 },
    { name: 'Esther', type: 'HALL', capacity: 60, description: 'Salón', unitPrice: 2500 },
    { name: 'Jacob', type: 'HALL', capacity: 60, description: 'Salón', unitPrice: 2500 },
    { name: 'Sansón', type: 'HALL', capacity: 60, description: 'Salón', unitPrice: 2500 },
    // GARDEN
    { name: 'Sharon', type: 'GARDEN', capacity: 100, description: 'Jardín principal', unitPrice: 3500 },
    { name: 'Judá', type: 'GARDEN', capacity: 100, description: 'Jardín secundario', unitPrice: 3500 },
    // TERRACE
    { name: 'Terraza Belén', type: 'TERRACE', capacity: 60, description: 'Terraza del edificio Belén', unitPrice: 2000 },
  ]

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { name: loc.name },
      update: { type: loc.type, unitPrice: loc.unitPrice },
      create: loc,
    })
  }
  console.log(`Created ${locations.length} locations`)

  // ==================== HABITACIONES ====================
  const buildings = [{ name: 'Belén' }, { name: 'Bethel' }]
  for (const building of buildings) {
    await prisma.building.upsert({
      where: { name: building.name },
      update: {},
      create: { name: building.name, floors: { create: [{ level: 1 }, { level: 2 }] } },
    })
  }
  console.log('Created buildings')

  const belenFloors = await prisma.floor.findMany({ where: { building: { name: 'Belén' } } })
  for (const floor of belenFloors) {
    const roomCount = floor.level === 1 ? 5 : 4
    for (let i = 1; i <= roomCount; i++) {
      await prisma.room.upsert({
        where: { floorId_number: { floorId: floor.id, number: `${floor.level}0${i}` } },
        update: { pricePerPerson: 200 },
        create: { floorId: floor.id, number: `${floor.level}0${i}`, capacity: 4, bedType: 'MATRIMONIAL', pricePerNight: 800, pricePerPerson: 200, status: 'DISPONIBLE' },
      })
    }
  }

  const bethelFloors = await prisma.floor.findMany({ where: { building: { name: 'Bethel' } } })
  for (const floor of bethelFloors) {
    const roomCount = floor.level === 1 ? 6 : 5
    for (let i = 1; i <= roomCount; i++) {
      await prisma.room.upsert({
        where: { floorId_number: { floorId: floor.id, number: `${floor.level}0${i}` } },
        update: { pricePerPerson: 250 },
        create: { floorId: floor.id, number: `${floor.level}0${i}`, capacity: 4, bedType: 'QUEEN', pricePerNight: 900, pricePerPerson: 250, status: 'DISPONIBLE' },
      })
    }
  }
  console.log('Created rooms')

  // ==================== PRODUCTOS ====================
  const products = [
    // COMIDA_MENU
    { name: 'Desayuno Ejecutivo', category: 'COMIDA_MENU', menuType: 'DESAYUNO', unitPrice: 120, unitMeasure: 'PERSONA', description: 'Huevos, frijoles, plátanos, pan, café' },
    { name: 'Refacción Matutina', category: 'COMIDA_MENU', menuType: 'REFACCION', unitPrice: 80, unitMeasure: 'PERSONA', description: 'Sandwiches, jugo, fruta' },
    { name: 'Coffee Break', category: 'COMIDA_MENU', menuType: 'COFFEE_BREAK', unitPrice: 65, unitMeasure: 'PERSONA', description: 'Café, té, galletas' },
    { name: 'Almuerzo Corporativo', category: 'COMIDA_MENU', menuType: 'ALMUERZO', unitPrice: 180, unitMeasure: 'PERSONA', description: 'Filete de res con acompañamiento' },
    { name: 'Cena de Gala', category: 'COMIDA_MENU', menuType: 'CENA', unitPrice: 220, unitMeasure: 'PERSONA', description: 'Tres tiempos con vino' },
    { name: 'Pollo Rostizado', category: 'COMIDA_MENU', menuType: 'ALMUERZO', unitPrice: 150, unitMeasure: 'PERSONA', description: 'Pollo con verduras' },
    // MOBILIARIO
    { name: 'Silla Tiffany', category: 'MOBILIARIO', unitPrice: 50, unitMeasure: 'PIEZA' },
    { name: 'Mesa Redonda', category: 'MOBILIARIO', unitPrice: 80, unitMeasure: 'PIEZA' },
    { name: 'Mantel', category: 'MOBILIARIO', unitPrice: 30, unitMeasure: 'PIEZA' },
    // ADORNOS
    { name: 'Centro de Mesa Floral', category: 'ADORNOS_DECORACION', unitPrice: 250, unitMeasure: 'PIEZA' },
    { name: 'Globos Decorativos', category: 'ADORNOS_DECORACION', unitPrice: 150, unitMeasure: 'EVENTO' },
    // SERVICIOS
    { name: 'DJ - Sonido Básico', category: 'SERVICIOS_ADICIONALES', unitPrice: 2000, unitMeasure: 'EVENTO' },
    { name: 'Fotógrafo', category: 'SERVICIOS_ADICIONALES', unitPrice: 1500, unitMeasure: 'EVENTO' },
    { name: 'Mesero', category: 'SERVICIOS_ADICIONALES', unitPrice: 350, unitMeasure: 'HORA' },
    { name: 'Valet Parking', category: 'SERVICIOS_ADICIONALES', unitPrice: 0, unitMeasure: 'EVENTO', isFree: true },
    // CRISTALERÍA
    { name: 'Plato Base', category: 'PLATOS', unitPrice: 25, unitMeasure: 'PIEZA', quantity: 500 },
    { name: 'Cubierto', category: 'CUBIERTOS', unitPrice: 15, unitMeasure: 'PIEZA', quantity: 500 },
    { name: 'Pichel', category: 'PICHELES', unitPrice: 35, unitMeasure: 'PIEZA', quantity: 100 },
    { name: 'Vaso', category: 'VASOS', unitPrice: 10, unitMeasure: 'PIEZA', quantity: 500 },
    { name: 'Copa', category: 'COPAS', unitPrice: 20, unitMeasure: 'PIEZA', quantity: 300 },
  ]

  for (const product of products) {
    const data: any = { ...product }
    await prisma.product.upsert({
      where: { name_category: { name: product.name, category: product.category } },
      update: { menuType: product.menuType || null, unitPrice: product.unitPrice },
      create: data,
    })
  }
  console.log(`Created ${products.length} products`)

  // ==================== TIPO DE CAMBIO ====================
  await prisma.exchangeRate.create({
    data: { fromCurrency: 'USD', toCurrency: 'GTQ', rate: 7.85, updatedBy: 'admin' },
  })
  console.log('Created exchange rate: 1 USD = 7.85 GTQ')

  // ==================== MOBILIARIO ====================
  const furnitureItems = [
    { inventoryNumber: 'SILLA-001', name: 'Silla Tiffany Blanca', category: 'SILLAS', purchaseValue: 250, rentalPrice: 50, depreciationRate: 10, status: 'BUENO' },
    { inventoryNumber: 'SILLA-002', name: 'Silla Tiffany Negra', category: 'SILLAS', purchaseValue: 250, rentalPrice: 50, depreciationRate: 10, status: 'BUENO' },
    { inventoryNumber: 'MESA-001', name: 'Mesa Redonda 90cm', category: 'MESAS', purchaseValue: 450, rentalPrice: 80, depreciationRate: 10, status: 'BUENO' },
    { inventoryNumber: 'MESA-002', name: 'Mesa Redonda 120cm', category: 'MESAS', purchaseValue: 550, rentalPrice: 100, depreciationRate: 10, status: 'BUENO' },
    { inventoryNumber: 'CARPA-001', name: 'Carpa 10x10', category: 'CARPAS', purchaseValue: 3500, rentalPrice: 500, depreciationRate: 10, status: 'BUENO' },
    { inventoryNumber: 'MANTEL-001', name: 'Mantel Blanco 120x120', category: 'MANTELES', purchaseValue: 80, rentalPrice: 30, depreciationRate: 10, status: 'BUENO' },
    { inventoryNumber: 'MANTEL-002', name: 'Mantel Blanco 90x90', category: 'MANTELES', purchaseValue: 60, rentalPrice: 25, depreciationRate: 10, status: 'BUENO' },
  ]
  const oneYearAgo = new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate())
  for (const item of furnitureItems) {
    await prisma.furniture.upsert({
      where: { inventoryNumber: item.inventoryNumber },
      update: { 
        rentalPrice: item.rentalPrice,
        currentValue: item.purchaseValue * 0.9,
      },
      create: { ...item, currentValue: item.purchaseValue * 0.9, purchaseDate: oneYearAgo, location: 'Almacén Principal' },
    })
  }
  console.log('Created furniture')

  console.log('Seed v2 completed!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
