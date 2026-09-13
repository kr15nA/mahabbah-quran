import { put, del } from '@vercel/blob'
import sharp from 'sharp'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic']

export type UploadImageOptions = {
  file: File
  entityType: 'users' | 'students'
  entityId: number
  oldUrl?: string | null
}

export async function uploadOptimizedImage({ file, entityType, entityId, oldUrl }: UploadImageOptions) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Ukuran file maksimal 5MB')
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.')
  }

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Validate with Sharp and generate optimized versions
  // We'll create a 640x640 detailed thumbnail and a 320x320 small thumbnail. 
  // Given mobile focus, maybe 1 optimized avatar image per user is enough for both profile and lists. 
  // 320x320 WebP is highly optimized, usually < 30KB. Let's stick to one 400x400 center-cropped image to keep Vercel Blob usage efficient.
  
  const optimizedBuffer = await sharp(buffer)
    .resize(400, 400, {
      fit: 'cover',
      position: 'center'
    })
    .webp({ quality: 80, effort: 4 })
    .toBuffer()

  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const filename = `${entityType}/${entityId}/${timestamp}-${randomSuffix}.webp`

  const blob = await put(filename, optimizedBuffer, {
    access: 'public',
    contentType: 'image/webp',
    addRandomSuffix: false // We generated our own safe suffix
  })

  // Cleanup old file safely
  if (oldUrl && oldUrl.includes('.vercel-blob.com/')) {
    try {
      await del(oldUrl)
    } catch (e) {
      console.warn('Failed to delete old image blob:', oldUrl, e)
    }
  }

  return blob.url
}

export async function deleteImage(url: string) {
  if (!url || !url.includes('.vercel-blob.com/')) return
  try {
    await del(url)
  } catch (e) {
    console.error('Failed to delete blob:', url, e)
  }
}
