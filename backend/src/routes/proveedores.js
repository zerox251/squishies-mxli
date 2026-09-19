const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')

router.get('/', async (req, res) => {
  const items = await prisma.proveedor.findMany({ orderBy: { nombre: 'asc' } })
  res.json(items)
})

router.post('/', async (req, res) => {
  try {
    const { nombre, pais, contacto, telefono, email, notas } = req.body
    const item = await prisma.proveedor.create({
      data: { nombre, pais: pais || 'MX', contacto: contacto || null, telefono: telefono || null, email: email || null, notas: notas || null },
    })
    res.json(item)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { nombre, pais, contacto, telefono, email, notas } = req.body
    const data = {}
    if (nombre   !== undefined) data.nombre   = nombre
    if (pais     !== undefined) data.pais      = pais
    if (contacto !== undefined) data.contacto  = contacto  || null
    if (telefono !== undefined) data.telefono  = telefono  || null
    if (email    !== undefined) data.email     = email     || null
    if (notas    !== undefined) data.notas     = notas     || null
    const item = await prisma.proveedor.update({ where: { id: Number(req.params.id) }, data })
    res.json(item)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.proveedor.delete({ where: { id: Number(req.params.id) } })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
