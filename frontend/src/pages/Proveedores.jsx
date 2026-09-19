import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

const PAISES = ['MX', 'US', 'CN', 'JP']
const PAIS_COLOR = {
  MX: 'border-green-500/40 bg-green-500/10 text-green-400',
  US: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  CN: 'border-red-500/40 bg-red-500/10 text-red-400',
  JP: 'border-pink-500/40 bg-pink-500/10 text-pink-400',
}
const EMPTY = { nombre: '', pais: 'MX', contacto: '', telefono: '', email: '', notas: '' }

export default function Proveedores() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(EMPTY)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)

  function load() {
    apiFetch('/api/proveedores').then(r => r.json()).then(setItems).finally(() => setLoading(false))
  }
  useEffect(load, [])

  function openNew()  { setForm(EMPTY); setEditId(null); setModal(true) }
  function openEdit(p) {
    setForm({ nombre: p.nombre, pais: p.pais || 'MX', contacto: p.contacto || '', telefono: p.telefono || '', email: p.email || '', notas: p.notas || '' })
    setEditId(p.id); setModal(true)
  }

  async function save() {
    if (!form.nombre.trim()) return
    setSaving(true)
    const path = editId ? `/api/proveedores/${editId}` : '/api/proveedores'
    await apiFetch(path, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(form) })
    setSaving(false); setModal(false); load()
  }

  async function remove(id) {
    if (!confirm('¿Eliminar proveedor?')) return
    await apiFetch(`/api/proveedores/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-anton text-white text-2xl tracking-widest">PROVEEDORES</h1>
        <button onClick={openNew}
          className="bg-pop-coral text-white font-montserrat font-bold text-xs px-4 py-2 rounded-lg">
          + Nuevo
        </button>
      </div>

      {loading ? (
        <p className="font-montserrat text-white/30 text-sm text-center py-12">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="font-montserrat text-white/25 text-sm text-center py-12">Sin proveedores aún</p>
      ) : (
        <div className="bg-[#1A1A24] border border-white/6 rounded-2xl overflow-hidden">
          {items.map(p => (
            <div key={p.id}
              className="px-4 py-3 border-b border-white/5 last:border-0 flex items-center gap-3">
              <span className={`font-montserrat text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0
                               ${PAIS_COLOR[p.pais] || PAIS_COLOR.MX}`}>
                {p.pais}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-montserrat text-white/80 text-sm font-medium truncate">{p.nombre}</p>
                <div className="flex gap-3 flex-wrap mt-0.5">
                  {p.contacto && <span className="font-montserrat text-white/30 text-xs">{p.contacto}</span>}
                  {p.telefono && <span className="font-montserrat text-white/30 text-xs">{p.telefono}</span>}
                  {p.email    && <span className="font-montserrat text-white/30 text-xs">{p.email}</span>}
                </div>
                {p.notas && <p className="font-montserrat text-white/20 text-[10px] truncate mt-0.5">{p.notas}</p>}
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => openEdit(p)}
                  className="font-montserrat text-xs text-pop-lav hover:text-white transition-colors">Editar</button>
                <button onClick={() => remove(p.id)}
                  className="font-montserrat text-xs text-white/20 hover:text-red-400 transition-colors">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A24] border border-white/10 rounded-t-2xl md:rounded-2xl
                          p-5 w-full md:max-w-md mb-14 md:mb-0">
            <h2 className="font-anton text-white text-lg tracking-wider mb-4">
              {editId ? 'EDITAR PROVEEDOR' : 'NUEVO PROVEEDOR'}
            </h2>
            <div className="flex flex-col gap-3">

              {/* Pais */}
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1.5 block">País / origen</label>
                <div className="flex gap-2">
                  {PAISES.map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, pais: p }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-montserrat font-bold border transition-colors
                                  ${form.pais === p ? PAIS_COLOR[p] : 'border-white/8 text-white/25 hover:border-white/20'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Nombre</label>
                <input type="text" value={form.nombre} placeholder="Alibaba Express…"
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                             text-white text-sm font-montserrat placeholder-white/20
                             focus:outline-none focus:border-pop-coral/50" />
              </div>

              {[
                { label: 'Contacto',            key: 'contacto', placeholder: 'Juan García' },
                { label: 'Teléfono / WhatsApp', key: 'telefono', placeholder: '+52 55 1234 5678' },
                { label: 'Email',               key: 'email',    placeholder: 'proveedor@ejemplo.com' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="font-montserrat text-white/40 text-xs mb-1 block">{label}</label>
                  <input type="text" value={form[key]} placeholder={placeholder}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                               text-white text-sm font-montserrat placeholder-white/20
                               focus:outline-none focus:border-pop-coral/50" />
                </div>
              ))}

              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Notas</label>
                <textarea value={form.notas} placeholder="Tiempos de entrega, condiciones…" rows={2}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                             text-white text-sm font-montserrat placeholder-white/20 resize-none
                             focus:outline-none focus:border-pop-coral/50" />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(false)}
                className="flex-1 border border-white/10 text-white/40 font-montserrat text-sm py-2.5 rounded-lg">
                Cancelar
              </button>
              <button onClick={save} disabled={saving || !form.nombre.trim()}
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
