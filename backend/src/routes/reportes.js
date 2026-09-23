const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')

router.get('/negocio', async (req, res) => {
  const hoy = new Date()
  const hace90 = new Date(hoy); hace90.setDate(hoy.getDate() - 90)
  const hace30 = new Date(hoy); hace30.setDate(hoy.getDate() - 30)
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  const [ventas, squishys, pedidos, gastosAggreg] = await Promise.all([
    prisma.venta.findMany({ include: { items: true }, orderBy: { fecha: 'asc' } }),
    prisma.squishy.findMany({ where: { activo: true } }),
    prisma.pedido.findMany(),
    prisma.gasto.aggregate({
      where: { fecha: { gte: inicioMes } },
      _sum: { total: true },
      _count: true,
    }),
  ])

  // Ventas por mes
  const porMesMap = {}
  for (const v of ventas) {
    const key = v.fecha.toISOString().slice(0, 7)
    if (!porMesMap[key]) porMesMap[key] = { total: 0, count: 0 }
    porMesMap[key].total += v.total
    porMesMap[key].count += 1
  }
  const meses = Object.entries(porMesMap).sort((a, b) => a[0].localeCompare(b[0]))
  const porMes = meses.map(([mes, d], i) => {
    const prev = i > 0 ? meses[i - 1][1].total : null
    const growth = prev ? ((d.total - prev) / prev) * 100 : null
    return { mes, ...d, growth }
  })

  // Ventas por canal
  const porCanalMap = {}
  for (const v of ventas) {
    const c = v.canal || 'Directo'
    if (!porCanalMap[c]) porCanalMap[c] = { total: 0, count: 0 }
    porCanalMap[c].total += v.total
    porCanalMap[c].count += 1
  }
  const porCanal = Object.entries(porCanalMap).map(([canal, d]) => ({
    canal, ...d, ticketPromedio: d.count ? d.total / d.count : 0,
  }))

  // Inventario
  const inventarioCosto = squishys.reduce((s, p) => s + (p.costo || 0) * p.stock, 0)
  const valorPrecioVenta = squishys.reduce((s, p) => s + p.precio * p.stock, 0)
  const unidades = squishys.reduce((s, p) => s + p.stock, 0)

  // Stock muerto (sin ventas en 30 días)
  const ventasRecientes = await prisma.ventaItem.findMany({
    where: { venta: { fecha: { gte: hace30 } }, squishyId: { not: null } },
    select: { squishyId: true },
  })
  const conVentas = new Set(ventasRecientes.map(v => v.squishyId))
  const stockMuerto = squishys.filter(p => p.stock > 0 && !conVentas.has(p.id))
    .sort((a, b) => (b.costo || 0) * b.stock - (a.costo || 0) * a.stock)

  // Promedios
  const ultimos3 = meses.slice(-3)
  const ultimos6 = meses.slice(-6)
  const prom3 = ultimos3.length ? ultimos3.reduce((s, [, v]) => s + v.total, 0) / ultimos3.length : 0
  const prom6 = ultimos6.length ? ultimos6.reduce((s, [, v]) => s + v.total, 0) / ultimos6.length : 0

  // Pedidos
  const deuda = pedidos.filter(p => p.status === 'pendiente').reduce((s, p) => s + p.total, 0)
  const transito = pedidos.filter(p =>
    ['pagado', 'pendiente'].includes(p.status) &&
    (!p.fechaLlegada || new Date(p.fechaLlegada) > hoy)
  )

  res.json({
    ventas: {
      total: ventas.length,
      totalVentasMXN: ventas.reduce((s, v) => s + v.total, 0),
      promedioMensual3m: prom3,
      promedioMensual6m: prom6,
      porMes,
      porCanal,
    },
    inventario: {
      unidades,
      valorPrecioVenta,
      valorCosto: inventarioCosto,
      stockMuerto: { productos: stockMuerto, totalProductos: stockMuerto.length },
    },
    pedidos: {
      total: pedidos.length,
      deudaProveedores: deuda,
      pedidosEnTransito: { monto: transito.reduce((s, p) => s + p.total, 0), count: transito.length },
    },
    gastos: {
      totalMes: gastosAggreg._sum.total || 0,
      countMes: gastosAggreg._count || 0,
    },
  })
})

module.exports = router
