import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

const EMPTY = { proveedor: '', total: '', notas: '', fechaLlegada: '', status: 'pendiente' }
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

  function load() {
    apiFetch('/api/pedidos').then(r => r.json()).then(setPedidos).finally(() => setLoading(false))
  }
  useEffect(load, [])

  function openNew() { setForm(EMPTY); setEditId(null); setModal(true) }
  function openEdit(p) {
    setForm({
      proveedor: p.proveedor, total: p.total, notas: p.notas || '',
      fechaLlegada: p.fechaLlegada ? p.fechaLlegada.slice(0, 10) : '',
      status: p.status,
    })
    setEditId(p.id); setModal(true)
  }

  async function save() {
    if (!form.proveedor || !form.total) return
    setSaving(true)
    const body = {
      proveedor: form.proveedor,
      total: Number(form.total),
      notas: form.notas || null,
      fechaLlegada: form.fechaLlegada || null,
      status: form.status,
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
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-montserrat text-white/80 text-sm font-medium">{p.proveedor}</p>
                    <span className={`font-montserrat text-xs px-2 py-0.5 rounded-full ${STATUS[p.status] || STATUS.pendiente}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="font-montserrat text-white/30 text-xs">
                    Llega: {fmtFecha(p.fechaLlegada)}
                    {p.notas && ` · ${p.notas}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
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
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A24] border border-white/10 rounded-t-2xl md:rounded-2xl p-5 w-full md:max-w-md">
            <h2 className="font-anton text-white text-lg tracking-wider mb-4">
              {editId ? 'EDITAR PEDIDO' : 'NUEVO PEDIDO'}
            </h2>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Proveedor', key: 'proveedor', type: 'text', placeholder: 'Ozzymandias' },
                { label: 'Total ($)', key: 'total', type: 'number', placeholder: '5000' },
                { label: 'Fecha llegada', key: 'fechaLlegada', type: 'date', placeholder: '' },
                { label: 'Notas', key: 'notas', type: 'text', placeholder: 'Opcional…' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="font-montserrat text-white/40 text-xs mb-1 block">{label}</label>
                  <input type={type} value={form[key]} placeholder={placeholder}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                               text-white text-sm font-montserrat placeholder-white/20
                               focus:outline-none focus:border-pop-coral/50" />
                </div>
              ))}
              {editId && (
                <div>
                  <label className="font-montserrat text-white/40 text-xs mb-1 block">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                               text-white text-sm font-montserrat focus:outline-none">
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </div>
              )}
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
