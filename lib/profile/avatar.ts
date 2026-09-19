import { uploadProfilePhoto, deleteImage } from '@/lib/media'
import { users } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { financeDb as txDb } from '@/lib/finance/tx'
import { auditLogs } from '@/drizzle/schema'
import { getUserById } from '@/lib/db/queries/users'

export type UploadUserAvatarOptions = {
  actorUserId: number
  targetUserId: number
  file: File
}

export async function uploadUserAvatar({ actorUserId, targetUserId, file }: UploadUserAvatarOptions) {
  // Validate target user exists
  const targetUser = await getUserById(targetUserId)
  if (!targetUser) {
    throw new Error('User tidak ditemukan')
  }

  // Upload to Vercel Blob
  const newUrl = await uploadProfilePhoto({
    file,
    entityType: 'users',
    entityId: targetUserId,
    oldUrl: targetUser.avatar_url,
    cleanupPrevious: false // We clean up manually after successful DB transaction
  })

  // Update DB and insert audit log
  await txDb.transaction(async (tx) => {
    await tx.update(users)
      .set({ avatarUrl: newUrl, updatedAt: new Date() })
      .where(eq(users.id, targetUserId))

    await tx.insert(auditLogs).values({
      actorUserId,
      action: 'USER_AVATAR_UPDATE',
      entityType: 'USER',
      entityId: targetUserId,
      oldValues: { hadAvatar: !!targetUser.avatar_url, hasAvatar: true },
      newValues: { hadAvatar: !!targetUser.avatar_url, hasAvatar: true },
    })
  })

  // Cleanup old file safely
  if (targetUser.avatar_url) {
    try {
      await deleteImage(targetUser.avatar_url)
    } catch (e) {
      console.warn('Failed to delete old image blob:', targetUser.avatar_url, e)
    }
  }

  return newUrl
}

export async function removeUserAvatar({ actorUserId, targetUserId }: { actorUserId: number, targetUserId: number }) {
  const targetUser = await getUserById(targetUserId)
  if (!targetUser || !targetUser.avatar_url) {
    return null
  }

  const oldUrl = targetUser.avatar_url

  await txDb.transaction(async (tx) => {
    await tx.update(users)
      .set({ avatarUrl: null, updatedAt: new Date() })
      .where(eq(users.id, targetUserId))

    await tx.insert(auditLogs).values({
      actorUserId,
      action: 'USER_AVATAR_REMOVE',
      entityType: 'USER',
      entityId: targetUserId,
      oldValues: { hadAvatar: true, hasAvatar: false },
      newValues: { hadAvatar: true, hasAvatar: false },
    })
  })

  try {
    await deleteImage(oldUrl)
  } catch (e) {
    console.warn('Failed to delete old image blob:', oldUrl, e)
  }

  return null
}

export async function getCurrentUserProfile(userId: number) {
  const user = await getUserById(userId)
  if (!user) return null
  return {
    id: user.id,
    fullName: user.full_name,
    avatarUrl: user.avatar_url
  }
}
