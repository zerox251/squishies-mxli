const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')

router.get('/', async (req, res) => {
  const pedidos = await prisma.pedido.findMany({ orderBy: { fecha: 'desc' } })
  res.json(pedidos)
})

router.post('/', async (req, res) => {
  const { proveedor, total, notas, fechaPedido, fechaLlegada, imagen } = req.body
  const pedido = await prisma.pedido.create({
    data: {
      proveedor, total, notas,
      fechaPedido: fechaPedido ? new Date(fechaPedido) : null,
      fechaLlegada: fechaLlegada ? new Date(fechaLlegada) : null,
      imagen: imagen || null,
    },
  })
  res.json(pedido)
})

router.put('/:id', async (req, res) => {
  const { proveedor, total, status, notas, fechaPedido, fechaLlegada, imagen } = req.body
  const pedido = await prisma.pedido.update({
    where: { id: Number(req.params.id) },
    data: {
      proveedor, total, status, notas,
      fechaPedido: fechaPedido ? new Date(fechaPedido) : null,
      fechaLlegada: fechaLlegada ? new Date(fechaLlegada) : null,
      imagen: imagen !== undefined ? imagen : undefined,
    },
  })
  res.json(pedido)
})

router.delete('/:id', async (req, res) => {
  await prisma.pedido.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

module.exports = router
