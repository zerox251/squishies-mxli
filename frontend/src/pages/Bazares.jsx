import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

const fmt = n => '$' + (n || 0).toLocaleString('es-MX')

export default function Bazares() {
  const [bazares, setBazares] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalEnvio, setModalEnvio] = useState(null) // bazarId
  const [modalRegreso, setModalRegreso] = useState(null) // { bazarId, item }
  const [nombre, setNombre] = useState('')
  const [envioForm, setEnvioForm] = useState({ squishyId: '', cantidad: '' })
  const [regresoVal, setRegresoVal] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    Promise.all([
      apiFetch('/api/bazares').then(r => r.json()),
      apiFetch('/api/productos').then(r => r.json()),
    ]).then(([b, p]) => { setBazares(b); setProductos(p.filter(x => x.activo)) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function crearBazar() {
    if (!nombre) return
    setSaving(true)
    await apiFetch('/api/bazares', { method: 'POST', body: JSON.stringify({ nombre }) })
    setSaving(false); setModalNuevo(false); setNombre(''); load()
  }

  async function enviar() {
    if (!envioForm.squishyId || !envioForm.cantidad) return
    setSaving(true)
    await apiFetch(`/api/bazares/${modalEnvio}/items`, {
      method: 'POST',
      body: JSON.stringify({ squishyId: Number(envioForm.squishyId), cantidadEnviada: Number(envioForm.cantidad) }),
    })
    setSaving(false); setModalEnvio(null); setEnvioForm({ squishyId: '', cantidad: '' }); load()
  }

  async function registrarRegreso() {
    if (regresoVal === '') return
    setSaving(true)
    await apiFetch(`/api/bazares/${modalRegreso.bazarId}/items/${modalRegreso.item.id}/regreso`, {
      method: 'PUT',
      body: JSON.stringify({ cantidadRegreso: Number(regresoVal) }),
    })
    setSaving(false); setModalRegreso(null); setRegresoVal(''); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-anton text-white text-2xl tracking-widest">BAZARES</h1>
        <button onClick={() => setModalNuevo(true)}
          className="bg-pop-coral text-white font-montserrat font-bold text-xs px-4 py-2 rounded-lg">
          + Nuevo
        </button>
      </div>

      {loading ? (
        <p className="font-montserrat text-white/30 text-sm text-center py-12">Cargando…</p>
      ) : bazares.length === 0 ? (
        <p className="font-montserrat text-white/25 text-sm text-center py-12">Sin bazares aún</p>
      ) : (
        <div className="flex flex-col gap-3">
          {bazares.map(b => {
            const enviados = b.items?.reduce((s, i) => s + i.cantidadEnviada, 0) || 0
            const regresaron = b.items?.reduce((s, i) => s + i.cantidadRegreso, 0) || 0
            const vendidos = enviados - regresaron
            return (
              <div key={b.id} className="bg-[#1A1A24] border border-white/6 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-montserrat text-white/80 font-medium">{b.nombre}</p>
                    <p className="font-montserrat text-white/30 text-xs">
                      {new Date(b.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-montserrat text-white/40 text-xs">{enviados} enviados · {vendidos} vendidos</p>
                  </div>
                </div>

                {/* Items del bazar */}
                {b.items?.length > 0 && (
                  <div className="mb-3 flex flex-col gap-1">
                    {b.items.map(item => {
                      const vend = item.cantidadEnviada - item.cantidadRegreso
                      const cerrado = item.cantidadRegreso > 0
                      return (
                        <div key={item.id} className="flex items-center justify-between py-1">
                          <span className="font-montserrat text-white/50 text-xs">{item.squishy?.nombre}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-montserrat text-white/30 text-xs">
                              {item.cantidadEnviada} enviados
                              {cerrado ? ` · ${vend} vendidos` : ''}
                            </span>
                            {!cerrado && (
                              <button
                                onClick={() => { setModalRegreso({ bazarId: b.id, item }); setRegresoVal('') }}
                                className="font-montserrat text-xs text-pop-lav hover:text-white transition-colors"
                              >
                                Registrar regreso
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <button
                  onClick={() => { setModalEnvio(b.id); setEnvioForm({ squishyId: '', cantidad: '' }) }}
                  className="font-montserrat text-xs text-pop-coral border border-pop-coral/30
                             hover:bg-pop-coral/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Enviar producto
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nuevo bazar */}
      {modalNuevo && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A24] border border-white/10 rounded-t-2xl md:rounded-2xl p-5 w-full md:max-w-sm">
            <h2 className="font-anton text-white text-lg tracking-wider mb-4">NUEVO BAZAR</h2>
            <label className="font-montserrat text-white/40 text-xs mb-1 block">Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Bazar Chapultepec"
              className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                         text-white text-sm font-montserrat placeholder-white/20
                         focus:outline-none focus:border-pop-coral/50" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalNuevo(false)}
                className="flex-1 border border-white/10 text-white/40 font-montserrat text-sm py-2.5 rounded-lg">
                Cancelar
              </button>
              <button onClick={crearBazar} disabled={saving}
                className="flex-1 bg-pop-coral text-white font-montserrat font-bold text-sm py-2.5 rounded-lg disabled:opacity-50">
                {saving ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal envío */}
      {modalEnvio && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A24] border border-white/10 rounded-t-2xl md:rounded-2xl p-5 w-full md:max-w-sm">
            <h2 className="font-anton text-white text-lg tracking-wider mb-4">ENVIAR AL BAZAR</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Producto</label>
                <select value={envioForm.squishyId}
                  onChange={e => setEnvioForm(f => ({ ...f, squishyId: e.target.value }))}
                  className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                             text-white text-sm font-montserrat focus:outline-none">
                  <option value="">Seleccionar…</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.stock} disponibles)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1 block">Cantidad</label>
                <input type="number" min="1" value={envioForm.cantidad}
                  onChange={e => setEnvioForm(f => ({ ...f, cantidad: e.target.value }))}
                  className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                             text-white text-sm font-montserrat focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalEnvio(null)}
                className="flex-1 border border-white/10 text-white/40 font-montserrat text-sm py-2.5 rounded-lg">
                Cancelar
              </button>
              <button onClick={enviar} disabled={saving}
                className="flex-1 bg-pop-coral text-white font-montserrat font-bold text-sm py-2.5 rounded-lg disabled:opacity-50">
                {saving ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal regreso */}
      {modalRegreso && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A24] border border-white/10 rounded-t-2xl md:rounded-2xl p-5 w-full md:max-w-sm">
            <h2 className="font-anton text-white text-lg tracking-wider mb-1">REGRESO DEL BAZAR</h2>
            <p className="font-montserrat text-white/40 text-xs mb-4">
              {modalRegreso.item.squishy?.nombre} · {modalRegreso.item.cantidadEnviada} enviados
            </p>
            <label className="font-montserrat text-white/40 text-xs mb-1 block">¿Cuántos regresaron sin vender?</label>
            <input type="number" min="0" max={modalRegreso.item.cantidadEnviada} value={regresoVal}
              onChange={e => setRegresoVal(e.target.value)}
              className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                         text-white text-sm font-montserrat focus:outline-none" />
            {regresoVal !== '' && (
              <p className="font-montserrat text-green-400/70 text-xs mt-2">
                Vendidos: {modalRegreso.item.cantidadEnviada - Number(regresoVal)} · Se generará venta automática
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalRegreso(null)}
                className="flex-1 border border-white/10 text-white/40 font-montserrat text-sm py-2.5 rounded-lg">
                Cancelar
              </button>
              <button onClick={registrarRegreso} disabled={saving || regresoVal === ''}
                className="flex-1 bg-pop-coral text-white font-montserrat font-bold text-sm py-2.5 rounded-lg disabled:opacity-50">
                {saving ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
