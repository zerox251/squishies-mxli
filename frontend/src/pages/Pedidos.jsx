import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import { subirImagen } from '../lib/storage'

const EMPTY = { proveedor: '', total: '', notas: '', fechaPedido: '', fechaLlegada: '', status: 'pendiente', imagen: null }
const STATUS = {
  pendiente: 'bg-yellow-500/15 text-yellow-400',
  pagado: 'bg-green-500/15 text-green-400',
}
const fmt = n => '$' + (n || 0).toLocaleString('es-MX')

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [imgPreview, setImgPreview] = useState(null)
  const [verImg, setVerImg] = useState(null)
  const fileRef = useRef()

  function load() {
    apiFetch('/api/pedidos').then(r => r.json()).then(setPedidos).finally(() => setLoading(false))
  }
  useEffect(load, [])

  function openNew() {
    setForm({ ...EMPTY, _imgFile: null }); setEditId(null); setImgPreview(null); setModal(true)
  }
  function openEdit(p) {
    setForm({
      proveedor: p.proveedor, total: p.total, notas: p.notas || '',
      fechaPedido: p.fechaPedido ? p.fechaPedido.slice(0, 10) : '',
      fechaLlegada: p.fechaLlegada ? p.fechaLlegada.slice(0, 10) : '',
      status: p.status,
      imagen: p.imagen || null,
      _imgFile: null,
    })
    setImgPreview(p.imagen || null)
    setEditId(p.id); setModal(true)
  }

  async function onFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setImgPreview(url)
    setForm(f => ({ ...f, _imgFile: file, imagen: f.imagen }))
  }

  async function save() {
    if (!form.proveedor || !form.total) return
    setSaving(true)
    let imagenUrl = form.imagen
    if (form._imgFile) {
      try { imagenUrl = await subirImagen(form._imgFile) } catch { /* imagen no crítica */ }
    }
    const body = {
      proveedor: form.proveedor,
      total: Number(form.total),
      notas: form.notas || null,
      fechaPedido: form.fechaPedido || null,
      fechaLlegada: form.fechaLlegada || null,
      status: form.status,
      imagen: imagenUrl ?? undefined,
    }
    const path = editId ? `/api/pedidos/${editId}` : '/api/pedidos'
    await apiFetch(path, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(body) })
    setSaving(false); setModal(false); load()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar pedido?')) return
    await apiFetch(`/api/pedidos/${id}`, { method: 'DELETE' })
    load()
  }

  function fmtFecha(f) {
    if (!f) return '—'
    return new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  const deudaTotal = pedidos.filter(p => p.status === 'pendiente').reduce((s, p) => s + p.total, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-anton text-white text-2xl tracking-widest">PEDIDOS</h1>
        <button onClick={openNew}
          className="bg-pop-coral text-white font-montserrat font-bold text-xs px-4 py-2 rounded-lg">
          + Nuevo
        </button>
      </div>

      {deudaTotal > 0 && (
        <p className="font-montserrat text-yellow-400/70 text-xs mb-4">
          Deuda pendiente: <span className="font-semibold">{fmt(deudaTotal)}</span>
        </p>
      )}

      {loading ? (
        <p className="font-montserrat text-white/30 text-sm text-center py-12">Cargando…</p>
      ) : pedidos.length === 0 ? (
        <p className="font-montserrat text-white/25 text-sm text-center py-12">Sin pedidos aún</p>
      ) : (
        <div className="flex flex-col gap-2">
          {pedidos.map(p => (
            <div key={p.id} className="bg-[#1A1A24] border border-white/6 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-montserrat text-white/80 text-sm font-medium">{p.proveedor}</p>
                    <span className={`font-montserrat text-xs px-2 py-0.5 rounded-full ${STATUS[p.status] || STATUS.pendiente}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="font-montserrat text-white/30 text-xs">
                    {p.fechaPedido && `Pedido: ${fmtFecha(p.fechaPedido)} · `}
                    Llega: {fmtFecha(p.fechaLlegada)}
                    {p.notas && ` · ${p.notas}`}
                  </p>
                </div>
                <div className="flex items-start gap-2 flex-shrink-0">
                  {p.imagen && (
                    <button onClick={() => setVerImg(p.imagen)}
                      className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                      <img src={p.imagen} alt="ref" className="w-full h-full object-cover" />
                    </button>
                  )}
                  <div className="text-right">
                    <p className="font-anton text-white text-lg">{fmt(p.total)}</p>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(p)}
                        className="font-montserrat text-xs text-pop-lav hover:text-white transition-colors">
                        editar
                      </button>
                      <button onClick={() => eliminar(p.id)}
                        className="font-montserrat text-xs text-white/15 hover:text-red-400 transition-colors">
                        borrar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nuevo/editar — bottom sheet mobile-first */}
      {modal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-black/70 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setModal(false)} />
          <div className="relative bg-[#1A1A24] border border-white/10
                          rounded-t-2xl md:rounded-2xl
                          w-full md:max-w-md
                          mb-14 md:mb-0
                          flex flex-col max-h-[88vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-1 flex-shrink-0">
              <h2 className="font-anton text-white text-lg tracking-wider">
                {editId ? 'EDITAR PEDIDO' : 'NUEVO PEDIDO'}
              </h2>
              <button onClick={() => setModal(false)} className="text-white/25 hover:text-white/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Scrollable fields */}
            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3 flex-1">
              {[
                { label: 'Proveedor', key: 'proveedor', type: 'text', placeholder: 'Ozzymandias' },
                { label: 'Total ($)', key: 'total', type: 'number', placeholder: '5000' },
                { label: 'Fecha del pedido', key: 'fechaPedido', type: 'date' },
                { label: 'Fecha de llegada', key: 'fechaLlegada', type: 'date' },
                { label: 'Notas', key: 'notas', type: 'text', placeholder: 'Opcional…' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="font-montserrat text-white/40 text-xs mb-1 block">{label}</label>
                  <input type={type} value={form[key]} placeholder={placeholder || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className={`w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-3
                               text-white text-sm font-montserrat placeholder-white/20
                               focus:outline-none focus:border-pop-coral/50
                               ${type === 'date' ? '[color-scheme:dark]' : ''}`} />
                </div>
              ))}

              {editId && (
                <div>
                  <label className="font-montserrat text-white/40 text-xs mb-1 block">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-3
                               text-white text-sm font-montserrat focus:outline-none">
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </div>
              )}

              {/* Image upload */}
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Imagen de referencia</label>
                <input ref={fileRef} type="file" accept="image/*" capture="environment"
                  onChange={onFile} className="hidden" />
                {imgPreview ? (
                  <div className="relative">
                    <img src={imgPreview} alt="preview"
                      className="w-full rounded-lg max-h-48 object-contain bg-black/30" />
                    <button
                      onClick={() => { setImgPreview(null); setForm(f => ({ ...f, imagen: null, _imgFile: null })) }}
                      className="absolute top-2 right-2 bg-black/60 text-white/60 hover:text-white
                                 rounded-full w-7 h-7 flex items-center justify-center text-xs">✕</button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current.click()}
                    className="w-full border border-dashed border-white/15 rounded-lg py-6
                               text-white/25 font-montserrat text-xs hover:border-white/30
                               hover:text-white/40 transition-colors flex flex-col items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    Toca para agregar foto
                  </button>
                )}
              </div>
            </div>

            {/* Fixed footer */}
            <div className="px-5 pb-5 pt-2 flex gap-2 flex-shrink-0">
              <button onClick={() => setModal(false)}
                className="flex-1 border border-white/10 text-white/40 font-montserrat text-sm py-3 rounded-xl">
                Cancelar
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 bg-pop-coral text-white font-montserrat font-bold text-sm py-3 rounded-xl disabled:opacity-50">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox imagen */}
      {verImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
             onClick={() => setVerImg(null)}>
          <img src={verImg} alt="referencia" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  )
}
