import { useState } from 'react'

const fmt    = n => isNaN(n) || !isFinite(n) ? '—' : '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtUSD = n => isNaN(n) || !isFinite(n) ? '—' : 'USD $' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function calcRow(r, margen, tc) {
  const piezas   = Number(r.piezas)   || 0
  const paquetes = Number(r.paquetes) || 0
  const precio   = Number(r.precio)   || 0
  const precioMXN = r.divisa === 'USD' ? precio * tc : precio
  const totalUnidades = piezas * paquetes
  const costoUnit     = piezas > 0 ? precioMXN / piezas : 0
  const precioPublico = costoUnit * (1 + margen / 100)
  const gananciaUnit  = precioPublico - costoUnit
  const gananciaTotal = gananciaUnit * totalUnidades
  const inversionMXN  = precioMXN * paquetes
  return { totalUnidades, costoUnit, precioPublico, gananciaUnit, gananciaTotal, inversion: inversionMXN }
}

function newRow(id) {
  return { id, nombre: '', piezas: '', paquetes: '', precio: '', divisa: 'MXN' }
}

export default function Cotizador() {
  const [margen, setMargen] = useState(100)
  const [tc, setTc]         = useState(19.5)
  const [rows, setRows]     = useState([newRow(1), newRow(2), newRow(3)])
  const [nextId, setNextId] = useState(4)

  function addRow() {
    setRows(r => [...r, newRow(nextId)])
    setNextId(n => n + 1)
  }

  function removeRow(id) {
    setRows(r => r.filter(x => x.id !== id))
  }

  function update(id, field, value) {
    setRows(r => r.map(x => x.id === id ? { ...x, [field]: value } : x))
  }

  const hayUSD = rows.some(r => r.divisa === 'USD')
  const calcs  = rows.map(r => ({ ...r, ...calcRow(r, margen, tc) }))
  const totalInversion  = calcs.reduce((s, r) => s + r.inversion, 0)
  const totalIngreso    = calcs.reduce((s, r) => s + r.precioPublico * r.totalUnidades, 0)
  const totalGanancia   = calcs.reduce((s, r) => s + r.gananciaTotal, 0)

  return (
    <div>
      <h1 className="font-anton text-white text-2xl tracking-widest mb-1">COTIZADOR</h1>
      <p className="font-montserrat text-white/30 text-xs mb-5">Calcula precios de venta a partir del costo por paquete</p>

      {/* Margen + tipo de cambio */}
      <div className="bg-[#1A1A24] border border-white/6 rounded-xl px-4 py-3 mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-0">
          <p className="font-montserrat text-white/40 text-xs mb-0.5">Margen de ganancia</p>
          <p className="font-montserrat text-white/20 text-[10px]">Precio público = Costo MXN × (1 + Margen%)</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number" value={margen} min={0}
            onChange={e => setMargen(Number(e.target.value))}
            className="w-16 bg-[#0F0F13] border border-pop-coral/40 rounded-lg px-2 py-2
                       text-white text-sm font-montserrat text-center focus:outline-none focus:border-pop-coral/80"
          />
          <span className="font-anton text-pop-coral text-lg">%</span>
        </div>
        <div className="flex items-center gap-2 border-l border-white/10 pl-4">
          <div>
            <p className="font-montserrat text-white/40 text-xs mb-0.5">USD → MXN</p>
          </div>
          <input
            type="number" value={tc} min={1} step={0.1}
            onChange={e => setTc(Number(e.target.value))}
            className="w-16 bg-[#0F0F13] border border-white/10 rounded-lg px-2 py-2
                       text-white text-sm font-montserrat text-center focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* Productos */}
      <div className="flex flex-col gap-3 mb-4">
        {calcs.map((r, i) => {
          const tieneData = r.nombre || r.piezas || r.paquetes || r.precio
          return (
            <div key={r.id} className="bg-[#1A1A24] border border-white/6 rounded-xl px-4 py-3">
              {/* Header row */}
              <div className="flex items-center gap-2 mb-3">
                <span className="font-montserrat text-white/20 text-xs w-5 text-center">{i + 1}</span>
                <input
                  type="text" value={r.nombre} placeholder="Nombre del producto…"
                  onChange={e => update(r.id, 'nombre', e.target.value)}
                  className="flex-1 bg-transparent text-white/80 text-sm font-montserrat
                             placeholder-white/20 focus:outline-none border-b border-white/10
                             focus:border-white/30 pb-0.5"
                />
                {rows.length > 1 && (
                  <button onClick={() => removeRow(r.id)}
                    className="text-white/15 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                )}
              </div>

              {/* Input grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Pzas/paquete', field: 'piezas', placeholder: '24' },
                  { label: 'Paquetes',     field: 'paquetes', placeholder: '1' },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="font-montserrat text-white/30 text-[10px] block mb-1">{label}</label>
                    <input
                      type="number" value={r[field]} placeholder={placeholder}
                      onChange={e => update(r.id, field, e.target.value)}
                      className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-2 py-2
                                 text-white text-sm font-montserrat placeholder-white/15
                                 focus:outline-none focus:border-white/30 text-center"
                    />
                  </div>
                ))}
                {/* Precio + divisa */}
                <div>
                  <label className="font-montserrat text-white/30 text-[10px] block mb-1">Precio paquete</label>
                  <div className="flex gap-1">
                    <input
                      type="number" value={r.precio} placeholder={r.divisa === 'USD' ? '5' : '177'}
                      onChange={e => update(r.id, 'precio', e.target.value)}
                      className="flex-1 min-w-0 bg-[#0F0F13] border border-white/10 rounded-lg px-2 py-2
                                 text-white text-sm font-montserrat placeholder-white/15
                                 focus:outline-none focus:border-white/30 text-center"
                    />
                    <button
                      onClick={() => update(r.id, 'divisa', r.divisa === 'MXN' ? 'USD' : 'MXN')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-montserrat font-bold border transition-colors flex-shrink-0
                                  ${r.divisa === 'USD'
                                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                                    : 'border-white/15 bg-white/5 text-white/30'}`}>
                      {r.divisa}
                    </button>
                  </div>
                  {r.divisa === 'USD' && r.precio && (
                    <p className="font-montserrat text-white/25 text-[10px] mt-1 text-right">
                      ≈ {fmt(Number(r.precio) * tc)} MXN
                    </p>
                  )}
                </div>
              </div>

              {/* Resultados */}
              {tieneData && (
                <div className="border-t border-white/5 pt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <ResultRow label="Total unidades" value={r.totalUnidades > 0 ? r.totalUnidades : '—'} mono />
                  <ResultRow label="Costo unitario" value={fmt(r.costoUnit)} />
                  <ResultRow label="Precio público" value={fmt(r.precioPublico)} highlight />
                  <ResultRow label="Ganancia unit." value={fmt(r.gananciaUnit)} />
                  <ResultRow label="Inversión total" value={fmt(r.inversion)} />
                  <ResultRow label="Ganancia total" value={fmt(r.gananciaTotal)} accent />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add row */}
      <button onClick={addRow}
        className="w-full border border-dashed border-white/15 rounded-xl py-3
                   text-white/25 font-montserrat text-sm hover:border-white/30
                   hover:text-white/40 transition-colors mb-6">
        + Agregar producto
      </button>

      {/* Resumen financiero */}
      {totalInversion > 0 && (
        <div className="bg-[#1A1A24] border border-white/6 rounded-xl px-4 py-4">
          <p className="font-anton text-white/50 text-sm tracking-widest mb-3">RESUMEN DEL PEDIDO</p>
          <div className="flex flex-col gap-2">
            <SummaryRow label="Inversión total (costo)"    value={fmt(totalInversion)} />
            <SummaryRow label="Ingreso esperado (ventas)"  value={fmt(totalIngreso)} />
            <div className="border-t border-white/5 pt-2 mt-1">
              <SummaryRow label="Ganancia bruta esperada"  value={fmt(totalGanancia)} highlight />
              <SummaryRow label="Retorno sobre inversión"
                value={totalInversion > 0 ? `${((totalGanancia / totalInversion) * 100).toFixed(1)}%` : '—'}
                accent />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultRow({ label, value, highlight, accent, mono }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-montserrat text-white/30 text-[11px]">{label}</span>
      <span className={`font-montserrat text-[11px] font-semibold
        ${highlight ? 'text-pop-rose' : accent ? 'text-emerald-400' : mono ? 'text-white/60' : 'text-white/60'}`}>
        {value}
      </span>
    </div>
  )
}

function SummaryRow({ label, value, highlight, accent }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="font-montserrat text-white/40 text-sm">{label}</span>
      <span className={`font-anton text-base
        ${highlight ? 'text-white' : accent ? 'text-emerald-400' : 'text-white/60'}`}>
        {value}
      </span>
    </div>
  )
}
