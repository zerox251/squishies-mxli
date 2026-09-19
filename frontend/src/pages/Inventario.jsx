import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

const EMPTY = { nombre: '', descripcion: '', precio: '', costo: '', stock: '' }

export default function Inventario() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  function load() {
    apiFetch('/api/productos').then(r => r.json()).then(setItems).finally(() => setLoading(false))
  }

  useEffect(load, [])

  function openNew() { setForm(EMPTY); setEditId(null); setModal(true) }
  function openEdit(p) {
    setForm({ nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio, costo: p.costo ?? '', stock: p.stock })
    setEditId(p.id)
    setModal(true)
  }

  async function save() {
    if (!form.nombre || !form.precio) return
    setSaving(true)
    const body = {
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      precio: Number(form.precio),
      costo: form.costo ? Number(form.costo) : null,
      stock: Number(form.stock) || 0,
    }
    const path = editId ? `/api/productos/${editId}` : '/api/productos'
    await apiFetch(path, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(body) })
    setSaving(false)
    setModal(false)
    load()
  }

  async function deactivate(id) {
    if (!confirm('¿Desactivar este producto?')) return
    await apiFetch(`/api/productos/${id}`, { method: 'DELETE' })
    load()
  }

  const fmt = n => '$' + (Number(n) || 0).toLocaleString('es-MX')

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-anton text-white text-2xl tracking-widest">INVENTARIO</h1>
        <button
          onClick={openNew}
          className="bg-pop-coral text-white font-montserrat font-bold text-xs px-4 py-2 rounded-lg"
        >
          + Nuevo
        </button>
      </div>

      {loading ? (
        <p className="font-montserrat text-white/30 text-sm text-center py-12">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="font-montserrat text-white/25 text-sm text-center py-12">Sin productos aún</p>
      ) : (
        <div className="bg-[#1A1A24] border border-white/6 rounded-2xl overflow-hidden">
          {/* Header — solo visible en md+ */}
          <div className="hidden md:grid grid-cols-5 px-4 py-2.5 border-b border-white/5">
            {['Nombre', 'Stock', 'Precio', 'Costo', ''].map(h => (
              <span key={h} className="font-montserrat text-white/25 text-xs">{h}</span>
            ))}
          </div>

          {items.map((item, i) => (
            <div
              key={item.id}
              className={`flex flex-col gap-1 px-4 py-3 border-b border-white/5 last:border-0
                          md:grid md:grid-cols-5 md:items-center
                          ${!item.activo ? 'opacity-40' : ''}`}
            >
              <div>
                <span className="font-montserrat text-white/80 text-sm font-medium">{item.nombre}</span>
                {item.descripcion && (
                  <p className="font-montserrat text-white/25 text-[10px] truncate">{item.descripcion}</p>
                )}
              </div>
              <div className="flex items-center gap-3 md:block">
                <span className={`font-montserrat text-sm font-bold
                  ${item.stock <= 0 ? 'text-red-400' : item.stock <= 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {item.stock} uds
                </span>
                <span className="font-montserrat text-pop-rose text-sm md:hidden">{fmt(item.precio)}</span>
              </div>
              <span className="font-montserrat text-white/60 text-sm hidden md:block">{fmt(item.precio)}</span>
              <span className="font-montserrat text-white/35 text-xs">{item.costo ? fmt(item.costo) : '—'}</span>
              <div className="flex gap-2 mt-1 md:mt-0">
                <button onClick={() => openEdit(item)}
                  className="font-montserrat text-xs text-pop-lav hover:text-white transition-colors">
                  Editar
                </button>
                {item.activo && (
                  <button onClick={() => deactivate(item.id)}
                    className="font-montserrat text-xs text-white/20 hover:text-red-400 transition-colors">
                    Baja
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A24] border border-white/10 rounded-t-2xl md:rounded-2xl p-5 w-full md:max-w-md">
            <h2 className="font-anton text-white text-lg tracking-wider mb-4">
              {editId ? 'EDITAR' : 'NUEVO PRODUCTO'}
            </h2>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Nombre', key: 'nombre', type: 'text', placeholder: 'Squishy unicornio' },
                { label: 'Descripción (opcional)', key: 'descripcion', type: 'text', placeholder: 'Pack de 24 pzas, colores surtidos…' },
                { label: 'Precio venta ($)', key: 'precio', type: 'number', placeholder: '150' },
                { label: 'Costo ($)', key: 'costo', type: 'number', placeholder: '60' },
                { label: 'Stock inicial', key: 'stock', type: 'number', placeholder: '0' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="font-montserrat text-white/40 text-xs mb-1 block">{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                               text-white text-sm font-montserrat placeholder-white/20
                               focus:outline-none focus:border-pop-coral/50"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(false)}
                className="flex-1 border border-white/10 text-white/40 font-montserrat text-sm py-2.5 rounded-lg">
                Cancelar
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 bg-pop-coral text-white font-montserrat font-bold text-sm py-2.5 rounded-lg disabled:opacity-50">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
