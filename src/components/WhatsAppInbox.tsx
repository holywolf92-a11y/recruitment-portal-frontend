import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../lib/apiClient';
import { useAuth, supabase } from '../lib/authContext';
import {
  ArrowLeft, CalendarClock, CheckCheck, Download, FileText,
  Mic, Phone, Search, Send, Smile, Paperclip, Smartphone, X,
} from 'lucide-react';

// APK download URL — Falisha Agent Android App (built via EAS)
const AGENT_APK_URL = 'https://expo.dev/artifacts/eas/4UHM4fr7khi7epQohrvcHL.apk';

// WhatsApp brand palette
const WA_DARK    = '#075E54';
const WA_MID     = '#128C7E';
const WA_LIGHT   = '#25D366';
const WA_OUT_BG  = '#DCF8C6';   // outbound bubble
const WA_CHAT_BG = '#E5DDD5';   // chat area background

type ReplyMode = 'ai' | 'human';

type Conversation = {
  id: string;
  phone_number: string;
  display_name: string | null;
  candidate_id?: string | null;
  candidate_name?: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  reply_mode: ReplyMode;
  taken_over_by: string | null;
  taken_over_at: string | null;
  taken_over_by_name?: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound' | 'ai';
  body: string | null;
  message_type: string;
  status: string;
  created_at: string;
  media_id: string | null;
  mime_type: string | null;
  file_name: string | null;
};

type AppointmentType = 'Interview' | 'Document Review' | 'Follow-up' | 'In-person Visit' | 'Video Call';
const APPT_TYPES: AppointmentType[] = ['Interview', 'Document Review', 'Follow-up', 'In-person Visit', 'Video Call'];

interface AppointmentForm {
  type: AppointmentType;
  date: string;
  time: string;
  durationMins: number;
  location: string;
  notes: string;
}

// ─── Utility functions ──────────────────────────────────────────────────────

function formatListTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatBubbleTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function initialsFromName(value: string) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (first + second).toUpperCase();
}

function playNotificationBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    setTimeout(() => ctx.close(), 1000);
  } catch {}
}

