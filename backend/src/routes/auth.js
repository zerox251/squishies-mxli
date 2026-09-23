const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const router = express.Router()
const prisma = require('../lib/prisma')

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Faltan datos' })

  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario) return res.status(401).json({ error: 'Credenciales incorrectas' })

  const ok = await bcrypt.compare(password, usuario.password)
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' })

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, alias: usuario.alias },
    process.env.JWT_SECRET,
    { expiresIn: '3d' }
  )
  res.json({ token, alias: usuario.alias, email: usuario.email })
})

router.put('/password', require('../middleware/auth'), async (req, res) => {
  const { passwordActual, passwordNuevo } = req.body
  const usuario = await prisma.usuario.findUnique({ where: { id: req.user.id } })
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

  const ok = await bcrypt.compare(passwordActual, usuario.password)
  if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' })

  const hash = await bcrypt.hash(passwordNuevo, 10)
  await prisma.usuario.update({ where: { id: usuario.id }, data: { password: hash } })
  res.json({ ok: true })
})

module.exports = router
