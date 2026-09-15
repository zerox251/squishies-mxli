const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')

router.get('/', async (req, res) => {
  const bazares = await prisma.bazar.findMany({
    include: { items: { include: { squishy: true } } },
    orderBy: { fecha: 'desc' },
  })
  res.json(bazares)
})

router.post('/', async (req, res) => {
  const { nombre } = req.body
  const bazar = await prisma.bazar.create({ data: { nombre } })
  res.json(bazar)
})

// Enviar items al bazar (descuenta stock)
router.post('/:id/items', async (req, res) => {
  const bazarId = Number(req.params.id)
  const { squishyId, cantidadEnviada } = req.body

  const squishy = await prisma.squishy.findUnique({ where: { id: squishyId } })
  if (!squishy || squishy.stock < cantidadEnviada) {
    return res.status(400).json({ error: 'Stock insuficiente' })
  }

  const item = await prisma.bazarItem.create({
    data: { bazarId, squishyId, cantidadEnviada },
    include: { squishy: true },
  })
  await prisma.squishy.update({
    where: { id: squishyId },
    data: { stock: { decrement: cantidadEnviada } },
  })
  res.json(item)
})

// Registrar regreso (aumenta stock con lo que volvió)
router.put('/:id/items/:itemId/regreso', async (req, res) => {
  const { cantidadRegreso } = req.body
  const item = await prisma.bazarItem.findUnique({ where: { id: Number(req.params.itemId) } })
  if (!item) return res.status(404).json({ error: 'Item no encontrado' })

  const vendidos = item.cantidadEnviada - cantidadRegreso

  await prisma.bazarItem.update({
    where: { id: item.id },
    data: { cantidadRegreso },
  })

  // Regresa lo que no se vendió al inventario
  await prisma.squishy.update({
    where: { id: item.squishyId },
    data: { stock: { increment: cantidadRegreso } },
  })

  // Genera venta automática por lo vendido en el bazar
  if (vendidos > 0) {
    const squishy = await prisma.squishy.findUnique({ where: { id: item.squishyId } })
    const bazar = await prisma.bazar.findUnique({ where: { id: item.bazarId } })
    await prisma.venta.create({
      data: {
        canal: bazar.nombre,
        total: vendidos * squishy.precio,
        items: {
          create: [{
            squishyId: squishy.id,
            nombre: squishy.nombre,
            cantidad: vendidos,
            precio: squishy.precio,
            costo: squishy.costo,
          }],
        },
      },
    })
  }

  res.json({ ok: true, vendidos })
})

router.delete('/:id', async (req, res) => {
  await prisma.bazar.update({
    where: { id: Number(req.params.id) },
    data: { activo: false },
  })
  res.json({ ok: true })
})

module.exports = router
