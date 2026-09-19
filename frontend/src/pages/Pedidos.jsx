import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import { subirImagen, subirArchivo } from '../lib/storage'

// ── helpers ──────────────────────────────────────────────────────────────────
function parseDocs(raw) {
  if (!raw) return []
  try {
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : [{ url: raw, nombre: 'Documento' }]
  } catch { return [{ url: raw, nombre: 'Documento' }] }
}

function generarMeses() {
  const out = []
  const hoy = new Date()
  for (let i = 0; i < 18; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

function mesLabel(ym) {
  const [y, m] = ym.split('-')
  return new Date(y, m - 1, 1)
    .toLocaleString('es-MX', { month: 'long', year: 'numeric' })
    .toUpperCase()
}

function groupByMonth(pedidos) {
  const groups = {}
  for (const p of pedidos) {
    const raw = p.fechaPedido || p.fecha
    let key = '__sin_fecha__'
    if (raw) {
      const d = new Date(raw)
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  }
  return Object.entries(groups).sort(([a], [b]) => {
    if (a === '__sin_fecha__') return 1
    if (b === '__sin_fecha__') return -1
    return b.localeCompare(a)
  })
}

function localDate(iso) {
  if (!iso) return null
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}
function fmtDay(iso) {
  const d = localDate(iso); if (!d) return null
  return { day: d.getDate(), mon: d.toLocaleString('es-MX', { month: 'short' }) }
}
function fmtFecha(iso) {
  const d = localDate(iso); if (!d) return '—'
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

const PAIS_COLOR  = { MX: 'text-green-400', US: 'text-blue-400', CN: 'text-red-400', JP: 'text-pink-400' }
const PAIS_BADGE  = {
  MX: 'border-green-500/30 bg-green-500/10 text-green-400',
  US: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  CN: 'border-red-500/30 bg-red-500/10 text-red-400',
  JP: 'border-pink-500/30 bg-pink-500/10 text-pink-400',
}
const STATUS_CLS  = {
  pendiente: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  pagado:    'border-green-500/30 bg-green-500/10 text-green-400',
}
const fmt = n => '$' + (n || 0).toLocaleString('es-MX')
const MESES = generarMeses()

// ── modal EMPTY ──────────────────────────────────────────────────────────────
const EMPTY = {
  proveedorId: null, total: '', notas: '',
  fechaPedido: '', fechaLlegada: '', status: 'pendiente',
  imagen: null, _imgFile: null, docs: [], _newFiles: [],
}

function DocIcon({ nombre = '' }) {
  const ext = nombre.split('.').pop().toLowerCase()
  if (['jpg','jpeg','png','webp','gif'].includes(ext))
    return <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  if (ext === 'pdf')
    return <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
  return <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
}

// ── component ─────────────────────────────────────────────────────────────────
export default function Pedidos() {
  const [pedidos,    setPedidos]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState(EMPTY)
  const [editId,     setEditId]     = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [imgPreview, setImgPreview] = useState(null)
  const [verImg,     setVerImg]     = useState(null)

  // filtros
  const [mesFiltro,  setMesFiltro]  = useState('')
  const [provFiltro, setProvFiltro] = useState('')
  const [paisFiltro, setPaisFiltro] = useState('')

  // proveedor selector (modal)
  const [proveedores,  setProveedores]  = useState([])
  const [provOpen,     setProvOpen]     = useState(false)
  const [creandoProv,  setCreandoProv]  = useState(false)
  const [nuevoProv,    setNuevoProv]    = useState({ nombre: '', pais: 'MX' })
  const [savingProv,   setSavingProv]   = useState(false)
  const provDropRef = useRef()

  // pagos parciales
  const [pagosModal,   setPagosModal]   = useState([])   // [{id, monto, fecha, metodoPago, nota, _new?, _edited?}]
  const [pagosDelete,  setPagosDelete]  = useState([])   // ids a borrar
  const [nuevoPago,    setNuevoPago]    = useState(null) // null=cerrado, {}=abierto
  const PAGO_EMPTY = { monto: '', fecha: new Date().toISOString().slice(0,10), metodoPago: '', nota: '' }

  const fileRef = useRef()
  const docRef  = useRef()

  // cerrar dropdown al click fuera
  useEffect(() => {
    if (!provOpen) return
    function handler(e) {
      if (provDropRef.current && !provDropRef.current.contains(e.target)) {
        setProvOpen(false); setCreandoProv(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [provOpen])

  const fetchPedidos = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (mesFiltro)  params.set('mes', mesFiltro)
    if (provFiltro) params.set('proveedorId', provFiltro)
    if (paisFiltro) params.set('pais', paisFiltro)
    apiFetch(`/api/pedidos?${params}`)
      .then(r => r.json()).then(setPedidos).finally(() => setLoading(false))
  }, [mesFiltro, provFiltro, paisFiltro])

  const loadProvs = () =>
    apiFetch('/api/proveedores').then(r => r.json()).then(setProveedores)

  useEffect(() => { fetchPedidos() }, [fetchPedidos])
  useEffect(() => { loadProvs() }, [])

  // ── modal open ──────────────────────────────────────────────────────────────
  function openNew() {
    setForm({ ...EMPTY }); setEditId(null); setImgPreview(null)
    setProvOpen(false); setCreandoProv(false); setNuevoProv({ nombre: '', pais: 'MX' })
    setPagosModal([]); setPagosDelete([]); setNuevoPago(null)
    setModal(true)
  }
  function openEdit(p) {
    const prov = p.proveedor
    setForm({
      proveedorId: prov?.id ?? null, total: p.total, notas: p.notas || '',
      fechaPedido:  p.fechaPedido  ? p.fechaPedido.slice(0, 10)  : '',
      fechaLlegada: p.fechaLlegada ? p.fechaLlegada.slice(0, 10) : '',
      status: p.status, imagen: p.imagen || null, _imgFile: null,
      docs: parseDocs(p.documento), _newFiles: [],
    })
    setImgPreview(p.imagen || null)
    setProvOpen(false); setCreandoProv(false)
    setPagosModal([]); setPagosDelete([]); setNuevoPago(null)
    // cargar pagos existentes
    apiFetch(`/api/pagos?pedidoId=${p.id}`).then(r => r.json()).then(setPagosModal)
    setEditId(p.id); setModal(true)
  }

  // ── proveedor inline create ─────────────────────────────────────────────────
  async function crearProveedor() {
    if (!nuevoProv.nombre.trim()) return
    setSavingProv(true)
    const res    = await apiFetch('/api/proveedores', { method: 'POST', body: JSON.stringify(nuevoProv) })
    const creado = await res.json()
    await loadProvs()
    setForm(f => ({ ...f, proveedorId: creado.id }))
    setCreandoProv(false); setProvOpen(false); setNuevoProv({ nombre: '', pais: 'MX' }); setSavingProv(false)
  }

  // ── pagos handlers ──────────────────────────────────────────────────────────
  function addPago() {
    if (!nuevoPago?.monto || !nuevoPago?.fecha) return
    const pago = {
      id: `_new_${Date.now()}`, _new: true,
      monto: Number(nuevoPago.monto), fecha: nuevoPago.fecha,
      metodoPago: nuevoPago.metodoPago || null, nota: nuevoPago.nota || null,
    }
    setPagosModal(prev => [...prev, pago].sort((a, b) => a.fecha.localeCompare(b.fecha)))
    setNuevoPago(null)
  }
  function deletePago(id) {
    if (!String(id).startsWith('_new_')) setPagosDelete(prev => [...prev, id])
    setPagosModal(prev => prev.filter(p => p.id !== id))
  }

  // ── file handlers ───────────────────────────────────────────────────────────
  function onPickDocs(e) {
    const files = Array.from(e.target.files); if (!files.length) return
    setForm(f => ({ ...f, _newFiles: [...f._newFiles, ...files] }))
    e.target.value = ''
  }
  function onFile(e) {
    const file = e.target.files[0]; if (!file) return
    setImgPreview(URL.createObjectURL(file)); setForm(f => ({ ...f, _imgFile: file }))
  }

  // ── save ────────────────────────────────────────────────────────────────────
  async function save() {
    if (!form.proveedorId || !form.total) return
    setSaving(true)
    let imagenUrl = form.imagen
    if (form._imgFile) { try { imagenUrl = await subirImagen(form._imgFile) } catch {} }
    const uploadedDocs = [...form.docs]
    for (const file of form._newFiles) {
      try {
        const url = file.type.startsWith('image/') ? await subirImagen(file) : await subirArchivo(file)
        uploadedDocs.push({ url, nombre: file.name })
      } catch {}
    }
    const body = {
      proveedorId: form.proveedorId, total: Number(form.total),
      notas: form.notas || null,
      fechaPedido: form.fechaPedido || null, fechaLlegada: form.fechaLlegada || null,
      status: form.status, imagen: imagenUrl ?? null,
      documento: uploadedDocs.length ? JSON.stringify(uploadedDocs) : null,
    }
    const res    = await apiFetch(editId ? `/api/pedidos/${editId}` : '/api/pedidos',
      { method: editId ? 'PUT' : 'POST', body: JSON.stringify(body) })
    const pedido = await res.json()
    const pid    = pedido.id

    // persistir pagos en paralelo
    await Promise.all([
      ...pagosDelete.map(id => apiFetch(`/api/pagos/${id}`, { method: 'DELETE' })),
      ...pagosModal.filter(p => p._new).map(p =>
        apiFetch('/api/pagos', { method: 'POST', body: JSON.stringify({
          pedidoId: pid, monto: p.monto, fecha: p.fecha,
          metodoPago: p.metodoPago, nota: p.nota,
        }) })
      ),
    ])
    setSaving(false); setModal(false); fetchPedidos()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar pedido?')) return
    await apiFetch(`/api/pedidos/${id}`, { method: 'DELETE' }); fetchPedidos()
  }

  // ── derived ─────────────────────────────────────────────────────────────────
  // auto-status según saldo
  const totalPagado = pagosModal.reduce((s, p) => s + (Number(p.monto) || 0), 0)
  const saldo       = modal ? (Number(form.total) || 0) - totalPagado : 0
  useEffect(() => {
    if (!modal || !form.total) return
    setForm(f => ({ ...f, status: saldo <= 0 ? 'pagado' : 'pendiente' }))
  }, [saldo, modal]) // eslint-disable-line

  const grupos = groupByMonth(pedidos)
  const deudaTotal = pedidos.filter(p => p.status === 'pendiente').reduce((s, p) => s + p.total, 0)
  const provSeleccionado = form.proveedorId ? proveedores.find(p => p.id === form.proveedorId) : null

  // proveedores únicos para filtro
  const provsUnicos = proveedores.slice().sort((a, b) => a.nombre.localeCompare(b.nombre))
  const selectCls = `bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2
                     text-white/60 text-xs font-montserrat focus:outline-none
                     focus:border-pop-coral/40 cursor-pointer`

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="font-anton text-white text-2xl tracking-widest">PEDIDOS</h1>
          <p className="font-montserrat text-white/25 text-xs">Compras a proveedores</p>
        </div>
        <button onClick={openNew}
          className="bg-pop-coral text-white font-montserrat font-bold text-xs px-4 py-2 rounded-lg">
          + Nuevo
        </button>
      </div>

      {deudaTotal > 0 && (
        <p className="font-montserrat text-yellow-400/60 text-xs mt-2 mb-1">
          Deuda pendiente: <span className="font-semibold">{fmt(deudaTotal)}</span>
        </p>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mt-3 mb-5">
        <select value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} className={selectCls}>
          <option value="">Todos los meses</option>
          {MESES.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>

        <select value={provFiltro} onChange={e => setProvFiltro(e.target.value)} className={selectCls}>
          <option value="">Todos los proveedores</option>
          {provsUnicos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>

        <select value={paisFiltro} onChange={e => setPaisFiltro(e.target.value)} className={selectCls}>
          <option value="">Todos los países</option>
          {['MX','US','CN','JP'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="font-montserrat text-white/30 text-sm text-center py-12">Cargando…</p>
      ) : pedidos.length === 0 ? (
        <p className="font-montserrat text-white/25 text-sm text-center py-12">Sin pedidos</p>
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.map(([mes, items]) => (
            <div key={mes}>
              {/* Encabezado de mes */}
              <p className="font-montserrat text-white/25 text-[10px] tracking-widest mb-2">
                {mes === '__sin_fecha__' ? 'SIN FECHA' : mesLabel(mes)}
              </p>

              <div className="flex flex-col gap-1.5">
                {items.map(p => {
                  const prov = p.proveedor
                  const docs = parseDocs(p.documento)
                  const dia  = fmtDay(p.fechaPedido || p.fecha)

                  return (
                    <div key={p.id}
                      className="bg-[#1A1A24] border border-white/6 rounded-xl px-4 py-3
                                 flex items-center gap-3">

                      {/* Fecha */}
                      <div className="shrink-0 w-10 text-center">
                        {dia ? (
                          <>
                            <p className="font-montserrat text-white/70 text-base font-bold leading-none">
                              {dia.day}
                            </p>
                            <p className="font-montserrat text-white/25 text-[10px]">{dia.mon}</p>
                          </>
                        ) : (
                          <p className="font-montserrat text-white/15 text-[10px]">—</p>
                        )}
                      </div>

                      {/* Proveedor + notas + docs */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {prov?.pais && (
                            <span className={`font-montserrat text-[9px] font-bold px-1.5 py-0.5
                                             rounded border ${PAIS_BADGE[prov.pais] || ''}`}>
                              {prov.pais}
                            </span>
                          )}
                          <span className="font-montserrat text-white/80 text-sm font-medium">
                            {prov?.nombre || '—'}
                          </span>
                          <span className={`font-montserrat text-[9px] px-1.5 py-0.5 rounded border
                                           ${STATUS_CLS[p.status] || STATUS_CLS.pendiente}`}>
                            {p.status}
                          </span>
                        </div>
                        {p.notas && (
                          <p className="font-montserrat text-white/30 text-xs truncate mt-0.5">{p.notas}</p>
                        )}
                        {docs.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {docs.map((d, i) => (
                              <a key={i} href={d.url} target="_blank" rel="noreferrer"
                                className="font-montserrat text-[10px] text-pop-lav/50
                                           hover:text-pop-lav flex items-center gap-1 transition-colors">
                                <DocIcon nombre={d.nombre} />
                                {d.nombre.length > 18 ? d.nombre.slice(0, 18) + '…' : d.nombre}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Llegada + imagen */}
                      <div className="shrink-0 text-right hidden sm:block">
                        {p.fechaLlegada && (
                          <>
                            <p className="font-montserrat text-white/20 text-[9px]">Llega</p>
                            <p className="font-montserrat text-white/40 text-xs">{fmtFecha(p.fechaLlegada)}</p>
                          </>
                        )}
                      </div>

                      {/* Imagen miniatura */}
                      {p.imagen && (
                        <button onClick={() => setVerImg(p.imagen)}
                          className="w-9 h-9 rounded-lg overflow-hidden border border-white/10 shrink-0">
                          <img src={p.imagen} alt="ref" className="w-full h-full object-cover" />
                        </button>
                      )}

                      {/* Total + acciones */}
                      <div className="shrink-0 text-right">
                        <p className="font-anton text-white text-base">{fmt(p.total)}</p>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEdit(p)}
                            className="font-montserrat text-[10px] text-pop-lav hover:text-white transition-colors">
                            editar
                          </button>
                          <button onClick={() => eliminar(p.id)}
                            className="font-montserrat text-[10px] text-white/15 hover:text-red-400 transition-colors">
                            borrar
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
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

              {/* Proveedor — dropdown clásico */}
              <div className="relative" ref={provDropRef}>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Proveedor</label>

                {/* Trigger */}
                <button type="button"
                  onClick={() => { setProvOpen(o => !o); setCreandoProv(false) }}
                  className={`w-full flex items-center justify-between gap-2 bg-[#0F0F13]
                              border rounded-lg px-3 py-2.5 text-sm font-montserrat text-left
                              focus:outline-none transition-colors
                              ${provOpen ? 'border-pop-coral/50' : 'border-white/10'}`}>
                  {provSeleccionado ? (
                    <span className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${PAIS_COLOR[provSeleccionado.pais] || ''}`}>
                        {provSeleccionado.pais}
                      </span>
                      <span className="text-white/80">{provSeleccionado.nombre}</span>
                    </span>
                  ) : (
                    <span className="text-white/25">Seleccionar proveedor…</span>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" strokeWidth="2"
                       className={`text-white/30 flex-shrink-0 transition-transform ${provOpen ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {/* Dropdown panel */}
                {provOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30
                                  bg-[#14141c] border border-white/10 rounded-xl
                                  shadow-2xl overflow-hidden">

                    {/* Lista de proveedores */}
                    <div className="max-h-44 overflow-y-auto">
                      {proveedores.length === 0 && (
                        <p className="px-3 py-3 font-montserrat text-white/25 text-xs text-center">
                          Sin proveedores — crea uno abajo
                        </p>
                      )}
                      {proveedores.map(p => (
                        <button key={p.id} type="button"
                          onClick={() => { setForm(f => ({ ...f, proveedorId: p.id })); setProvOpen(false); setCreandoProv(false) }}
                          className={`w-full text-left px-4 py-2.5 font-montserrat text-sm
                                      border-b border-white/5 last:border-0 transition-colors flex items-center gap-2
                                      ${form.proveedorId === p.id
                                        ? 'bg-white/8 text-white'
                                        : 'text-white/60 hover:bg-white/5'}`}>
                          <span className={`text-[10px] font-bold w-6 flex-shrink-0 ${PAIS_COLOR[p.pais] || ''}`}>{p.pais}</span>
                          {p.nombre}
                          {form.proveedorId === p.id && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                                 fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto text-emerald-400">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Separador + crear nuevo */}
                    <div className="border-t border-white/8">
                      {!creandoProv ? (
                        <button type="button"
                          onClick={() => setCreandoProv(true)}
                          className="w-full text-left px-4 py-2.5 font-montserrat text-xs
                                     text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/5
                                     transition-colors flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                               fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Crear nuevo proveedor
                        </button>
                      ) : (
                        <div className="px-4 py-3 flex flex-col gap-2">
                          <div className="flex gap-1.5">
                            {['MX','US','CN','JP'].map(p => (
                              <button key={p} type="button"
                                onClick={() => setNuevoProv(f => ({ ...f, pais: p }))}
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
                            onKeyDown={e => e.key === 'Enter' && crearProveedor()}
                            className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2
                                       text-white text-sm font-montserrat placeholder-white/20
                                       focus:outline-none focus:border-emerald-500/40" />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setCreandoProv(false)}
                              className="flex-1 border border-white/10 text-white/35 font-montserrat text-xs py-1.5 rounded-lg">
                              Cancelar
                            </button>
                            <button type="button" onClick={crearProveedor}
                              disabled={savingProv || !nuevoProv.nombre.trim()}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-montserrat
                                         font-bold text-xs py-1.5 rounded-lg disabled:opacity-40 transition-colors">
                              {savingProv ? 'Creando…' : 'Crear'}
                            </button>
                          </div>
                        </div>
                      )}
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

              {/* Status — siempre visible */}
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Status del pago</label>
                <div className="flex gap-2">
                  {[
                    { val: 'pendiente', label: 'Pendiente', cls: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' },
                    { val: 'pagado',    label: 'Pagado',    cls: 'border-green-500/40 bg-green-500/10 text-green-400'  },
                  ].map(({ val, label, cls }) => (
                    <button key={val} type="button"
                      onClick={() => setForm(f => ({ ...f, status: val }))}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-montserrat font-bold border transition-colors
                                  ${form.status === val ? cls : 'border-white/8 text-white/25 hover:border-white/20'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Pagos parciales ───────────────────────────────────────── */}
              <div className="border-t border-white/6 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-montserrat text-white/40 text-xs tracking-wider">PAGOS</p>
                  {!nuevoPago && (
                    <button type="button" onClick={() => setNuevoPago({ ...PAGO_EMPTY })}
                      className="font-montserrat text-xs text-pop-coral hover:text-white transition-colors">
                      + Agregar pago
                    </button>
                  )}
                </div>

                {/* Lista pagos */}
                {pagosModal.length === 0 && !nuevoPago && (
                  <p className="font-montserrat text-white/20 text-xs text-center py-2">Sin pagos registrados</p>
                )}
                {pagosModal.map(p => (
                  <div key={p.id} className="flex items-center gap-2 mb-1.5 bg-[#0F0F13]
                                              border border-white/6 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-montserrat text-white/80 text-sm font-medium">
                          {fmt(p.monto)}
                        </span>
                        {p.metodoPago && (
                          <span className="font-montserrat text-white/30 text-xs">{p.metodoPago}</span>
                        )}
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="font-montserrat text-white/25 text-[10px]">
                          {fmtFecha(typeof p.fecha === 'string' ? p.fecha : p.fecha?.toISOString?.())}
                        </span>
                        {p.nota && <span className="font-montserrat text-white/20 text-[10px] truncate">{p.nota}</span>}
                      </div>
                    </div>
                    <button type="button" onClick={() => deletePago(p.id)}
                      className="text-white/15 hover:text-red-400 text-xs transition-colors flex-shrink-0">✕</button>
                  </div>
                ))}

                {/* Formulario nuevo pago */}
                {nuevoPago && (
                  <div className="bg-[#0F0F13] border border-white/10 rounded-xl p-3 flex flex-col gap-2 mb-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-montserrat text-white/30 text-[10px] mb-0.5 block">Monto ($)</label>
                        <input type="number" value={nuevoPago.monto} placeholder="0"
                          onChange={e => setNuevoPago(f => ({ ...f, monto: e.target.value }))}
                          className="w-full bg-[#14141c] border border-white/8 rounded-lg px-2 py-2
                                     text-white text-sm font-montserrat placeholder-white/20
                                     focus:outline-none focus:border-pop-coral/40" />
                      </div>
                      <div>
                        <label className="font-montserrat text-white/30 text-[10px] mb-0.5 block">Fecha</label>
                        <input type="date" value={nuevoPago.fecha}
                          onChange={e => setNuevoPago(f => ({ ...f, fecha: e.target.value }))}
                          className="w-full bg-[#14141c] border border-white/8 rounded-lg px-2 py-2
                                     text-white text-sm font-montserrat [color-scheme:dark]
                                     focus:outline-none focus:border-pop-coral/40" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-montserrat text-white/30 text-[10px] mb-0.5 block">Método (opc.)</label>
                        <input type="text" value={nuevoPago.metodoPago} placeholder="Transferencia…"
                          onChange={e => setNuevoPago(f => ({ ...f, metodoPago: e.target.value }))}
                          className="w-full bg-[#14141c] border border-white/8 rounded-lg px-2 py-2
                                     text-white text-sm font-montserrat placeholder-white/20
                                     focus:outline-none focus:border-pop-coral/40" />
                      </div>
                      <div>
                        <label className="font-montserrat text-white/30 text-[10px] mb-0.5 block">Nota (opc.)</label>
                        <input type="text" value={nuevoPago.nota} placeholder="Anticipo…"
                          onChange={e => setNuevoPago(f => ({ ...f, nota: e.target.value }))}
                          className="w-full bg-[#14141c] border border-white/8 rounded-lg px-2 py-2
                                     text-white text-sm font-montserrat placeholder-white/20
                                     focus:outline-none focus:border-pop-coral/40" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-1">
                      <button type="button" onClick={() => setNuevoPago(null)}
                        className="font-montserrat text-xs text-white/30 hover:text-white/60 px-3 py-1.5 transition-colors">
                        Cancelar
                      </button>
                      <button type="button" onClick={addPago}
                        disabled={!nuevoPago.monto || !nuevoPago.fecha}
                        className="font-montserrat text-xs font-bold bg-pop-coral text-white
                                   px-4 py-1.5 rounded-lg disabled:opacity-40 transition-colors">
                        Agregar
                      </button>
                    </div>
                  </div>
                )}

                {/* Saldo pendiente */}
                {form.total && (
                  <div className="flex items-center justify-between px-1 mt-1">
                    <span className="font-montserrat text-white/30 text-xs">Saldo pendiente</span>
                    <span className={`font-montserrat font-bold text-sm ${saldo <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmt(Math.max(0, saldo))}
                    </span>
                  </div>
                )}
              </div>

              {/* Documentos */}
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">
                  Documentos <span className="text-white/20">(PDF, CSV, imágenes — varios)</span>
                </label>
                <input ref={docRef} type="file" multiple
                  accept=".pdf,.csv,.doc,.docx,.xls,.xlsx,image/*"
                  onChange={onPickDocs} className="hidden" />
                {form.docs.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#0F0F13] border border-white/8
                                          rounded-lg px-3 py-2 mb-1.5">
                    <span className="text-pop-lav/60 flex-shrink-0"><DocIcon nombre={d.nombre} /></span>
                    <a href={d.url} target="_blank" rel="noreferrer"
                      className="font-montserrat text-white/50 text-xs flex-1 truncate hover:text-white/80 transition-colors">
                      {d.nombre}
                    </a>
                    <button onClick={() => setForm(f => ({ ...f, docs: f.docs.filter((_, idx) => idx !== i) }))}
                      className="text-white/20 hover:text-red-400 text-xs transition-colors">✕</button>
                  </div>
                ))}
                {form._newFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#0F0F13] border border-emerald-500/20
                                          rounded-lg px-3 py-2 mb-1.5">
                    <span className="text-emerald-400/60 flex-shrink-0"><DocIcon nombre={f.name} /></span>
                    <span className="font-montserrat text-white/40 text-xs flex-1 truncate">{f.name}</span>
                    <button onClick={() => setForm(fm => ({ ...fm, _newFiles: fm._newFiles.filter((_, idx) => idx !== i) }))}
                      className="text-white/20 hover:text-red-400 text-xs transition-colors">✕</button>
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

              {/* Imagen */}
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Imagen de referencia</label>
                <input ref={fileRef} type="file" accept="image/*" capture="environment"
                  onChange={onFile} className="hidden" />
                {imgPreview ? (
                  <div className="relative">
                    <img src={imgPreview} alt="preview"
                      className="w-full rounded-lg max-h-48 object-contain bg-black/30" />
                    <button onClick={() => { setImgPreview(null); setForm(f => ({ ...f, imagen: null, _imgFile: null })) }}
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
                      <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
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
