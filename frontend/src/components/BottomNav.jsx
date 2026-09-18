import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const QUICK = [
  { to: '/dashboard',    icon: '⊞', label: 'Inicio' },
  { to: '/inventario',   icon: '📦', label: 'Stock' },
  { to: '/ventas/nueva', icon: '＋', label: 'Vender', highlight: true },
  { to: '/pedidos',      icon: '🚚', label: 'Pedidos' },
  { to: '/gastos',       icon: '💰', label: 'Gastos' },
]

const MAS = [
  { to: '/ventas',     icon: '📋', label: 'Historial ventas' },
  { to: '/cotizador',  icon: '🧮', label: 'Cotizador' },
  { to: '/bazares',    icon: '🎪', label: 'Bazares' },
  { to: '/usuarios',   icon: '👤', label: 'Mi perfil' },
]

export default function BottomNav() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  function goTo(to) {
    setOpen(false)
    navigate(to)
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden
                      bg-[#1A1A24] border-t border-white/5"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {QUICK.map(({ to, icon, label, highlight }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-montserrat transition-colors
               ${highlight
                 ? 'text-pop-coral'
                 : isActive
                   ? 'text-pop-rose'
                   : 'text-white/35'
               }`
            }
          >
            <span className={`text-xl leading-none ${highlight ? 'bg-pop-coral text-white rounded-full w-9 h-9 flex items-center justify-center text-base' : ''}`}>
              {icon}
            </span>
            {label}
          </NavLink>
        ))}

        {/* Botón Más */}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5
                     text-[10px] font-montserrat text-white/35 transition-colors"
        >
          <span className="text-xl leading-none">···</span>
          Más
        </button>
      </nav>

      {/* Overlay + Sheet */}
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-[#1A1A24] border-t border-white/10 rounded-t-2xl
                          pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/15 rounded-full" />
            </div>

            <div className="grid grid-cols-4 gap-1 px-4 py-2">
              {MAS.map(({ to, icon, label }) => (
                <button key={to} onClick={() => goTo(to)}
                  className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl
                             hover:bg-white/5 active:bg-white/10 transition-colors">
                  <span className="text-2xl leading-none">{icon}</span>
                  <span className="font-montserrat text-white/50 text-[10px] text-center leading-tight">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
