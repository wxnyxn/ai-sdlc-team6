// app/api/templates/route.ts
// Feature 07 — Template System
// GET: list all templates for the current user
// POST: create a new template

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB, userDB } from '@/lib/db';

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

  const templates = templateDB.findByUserId.all(userId);
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    name,
    description = null,
    priority = 'medium',
    due_date_offset_days = 0,
    subtasks = [],
    category = null,
  } = body as {
    name?: string;
    description?: string | null;
    priority?: string;
    due_date_offset_days?: number;
    subtasks?: Array<{ title: string; position: number }>;
    category?: string | null;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
  }

  const validPriorities = ['high', 'medium', 'low'];
  if (!validPriorities.includes(priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
  }

  const result = templateDB.create.run(
    userId,
    name.trim(),
    description,
    priority,
    due_date_offset_days,
    JSON.stringify(subtasks),
    category
  );

  return NextResponse.json({
    id: Number(result.lastInsertRowid),
    name: name.trim(),
    priority,
  }, { status: 201 });
}
