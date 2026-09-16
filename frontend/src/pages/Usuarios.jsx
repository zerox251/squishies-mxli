import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import PerfilModal from '../components/PerfilModal'

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

      {modal && <PerfilModal alias={alias} setAlias={setAlias} password={password} setPassword={setPassword}
        confirmar={confirmar} setConfirmar={setConfirmar} msg={msg} saving={saving}
        onClose={() => setModal(false)} onGuardar={guardar} />}

    </div>
  )
}
