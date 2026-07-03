// app/api/auth/login-verify/route.ts
// Feature 11 — WebAuthn Authentication: verify the browser response.
// Verifies the credential, updates the counter, and issues a JWT session.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
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
  const challengeEntry = getChallenge(`auth:${trimmed}`);
  if (!challengeEntry) {
    return NextResponse.json(
      { error: 'Challenge expired or not found. Please try again.' },
      { status: 400 }
    );
  }

  // Find the user
  const user = userDB.findByUsername.get(trimmed);
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  // Find the specific authenticator that was used (matched by credential id)
  const authResponse = response as { id?: string };
  const authenticatorRecord = authenticatorDB.findByCredentialId.get(
    authResponse.id ?? ''
  );
  if (!authenticatorRecord || authenticatorRecord.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Authenticator not associated with this account.' },
      { status: 400 }
    );
  }

  // Decode stored public key (stored as base64url per project instructions)
  const credentialPublicKey = isoBase64URL.toBuffer(
    authenticatorRecord.credential_public_key
  );

  // Verify the authentication response
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: response as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
      expectedChallenge: challengeEntry.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: authenticatorRecord.credential_id,
        publicKey: credentialPublicKey,
        counter: authenticatorRecord.counter ?? 0,
      },
    });
  } catch (err) {
    console.error('[login-verify] verification error:', err);
    return NextResponse.json(
      { error: 'Authentication verification failed.' },
      { status: 400 }
    );
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
  }

  deleteChallenge(`auth:${trimmed}`);

  // Update the counter to prevent replay attacks
  authenticatorDB.updateCounter.run(
    verification.authenticationInfo.newCounter ?? 0,
    authenticatorRecord.credential_id
  );

  // Issue JWT session cookie
  await createSession({ userId: user.id, username: user.username });

  return NextResponse.json({ verified: true });
}
