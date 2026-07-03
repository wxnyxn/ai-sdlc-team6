// app/api/templates/[id]/use/route.ts
// Feature 07 — Template System
// POST: create a new todo from a template
// Due date = today + due_date_offset_days in Singapore timezone

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB, todoDB, subtaskDB, userDB } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const templateId = parseInt(id, 10);
  if (isNaN(templateId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const template = templateDB.findById.get(templateId, userId);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  // Calculate due date = today + offset days (Singapore timezone)
  let dueDate: string | null = null;
  if (template.due_date_offset_days > 0) {
    const now = getSingaporeNow();
    now.setDate(now.getDate() + template.due_date_offset_days);
    dueDate = now.toISOString();
  }

  const todoResult = todoDB.create.run(
    userId,
    template.name,
    template.priority,
    dueDate,
    null,  // no recurrence
    null   // no reminder
  );
  const todoId = Number(todoResult.lastInsertRowid);

  // Create subtasks from JSON
  let subtaskList: Array<{ title: string; position: number }> = [];
  try {
    subtaskList = JSON.parse(template.subtasks);
  } catch { /* ignore malformed JSON */ }

  for (const s of subtaskList) {
    subtaskDB.create.run(todoId, s.title, s.position);
  }

  return NextResponse.json({ todoId }, { status: 201 });
}
