const express = require('express')
const router  = express.Router()
const prisma  = require('../lib/prisma')

async function syncMontoPagado(pedidoId) {
  const agg = await prisma.pago.aggregate({
    where: { pedidoId },
    _sum:  { monto: true },
  })
  const montoPagado = agg._sum.monto || 0
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId }, select: { total: true } })
  const status  = pedido && montoPagado >= pedido.total ? 'pagado' : 'pendiente'
  await prisma.pedido.update({ where: { id: pedidoId }, data: { montoPagado, status } })
}

router.get('/', async (req, res) => {
  const { pedidoId } = req.query
  if (!pedidoId) return res.json([])
  const pagos = await prisma.pago.findMany({
    where:   { pedidoId: Number(pedidoId) },
    orderBy: { fecha: 'asc' },
  })
  res.json(pagos)
})

router.post('/', async (req, res) => {
  try {
    const { pedidoId, monto, fecha, metodoPago, nota } = req.body
    const pago = await prisma.pago.create({
      data: {
        pedidoId: Number(pedidoId),
        monto:    Number(monto),
        fecha:    new Date(fecha),
        metodoPago: metodoPago || null,
        nota:       nota       || null,
      },
    })
    await syncMontoPagado(Number(pedidoId))
    res.json(pago)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.patch('/:id', async (req, res) => {
  try {
    const { monto, fecha, metodoPago, nota } = req.body
    const pago = await prisma.pago.update({
      where: { id: Number(req.params.id) },
      data:  {
        monto:      monto !== undefined ? Number(monto) : undefined,
        fecha:      fecha ? new Date(fecha) : undefined,
        metodoPago: metodoPago !== undefined ? metodoPago || null : undefined,
        nota:       nota       !== undefined ? nota       || null : undefined,
      },
    })
    await syncMontoPagado(pago.pedidoId)
    res.json(pago)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const pago = await prisma.pago.delete({ where: { id: Number(req.params.id) } })
    await syncMontoPagado(pago.pedidoId)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
