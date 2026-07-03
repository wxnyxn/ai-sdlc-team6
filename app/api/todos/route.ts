// app/api/todos/route.ts
// Feature 01 — Todo CRUD Operations
// Feature 02 — Priority System
// UI Reference: docs/main_ui.png, docs/main_ui_pending.png

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, userDB } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

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

export async function GET(_request: NextRequest) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const todos = todoDB.findAllByUserId.all(userId);
  return NextResponse.json({ todos });
}

export async function POST(request: NextRequest) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, priority = 'medium', dueDate } = body as {
    title?: string;
    priority?: string;
    dueDate?: string;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (dueDate) {
    const due = new Date(dueDate);
    const oneMinuteLater = new Date(getSingaporeNow().getTime() + 60_000);
    if (due < oneMinuteLater) {
      return NextResponse.json(
        { error: 'Due date must be at least 1 minute in the future' },
        { status: 400 }
      );
    }
  }

  const validPriorities = ['high', 'medium', 'low'];
  if (!validPriorities.includes(priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
  }

  const result = todoDB.create.run(
    userId,
    title.trim(),
    priority,
    dueDate ?? null,
    null,
    null
  );

  const todo = todoDB.findById.get(Number(result.lastInsertRowid), userId);
  return NextResponse.json({ todo }, { status: 201 });
}
