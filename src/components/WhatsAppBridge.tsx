import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../lib/apiClient';
import { useAuth } from '../lib/authContext';
import { Loader2, QrCode, RefreshCw, ShieldAlert, Smartphone } from 'lucide-react';

type BridgeSession = {
  accountId: string;
  displayName: string;
  owner: string | null;
  rolloutWave: string | null;
  status: 'needs_qr' | 'connecting' | 'connected' | 'degraded' | 'paused';
  lastEventAt: string | null;
  lastError: string | null;
  hasQrCode: boolean;
  pairingCode: string | null;
  pairingCodeGeneratedAt: string | null;
};

type BridgeStatusResponse = {
  ok: boolean;
  bridgeMode: string;
  sessions: BridgeSession[];
};

type BridgeQrResponse = {
  ok: boolean;
  accountId: string;
  qrCode: string;
  qrImageDataUrl: string;
};

type BridgePairingCodeResponse = {
  ok: boolean;
  accountId: string;
  pairingCode: string;
  generatedAt: string;
};

type AuthMethod = 'qr' | 'pairing';

function formatDateTime(value: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function statusClasses(status: BridgeSession['status']) {
  switch (status) {
    case 'connected':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'needs_qr':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'connecting':
      return 'bg-sky-50 text-sky-700 ring-sky-200';
    case 'paused':
      return 'bg-slate-100 text-slate-700 ring-slate-200';
    case 'degraded':
    default:
      return 'bg-rose-50 text-rose-700 ring-rose-200';
  }
}

function statusLabel(status: BridgeSession['status']) {
  return status.replace('_', ' ');
}

function statusGuidance(session: BridgeSession | null) {
  if (!session) {
    return 'Pick an account first. Then choose whether you want to link it with QR or with a phone-number code.';
  }

  switch (session.status) {
    case 'connected':
      return 'This account is already linked. You only need to reconnect it if WhatsApp drops the session.';
    case 'connecting':
      return 'WhatsApp is still authenticating this session. Wait a few seconds before requesting a new code.';
    case 'paused':
      return 'This account is paused. You can still inspect it, but it will not process incoming bridge traffic.';
    case 'degraded':
      return 'This account needs attention. Use one login method below to relink it, then refresh status.';
    case 'needs_qr':
    default:
      return 'This account is waiting for login. Choose one method below and complete the steps in order.';
  }
}

async function fetchJson<T>(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export function WhatsAppBridge() {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<BridgeSession[]>([]);
  const [bridgeMode, setBridgeMode] = useState<string>('meta-forward');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('qr');
  const [qrImageDataUrl, setQrImageDataUrl] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [loadingPairing, setLoadingPairing] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingPhoneNumber, setPairingPhoneNumber] = useState('');

  const authHeader = useMemo(() => {
    const token = session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }, [session?.access_token]);

  const selectedSession = useMemo(() => {
    if (!selectedAccountId) return null;
    return sessions.find((entry) => entry.accountId === selectedAccountId) ?? null;
  }, [selectedAccountId, sessions]);

  async function loadStatus() {
    if (!authHeader) return;
    setLoadingStatus(true);
    setStatusError(null);

    try {
      const data = await fetchJson<BridgeStatusResponse>(`${API_BASE_URL}/whatsapp-bridge/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
      });

      const nextSessions = Array.isArray(data.sessions) ? data.sessions : [];
      setSessions(nextSessions);
      setBridgeMode(data.bridgeMode || 'meta-forward');
      setSelectedAccountId((current) => {
        if (current && nextSessions.some((entry) => entry.accountId === current)) {
          return current;
        }

        const qrPending = nextSessions.find((entry) => entry.status === 'needs_qr' && entry.hasQrCode);
        return qrPending?.accountId || nextSessions[0]?.accountId || null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusError(message);
      setSessions([]);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function loadQr(accountId: string) {
    if (!authHeader) return;
    setLoadingQr(true);
    setQrError(null);

    try {
      const data = await fetchJson<BridgeQrResponse>(`${API_BASE_URL}/whatsapp-bridge/sessions/${encodeURIComponent(accountId)}/qr`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
      });
      setQrImageDataUrl(data.qrImageDataUrl || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setQrError(message);
      setQrImageDataUrl(null);
    } finally {
      setLoadingQr(false);
    }
  }

  async function requestPairingCode(accountId: string) {
    if (!authHeader) return;

    if (!pairingPhoneNumber.trim()) {
      setPairingError('Enter the phone number in international format, without spaces or symbols if possible.');
      return;
    }

    setLoadingPairing(true);
    setPairingError(null);

    try {
      const data = await fetchJson<BridgePairingCodeResponse>(`${API_BASE_URL}/whatsapp-bridge/sessions/${encodeURIComponent(accountId)}/pairing-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({ phoneNumber: pairingPhoneNumber }),
      });

      setSessions((current) => current.map((entry) => (
        entry.accountId === accountId
          ? {
              ...entry,
              pairingCode: data.pairingCode,
              pairingCodeGeneratedAt: data.generatedAt,
              hasQrCode: false,
            }
          : entry
      )));
      setQrImageDataUrl(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPairingError(message);
    } finally {
      setLoadingPairing(false);
    }
  }

  useEffect(() => {
    if (!authHeader) return;
    void loadStatus();

    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [authHeader]);

  useEffect(() => {
    if (!selectedSession) {
      setQrImageDataUrl(null);
      setQrError(null);
      setPairingError(null);
      return;
    }

    if (!selectedSession.hasQrCode) {
      setQrImageDataUrl(null);
      setQrError(null);
      return;
    }

    void loadQr(selectedSession.accountId);
  }, [selectedSession?.accountId, selectedSession?.hasQrCode]);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    if (selectedSession.pairingCode) {
      setAuthMethod('pairing');
      return;
    }

    if (selectedSession.hasQrCode) {
      setAuthMethod('qr');
    }
  }, [selectedSession?.accountId, selectedSession?.hasQrCode, selectedSession?.pairingCode]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <Smartphone className="h-3.5 w-3.5" />
              WhatsApp Bridge
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Bridge Session Monitor</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Scan QR here to connect the pilot forwarding account, then let the existing Meta WhatsApp pipeline keep processing forwarded CVs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Mode</div>
              <div className="mt-1 font-medium text-slate-900">{bridgeMode}</div>
            </div>
            <button
              type="button"
              onClick={() => void loadStatus()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loadingStatus || !authHeader}
            >
              <RefreshCw className={`h-4 w-4 ${loadingStatus ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {statusError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Failed to load bridge status: {statusError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_430px]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Sessions</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Account</th>
                  <th className="px-5 py-3 font-semibold">Owner</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Last Event</th>
                  <th className="px-5 py-3 font-semibold">QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sessions.map((entry) => (
                  <tr
                    key={entry.accountId}
                    className={`cursor-pointer ${selectedAccountId === entry.accountId ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}
                    onClick={() => setSelectedAccountId(entry.accountId)}
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">{entry.displayName}</div>
                      <div className="text-xs text-slate-500">{entry.accountId}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{entry.owner || 'Unassigned'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses(entry.status)}`}>
                        {entry.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatDateTime(entry.lastEventAt)}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedAccountId(entry.accountId)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}

                {!loadingStatus && sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                      No bridge sessions configured.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selected Session</div>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  {selectedSession ? selectedSession.displayName : 'Choose an account'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedSession ? selectedSession.accountId : 'Pick a row from the session list to start.'}
                </p>
              </div>
              {selectedSession ? (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses(selectedSession.status)}`}>
                  {statusLabel(selectedSession.status)}
                </span>
              ) : null}
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">{statusGuidance(selectedSession)}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAuthMethod('qr')}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${authMethod === 'qr' ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900'}`}
                disabled={!selectedSession}
              >
                <QrCode className="h-4 w-4" />
                Use QR Scan
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('pairing')}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${authMethod === 'pairing' ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900'}`}
                disabled={!selectedSession}
              >
                <Smartphone className="h-4 w-4" />
                Use Phone Number
              </button>
              <button
                type="button"
                onClick={() => selectedSession && void loadStatus()}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:opacity-60"
                disabled={!selectedSession || loadingStatus}
              >
                <RefreshCw className={`h-4 w-4 ${loadingStatus ? 'animate-spin' : ''}`} />
                Refresh status
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Step 1</div>
                <h4 className="mt-1 text-base font-semibold text-slate-900">
                  {authMethod === 'qr' ? 'Open a QR for scanning' : 'Generate a phone-number code'}
                </h4>
              </div>
              {authMethod === 'qr' && selectedSession?.hasQrCode ? (
                <button
                  type="button"
                  onClick={() => void loadQr(selectedSession.accountId)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:opacity-60"
                  disabled={loadingQr}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingQr ? 'animate-spin' : ''}`} />
                  Reload
                </button>
              ) : null}
            </div>

            {authMethod === 'qr' ? (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                {loadingQr ? (
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="h-7 w-7 animate-spin" />
                    <p className="text-sm">Loading QR code...</p>
                  </div>
                ) : qrImageDataUrl ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={qrImageDataUrl}
                        alt="WhatsApp Bridge QR"
                        className="aspect-square w-full max-w-[160px] rounded-2xl border border-slate-200 bg-white p-2 shadow-sm object-contain sm:max-w-[180px]"
                      />
                      <div className="flex-1 space-y-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                          <div className="font-semibold text-slate-900">Scan flow</div>
                          <ol className="mt-2 space-y-2 text-xs leading-5 text-slate-600">
                            <li>1. Open WhatsApp on the phone.</li>
                            <li>2. Go to Linked Devices.</li>
                            <li>3. Tap Link a device and scan this QR within a few seconds.</li>
                          </ol>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={qrImageDataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            Open large QR
                          </a>
                          <button
                            type="button"
                            onClick={() => setAuthMethod('pairing')}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                          >
                            <Smartphone className="h-3.5 w-3.5" />
                            Switch to phone code
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs leading-5 text-slate-500">
                      If WhatsApp says “try again later”, reload the QR and scan the fresh one immediately.
                    </p>
                  </div>
                ) : (
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center text-slate-500">
                    <QrCode className="h-10 w-10" />
                    <p className="text-sm font-medium text-slate-700">
                      {selectedSession?.status === 'connected'
                        ? 'This session is already connected.'
                        : selectedSession?.status === 'connecting'
                          ? 'This session is authenticating. Wait a moment before requesting a new login method.'
                          : 'No QR is ready yet for this session. Refresh status or switch to phone-number login.'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Phone-number flow</div>
                  <ol className="mt-2 space-y-2 text-xs leading-5 text-slate-600">
                    <li>1. Enter the phone number of the WhatsApp device you want to link.</li>
                    <li>2. Tap Generate code.</li>
                    <li>3. On the phone, open Linked Devices and choose Link with phone number.</li>
                  </ol>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Primary WhatsApp Number
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="923001234567"
                      value={pairingPhoneNumber}
                      onChange={(event) => setPairingPhoneNumber(event.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      disabled={!selectedSession || loadingPairing || selectedSession.status === 'connected'}
                    />
                    <button
                      type="button"
                      onClick={() => selectedSession && void requestPairingCode(selectedSession.accountId)}
                      className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!selectedSession || loadingPairing || selectedSession.status === 'connected'}
                    >
                      {loadingPairing ? 'Generating...' : 'Generate code'}
                    </button>
                  </div>
                </div>

                {selectedSession?.pairingCode ? (
                  <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Step 2: Enter this code on the phone</div>
                    <div className="mt-2 break-all text-3xl font-semibold tracking-[0.22em] text-slate-900 sm:text-4xl">
                      {selectedSession.pairingCode}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      On the phone, open Linked Devices, choose Link with phone number, then enter this code.
                      {selectedSession.pairingCodeGeneratedAt ? ` Generated ${formatDateTime(selectedSession.pairingCodeGeneratedAt)}.` : ''}
                    </p>
                  </div>
                ) : null}

                {pairingError ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Pairing code is not currently available: {pairingError}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {selectedSession?.lastError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <div className="mb-1 inline-flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                Session Error
              </div>
              <div>{selectedSession.lastError}</div>
            </div>
          ) : null}

          {qrError ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              QR is not currently available: {qrError}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}