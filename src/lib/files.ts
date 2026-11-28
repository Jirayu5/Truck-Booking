import { supabase } from './supabase'

const MAX_BYTES = 5 * 1024 * 1024
const BUCKET = 'attachments'

// ย่อรูปก่อนอัปโหลด เพื่อไม่ให้เต็มโควตา Storage ฟรี (PDF ส่งไปตามเดิม)
async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8))
  return blob ?? file
}

export async function uploadFile(userId: string, file: File): Promise<{ path: string; name: string }> {
  const isImage = file.type.startsWith('image/')
  if (!isImage && file.type !== 'application/pdf') throw new Error('รองรับเฉพาะรูปภาพหรือ PDF')
  const body = await shrinkImage(file)
  if (body.size > MAX_BYTES) throw new Error(`ไฟล์ ${file.name} ใหญ่เกิน 5 MB`)
  const ext = isImage ? 'jpg' : 'pdf'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: isImage ? 'image/jpeg' : 'application/pdf',
  })
  if (error) throw error
  return { path, name: file.name }
}

export async function signedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}
