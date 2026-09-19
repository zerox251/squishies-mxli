const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')

router.get('/', async (req, res) => {
  const items = await prisma.squishy.findMany({ orderBy: { nombre: 'asc' } })
  res.json(items)
})

router.post('/', async (req, res) => {
  try {
    const { nombre, descripcion, precio, costo, stock } = req.body
    const item = await prisma.squishy.create({ data: { nombre, descripcion: descripcion || null, precio, costo, stock } })
    res.json(item)
  } catch (e) {
    console.error('POST /productos:', e.message)
    res.status(500).json({ error: e.message })
  }
})

router.put('/:id', async (req, res) => {
  const { nombre, descripcion, precio, costo, stock, activo } = req.body
  const data = {}
  if (nombre     !== undefined) data.nombre     = nombre
  if (descripcion !== undefined) data.descripcion = descripcion || null
  if (precio     !== undefined) data.precio     = precio
  if (costo      !== undefined) data.costo      = costo
  if (stock      !== undefined) data.stock      = stock
  if (activo     !== undefined) data.activo     = activo
  const item = await prisma.squishy.update({ where: { id: Number(req.params.id) }, data })
  res.json(item)
})

router.delete('/:id', async (req, res) => {
  await prisma.squishy.update({
    where: { id: Number(req.params.id) },
    data: { activo: false },
  })
  res.json({ ok: true })
})

module.exports = router
