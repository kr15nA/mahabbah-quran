import sharp from 'sharp'
import { BlobStorage } from './storage'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic']

export type UploadImageOptions = {
  file: File
  entityType: 'users' | 'students'
  entityId: number
  oldUrl?: string | null
  cleanupPrevious?: boolean
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
  autoOrient?: boolean
}

export async function uploadOptimizedImage({ 
  file, 
  entityType, 
  entityId, 
  oldUrl, 
  cleanupPrevious = true,
  width = 400,
  height = 400,
  quality = 80,
  format = 'webp',
  autoOrient = false
}: UploadImageOptions) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Ukuran foto maksimal 5 MB.')
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.')
  }

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let sharpInstance = sharp(buffer)
  
  if (autoOrient) {
    sharpInstance = sharpInstance.rotate()
  }

  sharpInstance = sharpInstance.resize(width, height, {
    fit: 'cover',
    position: 'center'
  })

  if (format === 'webp') {
    sharpInstance = sharpInstance.webp({ quality, effort: 4 })
  } else if (format === 'jpeg') {
    sharpInstance = sharpInstance.jpeg({ quality })
  } else if (format === 'png') {
    sharpInstance = sharpInstance.png({ quality })
  }

  const optimizedBuffer = await sharpInstance.toBuffer()

  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const filename = `${entityType}/${entityId}/${timestamp}-${randomSuffix}.${format}`

  const blob = await BlobStorage.putBlob(filename, optimizedBuffer, {
    access: 'public',
    contentType: `image/${format}`,
    addRandomSuffix: false // We generated our own safe suffix
  })

  // Cleanup old file safely
  if (cleanupPrevious && oldUrl && isManagedBlobUrl(oldUrl)) {
    try {
      await BlobStorage.deleteBlob(oldUrl)
    } catch (e) {
      console.warn('Failed to delete old image blob:', oldUrl, e)
    }
  }

  return blob.url
}

export function isManagedBlobUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes('.vercel-blob.com/')
}

export async function uploadProfilePhoto(options: Omit<UploadImageOptions, 'width' | 'height' | 'quality' | 'format' | 'autoOrient'>) {
  return uploadOptimizedImage({
    ...options,
    width: 512,
    height: 512,
    quality: 82,
    format: 'webp',
    autoOrient: true
  })
}

export async function deleteImage(url: string) {
  if (!url || !isManagedBlobUrl(url)) return
  try {
    await BlobStorage.deleteBlob(url)
  } catch (e) {
    console.error('Failed to delete blob:', url, e)
  }
}
