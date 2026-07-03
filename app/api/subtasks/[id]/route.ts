// app/api/subtasks/[id]/route.ts
// Feature 05 — Subtasks & Progress Tracking

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { subtaskDB, todoDB, userDB } from '@/lib/db';

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

/** Verify subtask exists and belongs to a todo owned by the user. */
function getOwnedSubtask(subtaskId: number, userId: number) {
  const subtask = subtaskDB.findById.get(subtaskId);
  if (!subtask) return null;
  const todo = todoDB.findById.get(subtask.todo_id, userId);
  if (!todo) return null;
  return subtask;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const subtaskId = parseInt(id, 10);
  if (isNaN(subtaskId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const existing = getOwnedSubtask(subtaskId, userId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    title = existing.title,
    completed = existing.completed,
    position = existing.position,
  } = body as { title?: string; completed?: number | boolean; position?: number };

  subtaskDB.update.run(
    String(title).trim() || existing.title,
    completed ? 1 : 0,
    position,
    subtaskId
  );

  const updated = subtaskDB.findById.get(subtaskId);
  return NextResponse.json({ subtask: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const subtaskId = parseInt(id, 10);
  if (isNaN(subtaskId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const existing = getOwnedSubtask(subtaskId, userId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  subtaskDB.delete.run(subtaskId);
  return NextResponse.json({ success: true });
}
