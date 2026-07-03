// lib/challenge-store.ts
// Temporary in-memory challenge store for WebAuthn registration and authentication flows.
// Challenges expire after 5 minutes.
// NOTE: This is module-scoped; works for single-process deployments (SQLite/dev).

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ChallengeEntry {
  challenge: string;
  expires: number;
  userId?: number;
}

const challengeStore = new Map<string, ChallengeEntry>();

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of challengeStore.entries()) {
    if (entry.expires < now) challengeStore.delete(key);
  }
}

export function setChallenge(key: string, challenge: string, userId?: number): void {
  cleanupExpired();
  challengeStore.set(key, {
    challenge,
    expires: Date.now() + CHALLENGE_TTL_MS,
    userId,
  });
}

export function getChallenge(key: string): ChallengeEntry | null {
  const entry = challengeStore.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    challengeStore.delete(key);
    return null;
  }
  return entry;
}

export function deleteChallenge(key: string): void {
  challengeStore.delete(key);
}
