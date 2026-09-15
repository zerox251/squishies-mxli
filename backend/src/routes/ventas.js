const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')

router.get('/', async (req, res) => {
  const ventas = await prisma.venta.findMany({
    include: { items: true },
    orderBy: { fecha: 'desc' },
  })
  res.json(ventas)
})

router.post('/', async (req, res) => {
  const { canal, notas, items } = req.body
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0)

  const venta = await prisma.venta.create({
    data: {
      canal,
      notas,
      total,
      items: {
        create: items.map(i => ({
          squishyId: i.squishyId || null,
          nombre: i.nombre,
          cantidad: i.cantidad,
          precio: i.precio,
          costo: i.costo || null,
        })),
      },
    },
    include: { items: true },
  })

  // Descontar stock
  for (const item of items) {
    if (item.squishyId) {
      await prisma.squishy.update({
        where: { id: item.squishyId },
        data: { stock: { decrement: item.cantidad } },
      })
    }
  }

  res.json(venta)
})

router.delete('/:id', async (req, res) => {
  await prisma.venta.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

module.exports = router
