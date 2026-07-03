// app/api/auth/register-options/route.ts
// Feature 11 — WebAuthn Registration: generate options for the browser.
// Stores the challenge in-memory (lib/challenge-store.ts) keyed by username.

import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { setChallenge } from '@/lib/challenge-store';

const RP_ID = process.env.WEBAUTHN_RP_ID ?? 'localhost';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { username } = body as { username?: string };
  if (!username?.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const trimmed = username.trim();

  // Fetch existing credentials so they can be excluded (prevents re-registering same key)
  const existingUser = userDB.findByUsername.get(trimmed);
  const existingAuthenticators = existingUser
    ? authenticatorDB.findByUserId.all(existingUser.id)
    : [];

  const options = await generateRegistrationOptions({
    rpName: 'Todo App',
    rpID: RP_ID,
    userName: trimmed,
    // Use UTF-8 encoded username as stable user ID bytes
    userID: new TextEncoder().encode(trimmed),
    excludeCredentials: existingAuthenticators.map((auth) => ({
      id: auth.credential_id,
    })),
    authenticatorSelection: {
      userVerification: 'preferred',
    },
  });

  // Store challenge for verification step
  setChallenge(`reg:${trimmed}`, options.challenge);

  return NextResponse.json(options);
}
