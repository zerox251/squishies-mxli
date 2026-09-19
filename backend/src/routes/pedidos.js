const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')

const includeProveedor = { proveedor: true }

router.get('/', async (req, res) => {
  const { mes, proveedorId, pais } = req.query
  const where = {}

  if (mes) {
    const [y, m] = mes.split('-').map(Number)
    where.fechaPedido = {
      gte: new Date(y, m - 1, 1),
      lt:  new Date(y, m, 1),
    }
  }
  if (proveedorId) {
    where.proveedorId = Number(proveedorId)
  }
  if (pais) {
    where.proveedor = { pais }
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: { fechaPedido: 'desc' },
    include: includeProveedor,
  })
  res.json(pedidos)
})

router.post('/', async (req, res) => {
  try {
    const { proveedorId, total, notas, fechaPedido, fechaLlegada, imagen, documento } = req.body
    const pedido = await prisma.pedido.create({
      data: {
        proveedorId: proveedorId ? Number(proveedorId) : null,
        total: Number(total),
        notas: notas || null,
        fechaPedido:  fechaPedido  ? new Date(fechaPedido)  : null,
        fechaLlegada: fechaLlegada ? new Date(fechaLlegada) : null,
        imagen:    imagen    || null,
        documento: documento || null,
      },
      include: includeProveedor,
    })
    res.json(pedido)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { proveedorId, total, status, notas, fechaPedido, fechaLlegada, imagen, documento } = req.body
    const pedido = await prisma.pedido.update({
      where: { id: Number(req.params.id) },
      data: {
        proveedorId:  proveedorId !== undefined ? (proveedorId ? Number(proveedorId) : null) : undefined,
        total:        total   !== undefined ? Number(total) : undefined,
        status:       status  || undefined,
        notas:        notas   !== undefined ? notas   : undefined,
        fechaPedido:  fechaPedido  !== undefined ? (fechaPedido  ? new Date(fechaPedido)  : null) : undefined,
        fechaLlegada: fechaLlegada !== undefined ? (fechaLlegada ? new Date(fechaLlegada) : null) : undefined,
        imagen:       imagen    !== undefined ? imagen    : undefined,
        documento:    documento !== undefined ? documento : undefined,
      },
      include: includeProveedor,
    })
    res.json(pedido)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  await prisma.pedido.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

module.exports = router
