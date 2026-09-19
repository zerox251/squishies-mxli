const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function comprimirImagen(file, maxW = 1200) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const ratio = Math.min(1, maxW / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(resolve, 'image/jpeg', 0.78)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export async function subirArchivo(file, bucket = 'pedidos') {
  const ext  = file.name.split('.').pop().toLowerCase()
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${nombre}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: file,
  })
  if (!res.ok) throw new Error('Error al subir archivo')
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${nombre}`
}

export async function subirImagen(file, bucket = 'pedidos') {
  const blob = await comprimirImagen(file)
  const ext = 'jpg'
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${nombre}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'false',
    },
    body: blob,
  })
  if (!res.ok) throw new Error('Error al subir imagen')
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${nombre}`
}
