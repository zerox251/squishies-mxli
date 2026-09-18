import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import PerfilModal from './PerfilModal'

const NAV = [
  { to: '/dashboard',    label: 'Dashboard' },
  { to: '/inventario',   label: 'Inventario' },
  { to: '/ventas',       label: 'Ventas' },
  { to: '/ventas/nueva', label: 'Registrar Venta', highlight: true },
  { to: '/pedidos',      label: 'Pedidos' },
  { to: '/gastos',       label: 'Gastos' },
  { to: '/bazares',      label: 'Bazares' },
  { to: '/usuarios',     label: 'Usuarios' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const [modal, setModal] = useState(false)
  const [alias, setAlias] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const aliasActual = localStorage.getItem('alias') || '?'

  function abrirModal() {
    setAlias(localStorage.getItem('alias') || '')
    setPassword('')
    setConfirmar('')
    setMsg('')
    setModal(true)
  }

  async function guardar() {
    if (!alias.trim()) return setMsg('El nombre no puede estar vacío')
    if (password && password !== confirmar) return setMsg('Las contraseñas no coinciden')
    if (password && password.length < 6) return setMsg('Mínimo 6 caracteres')
    setSaving(true)
    try {
      const body = { alias: alias.trim() }
      if (password) body.passwordNuevo = password
      const res = await apiFetch('/api/usuarios/perfil', {
        method: 'PUT',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('alias', data.alias)
        setModal(false)
      } else {
        const data = await res.json()
        setMsg(data.error || 'Error al guardar')
      }
    } catch {
      setMsg('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('alias')
    localStorage.removeItem('email')
    navigate('/login')
  }

  return (
    <>
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

        {/* User profile block */}
        <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg border border-white/5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-pop-coral/20 flex items-center justify-center flex-shrink-0">
            <span className="font-montserrat text-pop-rose text-xs font-bold">
              {aliasActual.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="font-montserrat text-white/60 text-sm flex-1 truncate">
            {aliasActual}
          </span>
          <button
            onClick={abrirModal}
            className="text-white/25 hover:text-pop-rose transition-colors flex-shrink-0"
            title="Editar perfil"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>

        <button
          onClick={logout}
          className="mx-3 mb-4 px-3 py-2 rounded-lg font-montserrat text-xs
                     text-white/25 hover:text-white/50 text-left transition-colors"
        >
          Cerrar sesión
        </button>
      </aside>

      {modal && <PerfilModal alias={alias} setAlias={setAlias} password={password} setPassword={setPassword}
        confirmar={confirmar} setConfirmar={setConfirmar} msg={msg} saving={saving}
        onClose={() => setModal(false)} onGuardar={guardar} />}
    </>
  )
}
