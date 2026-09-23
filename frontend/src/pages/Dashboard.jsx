import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useNavigate } from 'react-router-dom'

function KPI({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-[#1A1A24] border border-white/6 rounded-2xl p-4">
      <p className="font-montserrat text-white/35 text-xs mb-1">{label}</p>
      <p className={`font-anton text-2xl tracking-wide ${color}`}>{value}</p>
      {sub && <p className="font-montserrat text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  )
}

const fmt = n => '$' + (n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    apiFetch('/api/reportes/negocio')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <p className="font-montserrat text-white/30 text-sm">Cargando…</p>
    </div>
  )

  const v = data?.ventas || {}
  const inv = data?.inventario || {}
  const ped = data?.pedidos || {}
  const gas = data?.gastos || {}
  const mesActual = v.porMes?.at(-1)
  const mesAnterior = v.porMes?.at(-2)

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-anton text-white text-2xl tracking-widest">DASHBOARD</h1>
        <span className="font-montserrat text-white/25 text-xs">
          {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <KPI
          label="Ventas este mes"
          value={fmt(mesActual?.total)}
          sub={mesActual?.growth != null
            ? `${mesActual.growth >= 0 ? '+' : ''}${mesActual.growth.toFixed(1)}% vs mes ant.`
            : '—'}
          color={mesActual?.growth >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <KPI
          label="Unidades en stock"
          value={inv.unidades ?? '—'}
          sub={`Valor: ${fmt(inv.valorCosto)}`}
        />
        <KPI
          label="Ventas totales"
          value={v.total ?? '—'}
          sub={`Total: ${fmt(v.totalVentasMXN)}`}
          color="text-pop-rose"
        />
        <KPI
          label="Deuda proveed."
          value={fmt(ped.deudaProveedores)}
          sub={ped.pedidosEnTransito?.count ? `${ped.pedidosEnTransito.count} en tránsito` : ''}
          color={ped.deudaProveedores > 0 ? 'text-yellow-400' : 'text-white'}
        />
        <KPI
          label="Gastos este mes"
          value={fmt(gas.totalMes)}
          sub={gas.countMes ? `${gas.countMes} gasto${gas.countMes > 1 ? 's' : ''} registrado${gas.countMes > 1 ? 's' : ''}` : '—'}
          color={gas.totalMes > 0 ? 'text-red-400' : 'text-white'}
        />
      </div>

      {/* Ventas por mes */}
      {v.porMes?.length > 0 && (
        <div className="bg-[#1A1A24] border border-white/6 rounded-2xl p-4 mb-4">
          <p className="font-montserrat text-white/40 text-xs mb-3">Ventas por mes</p>
          {[...v.porMes].reverse().slice(0, 6).map(m => {
            const max = Math.max(...v.porMes.map(x => x.total))
            const pct = max > 0 ? (m.total / max) * 100 : 0
            const [y, mo] = m.mes.split('-')
            const label = new Date(Number(y), Number(mo) - 1)
              .toLocaleString('es-MX', { month: 'short', year: '2-digit' })
            return (
              <div key={m.mes} className="flex items-center gap-2 py-1.5">
                <span className="font-montserrat text-white/35 text-xs w-12">{label}</span>
                <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-pop-coral/60 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-montserrat text-white/60 text-xs w-20 text-right">{fmt(m.total)}</span>
                {m.growth != null && (
                  <span className={`font-montserrat text-xs w-12 text-right ${m.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {m.growth >= 0 ? '+' : ''}{m.growth.toFixed(1)}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Stock muerto */}
      {inv.stockMuerto?.totalProductos > 0 && (
        <div className="bg-[#1A1A24] border border-yellow-500/20 rounded-2xl p-4 mb-4">
          <p className="font-montserrat text-yellow-400/80 text-xs mb-2">
            ⚠ {inv.stockMuerto.totalProductos} productos sin ventas en 30 días
          </p>
          {inv.stockMuerto.productos.slice(0, 3).map(p => (
            <div key={p.id} className="flex justify-between py-1">
              <span className="font-montserrat text-white/50 text-xs">{p.nombre}</span>
              <span className="font-montserrat text-white/40 text-xs">{p.stock} uds</span>
            </div>
          ))}
        </div>
      )}

      {/* Acción rápida */}
      <button
        onClick={() => navigate('/ventas/nueva')}
        className="w-full bg-pop-coral hover:opacity-90 text-white font-montserrat
                   font-bold text-sm py-3.5 rounded-xl transition-opacity"
      >
        + Registrar Venta
      </button>
    </div>
  )
}
