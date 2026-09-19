import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import { subirImagen, subirArchivo } from '../lib/storage'

// documento se guarda como JSON string: [{url, nombre}]
function parseDocs(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return [{ url: raw, nombre: 'Documento' }]
  } catch {
    return [{ url: raw, nombre: 'Documento' }]
  }
}

const EMPTY = {
  proveedorId: null, total: '', notas: '',
  fechaPedido: '', fechaLlegada: '', status: 'pendiente',
  imagen: null,
  _imgFile: null,
  docs: [],       // [{url, nombre}] — guardados
  _newFiles: [],  // File[] — pendientes de subir
}
const STATUS = {
  pendiente: 'bg-yellow-500/15 text-yellow-400',
  pagado:    'bg-green-500/15 text-green-400',
}
const PAIS_COLOR = { MX: 'text-green-400', US: 'text-blue-400', CN: 'text-red-400', JP: 'text-pink-400' }
const fmt = n => '$' + (n || 0).toLocaleString('es-MX')

function DocIcon({ nombre }) {
  const ext = (nombre || '').split('.').pop().toLowerCase()
  if (['jpg','jpeg','png','webp','gif'].includes(ext))
    return <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  if (ext === 'pdf')
    return <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  return <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
}

export default function Pedidos() {
  const [pedidos,    setPedidos]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState(EMPTY)
  const [editId,     setEditId]     = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [imgPreview, setImgPreview] = useState(null)
  const [verImg,     setVerImg]     = useState(null)

  const [proveedores,  setProveedores]  = useState([])
  const [provSearch,   setProvSearch]   = useState('')
  const [creandoProv,  setCreandoProv]  = useState(false)
  const [nuevoProv,    setNuevoProv]    = useState({ nombre: '', pais: 'MX' })
  const [savingProv,   setSavingProv]   = useState(false)

  const fileRef = useRef()
  const docRef  = useRef()

  function load() {
    apiFetch('/api/pedidos').then(r => r.json()).then(setPedidos).finally(() => setLoading(false))
  }
  function loadProvs() {
    return apiFetch('/api/proveedores').then(r => r.json()).then(setProveedores)
  }
  useEffect(load, [])

  function openNew() {
    setForm({ ...EMPTY })
    setEditId(null); setImgPreview(null)
    setProvSearch(''); setCreandoProv(false); setNuevoProv({ nombre: '', pais: 'MX' })
    loadProvs(); setModal(true)
  }
  function openEdit(p) {
    const prov = p.proveedor
    setForm({
      proveedorId: prov?.id ?? null,
      total: p.total, notas: p.notas || '',
      fechaPedido:  p.fechaPedido  ? p.fechaPedido.slice(0, 10)  : '',
      fechaLlegada: p.fechaLlegada ? p.fechaLlegada.slice(0, 10) : '',
      status: p.status,
      imagen: p.imagen || null,
      _imgFile: null,
      docs: parseDocs(p.documento),
      _newFiles: [],
    })
    setImgPreview(p.imagen || null)
    setProvSearch(prov?.nombre || '')
    setCreandoProv(false)
    loadProvs(); setEditId(p.id); setModal(true)
  }

  async function crearProveedor() {
    if (!nuevoProv.nombre.trim()) return
    setSavingProv(true)
    const res    = await apiFetch('/api/proveedores', { method: 'POST', body: JSON.stringify(nuevoProv) })
    const creado = await res.json()
    const lista  = await apiFetch('/api/proveedores').then(r => r.json())
    setProveedores(lista)
    setForm(f => ({ ...f, proveedorId: creado.id }))
    setProvSearch(creado.nombre)
    setCreandoProv(false); setNuevoProv({ nombre: '', pais: 'MX' })
    setSavingProv(false)
  }

  function onPickDocs(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setForm(f => ({ ...f, _newFiles: [...f._newFiles, ...files] }))
    e.target.value = ''
  }
  function removeNewFile(i) {
    setForm(f => ({ ...f, _newFiles: f._newFiles.filter((_, idx) => idx !== i) }))
  }
  function removeSavedDoc(i) {
    setForm(f => ({ ...f, docs: f.docs.filter((_, idx) => idx !== i) }))
  }

  async function onFile(e) {
    const file = e.target.files[0]; if (!file) return
    setImgPreview(URL.createObjectURL(file))
    setForm(f => ({ ...f, _imgFile: file }))
  }

  async function save() {
    if (!form.proveedorId || !form.total) return
    setSaving(true)

    let imagenUrl = form.imagen
    if (form._imgFile) { try { imagenUrl = await subirImagen(form._imgFile) } catch {} }

    // subir archivos nuevos
    const uploadedDocs = [...form.docs]
    for (const file of form._newFiles) {
      try {
        const isImg = file.type.startsWith('image/')
        const url = isImg ? await subirImagen(file) : await subirArchivo(file)
        uploadedDocs.push({ url, nombre: file.name })
      } catch {}
    }

    const body = {
      proveedorId:  form.proveedorId,
      total:        Number(form.total),
      notas:        form.notas || null,
      fechaPedido:  form.fechaPedido  || null,
      fechaLlegada: form.fechaLlegada || null,
      status:       form.status,
      imagen:       imagenUrl ?? null,
      documento:    uploadedDocs.length ? JSON.stringify(uploadedDocs) : null,
    }
    const path = editId ? `/api/pedidos/${editId}` : '/api/pedidos'
    await apiFetch(path, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(body) })
    setSaving(false); setModal(false); load()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar pedido?')) return
    await apiFetch(`/api/pedidos/${id}`, { method: 'DELETE' }); load()
  }

  function fmtFecha(f) {
    if (!f) return '—'
    const [y, m, d] = f.slice(0, 10).split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  const deudaTotal   = pedidos.filter(p => p.status === 'pendiente').reduce((s, p) => s + p.total, 0)
  const filteredProv = proveedores.filter(p => p.nombre.toLowerCase().includes(provSearch.toLowerCase()))
  const provSeleccionado = form.proveedorId ? proveedores.find(p => p.id === form.proveedorId) : null

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
          {pedidos.map(p => {
            const prov = p.proveedor
            const docs = parseDocs(p.documento)
            return (
              <div key={p.id} className="bg-[#1A1A24] border border-white/6 rounded-xl px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {prov?.pais && (
                        <span className={`font-montserrat text-[10px] font-bold ${PAIS_COLOR[prov.pais] || ''}`}>
                          {prov.pais}
                        </span>
                      )}
                      <p className="font-montserrat text-white/80 text-sm font-medium">{prov?.nombre || '—'}</p>
                      <span className={`font-montserrat text-xs px-2 py-0.5 rounded-full ${STATUS[p.status] || STATUS.pendiente}`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="font-montserrat text-white/30 text-xs">
                      {p.fechaPedido && `Pedido: ${fmtFecha(p.fechaPedido)} · `}
                      Llega: {fmtFecha(p.fechaLlegada)}
                      {p.notas && ` · ${p.notas}`}
                    </p>
                    {docs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {docs.map((d, i) => (
                          <a key={i} href={d.url} target="_blank" rel="noreferrer"
                            className="font-montserrat text-[10px] text-pop-lav/60 hover:text-pop-lav
                                       flex items-center gap-1 transition-colors">
                            <DocIcon nombre={d.nombre} />
                            {d.nombre.length > 20 ? d.nombre.slice(0, 20) + '…' : d.nombre}
                          </a>
                        ))}
                      </div>
                    )}
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
                          className="font-montserrat text-xs text-pop-lav hover:text-white transition-colors">editar</button>
                        <button onClick={() => eliminar(p.id)}
                          className="font-montserrat text-xs text-white/15 hover:text-red-400 transition-colors">borrar</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-black/70 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setModal(false)} />
          <div className="relative bg-[#1A1A24] border border-white/10
                          rounded-t-2xl md:rounded-2xl w-full md:max-w-md
                          mb-14 md:mb-0 flex flex-col max-h-[90vh]">

            <div className="flex items-center justify-between px-5 pt-5 pb-1 flex-shrink-0">
              <h2 className="font-anton text-white text-lg tracking-wider">
                {editId ? 'EDITAR PEDIDO' : 'NUEVO PEDIDO'}
              </h2>
              <button onClick={() => setModal(false)} className="text-white/25 hover:text-white/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3 flex-1">

              {/* Proveedor */}
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Proveedor</label>
                {!creandoProv ? (
                  <>
                    {provSeleccionado ? (
                      <div className="flex items-center gap-2 bg-[#0F0F13] border border-emerald-500/30 rounded-lg px-3 py-2.5">
                        <span className={`font-montserrat text-[10px] font-bold ${PAIS_COLOR[provSeleccionado.pais] || ''}`}>
                          {provSeleccionado.pais}
                        </span>
                        <span className="font-montserrat text-white/80 text-sm flex-1">{provSeleccionado.nombre}</span>
                        <button onClick={() => { setForm(f => ({ ...f, proveedorId: null })); setProvSearch('') }}
                          className="text-white/25 hover:text-white/60 transition-colors text-xs">✕</button>
                      </div>
                    ) : (
                      <>
                        <input type="text" value={provSearch} placeholder="Buscar proveedor…"
                          onChange={e => setProvSearch(e.target.value)}
                          className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                                     text-white text-sm font-montserrat placeholder-white/20
                                     focus:outline-none focus:border-pop-coral/50" />
                        {provSearch.trim() && (
                          <div className="border border-white/8 rounded-lg mt-1 max-h-36 overflow-y-auto">
                            {filteredProv.map(p => (
                              <button key={p.id}
                                onClick={() => { setForm(f => ({ ...f, proveedorId: p.id })); setProvSearch(p.nombre) }}
                                className="w-full text-left px-3 py-2 font-montserrat text-sm
                                           border-b border-white/5 last:border-0 text-white/60 hover:bg-white/5 transition-colors">
                                <span className={`text-[10px] font-bold mr-2 ${PAIS_COLOR[p.pais] || ''}`}>{p.pais}</span>
                                {p.nombre}
                              </button>
                            ))}
                            {filteredProv.length === 0 && (
                              <p className="px-3 py-2 font-montserrat text-white/25 text-xs">Sin resultados</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    <button onClick={() => { setCreandoProv(true); setNuevoProv({ nombre: provSearch, pais: 'MX' }) }}
                      className="mt-1.5 w-full border border-dashed border-white/15 hover:border-emerald-500/40
                                 text-white/30 hover:text-emerald-400/70 font-montserrat text-xs
                                 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1">
                      <span className="text-sm leading-none">+</span> Crear nuevo proveedor
                    </button>
                  </>
                ) : (
                  <div className="border border-white/8 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex gap-2">
                      {['MX','US','CN','JP'].map(p => (
                        <button key={p} onClick={() => setNuevoProv(f => ({ ...f, pais: p }))}
                          className={`flex-1 py-1.5 rounded text-[10px] font-montserrat font-bold border transition-colors
                                      ${nuevoProv.pais === p
                                        ? { MX:'border-green-500/40 bg-green-500/10 text-green-400', US:'border-blue-500/40 bg-blue-500/10 text-blue-400', CN:'border-red-500/40 bg-red-500/10 text-red-400', JP:'border-pink-500/40 bg-pink-500/10 text-pink-400' }[p]
                                        : 'border-white/8 text-white/25'}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                    <input type="text" value={nuevoProv.nombre} placeholder="Nombre del proveedor…"
                      autoFocus onChange={e => setNuevoProv(f => ({ ...f, nombre: e.target.value }))}
                      className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2
                                 text-white text-sm font-montserrat placeholder-white/20
                                 focus:outline-none focus:border-emerald-500/40" />
                    <div className="flex gap-2">
                      <button onClick={() => setCreandoProv(false)}
                        className="flex-1 border border-white/10 text-white/35 font-montserrat text-xs py-1.5 rounded-lg">
                        ← Volver
                      </button>
                      <button onClick={crearProveedor} disabled={savingProv || !nuevoProv.nombre.trim()}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-montserrat font-bold
                                   text-xs py-1.5 rounded-lg disabled:opacity-40 transition-colors">
                        {savingProv ? 'Creando…' : 'Crear'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Campos */}
              {[
                { label: 'Total ($)',        key: 'total',        type: 'number', placeholder: '5000' },
                { label: 'Fecha del pedido', key: 'fechaPedido',  type: 'date' },
                { label: 'Fecha de llegada', key: 'fechaLlegada', type: 'date' },
                { label: 'Notas',            key: 'notas',        type: 'text',   placeholder: 'Opcional…' },
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

              {/* Documentos múltiples */}
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">
                  Documentos <span className="text-white/20">(PDF, CSV, imágenes — varios)</span>
                </label>
                <input ref={docRef} type="file" multiple
                  accept=".pdf,.csv,.doc,.docx,.xls,.xlsx,image/*"
                  onChange={onPickDocs} className="hidden" />

                {/* Documentos ya guardados */}
                {form.docs.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#0F0F13] border border-white/8
                                          rounded-lg px-3 py-2 mb-1.5">
                    <span className="text-pop-lav/60 flex-shrink-0"><DocIcon nombre={d.nombre} /></span>
                    <a href={d.url} target="_blank" rel="noreferrer"
                      className="font-montserrat text-white/50 text-xs flex-1 truncate hover:text-white/80 transition-colors">
                      {d.nombre}
                    </a>
                    <button onClick={() => removeSavedDoc(i)}
                      className="text-white/20 hover:text-red-400 text-xs transition-colors flex-shrink-0">✕</button>
                  </div>
                ))}

                {/* Archivos nuevos seleccionados (aún no subidos) */}
                {form._newFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#0F0F13] border border-emerald-500/20
                                          rounded-lg px-3 py-2 mb-1.5">
                    <span className="text-emerald-400/60 flex-shrink-0"><DocIcon nombre={f.name} /></span>
                    <span className="font-montserrat text-white/40 text-xs flex-1 truncate">{f.name}</span>
                    <button onClick={() => removeNewFile(i)}
                      className="text-white/20 hover:text-red-400 text-xs transition-colors flex-shrink-0">✕</button>
                  </div>
                ))}

                <button onClick={() => docRef.current.click()}
                  className="w-full border border-dashed border-white/15 rounded-lg py-3
                             text-white/25 font-montserrat text-xs hover:border-white/30
                             hover:text-white/40 transition-colors flex items-center justify-center gap-2 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Agregar archivos
                </button>
              </div>

              {/* Imagen de referencia */}
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
                    className="w-full border border-dashed border-white/15 rounded-lg py-5
                               text-white/25 font-montserrat text-xs hover:border-white/30
                               hover:text-white/40 transition-colors flex flex-col items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
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

            <div className="px-5 pb-5 pt-2 flex gap-2 flex-shrink-0">
              <button onClick={() => setModal(false)}
                className="flex-1 border border-white/10 text-white/40 font-montserrat text-sm py-3 rounded-xl">
                Cancelar
              </button>
              <button onClick={save} disabled={saving || !form.proveedorId || !form.total}
                className="flex-1 bg-pop-coral text-white font-montserrat font-bold text-sm py-3 rounded-xl disabled:opacity-50">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {verImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
             onClick={() => setVerImg(null)}>
          <img src={verImg} alt="referencia" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  )
}
