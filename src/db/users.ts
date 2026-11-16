import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  photoUrl?: string | null
) {
  try {
    const fallbackUsername =
      displayName?.trim() || email.split('@')[0] || 'listener';

    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        username: fallbackUsername,
        profileImage: photoUrl ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  updates: {
    username?: string;
    bio?: string;
    profileImage?: string | null;
    commercialUseMode?: boolean;
  }
) {
  try {
    const result = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    return result[0] ?? null;
  } catch (error) {
    console.error('Database error in updateUserProfile:', error);
    throw new Error('Failed to update user profile.', { cause: error });
  }
}
