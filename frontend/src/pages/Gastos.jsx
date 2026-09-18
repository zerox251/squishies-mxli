import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

const CATS = {
  inversion: { label: 'Inversión', color: 'bg-emerald-500/15 text-emerald-400', icon: '💰' },
  operativo: { label: 'Operativo', color: 'bg-blue-500/15 text-blue-400',       icon: '🏪' },
  logistica: { label: 'Logística', color: 'bg-purple-500/15 text-purple-400',   icon: '📦' },
  pedido:    { label: 'Pedido',    color: 'bg-orange-500/15 text-orange-400',    icon: '🛒' },
}

const EMPTY = { concepto: '', categoria: 'operativo', fecha: '', total: '', estado: 'pendiente', notas: '', pedidoId: '' }

const fmt = n => '$' + (n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

function generarMeses() {
  const meses = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    meses.push({ val, label })
  }
  return meses
}

function fmtFecha(f) {
  if (!f) return ''
  const [y, m, d] = f.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function groupByMonth(gastos) {
  const groups = {}
  gastos.forEach(g => {
    const [y, m] = g.fecha.slice(0, 7).split('-').map(Number)
    const key = `${y}-${String(m).padStart(2, '0')}`
    const label = new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = { label, items: [] }
    groups[key].items.push(g)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

export default function Gastos() {
  const [gastos, setGastos]       = useState([])
  const [pedidosDisp, setPedidos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [saving, setSaving]       = useState(false)

  const [mesFilter, setMes]       = useState('')
  const [catFilter, setCat]       = useState('')
  const [estadoFilter, setEstado] = useState('')

  const meses = generarMeses()

  function load() {
    const p = new URLSearchParams()
    if (mesFilter)    p.set('mes', mesFilter)
    if (catFilter)    p.set('categoria', catFilter)
    if (estadoFilter) p.set('estado', estadoFilter)
    apiFetch(`/api/gastos?${p}`).then(r => r.json()).then(setGastos).finally(() => setLoading(false))
  }

  useEffect(load, [mesFilter, catFilter, estadoFilter])

  function openNew() {
    const today = new Date().toISOString().slice(0, 10)
    setForm({ ...EMPTY, fecha: today })
    setEditId(null)
    apiFetch('/api/gastos/pedidos-disponibles').then(r => r.json()).then(setPedidos)
    setModal(true)
  }

  function openEdit(g) {
    setForm({
      concepto: g.concepto, categoria: g.categoria,
      fecha: g.fecha ? g.fecha.slice(0, 10) : '',
      total: g.total, estado: g.estado, notas: g.notas || '',
      pedidoId: g.pedidoId || '',
    })
    setEditId(g.id)
    apiFetch('/api/gastos/pedidos-disponibles').then(r => r.json()).then(d => {
      if (g.pedido) setPedidos([g.pedido, ...d])
      else setPedidos(d)
    })
    setModal(true)
  }

  async function save() {
    if (!form.concepto || !form.total) return
    setSaving(true)
    const body = {
      concepto: form.concepto,
      categoria: form.categoria,
      fecha: form.fecha || null,
      total: Number(form.total),
      estado: form.estado,
      notas: form.notas || null,
      pedidoId: form.pedidoId ? Number(form.pedidoId) : null,
    }
    const path = editId ? `/api/gastos/${editId}` : '/api/gastos'
    await apiFetch(path, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(body) })
    setSaving(false); setModal(false); load()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar gasto?')) return
    await apiFetch(`/api/gastos/${id}`, { method: 'DELETE' })
    load()
  }

  const pendienteTotal = gastos.filter(g => g.estado === 'pendiente').reduce((s, g) => s + g.total, 0)
  const inversionTotal = gastos.filter(g => g.categoria === 'inversion').reduce((s, g) => s + g.total, 0)
  const groups = groupByMonth(gastos)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-anton text-white text-2xl tracking-widest">GASTOS</h1>
        <button onClick={openNew}
          className="bg-pop-coral text-white font-montserrat font-bold text-xs px-4 py-2 rounded-lg">
          + Nuevo
        </button>
      </div>

      {/* Summary tiles */}
      {(pendienteTotal > 0 || inversionTotal > 0) && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {pendienteTotal > 0 && (
            <div className="bg-[#1A1A24] border border-white/6 rounded-xl px-3 py-3">
              <p className="font-montserrat text-white/30 text-xs mb-1">Saldo pendiente</p>
              <p className="font-anton text-yellow-400 text-lg">{fmt(pendienteTotal)}</p>
            </div>
          )}
          {inversionTotal > 0 && (
            <div className="bg-[#1A1A24] border border-white/6 rounded-xl px-3 py-3">
              <p className="font-montserrat text-white/30 text-xs mb-1">Capital invertido</p>
              <p className="font-anton text-emerald-400 text-lg">{fmt(inversionTotal)}</p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <select value={mesFilter} onChange={e => setMes(e.target.value)}
          className="bg-[#1A1A24] border border-white/10 text-white/60 text-xs font-montserrat rounded-lg px-2 py-1.5 flex-shrink-0">
          <option value="">Todos los meses</option>
          {meses.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
        </select>
        <select value={catFilter} onChange={e => setCat(e.target.value)}
          className="bg-[#1A1A24] border border-white/10 text-white/60 text-xs font-montserrat rounded-lg px-2 py-1.5 flex-shrink-0">
          <option value="">Todas</option>
          {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={estadoFilter} onChange={e => setEstado(e.target.value)}
          className="bg-[#1A1A24] border border-white/10 text-white/60 text-xs font-montserrat rounded-lg px-2 py-1.5 flex-shrink-0">
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <p className="font-montserrat text-white/30 text-sm text-center py-12">Cargando…</p>
      ) : groups.length === 0 ? (
        <p className="font-montserrat text-white/25 text-sm text-center py-12">Sin gastos aún</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(([key, { label, items }]) => (
            <div key={key}>
              <p className="font-montserrat text-white/25 text-xs uppercase tracking-widest mb-2 px-1">
                {label}
              </p>
              <div className="flex flex-col gap-1.5">
                {items.map(g => {
                  const cat = CATS[g.categoria] || CATS.operativo
                  return (
                    <div key={g.id} className="bg-[#1A1A24] border border-white/6 rounded-xl px-4 py-3
                                               flex items-center gap-3">
                      <span className="text-xl flex-shrink-0">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-montserrat text-white/80 text-sm font-medium truncate">
                          {g.concepto}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`font-montserrat text-[10px] px-1.5 py-0.5 rounded-full ${cat.color}`}>
                            {cat.label}
                          </span>
                          {g.pedido && (
                            <span className="font-montserrat text-[10px] text-orange-300/60">
                              → {g.pedido.proveedor}
                            </span>
                          )}
                          <span className="font-montserrat text-white/20 text-[10px]">
                            {fmtFecha(g.fecha)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-anton text-white text-base">{fmt(g.total)}</p>
                        <div className="flex items-center gap-2 justify-end mt-0.5">
                          <span className={`font-montserrat text-[10px] ${g.estado === 'pagado' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {g.estado}
                          </span>
                          <button onClick={() => openEdit(g)}
                            className="font-montserrat text-[10px] text-pop-lav hover:text-white transition-colors">
                            editar
                          </button>
                          <button onClick={() => eliminar(g.id)}
                            className="font-montserrat text-[10px] text-white/15 hover:text-red-400 transition-colors">
                            ×
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

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-black/70 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setModal(false)} />
          <div className="relative bg-[#1A1A24] border border-white/10
                          rounded-t-2xl md:rounded-2xl
                          w-full md:max-w-md
                          mb-14 md:mb-0
                          flex flex-col max-h-[88vh]">

            <div className="flex items-center justify-between px-5 pt-5 pb-1 flex-shrink-0">
              <h2 className="font-anton text-white text-lg tracking-wider">
                {editId ? 'EDITAR GASTO' : 'NUEVO GASTO'}
              </h2>
              <button onClick={() => setModal(false)} className="text-white/25 hover:text-white/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3 flex-1">
              {/* Concepto */}
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Concepto</label>
                <input type="text" value={form.concepto} placeholder="Inversión de Ana…"
                  onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
                  className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-3
                             text-white text-sm font-montserrat placeholder-white/20
                             focus:outline-none focus:border-pop-coral/50" />
              </div>

              {/* Categoría */}
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Categoría</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CATS).map(([k, v]) => (
                    <button key={k} onClick={() => setForm(f => ({ ...f, categoria: k, pedidoId: k !== 'pedido' ? '' : f.pedidoId }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-montserrat transition-colors
                                  ${form.categoria === k
                                    ? 'border-pop-coral/50 bg-pop-coral/10 text-white'
                                    : 'border-white/10 bg-[#0F0F13] text-white/40'}`}>
                      <span>{v.icon}</span> {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pedido selector (solo si categoria = pedido) */}
              {form.categoria === 'pedido' && (
                <div>
                  <label className="font-montserrat text-white/40 text-xs mb-1 block">Vincular pedido</label>
                  <select value={form.pedidoId} onChange={e => setForm(f => ({ ...f, pedidoId: e.target.value }))}
                    className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-3
                               text-white text-sm font-montserrat focus:outline-none">
                    <option value="">Sin vincular</option>
                    {pedidosDisp.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.proveedor} — ${p.total?.toLocaleString('es-MX')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Fecha + Total */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-montserrat text-white/40 text-xs mb-1 block">Fecha</label>
                  <input type="date" value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-3
                               text-white text-sm font-montserrat focus:outline-none [color-scheme:dark]" />
                </div>
                <div>
                  <label className="font-montserrat text-white/40 text-xs mb-1 block">Total ($)</label>
                  <input type="number" value={form.total} placeholder="700"
                    onChange={e => setForm(f => ({ ...f, total: e.target.value }))}
                    className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-3
                               text-white text-sm font-montserrat placeholder-white/20
                               focus:outline-none" />
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Estado</label>
                <div className="flex gap-2">
                  {['pendiente', 'pagado'].map(e => (
                    <button key={e} onClick={() => setForm(f => ({ ...f, estado: e }))}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-montserrat transition-colors capitalize
                                  ${form.estado === e
                                    ? e === 'pagado' ? 'border-green-500/50 bg-green-500/10 text-green-400'
                                                     : 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                                    : 'border-white/10 bg-[#0F0F13] text-white/40'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Notas (opcional)</label>
                <input type="text" value={form.notas} placeholder="Ej. pagado en efectivo…"
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-3
                             text-white text-sm font-montserrat placeholder-white/20
                             focus:outline-none" />
              </div>
            </div>

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
    </div>
  )
}
