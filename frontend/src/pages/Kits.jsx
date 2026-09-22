import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

const fmt  = n => '$' + (Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const r2   = n => Math.round(Number(n) * 100) / 100

function calcCosto(items, costoBolsa, comision) {
  return items.reduce((s, it) => s + (Number(it.costo) || 0) * (Number(it.cantidad) || 1), 0)
    + (Number(costoBolsa) || 0) + (Number(comision) || 0)
}

export default function Kits() {
  const [kits,       setKits]       = useState([])
  const [inventario, setInventario] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [editId,     setEditId]     = useState(null)
  const [saving,     setSaving]     = useState(false)

  // form
  const [nombre,     setNombre]     = useState('')
  const [costoBolsa, setCostoBolsa] = useState('')
  const [comision,   setComision]   = useState('')
  const [precio,     setPrecio]     = useState('')
  const [profitPct,  setProfitPct]  = useState('')
  const [items,      setItems]      = useState([]) // {squishyId, nombre, costo, cantidad}
  const [itemSearch, setItemSearch] = useState('')

  // armar modal
  // picker de productos
  const [pickerOpen,   setPickerOpen]   = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  // armar modal
  const [armarKit,   setArmarKit]   = useState(null)
  const [armarN,     setArmarN]     = useState('1')
  const [armando,    setArmando]    = useState(false)
  const [armarErr,   setArmarErr]   = useState('')

  function load() {
    Promise.all([
      apiFetch('/api/kits').then(r => r.json()),
      apiFetch('/api/productos').then(r => r.json()),
    ]).then(([k, inv]) => {
      setKits(k)
      setInventario(inv.filter(p => p.activo))
    }).finally(() => setLoading(false))
  }
  useEffect(load, [])

  function openNew() {
    setEditId(null); setNombre(''); setCostoBolsa(''); setComision(''); setPrecio(''); setProfitPct('')
    setItems([]); setItemSearch(''); setPickerSearch(''); setModal(true)
  }
  function openEdit(kit) {
    setEditId(kit.id)
    setNombre(kit.nombre)
    setCostoBolsa(String(kit.costoBolsa))
    setComision(String(kit.comision))
    setPrecio(String(kit.precio))
    const costo = calcCosto(
      kit.items.map(it => ({ costo: it.squishy?.costo || 0, cantidad: it.cantidad })),
      kit.costoBolsa, kit.comision
    )
    setProfitPct(costo > 0 ? String(r2(((kit.precio / costo) - 1) * 100)) : '')
    setItems(kit.items.map(it => ({
      squishyId: it.squishyId,
      nombre:    it.squishy?.nombre || it.nombre || '',
      costo:     it.squishy?.costo  || 0,
      cantidad:  it.cantidad,
    })))
    setItemSearch(''); setPickerSearch(''); setModal(true)
  }

  // agregar componente
  function agregarItem(sq) {
    if (items.find(it => it.squishyId === sq.id)) return
    setItems(prev => [...prev, { squishyId: sq.id, nombre: sq.nombre, costo: sq.costo || 0, cantidad: 1 }])
    setItemSearch('')
  }
  function setItemCantidad(squishyId, val) {
    setItems(prev => prev.map(it => it.squishyId === squishyId ? { ...it, cantidad: Math.max(1, Number(val) || 1) } : it))
  }
  function removeItem(squishyId) {
    setItems(prev => prev.filter(it => it.squishyId !== squishyId))
  }

  const costoCalculado = calcCosto(items, costoBolsa, comision)

  // cuando cambia el costo, recalcular precio si hay % definido
  useEffect(() => {
    if (!profitPct || !costoCalculado) return
    setPrecio(String(r2(costoCalculado * (1 + Number(profitPct) / 100))))
  }, [costoCalculado]) // eslint-disable-line react-hooks/exhaustive-deps

  function onProfitChange(v) {
    setProfitPct(v)
    if (costoCalculado > 0) setPrecio(String(r2(costoCalculado * (1 + Number(v) / 100))))
  }
  function onPrecioChange(v) {
    setPrecio(v)
    if (costoCalculado > 0 && Number(v) > 0)
      setProfitPct(String(r2(((Number(v) / costoCalculado) - 1) * 100)))
    else setProfitPct('')
  }

  const filteredInv = inventario.filter(sq =>
    sq.nombre.toLowerCase().includes(itemSearch.toLowerCase()) &&
    !items.find(it => it.squishyId === sq.id)
  )

  async function save() {
    if (!nombre.trim() || items.length === 0) return
    setSaving(true)
    const body = { nombre, costoBolsa, comision, precio, items }
    const path = editId ? `/api/kits/${editId}` : '/api/kits'
    await apiFetch(path, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(body) })
    setSaving(false); setModal(false); load()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar kit?')) return
    await apiFetch(`/api/kits/${id}`, { method: 'DELETE' }); load()
  }

  async function armar() {
    if (!armarKit || !armarN || Number(armarN) < 1) return
    setArmando(true); setArmarErr('')
    const res = await apiFetch(`/api/kits/${armarKit.id}/armar`, {
      method: 'POST', body: JSON.stringify({ cantidad: Number(armarN) }),
    })
    if (res.ok) {
      setArmarKit(null); load()
    } else {
      const data = await res.json()
      setArmarErr(data.error || 'Error al armar')
    }
    setArmando(false)
  }

  const inputCls = `w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                    text-white text-sm font-montserrat placeholder-white/20
                    focus:outline-none focus:border-pop-coral/50`

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-anton text-white text-2xl tracking-widest">KITS</h1>
          <p className="font-montserrat text-white/25 text-xs">Bolsas y paquetes armados</p>
        </div>
        <button onClick={openNew}
          className="bg-pop-coral text-white font-montserrat font-bold text-xs px-4 py-2 rounded-lg">
          + Nuevo kit
        </button>
      </div>

      {loading ? (
        <p className="font-montserrat text-white/30 text-sm text-center py-12">Cargando…</p>
      ) : kits.length === 0 ? (
        <p className="font-montserrat text-white/25 text-sm text-center py-12">Sin kits aún</p>
      ) : (
        <div className="flex flex-col gap-3">
          {kits.map(kit => {
            const costoKit = calcCosto(
              kit.items.map(it => ({ costo: it.squishy?.costo || 0, cantidad: it.cantidad })),
              kit.costoBolsa, kit.comision
            )
            const stock = kit.squishy?.stock ?? 0
            return (
              <div key={kit.id} className="bg-[#1A1A24] border border-white/6 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="font-montserrat text-white/90 font-semibold text-sm">{kit.nombre}</h2>
                      <span className={`font-montserrat text-xs px-2 py-0.5 rounded-full
                        ${stock > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                        {stock} uds en stock
                      </span>
                    </div>
                    {/* Componentes */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {kit.items.map(it => (
                        <span key={it.id}
                          className="font-montserrat text-[10px] text-white/40 bg-white/5 rounded px-2 py-0.5">
                          {it.cantidad}× {it.squishy?.nombre}
                        </span>
                      ))}
                      {kit.costoBolsa > 0 && (
                        <span className="font-montserrat text-[10px] text-pop-lav/50 bg-pop-lav/5 rounded px-2 py-0.5">
                          Bolsa {fmt(kit.costoBolsa)}
                        </span>
                      )}
                    </div>
                    {/* Costos */}
                    <div className="flex gap-4">
                      <div>
                        <p className="font-montserrat text-white/25 text-[10px]">Costo</p>
                        <p className="font-montserrat text-white/60 text-sm font-medium">{fmt(costoKit)}</p>
                      </div>
                      <div>
                        <p className="font-montserrat text-white/25 text-[10px]">Precio venta</p>
                        <p className="font-montserrat text-white text-sm font-bold">{fmt(kit.precio)}</p>
                      </div>
                      {kit.precio > 0 && costoKit > 0 && (
                        <div>
                          <p className="font-montserrat text-white/25 text-[10px]">Margen</p>
                          <p className="font-montserrat text-emerald-400 text-sm">
                            {Math.round((kit.precio - costoKit) / kit.precio * 100)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 items-end">
                    <button onClick={() => { setArmarKit(kit); setArmarN('1'); setArmarErr('') }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-montserrat
                                 font-bold text-xs px-4 py-2 rounded-lg transition-colors">
                      Armar
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(kit)}
                        className="font-montserrat text-xs text-pop-lav hover:text-white transition-colors">editar</button>
                      <button onClick={() => eliminar(kit.id)}
                        className="font-montserrat text-xs text-white/15 hover:text-red-400 transition-colors">borrar</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal crear/editar ─────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="absolute inset-0" onClick={() => setModal(false)} />
          <div className="relative bg-[#1A1A24] border border-white/10
                          rounded-2xl w-full max-w-lg
                          flex flex-col max-h-[90vh]">

            <div className="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
              <h2 className="font-anton text-white text-lg tracking-wider">
                {editId ? 'EDITAR KIT' : 'NUEVO KIT'}
              </h2>
              <button onClick={() => setModal(false)} className="text-white/25 hover:text-white/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-4 flex flex-col gap-4 flex-1">

              {/* Nombre */}
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Nombre del kit</label>
                <input type="text" value={nombre} placeholder="Kit Halloween…"
                  onChange={e => setNombre(e.target.value)} className={inputCls} />
              </div>

              {/* Componentes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-montserrat text-white/40 text-xs">Productos del kit</label>
                  {items.length > 0 && (
                    <span className="font-montserrat text-white/25 text-[10px]">{items.length} producto{items.length > 1 ? 's' : ''}</span>
                  )}
                </div>

                <button type="button" onClick={() => { setPickerSearch(''); setPickerOpen(true) }}
                  className="w-full bg-[#0F0F13] border border-white/10 hover:border-pop-coral/40
                             rounded-lg px-3 py-2.5 text-left font-montserrat text-sm
                             text-white/25 hover:text-white/50 transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Agregar productos al kit…
                </button>

                {/* Lista de componentes seleccionados */}
                {items.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {items.map(it => (
                      <div key={it.squishyId}
                        className="flex items-center gap-2 bg-[#0F0F13] border border-white/6 rounded-lg px-3 py-2">
                        <span className="font-montserrat text-white/70 text-sm flex-1 truncate">{it.nombre}</span>
                        <span className="font-montserrat text-white/30 text-xs shrink-0">{fmt(it.costo)}/u</span>
                        <input type="number" min="1" value={it.cantidad}
                          onChange={e => setItemCantidad(it.squishyId, e.target.value)}
                          className="w-14 bg-[#1A1A24] border border-white/10 rounded px-2 py-1
                                     text-white text-xs font-montserrat text-center focus:outline-none shrink-0" />
                        <span className="font-montserrat text-emerald-400/70 text-xs w-14 text-right shrink-0">
                          {fmt(r2(it.costo * it.cantidad))}
                        </span>
                        <button onClick={() => removeItem(it.squishyId)}
                          className="text-white/15 hover:text-red-400 transition-colors text-xs ml-1 shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bolsa + comisión */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-montserrat text-white/40 text-xs mb-1 block">Costo bolsa ($)</label>
                  <input type="number" value={costoBolsa} placeholder="0"
                    onChange={e => setCostoBolsa(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="font-montserrat text-white/40 text-xs mb-1 block">Comisión ($)</label>
                  <input type="number" value={comision} placeholder="0"
                    onChange={e => setComision(e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Costo calculado + precio */}
              <div className="bg-[#0F0F13] border border-white/8 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="font-montserrat text-white/40 text-xs">Costo total calculado</span>
                  <span className="font-montserrat text-white/70 font-semibold text-sm">{fmt(costoCalculado)}</span>
                </div>
                {items.length > 0 && (
                  <div className="space-y-1">
                    {items.map(it => (
                      <div key={it.squishyId} className="flex justify-between">
                        <span className="font-montserrat text-white/25 text-xs">{it.cantidad}× {it.nombre}</span>
                        <span className="font-montserrat text-white/35 text-xs">{fmt(r2(it.costo * it.cantidad))}</span>
                      </div>
                    ))}
                    {Number(costoBolsa) > 0 && (
                      <div className="flex justify-between">
                        <span className="font-montserrat text-white/25 text-xs">Bolsa</span>
                        <span className="font-montserrat text-white/35 text-xs">{fmt(costoBolsa)}</span>
                      </div>
                    )}
                    {Number(comision) > 0 && (
                      <div className="flex justify-between">
                        <span className="font-montserrat text-white/25 text-xs">Comisión</span>
                        <span className="font-montserrat text-white/35 text-xs">{fmt(comision)}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-montserrat text-white/40 text-xs mb-1 block">% Profit</label>
                    <div className="relative">
                      <input type="number" value={profitPct} placeholder="30"
                        onChange={e => onProfitChange(e.target.value)}
                        className="w-full bg-[#14141c] border border-emerald-500/30 rounded-lg pl-3 pr-7 py-2.5
                                   text-white text-sm font-montserrat placeholder-white/20
                                   focus:outline-none focus:border-emerald-500/60" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-montserrat text-white/30 text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="font-montserrat text-white/40 text-xs mb-1 block">Precio de venta</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-montserrat text-white/30 text-sm">$</span>
                      <input type="number" value={precio} placeholder="0"
                        onChange={e => onPrecioChange(e.target.value)}
                        className="w-full bg-[#14141c] border border-pop-coral/30 rounded-lg pl-6 pr-3 py-2.5
                                   text-white text-sm font-montserrat placeholder-white/20
                                   focus:outline-none focus:border-pop-coral/60" />
                    </div>
                  </div>
                </div>
                {precio && costoCalculado > 0 && Number(precio) > costoCalculado && (
                  <p className="font-montserrat text-[10px] text-emerald-400/70 mt-1">
                    Ganancia por kit: {fmt(r2(Number(precio) - costoCalculado))}
                  </p>
                )}
              </div>
            </div>

            <div className="px-5 pb-5 pt-2 flex gap-2 flex-shrink-0">
              <button onClick={() => setModal(false)}
                className="flex-1 border border-white/10 text-white/40 font-montserrat text-sm py-3 rounded-xl">
                Cancelar
              </button>
              <button onClick={save} disabled={saving || !nombre.trim() || items.length === 0}
                className="flex-1 bg-pop-coral text-white font-montserrat font-bold text-sm py-3 rounded-xl disabled:opacity-50">
                {saving ? 'Guardando…' : 'Guardar kit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal picker de productos ─────────────────────────────────────────── */}
      {pickerOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" style={{ zIndex: 60 }}>
          <div className="absolute inset-0" onClick={() => setPickerOpen(false)} />
          <div className="relative bg-[#1A1A24] border border-white/10
                          rounded-2xl w-full max-w-md
                          flex flex-col" style={{ maxHeight: '80vh' }}>

            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h3 className="font-anton text-white text-base tracking-wider">AGREGAR PRODUCTO</h3>
              <button onClick={() => setPickerOpen(false)} className="text-white/25 hover:text-white/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Buscador */}
            <div className="px-5 pb-3 flex-shrink-0">
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2"
                     className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input autoFocus type="text" value={pickerSearch}
                  placeholder="Buscar producto…"
                  onChange={e => setPickerSearch(e.target.value)}
                  className="w-full bg-[#0F0F13] border border-white/10 rounded-lg pl-9 pr-3 py-2.5
                             text-white text-sm font-montserrat placeholder-white/20
                             focus:outline-none focus:border-pop-coral/50" />
              </div>
            </div>

            {/* Lista de productos */}
            <div className="overflow-y-auto flex-1 px-3 pb-4">
              {inventario
                .filter(sq =>
                  sq.nombre.toLowerCase().includes(pickerSearch.toLowerCase())
                )
                .map(sq => {
                  const yaAgregado = items.find(it => it.squishyId === sq.id)
                  return (
                    <button key={sq.id}
                      onClick={() => { if (!yaAgregado) { agregarItem(sq) } else { removeItem(sq.id) } }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1
                                  transition-colors text-left
                                  ${yaAgregado
                                    ? 'bg-pop-coral/10 border border-pop-coral/20'
                                    : 'hover:bg-white/5 border border-transparent'}`}>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors
                                       ${yaAgregado ? 'bg-pop-coral border-pop-coral' : 'border-white/15'}`}>
                        {yaAgregado && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                               fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-montserrat text-sm truncate ${yaAgregado ? 'text-white' : 'text-white/70'}`}>
                          {sq.nombre}
                        </p>
                        <p className="font-montserrat text-white/30 text-xs">
                          {fmt(sq.costo || 0)}/u · {sq.stock} en stock
                        </p>
                      </div>
                      {yaAgregado && (
                        <span className="font-montserrat text-pop-coral text-xs shrink-0">Agregado</span>
                      )}
                    </button>
                  )
                })}
              {inventario.filter(sq => sq.nombre.toLowerCase().includes(pickerSearch.toLowerCase())).length === 0 && (
                <p className="font-montserrat text-white/25 text-sm text-center py-8">Sin resultados</p>
              )}
            </div>

            <div className="px-5 pb-5 pt-2 flex-shrink-0 border-t border-white/5">
              <button onClick={() => setPickerOpen(false)}
                className="w-full bg-pop-coral text-white font-montserrat font-bold text-sm py-3 rounded-xl">
                Listo {items.length > 0 ? `· ${items.length} producto${items.length > 1 ? 's' : ''}` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal armar ───────────────────────────────────────────────────────── */}
      {armarKit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#1A1A24] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-anton text-white text-lg tracking-wider mb-1">ARMAR KITS</h2>
            <p className="font-montserrat text-white/40 text-xs mb-4">{armarKit.nombre}</p>

            {/* Stock disponible por componente */}
            <div className="bg-[#0F0F13] border border-white/6 rounded-xl p-3 mb-4">
              <p className="font-montserrat text-white/30 text-[10px] mb-2 uppercase tracking-wider">Stock disponible</p>
              {armarKit.items.map(it => {
                const stockDisp = it.squishy?.stock || 0
                const maxKits   = Math.floor(stockDisp / it.cantidad)
                return (
                  <div key={it.id} className="flex justify-between items-center mb-1 last:mb-0">
                    <span className="font-montserrat text-white/50 text-xs">{it.cantidad}× {it.squishy?.nombre}</span>
                    <span className={`font-montserrat text-xs font-medium ${maxKits < 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {stockDisp} uds → máx. {maxKits} kits
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="mb-4">
              <label className="font-montserrat text-white/40 text-xs mb-1 block">¿Cuántos kits armar?</label>
              <input type="number" min="1" value={armarN} onChange={e => setArmarN(e.target.value)}
                className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-3
                           text-white text-xl font-montserrat text-center
                           focus:outline-none focus:border-emerald-500/50" />
            </div>

            {armarErr && (
              <p className="font-montserrat text-red-400 text-xs mb-3 bg-red-500/10 border border-red-500/20
                            rounded-lg px-3 py-2">{armarErr}</p>
            )}

            <div className="flex gap-2">
              <button onClick={() => setArmarKit(null)}
                className="flex-1 border border-white/10 text-white/40 font-montserrat text-sm py-2.5 rounded-xl">
                Cancelar
              </button>
              <button onClick={armar} disabled={armando || !armarN || Number(armarN) < 1}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-montserrat font-bold
                           text-sm py-2.5 rounded-xl disabled:opacity-50 transition-colors">
                {armando ? 'Armando…' : `Armar ${armarN} kit${Number(armarN) > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
