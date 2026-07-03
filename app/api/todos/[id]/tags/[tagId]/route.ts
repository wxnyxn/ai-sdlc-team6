// app/api/todos/[id]/tags/[tagId]/route.ts
// Feature 06 — Tag System
// DELETE: remove a tag from a todo

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB, todoDB, userDB } from '@/lib/db';

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
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, tagId } = await params;
  const todoId = parseInt(id, 10);
  const tId = parseInt(tagId, 10);
  if (isNaN(todoId) || isNaN(tId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const todo = todoDB.findById.get(todoId, userId);
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  tagDB.removeFromTodo.run(todoId, tId);
  return NextResponse.json({ success: true });
}
