// Lightweight passphrase gate for the "Lead" tools (Find Jobs / Find Recruiters).
// It sits on top of the normal portal login as a second barrier, so the
// lead-generation tools are only opened by staff who hold the Lead passphrase.
// Once entered correctly it stays unlocked for the browser session
// (sessionStorage), covering both Find Jobs and Find Recruiters.
//
// The passphrase is read from VITE_LEAD_PASSWORD at build time (set it in the
// frontend's Railway variables). Note: a build-time frontend value is bundled
// into the JS, so this gates access among already-authenticated portal users —
// it is not a server-side secret. Ask for the backend-verified variant if a
// hard wall is needed.

import { useState, type FormEvent, type ReactNode } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const STORAGE_KEY = 'falisha_lead_unlocked';
const DEFAULT_PASSWORD = 'Falisha@Lead2026';

function configuredPassword(): string {
  const env = (import.meta as { env?: Record<string, string> }).env;
  return env?.VITE_LEAD_PASSWORD || DEFAULT_PASSWORD;
}

export function LeadPasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) {
    return <>{children}</>;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value === configuredPassword()) {
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* sessionStorage unavailable (private mode) — still unlock for this view */
      }
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-center text-lg font-semibold text-slate-900">Protected area</h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Enter the Lead passphrase to access Find Jobs and Find Recruiters.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <Input
            type="password"
            autoFocus
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(false);
            }}
            placeholder="Passphrase"
            className={error ? 'border-red-400 focus-visible:ring-red-400' : ''}
          />
          {error && <p className="text-sm text-red-600">Incorrect passphrase. Try again.</p>}
          <Button type="submit" className="w-full gap-2">
            <ShieldCheck className="h-4 w-4" /> Unlock
          </Button>
        </form>
      </div>
    </div>
  );
}

export default LeadPasswordGate;
