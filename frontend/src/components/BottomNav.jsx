import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/dashboard',    icon: '⊞', label: 'Inicio' },
  { to: '/inventario',   icon: '📦', label: 'Stock' },
  { to: '/ventas/nueva', icon: '＋', label: 'Vender', highlight: true },
  { to: '/pedidos',      icon: '🚚', label: 'Pedidos' },
  { to: '/gastos',       icon: '💰', label: 'Gastos' },
  { to: '/usuarios',     icon: '👤', label: 'Perfil' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden
                    bg-[#1A1A24] border-t border-white/5"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {NAV.map(({ to, icon, label, highlight }) => (
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
    </nav>
  )
}
