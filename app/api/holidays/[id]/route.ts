// app/api/holidays/[id]/route.ts
// Feature 10 — Calendar View
// DELETE: remove a holiday

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { holidayDB } from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const holidayId = parseInt(id, 10);
  if (isNaN(holidayId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  holidayDB.delete.run(holidayId);
  return NextResponse.json({ success: true });
}
