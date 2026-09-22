const express = require('express')
const router  = express.Router()
const prisma  = require('../lib/prisma')

const includeItems = {
  items: { include: { squishy: { select: { id: true, nombre: true, costo: true, stock: true } } } },
  squishy: { select: { id: true, nombre: true, stock: true } },
}

router.get('/', async (req, res) => {
  const kits = await prisma.kit.findMany({
    where:   { activo: true },
    include: includeItems,
    orderBy: { creadoEn: 'desc' },
  })
  res.json(kits)
})

router.post('/', async (req, res) => {
  try {
    const { nombre, costoBolsa, comision, precio, items } = req.body

    // calcular costo total para el squishy vinculado
    const costoCalculado = items.reduce((s, it) => s + (it.costo || 0) * it.cantidad, 0)
      + Number(costoBolsa || 0) + Number(comision || 0)

    // crear el squishy producto del kit
    const squishyKit = await prisma.squishy.create({
      data: {
        nombre,
        precio: Number(precio),
        costo:  Math.round(costoCalculado * 100) / 100,
        stock:  0,
        activo: true,
      },
    })

    const kit = await prisma.kit.create({
      data: {
        nombre,
        costoBolsa: Number(costoBolsa || 0),
        comision:   Number(comision   || 0),
        precio:     Number(precio     || 0),
        squishyId:  squishyKit.id,
        items: {
          create: items.map(it => ({ squishyId: it.squishyId, cantidad: it.cantidad })),
        },
      },
      include: includeItems,
    })
    res.json(kit)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const { nombre, costoBolsa, comision, precio, items } = req.body
    const id = Number(req.params.id)

    const costoCalculado = items.reduce((s, it) => s + (it.costo || 0) * it.cantidad, 0)
      + Number(costoBolsa || 0) + Number(comision || 0)

    // reemplazar items
    await prisma.kitItem.deleteMany({ where: { kitId: id } })

    const kit = await prisma.kit.update({
      where: { id },
      data: {
        nombre,
        costoBolsa: Number(costoBolsa || 0),
        comision:   Number(comision   || 0),
        precio:     Number(precio     || 0),
        items: {
          create: items.map(it => ({ squishyId: it.squishyId, cantidad: it.cantidad })),
        },
      },
      include: includeItems,
    })

    // sincronizar squishy vinculado
    if (kit.squishyId) {
      await prisma.squishy.update({
        where: { id: kit.squishyId },
        data:  { nombre, precio: Number(precio), costo: Math.round(costoCalculado * 100) / 100 },
      })
    }
    res.json(kit)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const id  = Number(req.params.id)
    const kit = await prisma.kit.findUnique({ where: { id } })
    await prisma.kit.update({ where: { id }, data: { activo: false } })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/kits/:id/armar — armar N kits
router.post('/:id/armar', async (req, res) => {
  try {
    const id       = Number(req.params.id)
    const cantidad = Number(req.body.cantidad) || 1

    const kit = await prisma.kit.findUnique({
      where:   { id },
      include: { items: { include: { squishy: true } } },
    })
    if (!kit) return res.status(404).json({ error: 'Kit no encontrado' })

    // verificar stock suficiente
    for (const item of kit.items) {
      const needed = item.cantidad * cantidad
      if (item.squishy.stock < needed) {
        return res.status(400).json({
          error: `Stock insuficiente: ${item.squishy.nombre} (necesitas ${needed}, tienes ${item.squishy.stock})`
        })
      }
    }

    // descontar componentes y agregar al kit
    await prisma.$transaction([
      ...kit.items.map(item =>
        prisma.squishy.update({
          where: { id: item.squishyId },
          data:  { stock: { decrement: item.cantidad * cantidad } },
        })
      ),
      ...(kit.squishyId ? [
        prisma.squishy.update({
          where: { id: kit.squishyId },
          data:  { stock: { increment: cantidad } },
        })
      ] : []),
    ])

    res.json({ ok: true, armados: cantidad })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
