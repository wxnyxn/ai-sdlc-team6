// app/api/auth/logout/route.ts
// Feature 11 — Logout: clear the session cookie.

import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST() {
  await deleteSession();
  return NextResponse.json({ success: true });
}
