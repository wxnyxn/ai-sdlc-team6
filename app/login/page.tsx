'use client';

// app/login/page.tsx
// Feature 11 — WebAuthn/Passkeys Authentication
// Login and Registration page with passkey support.
// UI Reference: docs/main_ui.png (header shows logged-in state)

import { useState } from 'react';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister() {
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Username is required.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Step 1: Get registration options from server
      const optRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });
      if (!optRes.ok) {
        const data = await optRes.json();
        setError(data.error ?? 'Failed to start registration.');
        return;
      }
      const options = await optRes.json();

      // Step 2: Invoke the authenticator (browser/device)
      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: options });
      } catch {
        setError('Passkey creation was cancelled or is not supported on this device.');
        return;
      }

      // Step 3: Verify with server and create session
      const verRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed, response: attResp }),
      });
      if (verRes.ok) {
        setSuccess('Registration successful! Redirecting…');
        router.push('/');
      } else {
        const data = await verRes.json();
        setError(data.error ?? 'Registration verification failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Username is required.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Step 1: Get authentication options from server
      const optRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });
      if (!optRes.ok) {
        const data = await optRes.json();
        setError(data.error ?? 'Failed to start login.');
        return;
      }
      const options = await optRes.json();

      // Step 2: Invoke the authenticator
      let authResp;
      try {
        authResp = await startAuthentication({ optionsJSON: options });
      } catch {
        setError('Passkey authentication was cancelled or failed.');
        return;
      }

      // Step 3: Verify with server and create session
      const verRes = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed, response: authResp }),
      });
      if (verRes.ok) {
        setSuccess('Login successful! Redirecting…');
        router.push('/');
      } else {
        const data = await verRes.json();
        setError(data.error ?? 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl border shadow-sm p-8">
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Todo App</h1>
        <p className="text-gray-500 text-sm mb-6">
          Sign in or create an account with your passkey
        </p>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
            {success}
          </div>
        )}

        {/* Username input */}
        <div className="mb-5">
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Enter your username"
            className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50"
            disabled={loading}
            autoFocus
            autoComplete="username webauthn"
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-2.5 bg-blue-500 text-white rounded-lg font-semibold text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Processing…' : '🔑 Sign In with Passkey'}
          </button>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Processing…' : '✨ Register New Account'}
          </button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-400 mt-6 text-center">
          Uses WebAuthn/Passkeys — no password required.
          <br />
          Your biometrics stay on your device.
        </p>
      </div>
    </main>
  );
}
