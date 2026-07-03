// app/api/notifications/check/route.ts
// Feature 04 — Reminders & Notifications
// Checks todos whose reminder time has arrived and marks them notified.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, userDB } from '@/lib/db';

/** Resolves userId from session; in development, falls back to a "dev" user. */
async function resolveUserId(): Promise<number | null> {
  const session = await getSession();
  if (session) return session.userId;

  if (process.env.NODE_ENV !== 'production') {
    const user = userDB.findByUsername.get('dev');
    if (user) return user.id;
    const result = userDB.create.run('dev');
    return Number(result.lastInsertRowid);
  }

  return null;
}

export async function GET() {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Find all todos whose reminder time has arrived and haven't been notified recently
  const due = todoDB.findDueReminders.all(userId);

  // Mark each as notified so we don't fire duplicate notifications
  for (const todo of due) {
    todoDB.markNotified.run(todo.id);
  }

  return NextResponse.json({ notifications: due });
}
