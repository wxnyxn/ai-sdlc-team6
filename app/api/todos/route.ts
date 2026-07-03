// app/api/todos/route.ts
// Feature 01 — Todo CRUD Operations
// UI Reference: docs/main_ui.png, docs/main_ui_pending.png
// See docs/FEATURES.md § "Todo CRUD Operations" for full spec.
// See docs/PROGRESS.md — ensure Feature 01 is In Progress before implementing.

import { NextRequest, NextResponse } from 'next/server';
// import { getSession } from '@/lib/auth';
// import { todoDB } from '@/lib/db';

export async function GET(_request: NextRequest) {
  // TODO: Implement — check session, return todos for session.userId
  return NextResponse.json({ todos: [] });
}

export async function POST(request: NextRequest) {
  // TODO: Implement — validate title, priority, dueDate; insert via todoDB.create()
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
