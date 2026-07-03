// app/api/tags/[id]/route.ts
// Feature 06 — Tag System
// DELETE: remove a tag (also removes all todo_tags associations via CASCADE)

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB, userDB } from '@/lib/db';

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const tagId = parseInt(id, 10);
  if (isNaN(tagId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  tagDB.delete.run(tagId, userId);
  return NextResponse.json({ success: true });
}
