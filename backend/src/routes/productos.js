const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')

router.get('/', async (req, res) => {
  const items = await prisma.squishy.findMany({ orderBy: { nombre: 'asc' } })
  res.json(items)
})

router.post('/', async (req, res) => {
  const { nombre, precio, costo, stock } = req.body
  const item = await prisma.squishy.create({ data: { nombre, precio, costo, stock } })
  res.json(item)
})

router.put('/:id', async (req, res) => {
  const { nombre, precio, costo, stock, activo } = req.body
  const item = await prisma.squishy.update({
    where: { id: Number(req.params.id) },
    data: { nombre, precio, costo, stock, activo },
  })
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
