import { useEffect, useState } from 'react'

const fmt = n => isNaN(n) || !isFinite(n) ? '—' : '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function calcRow(r, margen, tc) {
  const piezas     = Number(r.piezas)   || 0
  const paquetes   = Number(r.paquetes) || 0
  const precio     = Number(r.precio)   || 0
  const precioMXN  = r.divisa === 'USD' ? precio * tc : precio
  const totalUnidades = piezas * paquetes
  const costoUnit     = piezas > 0 ? precioMXN / piezas : 0
  const precioPublico = costoUnit * (1 + margen / 100)
  const gananciaTotal = (precioPublico - costoUnit) * totalUnidades
  const inversion     = precioMXN * paquetes
  return { totalUnidades, costoUnit, precioPublico, gananciaTotal, inversion }
}

function newRow(id) {
  return { id, nombre: '', piezas: '', paquetes: '', precio: '', divisa: 'MXN' }
}

const INPUT = `bg-[#0F0F13] border border-white/10 rounded-lg text-white text-xs
               font-montserrat placeholder-white/15 focus:outline-none focus:border-white/25
               text-center py-1.5 px-1.5 w-full`

export default function Cotizador() {
  const [margen,    setMargen]    = useState(100)
  const [tc,        setTc]        = useState(19.5)
  const [rows,      setRows]      = useState([newRow(1), newRow(2), newRow(3)])
  const [nextId,    setNextId]    = useState(4)
  const [descuento, setDescuento] = useState('')
  const [envio,     setEnvio]     = useState('')
  const [impuesto,  setImpuesto]  = useState('')
  const [tcAuto,    setTcAuto]    = useState(false)

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => { if (d?.rates?.MXN) { setTc(Number(d.rates.MXN.toFixed(4))); setTcAuto(true) } })
      .catch(() => {})
  }, [])

  function addRow() { setRows(r => [...r, newRow(nextId)]); setNextId(n => n + 1) }
  function removeRow(id) { setRows(r => r.filter(x => x.id !== id)) }
  function update(id, field, value) { setRows(r => r.map(x => x.id === id ? { ...x, [field]: value } : x)) }

  // Paso 1: costo base sin ajustes
  const calcsBase     = rows.map(r => ({ ...r, ...calcRow(r, margen, tc) }))
  const subtotalProductos = calcsBase.reduce((s, r) => s + r.inversion, 0)

  const ajDescuento = Number(descuento) || 0
  const ajEnvio     = Number(envio)     || 0
  const ajImpuesto  = Number(impuesto)  || 0
  const costoReal   = subtotalProductos - ajDescuento + ajEnvio + ajImpuesto

  // Paso 2: repartir ajustes por peso de inversión → costo/precio reales por producto
  const ajusteNeto = ajEnvio + ajImpuesto - ajDescuento
  const calcs = calcsBase.map(r => {
    if (subtotalProductos === 0 || r.inversion === 0) return r
    const share          = r.inversion / subtotalProductos
    const aEnvio         = share * ajEnvio
    const aImpuesto      = share * ajImpuesto
    const aDescuento     = share * ajDescuento
    const inversionReal  = r.inversion + share * ajusteNeto
    const costoRealUnit  = r.totalUnidades > 0 ? inversionReal / r.totalUnidades : 0
    const precioPublico  = costoRealUnit * (1 + margen / 100)
    const gananciaTotal  = (precioPublico - costoRealUnit) * r.totalUnidades
    return { ...r, inversionReal, aEnvio, aImpuesto, aDescuento, costoUnit: costoRealUnit, precioPublico, gananciaTotal }
  })

  const totalIngreso  = calcs.reduce((s, r) => s + r.precioPublico * r.totalUnidades, 0)
  const totalGanancia = totalIngreso - costoReal

  return (
    <div>
      <h1 className="font-anton text-white text-2xl tracking-widest mb-1">COTIZADOR</h1>
      <p className="font-montserrat text-white/30 text-xs mb-4">Precio público = Costo × (1 + Margen%)</p>

      {/* Config bar */}
      <div className="bg-[#1A1A24] border border-[#2a2a35] rounded-xl px-4 py-2.5 mb-3
                      flex flex-wrap gap-3 items-center">
        <span className="font-montserrat text-white/30 text-xs">Margen</span>
        <div className="flex items-center gap-1">
          <input type="number" value={margen} min={0}
            onChange={e => setMargen(Number(e.target.value))}
            className="w-14 bg-[#0F0F13] border border-pop-coral/40 rounded-lg px-2 py-1.5
                       text-white text-sm font-montserrat text-center focus:outline-none focus:border-pop-coral/70" />
          <span className="font-anton text-pop-coral">%</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div>
          <span className="font-montserrat text-white/30 text-xs">USD → MXN</span>
          {tcAuto && (
            <span className="font-montserrat text-emerald-500/60 text-[9px] ml-1.5">● live</span>
          )}
        </div>
        <input type="number" value={tc} min={1} step={0.01}
          onChange={e => { setTc(Number(e.target.value)); setTcAuto(false) }}
          className="w-20 bg-[#0F0F13] border border-white/10 rounded-lg px-2 py-1.5
                     text-white text-sm font-montserrat text-center focus:outline-none focus:border-white/30" />
      </div>

      {/* Productos */}
      <div className="bg-[#1A1A24] border border-[#2a2a35] rounded-xl overflow-hidden mb-3">

        {/* Column headers — desktop only */}
        <div className="hidden md:grid grid-cols-[1.5rem_1fr_5rem_5rem_7rem_6rem_6rem_6rem_1.5rem]
                        gap-2 px-3 py-1.5 border-b border-white/5">
          {['#','Producto','Pzas/paq','Paquetes','Precio','Costo/u','P.público','Inversión',''].map((h, i) => (
            <span key={i} className="font-montserrat text-white/20 text-[10px] text-center first:text-left last:text-right">
              {h}
            </span>
          ))}
        </div>

        <div className="divide-y divide-white/5">
          {calcs.map((r, i) => {
            const hasData = r.totalUnidades > 0 && r.costoUnit > 0
            return (
              <div key={r.id} className="px-3 py-2.5">

                {/* Mobile layout */}
                <div className="md:hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-montserrat text-white/20 text-[10px] w-4 flex-shrink-0">{i + 1}</span>
                    <input type="text" value={r.nombre} placeholder="Nombre del producto…"
                      onChange={e => update(r.id, 'nombre', e.target.value)}
                      className="flex-1 bg-[#0F0F13] border border-white/25 rounded-lg text-white/80 text-sm
                                 font-montserrat placeholder-white/20 focus:outline-none
                                 focus:border-white/50 py-1.5 px-2" />
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(r.id)}
                        className="text-white/15 hover:text-red-400 transition-colors text-base leading-none flex-shrink-0">×</button>
                    )}
                  </div>
                  <div className="flex gap-1.5 items-center pl-6">
                    <div className="flex-1">
                      <p className="font-montserrat text-white/20 text-[9px] mb-0.5 text-center">Pzas/paq</p>
                      <input type="number" value={r.piezas} placeholder="24"
                        onChange={e => update(r.id, 'piezas', e.target.value)}
                        className={INPUT} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-white/20 text-[9px] mb-0.5 text-center">Paquetes</p>
                      <input type="number" value={r.paquetes} placeholder="1"
                        onChange={e => update(r.id, 'paquetes', e.target.value)}
                        className={INPUT} />
                    </div>
                    <div className="flex-[2]">
                      <p className="font-montserrat text-white/20 text-[9px] mb-0.5 text-center">Precio</p>
                      <div className="flex gap-1">
                        <input type="number" value={r.precio} placeholder={r.divisa === 'USD' ? '5.00' : '177'}
                          onChange={e => update(r.id, 'precio', e.target.value)}
                          className={INPUT + ' flex-1 min-w-0'} />
                        <button
                          onClick={() => update(r.id, 'divisa', r.divisa === 'MXN' ? 'USD' : 'MXN')}
                          className={`px-1.5 py-1.5 rounded-lg text-[9px] font-montserrat font-bold border
                                      transition-colors flex-shrink-0
                                      ${r.divisa === 'USD'
                                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                                        : 'border-white/12 bg-white/4 text-white/25'}`}>
                          {r.divisa}
                        </button>
                      </div>
                    </div>
                  </div>
                  {hasData && (
                    <div className="pl-6 mt-1.5 flex gap-2.5 flex-wrap">
                      <Chip label={`${r.totalUnidades}u`} />
                      <Chip label={`Costo ${fmt(r.costoUnit)}`} />
                      <Chip label={`Público ${fmt(r.precioPublico)}`} rose />
                      <Chip label={`Inv. ${fmt(r.inversionReal ?? r.inversion)}`} />
                      <Chip label={`+${fmt(r.gananciaTotal)}`} green />
                    </div>
                  )}
                  {hasData && ajusteNeto !== 0 && (
                    <div className="pl-6 mt-1 flex gap-3 flex-wrap">
                      {r.aEnvio     > 0 && <span className="font-montserrat text-white/25 text-[9px]">Flete +{fmt(r.aEnvio)}</span>}
                      {r.aImpuesto  > 0 && <span className="font-montserrat text-white/25 text-[9px]">Imp. +{fmt(r.aImpuesto)}</span>}
                      {r.aDescuento > 0 && <span className="font-montserrat text-emerald-500/40 text-[9px]">Desc. −{fmt(r.aDescuento)}</span>}
                    </div>
                  )}
                  {r.divisa === 'USD' && r.precio && (
                    <p className="font-montserrat text-white/20 text-[9px] pl-6 mt-1">
                      ≈ {fmt(Number(r.precio) * tc)} MXN por paquete
                    </p>
                  )}
                </div>

                {/* Desktop layout — table row */}
                <div className="hidden md:grid grid-cols-[1.5rem_1fr_5rem_5rem_7rem_6rem_6rem_6rem_1.5rem]
                                gap-2 items-center">
                  <span className="font-montserrat text-white/20 text-[10px]">{i + 1}</span>
                  <input type="text" value={r.nombre} placeholder="Nombre…"
                    onChange={e => update(r.id, 'nombre', e.target.value)}
                    className="w-full bg-[#0F0F13] border border-white/25 rounded-lg text-white/80 text-xs
                               font-montserrat placeholder-white/20 focus:outline-none
                               focus:border-white/50 py-1.5 px-2" />
                  <input type="number" value={r.piezas} placeholder="24"
                    onChange={e => update(r.id, 'piezas', e.target.value)}
                    className={INPUT} />
                  <input type="number" value={r.paquetes} placeholder="1"
                    onChange={e => update(r.id, 'paquetes', e.target.value)}
                    className={INPUT} />
                  <div className="flex gap-1">
                    <input type="number" value={r.precio} placeholder={r.divisa === 'USD' ? '5.00' : '177'}
                      onChange={e => update(r.id, 'precio', e.target.value)}
                      className={INPUT + ' flex-1 min-w-0'} />
                    <button
                      onClick={() => update(r.id, 'divisa', r.divisa === 'MXN' ? 'USD' : 'MXN')}
                      className={`px-1.5 rounded-lg text-[9px] font-montserrat font-bold border
                                  transition-colors flex-shrink-0
                                  ${r.divisa === 'USD'
                                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                                    : 'border-white/12 bg-white/4 text-white/25'}`}>
                      {r.divisa}
                    </button>
                  </div>
                  <span className="font-montserrat text-white/50 text-xs text-center">
                    {hasData ? fmt(r.costoUnit) : '—'}
                  </span>
                  <span className={`font-montserrat text-xs text-center font-semibold
                                    ${hasData ? 'text-pop-rose' : 'text-white/20'}`}>
                    {hasData ? fmt(r.precioPublico) : '—'}
                  </span>
                  <div className="text-center">
                    <span className="font-montserrat text-white/50 text-xs">
                      {hasData ? fmt(r.inversionReal ?? r.inversion) : '—'}
                    </span>
                    {hasData && ajusteNeto !== 0 && (
                      <div className="flex flex-col gap-px mt-0.5">
                        {r.aEnvio     > 0 && <span className="font-montserrat text-white/20 text-[9px]">flete +{fmt(r.aEnvio)}</span>}
                        {r.aImpuesto  > 0 && <span className="font-montserrat text-white/20 text-[9px]">imp. +{fmt(r.aImpuesto)}</span>}
                        {r.aDescuento > 0 && <span className="font-montserrat text-emerald-500/35 text-[9px]">desc. −{fmt(r.aDescuento)}</span>}
                      </div>
                    )}
                  </div>
                  {rows.length > 1
                    ? <button onClick={() => removeRow(r.id)}
                        className="text-white/12 hover:text-red-400 transition-colors text-base leading-none text-right">×</button>
                    : <span />
                  }
                </div>

              </div>
            )
          })}
        </div>

        <div className="px-3 py-2 border-t border-white/5">
          <button onClick={addRow}
            className="font-montserrat text-white/25 text-xs hover:text-white/45
                       transition-colors flex items-center gap-1">
            <span className="text-base leading-none">+</span> Agregar producto
          </button>
        </div>
      </div>

      {/* Ajustes + Resumen */}
      {subtotalProductos > 0 && (
        <div className="bg-[#1A1A24] border border-[#2a2a35] rounded-xl px-4 py-3">

          {/* Ajustes */}
          <p className="font-anton text-white/35 text-[10px] tracking-widest mb-2">AJUSTES DEL PEDIDO</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: '− Descuento', val: descuento, set: setDescuento, accent: 'focus:border-emerald-500/40' },
              { label: '+ Envío',     val: envio,     set: setEnvio,     accent: '' },
              { label: '+ Imp. imp.', val: impuesto,  set: setImpuesto,  accent: '' },
            ].map(({ label, val, set, accent }) => (
              <div key={label}>
                <label className="font-montserrat text-white/25 text-[10px] block mb-1">{label}</label>
                <input type="number" value={val} min={0} placeholder="0"
                  onChange={e => set(e.target.value)}
                  className={`w-full bg-[#0F0F13] border border-white/8 rounded-lg px-2 py-1.5
                              text-white text-xs font-montserrat placeholder-white/12
                              focus:outline-none ${accent || 'focus:border-white/25'} text-center`} />
              </div>
            ))}
          </div>

          {/* Resumen */}
          <div className="border-t border-white/6 pt-3 space-y-1.5">
            <p className="font-anton text-white/35 text-[10px] tracking-widest mb-2">RESUMEN</p>
            <SRow label="Subtotal productos" value={fmt(subtotalProductos)} />
            {ajDescuento > 0 && <SRow label="Descuento" value={`− ${fmt(ajDescuento)}`} green />}
            {ajEnvio     > 0 && <SRow label="Envío"     value={`+ ${fmt(ajEnvio)}`} />}
            {ajImpuesto  > 0 && <SRow label="Imp. importación" value={`+ ${fmt(ajImpuesto)}`} />}
            {(ajDescuento > 0 || ajEnvio > 0 || ajImpuesto > 0) && (
              <div className="border-t border-white/6 pt-1.5">
                <SRow label="Costo real" value={fmt(costoReal)} bold />
              </div>
            )}
            <SRow label="Ingreso esperado" value={fmt(totalIngreso)} />
            <div className="border-t border-white/6 pt-1.5 flex justify-between items-center">
              <div>
                <p className="font-montserrat text-white/35 text-xs">Ganancia bruta</p>
                {costoReal > 0 && (
                  <p className="font-montserrat text-white/25 text-[10px]">
                    ROI {((totalGanancia / costoReal) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <span className={`font-anton text-2xl ${totalGanancia >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt(totalGanancia)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ label, rose, green }) {
  return (
    <span className={`font-montserrat text-[10px] px-1.5 py-0.5 rounded-md
      ${rose  ? 'text-pop-rose bg-pop-rose/8'
      : green ? 'text-emerald-400 bg-emerald-400/8'
      :         'text-white/35 bg-white/4'}`}>
      {label}
    </span>
  )
}

function SRow({ label, value, green, bold }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-montserrat text-white/35 text-xs">{label}</span>
      <span className={`font-montserrat text-sm font-semibold
        ${green ? 'text-emerald-400' : bold ? 'text-white' : 'text-white/55'}`}>
        {value}
      </span>
    </div>
  )
}
