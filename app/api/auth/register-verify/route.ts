// app/api/auth/register-verify/route.ts
// Feature 11 — WebAuthn Registration: verify the browser response.
// Creates (or finds) the user, stores the authenticator, and issues a JWT session.

import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { getChallenge, deleteChallenge } from '@/lib/challenge-store';

const RP_ID = process.env.WEBAUTHN_RP_ID ?? 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { username, response } = body as { username?: string; response?: unknown };
  if (!username?.trim() || !response) {
    return NextResponse.json(
      { error: 'Username and response are required' },
      { status: 400 }
    );
  }

  const trimmed = username.trim();

  // Retrieve the stored challenge
  const challengeEntry = getChallenge(`reg:${trimmed}`);
  if (!challengeEntry) {
    return NextResponse.json(
      { error: 'Challenge expired or not found. Please try again.' },
      { status: 400 }
    );
  }

  // Verify the registration response from the authenticator
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: response as Parameters<typeof verifyRegistrationResponse>[0]['response'],
      expectedChallenge: challengeEntry.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });
  } catch (err) {
    console.error('[register-verify] verification error:', err);
    return NextResponse.json(
      { error: 'Registration verification failed.' },
      { status: 400 }
    );
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json(
      { error: 'Registration could not be verified.' },
      { status: 400 }
    );
  }

  deleteChallenge(`reg:${trimmed}`);

  const { credential } = verification.registrationInfo;

  // Create user if not already registered
  let user = userDB.findByUsername.get(trimmed);
  if (!user) {
    const result = userDB.create.run(trimmed);
    user = userDB.findById.get(Number(result.lastInsertRowid))!;
  }

  // Persist the authenticator using isoBase64URL for the public key (per project instructions)
  const credentialPublicKeyBase64 = isoBase64URL.fromBuffer(credential.publicKey);

  authenticatorDB.create.run(
    user.id,
    credential.id,
    credentialPublicKeyBase64,
    credential.counter ?? 0,
  );

  // Issue JWT session cookie
  await createSession({ userId: user.id, username: user.username });

  return NextResponse.json({ verified: true });
}
