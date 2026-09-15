import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (!res.ok) { setError('Usuario o contraseña incorrectos'); return }
      const { token } = await res.json()
      localStorage.setItem('token', token)
      navigate('/dashboard')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F13] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-anton text-pop-rose text-4xl tracking-widest">POPIFY</p>
          <p className="font-montserrat text-white/30 text-sm mt-1">Juguetes Antistrés</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1A1A24] border border-white/6 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <label className="font-montserrat text-white/40 text-xs mb-1.5 block">Usuario</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-3
                         text-white text-sm font-montserrat placeholder-white/20
                         focus:outline-none focus:border-pop-coral/50"
              placeholder="admin"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="font-montserrat text-white/40 text-xs mb-1.5 block">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-[#0F0F13] border border-white/10 rounded-lg px-3 py-3
                         text-white text-sm font-montserrat placeholder-white/20
                         focus:outline-none focus:border-pop-coral/50"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="font-montserrat text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-pop-coral hover:opacity-90 disabled:opacity-50 text-white
                       font-montserrat font-bold text-sm py-3 rounded-lg transition-opacity mt-1"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
