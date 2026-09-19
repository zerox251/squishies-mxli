import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-[#0F0F13]">
      {/* Sidebar solo en desktop */}
      <Sidebar />

      {/* Contenido principal */}
      <main className="flex-1 pb-20 md:pb-6 md:pl-56">
        <div className="max-w-2xl mx-auto px-4 pt-6 md:max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Nav inferior solo en móvil */}
      <BottomNav />
    </div>
  )
}
