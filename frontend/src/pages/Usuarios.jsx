import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ passwordActual: '', passwordNuevo: '', confirmar: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const emailActual = localStorage.getItem('email') || ''
  const aliasActual = localStorage.getItem('alias') || ''

  useEffect(() => {
    apiFetch('/api/usuarios').then(r => r.json()).then(setUsuarios).finally(() => setLoading(false))
  }, [])

  function abrirModal() {
    setForm({ passwordActual: '', passwordNuevo: '', confirmar: '' })
    setMsg('')
    setModal(true)
  }

  async function cambiarPassword() {
    if (!form.passwordActual || !form.passwordNuevo) return setMsg('Completa todos los campos')
    if (form.passwordNuevo !== form.confirmar) return setMsg('Las contraseñas no coinciden')
    if (form.passwordNuevo.length < 6) return setMsg('Mínimo 6 caracteres')
    setSaving(true)
    try {
      const res = await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ passwordActual: form.passwordActual, passwordNuevo: form.passwordNuevo }),
      })
      if (res.ok) {
        setMsg('✓ Contraseña actualizada')
        setTimeout(() => setModal(false), 1200)
      } else {
        const data = await res.json()
        setMsg(data.error || 'Error al actualizar')
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
                      {esMio && <span className="ml-2 font-montserrat text-xs text-pop-lav">(tú)</span>}
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
                      Cambiar contraseña
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal cambiar contraseña */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A24] border border-white/10 rounded-t-2xl md:rounded-2xl p-5 w-full md:max-w-sm">
            <h2 className="font-anton text-white text-lg tracking-wider mb-1">CAMBIAR CONTRASEÑA</h2>
            <p className="font-montserrat text-white/30 text-xs mb-4">{aliasActual}</p>

            <div className="flex flex-col gap-3">
              {[
                { label: 'Contraseña actual', key: 'passwordActual' },
                { label: 'Nueva contraseña', key: 'passwordNuevo' },
                { label: 'Confirmar nueva contraseña', key: 'confirmar' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="font-montserrat text-white/40 text-xs mb-1 block">{label}</label>
                  <input
                    type="password"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-2.5
                               text-white text-sm font-montserrat
                               focus:outline-none focus:border-pop-coral/50"
                  />
                </div>
              ))}
            </div>

            {msg && (
              <p className={`font-montserrat text-xs mt-3 ${msg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                {msg}
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(false)}
                className="flex-1 border border-white/10 text-white/40 font-montserrat text-sm py-2.5 rounded-lg">
                Cancelar
              </button>
              <button onClick={cambiarPassword} disabled={saving}
                className="flex-1 bg-pop-coral text-white font-montserrat font-bold text-sm py-2.5 rounded-lg disabled:opacity-50">
                {saving ? 'Guardando…' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
