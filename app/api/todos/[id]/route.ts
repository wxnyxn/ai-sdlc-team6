// app/api/todos/[id]/route.ts
// Feature 01 — Todo CRUD Operations (Update, Delete)
// Feature 02 — Priority System
// UI Reference: docs/main_ui.png, docs/main_ui_pending.png

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const todoId = parseInt(id, 10);
  if (isNaN(todoId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const existing = todoDB.findById.get(todoId, userId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    title = existing.title,
    priority = existing.priority,
    dueDate = existing.due_date,
    completed = existing.completed,
    recurrencePattern = existing.recurrence_pattern,
    reminderOffsetMinutes = existing.reminder_offset_minutes,
  } = body as {
    title?: string;
    priority?: string;
    dueDate?: string | null;
    completed?: number | boolean;
    recurrencePattern?: string | null;
    reminderOffsetMinutes?: number | null;
  };

  if (!String(title ?? '').trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  todoDB.update.run(
    String(title).trim(),
    priority,
    dueDate ?? null,
    completed ? 1 : 0,
    recurrencePattern ?? null,
    reminderOffsetMinutes ?? null,
    todoId,
    userId
  );

  const updated = todoDB.findById.get(todoId, userId);
  return NextResponse.json({ todo: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const todoId = parseInt(id, 10);
  if (isNaN(todoId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const existing = todoDB.findById.get(todoId, userId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  todoDB.delete.run(todoId, userId);
  return NextResponse.json({ success: true });
}
