// app/api/tags/route.ts
// Feature 06 — Tag System
// GET: list all tags for the current user
// POST: create a new tag

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB, userDB } from '@/lib/db';

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

  const tags = tagDB.findByUserId.all(userId);
  return NextResponse.json({ tags });
}

export async function POST(request: NextRequest) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, color = '#6b7280' } = body as { name?: string; color?: string };
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
  }

  const result = tagDB.create.run(userId, name.trim(), color);
  return NextResponse.json({ id: Number(result.lastInsertRowid), name: name.trim(), color }, { status: 201 });
}
