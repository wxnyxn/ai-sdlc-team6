// app/api/todos/[id]/subtasks/route.ts
// Feature 05 — Subtasks & Progress Tracking

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB, userDB } from '@/lib/db';

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const todoId = parseInt(id, 10);
  if (isNaN(todoId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const todo = todoDB.findById.get(todoId, userId);
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const subtasks = subtaskDB.findByTodoId.all(todoId);
  return NextResponse.json({ subtasks });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const todoId = parseInt(id, 10);
  if (isNaN(todoId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const todo = todoDB.findById.get(todoId, userId);
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, position } = body as { title?: string; position?: number };

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // Auto-position: place at end
  const existing = subtaskDB.findByTodoId.all(todoId);
  const pos = typeof position === 'number' ? position : existing.length;

  const result = subtaskDB.create.run(todoId, title.trim(), pos);
  const subtask = subtaskDB.findById.get(Number(result.lastInsertRowid));
  return NextResponse.json({ subtask }, { status: 201 });
}
