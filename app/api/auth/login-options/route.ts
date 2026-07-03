// app/api/auth/login-options/route.ts
// Feature 11 — WebAuthn Authentication: generate options for the browser.
// Stores the challenge in-memory keyed by username.

import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
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

  // User must exist
  const user = userDB.findByUsername.get(trimmed);
  if (!user) {
    return NextResponse.json(
      { error: 'User not found. Please register first.' },
      { status: 404 }
    );
  }

  // User must have at least one registered authenticator
  const authenticators = authenticatorDB.findByUserId.all(user.id);
  if (authenticators.length === 0) {
    return NextResponse.json(
      { error: 'No passkeys registered for this account.' },
      { status: 400 }
    );
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: authenticators.map((auth) => ({
      id: auth.credential_id,
    })),
    userVerification: 'preferred',
  });

  // Store challenge for verification step (include userId for quick lookup)
  setChallenge(`auth:${trimmed}`, options.challenge, user.id);

  return NextResponse.json(options);
}
