// app/api/templates/[id]/route.ts
// Feature 07 — Template System
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
