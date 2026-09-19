import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import Ventas from './pages/Ventas'
import NuevaVenta from './pages/NuevaVenta'
import Pedidos from './pages/Pedidos'
import Bazares from './pages/Bazares'
import Gastos from './pages/Gastos'
import Cotizador from './pages/Cotizador'
import Usuarios from './pages/Usuarios'
import Proveedores from './pages/Proveedores'

function RequireAuth({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="ventas/nueva" element={<NuevaVenta />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="bazares" element={<Bazares />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="cotizador" element={<Cotizador />} />
          <Route path="usuarios"    element={<Usuarios />} />
          <Route path="proveedores" element={<Proveedores />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
