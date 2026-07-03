// app/api/holidays/route.ts
// Feature 10 — Calendar View
// GET: list all holidays (or filter by month YYYY-MM)
// POST: create a new holiday

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { holidayDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // optional: "YYYY-MM"

  const holidays = month
    ? holidayDB.findByMonth.all(month)
    : holidayDB.findAll.all();

  return NextResponse.json({ holidays });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, date, description = null, recurring = false } = body as {
    name?: string;
    date?: string;
    description?: string | null;
    recurring?: boolean;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Holiday name is required' }, { status: 400 });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Date must be in YYYY-MM-DD format' }, { status: 400 });
  }

  const result = holidayDB.create.run(name.trim(), date, description, recurring ? 1 : 0);
  return NextResponse.json(
    { id: Number(result.lastInsertRowid), name: name.trim(), date },
    { status: 201 }
  );
}