async function fetchJson(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

// ─── Avatar ─────────────────────────────────────────────────────────────────

const AVATAR_COLOURS = [
  '#AB47BC', '#26A69A', '#EF5350', '#42A5F5',
  '#66BB6A', '#FFA726', '#EC407A', '#7E57C2',
];

function WaAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = initialsFromName(name);
  const colour = AVATAR_COLOURS[(name.charCodeAt(0) ?? 0) % AVATAR_COLOURS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: colour,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.34, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ─── VoicePlayer ─────────────────────────────────────────────────────────────

function VoicePlayer({ messageId, fetchUrl }: {
  messageId: string;
  fetchUrl: (id: string) => Promise<string | null>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (url || loading) return;
    setLoading(true);
    const loaded = await fetchUrl(messageId);
    setUrl(loaded);
    setLoading(false);
  };

  if (loading) return <span style={{ fontSize: 12, color: '#6b7280' }}>Loading audio…</span>;

  if (!url) {
    return (
      <button
        onClick={load}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'rgba(0,0,0,0.07)', borderRadius: 20,
          padding: '5px 12px', border: 'none', cursor: 'pointer',
          fontSize: 12, color: '#374151',
        }}
      >
        <Mic size={13} /> Voice message — tap to load
      </button>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio controls style={{ maxWidth: '100%', height: 36, display: 'block' }}>
      <source src={url} />
    </audio>
  );
}

// ─── InlineImage ──────────────────────────────────────────────────────────────

function InlineImage({ messageId, fileName, fetchUrl }: {
  messageId: string;
  fileName: string | null;
  fetchUrl: (id: string) => Promise<string | null>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const open = async () => {
    if (loading) return;
    if (url) { window.open(url, '_blank'); return; }
    setLoading(true);
    const loaded = await fetchUrl(messageId);
    setUrl(loaded);
    setLoading(false);
    if (loaded) window.open(loaded, '_blank');
  };

  return (
    <button
      onClick={open}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(0,0,0,0.07)', borderRadius: 10,
        padding: '7px 10px', border: 'none', cursor: 'pointer',
        fontSize: 12, color: '#374151',
      }}
    >
      <span style={{ fontSize: 17 }}>📷</span>
      <span>{loading ? 'Loading…' : (fileName || 'Image')} — tap to view</span>
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function WhatsAppInbox() {
  const { session } = useAuth();

  // ── State ─────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('en_US');

  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modeError, setModeError] = useState<string | null>(null);
  const [modeLoading, setModeLoading] = useState(false);

  const [conversationOffset, setConversationOffset] = useState(0);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Book Appointment
  const [showBookModal, setShowBookModal] = useState(false);
  const [apptForm, setApptForm] = useState<AppointmentForm>({
    type: 'Interview', date: '', time: '10:00', durationMins: 60, location: '', notes: '',
  });
  const [apptSending, setApptSending] = useState(false);
  const [apptError, setApptError] = useState<string | null>(null);
  const [apptSent, setApptSent] = useState(false);

  // Media URL cache
  const [mediaUrlCache, setMediaUrlCache] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────

  const authHeader = useMemo(() => {
    const token = session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }, [session?.access_token]);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return conversations.find((c) => c.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  const isTakenOverByOther = useMemo(() => {
    if (!selectedConversation) return false;
    if (selectedConversation.reply_mode !== 'human') return false;
    if (!selectedConversation.taken_over_by) return false;
    const myUserId = session?.user?.id;
    return !!myUserId && selectedConversation.taken_over_by !== myUserId;
  }, [selectedConversation, session?.user?.id]);

  const takeoverLabel = useMemo(() => {
    if (!selectedConversation) return null;
    if (selectedConversation.reply_mode !== 'human') return null;
    if (!selectedConversation.taken_over_by) return null;
    const myUserId = session?.user?.id;
    if (myUserId && selectedConversation.taken_over_by === myUserId) return 'You';
    return selectedConversation.taken_over_by_name || 'Another admin';
  }, [selectedConversation, session?.user?.id]);

  const showTemplateComposer = useMemo(() => {
    return (sendError || '').toLowerCase().includes('template');
  }, [sendError]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter((c) => {
      const title = (c.candidate_name || c.display_name || c.phone_number || '').toLowerCase();
      return title.includes(q) || (c.phone_number || '').includes(q);
    });
  }, [conversations, searchQuery]);

  const selectedTitle = selectedConversation
    ? (selectedConversation.candidate_name || selectedConversation.display_name || selectedConversation.phone_number || '')
    : '';

  // ── API ───────────────────────────────────────────────────────────────────

  async function loadConversations(opts?: { offset?: number; append?: boolean }) {
    if (!authHeader) return;
    const off = opts?.offset ?? 0;
    const isAppend = opts?.append ?? false;
    if (isAppend) setLoadingMore(true);
    else setLoadingConversations(true);
    setLoadError(null);
    try {
      const data = await fetchJson(`${API_BASE_URL}/whatsapp-inbox/conversations?limit=50&offset=${off}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      const convs = (data?.conversations ?? []) as Conversation[];
      const total = (data?.total ?? 0) as number;
      if (isAppend) setConversations((prev) => [...prev, ...convs]);
      else setConversations(convs);
      const newOffset = off + convs.length;
      setConversationOffset(newOffset);
      setHasMoreConversations(newOffset < total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg);
      if (!isAppend) setConversations([]);
    } finally {
      if (isAppend) setLoadingMore(false);
      else setLoadingConversations(false);
    }
  }

  async function fetchMediaUrl(messageId: string): Promise<string | null> {
    if (!authHeader) return null;
    if (mediaUrlCache[messageId]) return mediaUrlCache[messageId];
    try {
      const data = await fetchJson(`${API_BASE_URL}/whatsapp-inbox/messages/${messageId}/media-url`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      const url = data?.url ?? null;
      if (url) setMediaUrlCache((prev) => ({ ...prev, [messageId]: url }));
      return url;
    } catch {
      return null;
    }
  }

  async function loadMessages(conversationId: string) {
    if (!authHeader) return;
    setLoadingMessages(true);
    setLoadError(null);
    try {
      const data = await fetchJson(`${API_BASE_URL}/whatsapp-inbox/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      setMessages((data?.messages ?? []) as Message[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function markRead(conversationId: string) {
    if (!authHeader) return;
    try {
      await fetchJson(`${API_BASE_URL}/whatsapp-inbox/conversations/${conversationId}/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      await loadConversations();
    } catch { /* fail-open */ }
  }

  async function takeOver(conversationId: string) {
    if (!authHeader) return;
    setModeError(null);
    setModeLoading(true);
    try {
      const updated = (await fetchJson(`${API_BASE_URL}/whatsapp-inbox/conversations/${conversationId}/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
      })) as Partial<Conversation>;
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? ({ ...c, ...updated } as Conversation) : c)));
      await loadConversations();
    } catch (err) {
      setModeError(err instanceof Error ? err.message : String(err));
    } finally {
      setModeLoading(false);
    }
  }

  async function returnToAI(conversationId: string) {
    if (!authHeader) return;
    setModeError(null);
    setModeLoading(true);
    try {
      const updated = (await fetchJson(`${API_BASE_URL}/whatsapp-inbox/conversations/${conversationId}/return-to-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
      })) as Partial<Conversation>;
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? ({ ...c, ...updated } as Conversation) : c)));
      await loadConversations();
    } catch (err) {
      setModeError(err instanceof Error ? err.message : String(err));
    } finally {
      setModeLoading(false);
    }
  }

  async function sendText(conversationId: string) {
    if (!authHeader) return;
    const text = draft.trim();
    if (!text) return;
    setSendError(null);
    setDraft('');
    try {
      await fetchJson(`${API_BASE_URL}/whatsapp-inbox/conversations/${conversationId}/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ text }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSendError(msg.includes('24h_window_expired') ? '24-hour window expired. Use a template message.' : msg);
      setDraft(text);
    }
  }

  async function sendTemplate(conversationId: string) {
    if (!authHeader) return;
    const name = templateName.trim();
    if (!name) { setSendError('Template name is required.'); return; }
    setSendError(null);
    try {
      await fetchJson(`${API_BASE_URL}/whatsapp-inbox/conversations/${conversationId}/send-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ templateName: name, language: templateLanguage || 'en_US' }),
      });
      setTemplateName('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err));
    }
  }

  async function sendAppointmentMessage(conversationId: string) {
    if (!authHeader) return;
    const { type, date, time, durationMins, location, notes } = apptForm;
    if (!date || !time) { setApptError('Date and time are required.'); return; }

    const candidate = selectedConversation?.candidate_name
      || selectedConversation?.display_name
      || selectedConversation?.phone_number
      || 'Candidate';

    const formattedDate = new Date(`${date}T${time}`).toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const msg =
      `📅 *Appointment Confirmation*\n\n` +
      `Dear ${candidate},\n\n` +
      `Your appointment has been scheduled:\n\n` +
      `📌 *Type:* ${type}\n` +
      `📅 *Date:* ${formattedDate}\n` +
      `🕐 *Time:* ${time}\n` +
      `⏱ *Duration:* ${durationMins} mins` +
      (location ? `\n📍 *Location:* ${location}` : '') +
      (notes ? `\n\n📝 ${notes}` : '') +
      `\n\nPlease reply *CONFIRM* to confirm.\n_— Falisha Manpower_`;

    setApptSending(true);
    setApptError(null);
    try {
      await fetchJson(`${API_BASE_URL}/whatsapp-inbox/conversations/${conversationId}/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ text: msg }),
      });
      setApptSent(true);
      setTimeout(() => {
        setShowBookModal(false);
        setApptSent(false);
        setApptForm({ type: 'Interview', date: '', time: '10:00', durationMins: 60, location: '', notes: '' });
      }, 1500);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setApptError(errMsg.includes('24h') ? '24-hour window expired — send a template message instead.' : errMsg);
    } finally {
      setApptSending(false);
    }
  }

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadConversations({ offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeader]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
      markRead(selectedConversationId);
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedConversationId]);

  useEffect(() => {
    if (!authHeader) return;
    let refreshTimer: number | undefined;
    const scheduleRefresh = (convId?: string) => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        loadConversations();
        if (convId && selectedConversationId && convId === selectedConversationId) {
          loadMessages(selectedConversationId);
        }
      }, 250);
    };
    const channel = supabase
      .channel('whatsapp-inbox-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        const newMsg = payload.new as any;
        if (newMsg?.direction === 'inbound') playNotificationBeep();
        scheduleRefresh(String(newMsg?.conversation_id || ''));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        scheduleRefresh(String((payload.new as any)?.conversation_id || ''));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_conversations' }, () => {
        scheduleRefresh();
      })
      .subscribe((status) => {
        console.log('[WhatsAppInbox] Realtime:', status);
      });
    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, authHeader]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Two-panel WhatsApp-style container ──────────────────────────── */}
      <div
        style={{
          display: 'flex', height: '100%', minHeight: 0,
          borderRadius: 12, overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* ── LEFT PANEL — conversation list ─────────────────────────────── */}
        <div
          className={`flex-col bg-white border-r border-gray-100 ${selectedConversationId ? 'hidden sm:flex' : 'flex w-full sm:w-auto'}`}
          style={{ width: 360, flexShrink: 0 }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 16px', flexShrink: 0,
            background: `linear-gradient(135deg, ${WA_DARK}, ${WA_MID})`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>💬</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>WhatsApp Inbox</div>
                {loadingConversations && (
                  <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>Updating…</div>
                )}
              </div>
            </div>
            <button
              onClick={() => { setShowSearch((v) => !v); setSearchQuery(''); }}
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: showSearch ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Search"
            >
              <Search size={16} color="#fff" />
            </button>
          </div>

          {/* Search bar */}
          {showSearch && (
            <div style={{ padding: '8px 12px', background: '#f0f2f5', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, pointerEvents: 'none' }} />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or number"
                  style={{
                    width: '100%', padding: '8px 32px 8px 32px',
                    borderRadius: 20, border: 'none', background: '#fff',
                    fontSize: 13, outline: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    boxSizing: 'border-box',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    aria-label="Clear search"
                  >
                    <X size={13} color="#9ca3af" />
                  </button>
                )}
              </div>
            </div>
          )}

          {loadError && (
            <div style={{ padding: '8px 14px', fontSize: 12, color: '#dc2626', background: '#fef2f2', flexShrink: 0 }}>
              {loadError}
            </div>
          )}

          {/* Agent APK banner */}
          {AGENT_APK_URL && (
            <div style={{
              margin: '8px 10px', borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${WA_DARK}, ${WA_MID})`,
              padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Smartphone size={17} color="#fff" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Falisha Agent App</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Android — manage on mobile</div>
              </div>
              <a
                href={AGENT_APK_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11, fontWeight: 700, color: WA_DARK, background: '#fff',
                  borderRadius: 8, padding: '5px 10px', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                }}
              >
                <Download size={11} /> APK
              </a>
            </div>
          )}

          {/* Conversation rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length === 0 && !loadingConversations && (
              <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                {searchQuery ? 'No conversations match your search.' : 'No conversations yet.'}
              </div>
            )}
            {filteredConversations.map((c) => {
              const title = c.candidate_name || c.display_name || c.phone_number || '';
              const isSelected = c.id === selectedConversationId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedConversationId(c.id)}
                  style={{
                    width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                    padding: '11px 16px',
                    background: isSelected ? '#f0f2f5' : 'transparent',
                    borderBottom: '1px solid #f0f2f5',
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '#f7f8fa'; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <WaAvatar name={title} size={46} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{
                        fontWeight: 600, fontSize: 14, color: '#111827',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                      }}>{title}</span>
                      <span style={{
                        fontSize: 11, flexShrink: 0,
                        color: c.unread_count > 0 ? WA_MID : '#9ca3af',
                      }}>{formatListTime(c.last_message_at)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
                      <span style={{
                        fontSize: 12, color: '#6b7280',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                      }}>{c.last_message_preview || ''}</span>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                        {c.unread_count > 0 && (
                          <span style={{
                            minWidth: 18, height: 18, borderRadius: 9,
                            background: WA_LIGHT, color: '#fff',
                            fontSize: 11, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                          }}>{c.unread_count}</span>
                        )}
                        <span style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 8, fontWeight: 600,
                          background: c.reply_mode === 'ai' ? '#eff6ff' : '#f0fdf4',
                          color: c.reply_mode === 'ai' ? '#1d4ed8' : WA_MID,
                        }}>
                          {c.reply_mode === 'ai' ? 'AI' : 'Human'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {hasMoreConversations && !searchQuery && (
              <button
                onClick={() => loadConversations({ offset: conversationOffset, append: true })}
                disabled={loadingMore}
                style={{
                  width: '100%', padding: 12, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: WA_MID, fontSize: 13, fontWeight: 600,
                  opacity: loadingMore ? 0.5 : 1,
                }}
              >
                {loadingMore ? 'Loading…' : 'Load more conversations'}
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL — chat view or empty state ──────────────────────── */}
        <div
          className={`flex-col min-w-0 ${!selectedConversationId ? 'hidden sm:flex' : 'flex'}`}
          style={{ flex: 1, background: WA_CHAT_BG }}
        >
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div style={{
                padding: '10px 16px', flexShrink: 0,
                background: `linear-gradient(135deg, ${WA_DARK}, ${WA_MID})`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <button
                  className="flex sm:hidden"
                  onClick={() => setSelectedConversationId(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                  aria-label="Back"
                >
                  <ArrowLeft size={20} color="#fff" />
                </button>

                <WaAvatar name={selectedTitle} size={40} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{selectedTitle}</div>
                  <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 1 }}>
                    {selectedConversation.phone_number}
                    {selectedConversation.reply_mode === 'human' && takeoverLabel && ` · Taken: ${takeoverLabel}`}
                    {isTakenOverByOther && ' 🔒 Locked'}
                  </div>
                </div>

                <span style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 10, fontWeight: 700,
                  background: 'rgba(255,255,255,0.2)', color: '#fff', flexShrink: 0,
                }}>
                  {selectedConversation.reply_mode === 'ai' ? 'AI' : 'Human'}
                </span>

                <button
                  title={selectedConversation.phone_number ? `Call ${selectedConversation.phone_number}` : 'No number'}
                  disabled={!selectedConversation.phone_number}
                  onClick={() => {
                    const tel = (selectedConversation.phone_number || '').replace(/[^\d+]/g, '');
                    if (tel) window.location.href = `tel:${tel}`;
                  }}
                  style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: 'rgba(255,255,255,0.15)', border: 'none',
                    cursor: selectedConversation.phone_number ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    opacity: selectedConversation.phone_number ? 1 : 0.4,
                  }}
                >
                  <Phone size={16} color="#fff" />
                </button>
              </div>

              {/* Quick actions bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
                background: '#f0fdf4', borderBottom: '1px solid #d1fae5',
                flexShrink: 0, flexWrap: 'wrap',
              }}>
                <button
                  onClick={() => {
                    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
                    setApptForm((f) => ({ ...f, date: tomorrow.toISOString().slice(0, 10) }));
                    setApptError(null);
                    setApptSent(false);
                    setShowBookModal(true);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 20,
                    background: WA_MID, border: 'none', color: '#fff',
                    cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  }}
                >
                  <CalendarClock size={13} /> Book Appointment
                </button>

                {selectedConversation.reply_mode === 'ai' ? (
                  <button
                    onClick={() => takeOver(selectedConversation.id)}
                    disabled={isTakenOverByOther || modeLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 20,
                      background: '#374151', border: 'none', color: '#fff',
                      cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      opacity: isTakenOverByOther || modeLoading ? 0.5 : 1,
                    }}
                  >
                    Take Over
                  </button>
                ) : (
                  <button
                    onClick={() => returnToAI(selectedConversation.id)}
                    disabled={isTakenOverByOther || modeLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 20,
                      background: '#6366f1', border: 'none', color: '#fff',
                      cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      opacity: isTakenOverByOther || modeLoading ? 0.5 : 1,
                    }}
                  >
                    Return to AI
                  </button>
                )}

                {modeError && (
                  <span style={{ fontSize: 11, color: '#dc2626' }}>{modeError}</span>
                )}
              </div>

              {/* Messages */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '12px 4%',
                display: 'flex', flexDirection: 'column', gap: 2,
                background: WA_CHAT_BG,
              }}>
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13 }}>Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13 }}>No messages yet.</div>
                ) : (
                  messages.map((m) => {
                    const isInbound = m.direction === 'inbound';
                    const isDocument = m.message_type === 'document';
                    const isImage = m.message_type === 'image' || m.message_type === 'sticker';
                    const isAudio = m.message_type === 'audio';
                    const isVideo = m.message_type === 'video';
                    const isInteractive = m.message_type === 'interactive';
                    const isMedia = isDocument || isImage || isAudio || isVideo;
                    const isPlaceholderBody = /^\[.*\]$/.test((m.body || '').trim());
                    const realBody = !isPlaceholderBody && m.body ? m.body : null;
                    const showTicks = !isInbound && m.direction !== 'ai';
                    const tickColor = m.status === 'read' ? WA_MID : '#9ca3af';

                    return (
                      <div key={m.id} style={{
                        display: 'flex',
                        justifyContent: isInbound ? 'flex-start' : 'flex-end',
                        marginBottom: 2,
                      }}>
                        <div style={{
                          maxWidth: '74%',
                          background: isInbound ? '#fff' : WA_OUT_BG,
                          borderRadius: isInbound ? '2px 12px 12px 12px' : '12px 2px 12px 12px',
                          padding: '6px 10px 4px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                        }}>
                          {isAudio && (
                            <VoicePlayer messageId={m.id} fetchUrl={fetchMediaUrl} />
                          )}
                          {isImage && (
                            <InlineImage messageId={m.id} fileName={m.file_name} fetchUrl={fetchMediaUrl} />
                          )}
                          {isDocument && (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              background: 'rgba(0,0,0,0.06)', borderRadius: 8,
                              padding: '7px 10px', marginBottom: realBody ? 4 : 0,
                            }}>
                              <FileText size={18} color={WA_MID} style={{ flexShrink: 0 }} />
                              <span style={{
                                fontSize: 12, flex: 1, color: '#374151', fontWeight: 500,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>{m.file_name || 'Document'}</span>
                              <button
                                onClick={async () => {
                                  const url = await fetchMediaUrl(m.id);
                                  if (url) window.open(url, '_blank');
                                  else alert('File not yet available in storage.');
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 2 }}
                                aria-label="Download document"
                              >
                                <Download size={14} color={WA_MID} />
                              </button>
                            </div>
                          )}
                          {isVideo && (
                            <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', padding: '2px 0' }}>🎥 Video</div>
                          )}
                          {isInteractive && (
                            <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', padding: '2px 0' }}>📋 Interactive response</div>
                          )}
                          {!isMedia && !isInteractive && !realBody && (
                            <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', padding: '2px 0' }}>[{m.message_type || 'message'}]</div>
                          )}
                          {realBody && (
                            <div style={{
                              fontSize: 13.5, color: '#1f2937', lineHeight: 1.5,
                              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            }}>{realBody}</div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 2 }}>
                            <span style={{ fontSize: 10, color: '#9ca3af' }}>{formatBubbleTime(m.created_at)}</span>
                            {showTicks && <CheckCheck size={13} color={tickColor} />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div style={{
                padding: '8px 12px', background: '#f0f2f5',
                borderTop: '1px solid #e5e7eb', flexShrink: 0,
              }}>
                {sendError && (
                  <div style={{
                    marginBottom: 6, fontSize: 12, color: '#dc2626',
                    background: '#fef2f2', padding: '5px 10px', borderRadius: 6,
                  }}>
                    {sendError}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    disabled title="Emoji (coming soon)"
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'transparent', border: 'none', cursor: 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Smile size={22} color="#9ca3af" />
                  </button>
                  <button
                    disabled title="Attach file (coming soon)"
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'transparent', border: 'none', cursor: 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Paperclip size={22} color="#9ca3af" />
                  </button>

                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendText(selectedConversation.id);
                      }
                    }}
                    disabled={isTakenOverByOther}
                    placeholder={isTakenOverByOther ? 'Locked by another admin…' : 'Type a message'}
                    style={{
                      flex: 1, minWidth: 0,
                      padding: '9px 16px', borderRadius: 24,
                      border: 'none', background: '#fff',
                      fontSize: 14, outline: 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                  />

                  <button
                    onClick={() => sendText(selectedConversation.id)}
                    disabled={isTakenOverByOther || !draft.trim()}
                    style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: draft.trim() && !isTakenOverByOther ? WA_LIGHT : '#d1d5db',
                      border: 'none',
                      cursor: draft.trim() && !isTakenOverByOther ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s', flexShrink: 0,
                    }}
                    aria-label="Send message"
                  >
                    <Send size={18} color="#fff" />
                  </button>
                </div>

                {/* Template composer (shown when 24h window expired) */}
                {showTemplateComposer && !isTakenOverByOther && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name (approved)"
                      style={{
                        flex: 1, minWidth: 150, padding: '7px 12px', borderRadius: 8,
                        border: '1px solid #e5e7eb', fontSize: 13, outline: 'none',
                      }}
                    />
                    <input
                      value={templateLanguage}
                      onChange={(e) => setTemplateLanguage(e.target.value)}
                      placeholder="en_US"
                      style={{
                        width: 90, padding: '7px 10px', borderRadius: 8,
                        border: '1px solid #e5e7eb', fontSize: 13, outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => sendTemplate(selectedConversation.id)}
                      style={{
                        padding: '7px 16px', borderRadius: 8,
                        background: WA_MID, color: '#fff', border: 'none',
                        cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      }}
                    >
                      Send Template
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Desktop empty state */
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: '#f8fafc',
            }}>
              <div style={{ fontSize: 72, marginBottom: 16 }}>💬</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                WhatsApp Inbox
              </div>
              <div style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
                Select a conversation from the left to start messaging your candidates.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Book Appointment Modal ───────────────────────────────────────── */}
      {showBookModal && selectedConversationId && (
        <BookAppointmentModal
          candidateName={selectedTitle}
          form={apptForm}
          onChange={(updates) => setApptForm((f) => ({ ...f, ...updates }))}
          onClose={() => setShowBookModal(false)}
          onSubmit={() => sendAppointmentMessage(selectedConversationId)}
          sending={apptSending}
          sent={apptSent}
          error={apptError}
        />
      )}
    </>
  );
}

// ─── Book Appointment Modal ──────────────────────────────────────────────────

interface BookApptModalProps {
  candidateName: string;
  form: AppointmentForm;
  onChange: (updates: Partial<AppointmentForm>) => void;
  onClose: () => void;
  onSubmit: () => void;
  sending: boolean;
  sent: boolean;
  error: string | null;
}

function BookAppointmentModal({
  candidateName, form, onChange, onClose, onSubmit, sending, sent, error,
}: BookApptModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: `linear-gradient(135deg, ${WA_DARK}, ${WA_MID})`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CalendarClock size={19} color="#fff" />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Book Appointment</div>
              {candidateName && (
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>for {candidateName}</div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Close"
          >
            <X size={16} color="#fff" />
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '20px', display: 'flex', flexDirection: 'column', gap: 14,
          maxHeight: '72vh', overflowY: 'auto',
        }}>
          {/* Success state */}
          {sent && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 10 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#065f46' }}>Appointment confirmation sent!</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                WhatsApp message with the appointment details has been sent.
              </div>
            </div>
          )}

          {!sent && (
            <>
              {/* Type */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Appointment Type
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {APPT_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => onChange({ type: t })}
                      style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        border: `1.5px solid ${form.type === t ? WA_MID : '#e5e7eb'}`,
                        background: form.type === t ? WA_MID : '#f9fafb',
                        color: form.type === t ? '#fff' : '#374151',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date / Time / Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Date <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => onChange({ date: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 10,
                      border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Time <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => onChange({ time: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 10,
                      border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    value={form.durationMins}
                    onChange={(e) => onChange({ durationMins: Number(e.target.value) || 60 })}
                    min={5} step={15}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 10,
                      border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Location <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => onChange({ location: e.target.value })}
                  placeholder="Office address or video link"
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 10,
                    border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Notes <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  placeholder="Bring documents, prepare questions, etc."
                  rows={2}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 10,
                    border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none',
                    resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Info banner */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#166534',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>💬</span>
                <span>
                  A WhatsApp message with appointment details will be sent to the candidate.
                  Only works within the 24-hour conversation window.
                </span>
              </div>
            </>
          )}

          {error && (
            <div style={{
              background: '#fef2f2', border: '1.5px solid #fecaca',
              borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#dc2626',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {!sent && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid #f0f2f5',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px', borderRadius: 10,
                border: '1.5px solid #e5e7eb', background: '#fff',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={sending || !form.date || !form.time}
              style={{
                padding: '8px 18px', borderRadius: 10, border: 'none',
                background: sending || !form.date || !form.time ? '#d1d5db' : WA_MID,
                color: '#fff',
                cursor: sending || !form.date || !form.time ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <CalendarClock size={14} />
              {sending ? 'Sending…' : 'Send via WhatsApp'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
