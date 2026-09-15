import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

const CANALES = ['Instagram', 'Bazar', 'Directo', 'Otro']

export default function NuevaVenta() {
  const [productos, setProductos] = useState([])
  const [canal, setCanal] = useState('Directo')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    apiFetch('/api/productos').then(r => r.json()).then(ps =>
      setProductos(ps.filter(p => p.activo && p.stock > 0))
    )
  }, [])

  function addItem(p) {
    setItems(prev => {
      const ex = prev.find(i => i.squishyId === p.id)
      if (ex) return prev.map(i => i.squishyId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...prev, { squishyId: p.id, nombre: p.nombre, cantidad: 1, precio: p.precio, costo: p.costo }]
    })
  }

  function removeItem(id) { setItems(prev => prev.filter(i => i.squishyId !== id)) }
  function setCant(id, val) {
    const n = Math.max(1, Number(val))
    setItems(prev => prev.map(i => i.squishyId === id ? { ...i, cantidad: n } : i))
  }
  function setPrecio(id, val) {
    setItems(prev => prev.map(i => i.squishyId === id ? { ...i, precio: Number(val) } : i))
  }

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const fmt = n => '$' + (n || 0).toLocaleString('es-MX')

  async function guardar() {
    if (items.length === 0) return
    setSaving(true)
    try {
      const res = await apiFetch('/api/ventas', {
        method: 'POST',
        body: JSON.stringify({ canal, notas, items }),
      })
      if (res.ok) navigate('/ventas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="font-anton text-white text-2xl tracking-widest mb-5">REGISTRAR VENTA</h1>

      {/* Canal */}
      <div className="mb-4">
        <p className="font-montserrat text-white/40 text-xs mb-2">Canal de venta</p>
        <div className="flex gap-2 flex-wrap">
          {CANALES.map(c => (
            <button
              key={c}
              onClick={() => setCanal(c)}
              className={`font-montserrat text-xs px-3 py-1.5 rounded-full border transition-colors
                ${canal === c
                  ? 'bg-pop-coral border-pop-coral text-white'
                  : 'border-white/15 text-white/40 hover:border-white/30'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Productos disponibles */}
      <div className="mb-4">
        <p className="font-montserrat text-white/40 text-xs mb-2">Agregar productos</p>
        <div className="flex gap-2 flex-wrap">
          {productos.map(p => (
            <button
              key={p.id}
              onClick={() => addItem(p)}
              className="bg-[#1A1A24] border border-white/8 rounded-xl px-3 py-2 text-left
                         hover:border-pop-coral/40 transition-colors"
            >
              <p className="font-montserrat text-white/70 text-xs font-medium">{p.nombre}</p>
              <p className="font-montserrat text-pop-rose text-xs">${p.precio} · {p.stock} disponibles</p>
            </button>
          ))}
        </div>
      </div>

      {/* Items en la venta */}
      {items.length > 0 && (
        <div className="bg-[#1A1A24] border border-white/6 rounded-2xl overflow-hidden mb-4">
          {items.map(item => (
            <div key={item.squishyId} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
              <div className="flex-1">
                <p className="font-montserrat text-white/80 text-sm">{item.nombre}</p>
                <div className="flex gap-2 mt-1 items-center">
                  <span className="font-montserrat text-white/35 text-xs">Cant:</span>
                  <input
                    type="number" min="1" value={item.cantidad}
                    onChange={e => setCant(item.squishyId, e.target.value)}
                    className="w-14 bg-[#0F0F13] border border-white/10 rounded px-2 py-0.5
                               text-white text-xs font-montserrat focus:outline-none"
                  />
                  <span className="font-montserrat text-white/35 text-xs">Precio:</span>
                  <input
                    type="number" value={item.precio}
                    onChange={e => setPrecio(item.squishyId, e.target.value)}
                    className="w-20 bg-[#0F0F13] border border-white/10 rounded px-2 py-0.5
                               text-white text-xs font-montserrat focus:outline-none"
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="font-montserrat text-pop-rose text-sm font-semibold">
                  {fmt(item.precio * item.cantidad)}
                </p>
                <button onClick={() => removeItem(item.squishyId)}
                  className="font-montserrat text-white/20 text-xs hover:text-red-400">
                  quitar
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 bg-white/3">
            <span className="font-montserrat text-white/50 text-sm">Total</span>
            <span className="font-anton text-white text-xl">{fmt(total)}</span>
          </div>
        </div>
      )}

      {/* Notas */}
      <div className="mb-5">
        <label className="font-montserrat text-white/40 text-xs mb-1.5 block">Notas (opcional)</label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={2}
          placeholder="Pago con tarjeta, cliente regular…"
          className="w-full bg-[#1A1A24] border border-white/8 rounded-lg px-3 py-2.5
                     text-white/80 text-sm font-montserrat placeholder-white/20
                     focus:outline-none focus:border-pop-coral/40 resize-none"
        />
      </div>

      <button
        onClick={guardar}
        disabled={saving || items.length === 0}
        className="w-full bg-pop-coral hover:opacity-90 disabled:opacity-40 text-white
                   font-montserrat font-bold text-sm py-3.5 rounded-xl transition-opacity"
      >
        {saving ? 'Guardando…' : `Guardar Venta · ${fmt(total)}`}
      </button>
    </div>
  )
}
