require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authMiddleware = require('./middleware/auth')
const productosRoutes = require('./routes/productos')
const ventasRoutes = require('./routes/ventas')
const pedidosRoutes = require('./routes/pedidos')
const bazaresRoutes = require('./routes/bazares')
const reportesRoutes = require('./routes/reportes')
const authRoutes = require('./routes/auth')
const usuariosRoutes = require('./routes/usuarios')

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/productos', authMiddleware, productosRoutes)
app.use('/api/ventas', authMiddleware, ventasRoutes)
app.use('/api/pedidos', authMiddleware, pedidosRoutes)
app.use('/api/bazares', authMiddleware, bazaresRoutes)
app.use('/api/reportes', authMiddleware, reportesRoutes)
app.use('/api/usuarios', authMiddleware, usuariosRoutes)

module.exports = app
