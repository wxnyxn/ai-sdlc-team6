// app/api/templates/[id]/route.ts
// Feature 07 — Template System
// PUT: update/rename a template
// DELETE: remove a template

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const templateId = parseInt(id, 10);
  if (isNaN(templateId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const existing = templateDB.findById.get(templateId, userId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    name = existing.name,
    description = existing.description,
    priority = existing.priority,
    due_date_offset_days = existing.due_date_offset_days,
    subtasks = existing.subtasks,
    category = existing.category,
  } = body as {
    name?: string;
    description?: string | null;
    priority?: string;
    due_date_offset_days?: number;
    subtasks?: string;
    category?: string | null;
  };

  if (!String(name ?? '').trim()) {
    return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
  }

  templateDB.update.run(
    String(name).trim(), description ?? null, priority,
    due_date_offset_days, subtasks, category ?? null,
    templateId, userId
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const templateId = parseInt(id, 10);
  if (isNaN(templateId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  templateDB.delete.run(templateId, userId);
  return NextResponse.json({ success: true });
}
