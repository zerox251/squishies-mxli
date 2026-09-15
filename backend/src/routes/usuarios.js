const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')

router.get('/', async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, email: true, alias: true, creadoEn: true },
    orderBy: { alias: 'asc' },
  })
  res.json(usuarios)
})

module.exports = router
