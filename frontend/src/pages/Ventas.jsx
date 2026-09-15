import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

const fmt = n => '$' + (n || 0).toLocaleString('es-MX')

export default function Ventas() {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  function load() {
    apiFetch('/api/ventas').then(r => r.json()).then(setVentas).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta venta? El stock no se repondrá automáticamente.')) return
    await apiFetch(`/api/ventas/${id}`, { method: 'DELETE' })
    load()
  }

  function fmtFecha(f) {
    return new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  const totalHoy = ventas
    .filter(v => new Date(v.fecha).toDateString() === new Date().toDateString())
    .reduce((s, v) => s + v.total, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-anton text-white text-2xl tracking-widest">VENTAS</h1>
        <button
          onClick={() => navigate('/ventas/nueva')}
          className="bg-pop-coral text-white font-montserrat font-bold text-xs px-4 py-2 rounded-lg"
        >
          + Nueva
        </button>
      </div>

      <p className="font-montserrat text-white/30 text-xs mb-5">
        Hoy: <span className="text-pop-rose font-semibold">{fmt(totalHoy)}</span>
      </p>

      {loading ? (
        <p className="font-montserrat text-white/30 text-sm text-center py-12">Cargando…</p>
      ) : ventas.length === 0 ? (
        <p className="font-montserrat text-white/25 text-sm text-center py-12">Sin ventas aún</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ventas.map(v => (
            <div key={v.id} className="bg-[#1A1A24] border border-white/6 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-montserrat text-white/70 text-sm font-medium">
                    {v.items.map(i => i.nombre).join(', ')}
                  </p>
                  <p className="font-montserrat text-white/30 text-xs mt-0.5">
                    {fmtFecha(v.fecha)} · {v.canal || 'Directo'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="font-anton text-pop-rose text-lg">{fmt(v.total)}</p>
                  <button onClick={() => eliminar(v.id)}
                    className="font-montserrat text-white/15 text-xs hover:text-red-400 transition-colors">
                    eliminar
                  </button>
                </div>
              </div>
              {v.notas && (
                <p className="font-montserrat text-white/25 text-xs mt-1.5 italic">{v.notas}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
