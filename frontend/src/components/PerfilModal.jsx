export default function PerfilModal({ alias, setAlias, password, setPassword,
  confirmar, setConfirmar, msg, saving, onClose, onGuardar }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-black/70 backdrop-blur-sm">
      {/* backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-[#1A1A24] border border-white/10
                      rounded-t-2xl md:rounded-2xl
                      w-full md:max-w-sm
                      mb-14 md:mb-0
                      flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-1 flex-shrink-0">
          <div>
            <h2 className="font-anton text-white text-xl tracking-wider">MI PERFIL</h2>
            <p className="font-montserrat text-white/30 text-xs mt-0.5">
              Actualiza tu nombre o contraseña
            </p>
          </div>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors mt-0.5 ml-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 py-4 flex-1 flex flex-col gap-4">
          <div>
            <label className="font-montserrat text-white/40 text-xs mb-1.5 block">Nombre</label>
            <input
              type="text"
              value={alias}
              onChange={e => setAlias(e.target.value)}
              className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-3
                         text-white text-sm font-montserrat
                         focus:outline-none focus:border-pop-coral/50"
            />
          </div>

          <div>
            <label className="font-montserrat text-white/40 text-xs mb-1.5 block">
              Nueva contraseña <span className="text-white/20">(vacío = no cambiar)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-3
                         text-white text-sm font-montserrat placeholder:text-white/15
                         focus:outline-none focus:border-pop-coral/50"
            />
          </div>

          {password && (
            <div>
              <label className="font-montserrat text-white/40 text-xs mb-1.5 block">Confirmar contraseña</label>
              <input
                type="password"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-3
                           text-white text-sm font-montserrat
                           focus:outline-none focus:border-pop-coral/50"
              />
            </div>
          )}

          {msg && <p className="font-montserrat text-xs text-red-400">{msg}</p>}
        </div>

        {/* Fixed footer buttons */}
        <div className="px-6 pb-6 pt-2 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 border border-white/10 text-white/40 font-montserrat text-sm py-3 rounded-xl"
          >
            Cancelar
          </button>
          <button
            onClick={onGuardar}
            disabled={saving}
            className="flex-1 bg-pop-coral text-white font-montserrat font-bold text-sm py-3 rounded-xl disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
