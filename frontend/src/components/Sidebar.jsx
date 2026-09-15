import { NavLink, useNavigate } from 'react-router-dom'

const NAV = [
  { to: '/dashboard',    label: 'Dashboard' },
  { to: '/inventario',   label: 'Inventario' },
  { to: '/ventas',       label: 'Ventas' },
  { to: '/ventas/nueva', label: 'Registrar Venta', highlight: true },
  { to: '/pedidos',      label: 'Pedidos' },
  { to: '/bazares',      label: 'Bazares' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full w-56
                      bg-[#1A1A24] border-r border-white/5 z-40">
      <div className="px-5 pt-6 pb-4 border-b border-white/5">
        <p className="font-anton text-pop-rose text-xl tracking-widest">POPIFY</p>
        <p className="font-montserrat text-white/30 text-xs mt-0.5">Panel Admin</p>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map(({ to, label, highlight }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/ventas'}
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg font-montserrat text-sm transition-colors
               ${highlight
                 ? 'bg-pop-coral/15 text-pop-rose hover:bg-pop-coral/25'
                 : isActive
                   ? 'bg-white/8 text-white'
                   : 'text-white/40 hover:text-white/70 hover:bg-white/5'
               }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={logout}
        className="mx-3 mb-4 px-3 py-2 rounded-lg font-montserrat text-xs
                   text-white/25 hover:text-white/50 text-left transition-colors"
      >
        Cerrar sesión
      </button>
    </aside>
  )
}
