const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')

router.get('/', async (req, res) => {
  const { mes, categoria, estado } = req.query
  const where = {}

  if (mes) {
    const [y, m] = mes.split('-').map(Number)
    where.fecha = {
      gte: new Date(y, m - 1, 1),
      lte: new Date(y, m, 0, 23, 59, 59),
    }
  }
  if (categoria) where.categoria = categoria
  if (estado) where.estado = estado

  const gastos = await prisma.gasto.findMany({
    where,
    orderBy: { fecha: 'desc' },
    include: { pedido: { select: { id: true, proveedor: true, total: true } } },
  })
  res.json(gastos)
})

router.get('/pedidos-disponibles', async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    where: { gasto: null },
    select: { id: true, proveedor: true, total: true, fechaPedido: true },
    orderBy: { fecha: 'desc' },
  })
  res.json(pedidos)
})

router.post('/', async (req, res) => {
  const { concepto, categoria, fecha, total, estado, notas, pedidoId } = req.body
  const gasto = await prisma.gasto.create({
    data: {
      concepto,
      categoria: categoria || 'operativo',
      fecha: fecha ? new Date(fecha) : new Date(),
      total: Number(total),
      estado: estado || 'pendiente',
      notas: notas || null,
      pedidoId: pedidoId ? Number(pedidoId) : null,
    },
    include: { pedido: { select: { id: true, proveedor: true, total: true } } },
  })
  res.json(gasto)
})

router.put('/:id', async (req, res) => {
  const { concepto, categoria, fecha, total, estado, notas, pedidoId } = req.body
  const gasto = await prisma.gasto.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(concepto != null && { concepto }),
      ...(categoria != null && { categoria }),
      ...(fecha != null && { fecha: new Date(fecha) }),
      ...(total != null && { total: Number(total) }),
      ...(estado != null && { estado }),
      ...(notas !== undefined && { notas: notas || null }),
      ...(pedidoId !== undefined && { pedidoId: pedidoId ? Number(pedidoId) : null }),
    },
    include: { pedido: { select: { id: true, proveedor: true, total: true } } },
  })
  res.json(gasto)
})

router.delete('/:id', async (req, res) => {
  await prisma.gasto.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

module.exports = router
