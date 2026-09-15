import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [alias, setAlias] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const emailActual = localStorage.getItem('email') || ''

  useEffect(() => {
    apiFetch('/api/usuarios').then(r => r.json()).then(setUsuarios).finally(() => setLoading(false))
  }, [])

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
        setUsuarios(prev => prev.map(u => u.email === emailActual ? { ...u, alias: data.alias } : u))
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

  function fmtFecha(f) {
    return new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  return (
    <div>
      <h1 className="font-anton text-white text-2xl tracking-widest mb-5">USUARIOS</h1>

      {loading ? (
        <p className="font-montserrat text-white/30 text-sm text-center py-12">Cargando…</p>
      ) : (
        <div className="bg-[#1A1A24] border border-white/6 rounded-2xl overflow-hidden">
          {usuarios.map(u => {
            const esMio = u.email.toLowerCase() === emailActual.toLowerCase()
            return (
              <div key={u.id}
                className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-pop-coral/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-montserrat text-pop-rose text-sm font-bold">
                      {u.alias.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-montserrat text-white/80 text-sm font-medium">
                      {u.alias}
                      {esMio && <span className="ml-2 text-xs text-pop-lav">(tú)</span>}
                    </p>
                    <p className="font-montserrat text-white/30 text-xs">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-montserrat text-white/20 text-xs hidden sm:block">
                    {fmtFecha(u.creadoEn)}
                  </span>
                  {esMio && (
                    <button
                      onClick={abrirModal}
                      className="font-montserrat text-xs text-pop-coral border border-pop-coral/30
                                 hover:bg-pop-coral/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Mi perfil
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A24] border border-white/10 rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-sm">
            <h2 className="font-anton text-white text-xl tracking-wider">MI PERFIL</h2>
            <p className="font-montserrat text-white/30 text-xs mt-0.5 mb-5">
              Actualiza tu nombre o contraseña
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1.5 block">Nombre</label>
                <input
                  type="text"
                  value={alias}
                  onChange={e => setAlias(e.target.value)}
                  className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                             text-white text-sm font-montserrat
                             focus:outline-none focus:border-pop-coral/50"
                />
              </div>

              <div>
                <label className="font-montserrat text-white/40 text-xs mb-1.5 block">
                  Nueva contraseña <span className="text-white/20">(dejar vacío para no cambiar)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
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
                    className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                               text-white text-sm font-montserrat
                               focus:outline-none focus:border-pop-coral/50"
                  />
                </div>
              )}
            </div>

            {msg && (
              <p className="font-montserrat text-xs mt-3 text-red-400">{msg}</p>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setModal(false)}
                className="flex-1 border border-white/10 text-white/40 font-montserrat text-sm py-2.5 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={saving}
                className="flex-1 bg-pop-coral text-white font-montserrat font-bold text-sm py-2.5 rounded-lg disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
