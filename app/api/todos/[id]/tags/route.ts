// app/api/todos/[id]/tags/route.ts
// Feature 06 — Tag System
// GET: list tags attached to a todo
// POST: attach an existing tag to a todo

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

  const tags = tagDB.findByTodoId.all(todoId);
  return NextResponse.json({ tags });
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
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { tagId } = body as { tagId?: number };
  if (!tagId) return NextResponse.json({ error: 'tagId is required' }, { status: 400 });

  tagDB.addToTodo.run(todoId, tagId);
  return NextResponse.json({ success: true }, { status: 201 });
}
