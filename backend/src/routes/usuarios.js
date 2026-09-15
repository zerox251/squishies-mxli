const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const prisma = require('../lib/prisma')

router.get('/', async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, email: true, alias: true, creadoEn: true },
    orderBy: { alias: 'asc' },
  })
  res.json(usuarios)
})

router.put('/perfil', async (req, res) => {
  const { alias, passwordNuevo } = req.body
  const data = {}
  if (alias && alias.trim()) data.alias = alias.trim()
  if (passwordNuevo) {
    if (passwordNuevo.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' })
    data.password = await bcrypt.hash(passwordNuevo, 10)
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nada que actualizar' })
  const usuario = await prisma.usuario.update({
    where: { id: req.user.id },
    data,
    select: { id: true, email: true, alias: true },
  })
  res.json(usuario)
})

module.exports = router
