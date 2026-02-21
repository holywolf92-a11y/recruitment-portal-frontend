import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../lib/apiClient';
import { useAuth, supabase } from '../lib/authContext';
import { ArrowLeft, CheckCheck, MoreVertical, Phone, Search, Send, Smile, Paperclip, Video } from 'lucide-react';

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
};

function formatListTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

async function fetchJson(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export function WhatsAppInbox() {
  const { session } = useAuth();

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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const authHeader = useMemo(() => {
    const token = session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }, [session?.access_token]);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return conversations.find((c) => c.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  const view = useMemo<'list' | 'chat'>(() => {
    return selectedConversationId ? 'chat' : 'list';
  }, [selectedConversationId]);

  const selectedTitle = useMemo(() => {
    if (!selectedConversation) return '';
    return selectedConversation.display_name || selectedConversation.candidate_name || selectedConversation.phone_number;
  }, [selectedConversation]);

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

  async function loadConversations() {
    if (!authHeader) return;
    setLoadingConversations(true);
    setLoadError(null);
    try {
      const data = await fetchJson(`${API_BASE_URL}/whatsapp-inbox/conversations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
      });
      setConversations((data?.conversations ?? []) as Conversation[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }

  async function loadMessages(conversationId: string) {
    if (!authHeader) return;
    setLoadingMessages(true);
    setLoadError(null);
    try {
      const data = await fetchJson(`${API_BASE_URL}/whatsapp-inbox/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
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
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
      });
      await loadConversations();
    } catch {
      // fail-open for UI
    }
  }

  async function takeOver(conversationId: string) {
    if (!authHeader) return;
    await fetchJson(`${API_BASE_URL}/whatsapp-inbox/conversations/${conversationId}/takeover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
    });
    await loadConversations();
  }

  async function returnToAI(conversationId: string) {
    if (!authHeader) return;
    await fetchJson(`${API_BASE_URL}/whatsapp-inbox/conversations/${conversationId}/return-to-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
    });
    await loadConversations();
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
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
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
    if (!name) {
      setSendError('Template name is required.');
      return;
    }

    setSendError(null);

    try {
      await fetchJson(`${API_BASE_URL}/whatsapp-inbox/conversations/${conversationId}/send-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({ templateName: name, language: templateLanguage || 'en_US' }),
      });
      setTemplateName('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSendError(msg);
    }
  }

  useEffect(() => {
    loadConversations();
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
    const scheduleRefresh = (conversationId?: string) => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        loadConversations();
        if (conversationId && selectedConversationId && conversationId === selectedConversationId) {
          loadMessages(selectedConversationId);
        }
      }, 250);
    };

    const channel = supabase
      .channel('whatsapp-inbox-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          const newMsg = payload.new as any;
          const convId = String(newMsg?.conversation_id || '');

          // Refresh list + open thread if affected.
          scheduleRefresh(convId);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          const newMsg = payload.new as any;
          const convId = String(newMsg?.conversation_id || '');

          // Update ticks/status changes etc.
          scheduleRefresh(convId);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_conversations' },
        () => {
          scheduleRefresh();
        }
      )
      .subscribe((status) => {
        // Helpful when diagnosing why realtime isn't updating.
        // eslint-disable-next-line no-console
        console.log('[WhatsAppInbox] Realtime status:', status);
      });

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, authHeader]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="h-[calc(100vh-73px-48px)] min-h-[520px] flex flex-col">
        {view === 'list' ? (
          <div className="flex-1 flex flex-col bg-white">
            <div className="px-4 py-3 border-b border-gray-200 bg-emerald-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">WhatsApp Inbox</h2>
                  <p className="text-xs text-emerald-100">Conversations</p>
                </div>
                <div className="flex items-center gap-2">
                  {loadingConversations && <span className="text-xs text-emerald-100">Loading...</span>}
                  <button
                    type="button"
                    className="p-2 rounded-md hover:bg-emerald-700/40"
                    aria-label="Search"
                    disabled
                    title="Search (not implemented)"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-md hover:bg-emerald-700/40"
                    aria-label="Menu"
                    disabled
                    title="Menu (not implemented)"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {loadError && <div className="mt-2 text-xs text-red-100 break-words">{loadError}</div>}
            </div>

            <div className="flex-1 overflow-auto">
              {conversations.length === 0 && !loadingConversations ? (
                <div className="p-6 text-sm text-gray-500">No conversations yet.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {conversations.map((c) => {
                    const title = c.display_name || c.candidate_name || c.phone_number;
                    const avatar = initialsFromName(title);
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedConversationId(c.id)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-700">
                            {avatar}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
                              <div className="text-xs text-gray-500 shrink-0">{formatListTime(c.last_message_at)}</div>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <div className="min-w-0">
                                <div className="text-xs text-gray-500 truncate">{c.last_message_preview || ''}</div>
                                {c.reply_mode === 'human' && (c.taken_over_by_name || c.taken_over_by) && (
                                  <div className="text-[11px] text-orange-700 truncate">
                                    Taken by: {c.taken_over_by_name || 'Another admin'}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {c.unread_count > 0 && (
                                  <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                                    {c.unread_count}
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                    c.reply_mode === 'ai'
                                      ? 'border-purple-200 text-purple-700 bg-purple-50'
                                      : 'border-orange-200 text-orange-700 bg-orange-50'
                                  }`}
                                >
                                  {c.reply_mode === 'ai' ? 'AI' : 'Human'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : !selectedConversation ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Loading…</div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 bg-emerald-600 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedConversationId(null)}
                  className="px-2 py-2 rounded-md hover:bg-emerald-700/40 flex items-center gap-1"
                  aria-label="Back"
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-xs">Back</span>
                </button>

                <div className="w-10 h-10 rounded-full bg-emerald-700/40 flex items-center justify-center text-xs font-semibold">
                  {initialsFromName(selectedTitle)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{selectedTitle}</div>
                  <div className="text-xs text-emerald-100 truncate">
                    {selectedConversation.candidate_name
                      ? `Candidate: ${selectedConversation.candidate_name}`
                      : selectedConversation.phone_number}
                  </div>
                  {takeoverLabel && (
                    <div className="text-[11px] text-emerald-100 mt-0.5">Human takeover by: {takeoverLabel}</div>
                  )}
                  {isTakenOverByOther && (
                    <div className="text-[11px] text-orange-100 mt-0.5">Sending disabled (taken over).</div>
                  )}
                </div>
                </div>

                <div className="flex items-center justify-end gap-1 flex-wrap">
                <button
                  type="button"
                  className="p-2 rounded-md hover:bg-emerald-700/40"
                  aria-label="Video"
                  disabled
                  title="Video (not implemented)"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-md hover:bg-emerald-700/40"
                  aria-label="Call"
                  disabled
                  title="Call (not implemented)"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-md hover:bg-emerald-700/40"
                  aria-label="Search"
                  disabled
                  title="Search (not implemented)"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-md hover:bg-emerald-700/40"
                  aria-label="Menu"
                  disabled
                  title="Menu (not implemented)"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-emerald-200/30 mx-1" />

                {selectedConversation.reply_mode === 'ai' ? (
                  <button
                    onClick={() => takeOver(selectedConversation.id)}
                    disabled={isTakenOverByOther}
                    className="px-3 py-1.5 text-xs rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50"
                  >
                    Take Over
                  </button>
                ) : (
                  <button
                    onClick={() => returnToAI(selectedConversation.id)}
                    disabled={isTakenOverByOther}
                    className="px-3 py-1.5 text-xs rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50"
                  >
                    Return to AI
                  </button>
                )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-emerald-50/40">
              {loadingMessages ? (
                <div className="text-sm text-gray-500">Loading messages...</div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m) => {
                    const isInbound = m.direction === 'inbound';
                    const bubbleStyle = isInbound
                      ? 'bg-white border border-gray-200 text-gray-900'
                      : m.direction === 'ai'
                        ? 'bg-purple-50 border border-purple-200 text-gray-900'
                        : 'bg-emerald-100 text-gray-900';

                    const showTicks = !isInbound && m.direction !== 'ai';
                    const tickColor = m.status === 'read' ? 'text-emerald-600' : 'text-gray-400';

                    return (
                      <div key={m.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow-sm ${bubbleStyle}`}>
                          <div className="whitespace-pre-wrap break-words leading-5">{m.body || ''}</div>
                          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-gray-500">
                            <span>{formatBubbleTime(m.created_at)}</span>
                            {showTicks && <CheckCheck className={`w-3.5 h-3.5 ${tickColor}`} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 bg-white p-3">
              {sendError && <div className="mb-2 text-xs text-red-600">{sendError}</div>}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-gray-100"
                  aria-label="Emoji"
                  disabled
                  title="Emoji (not implemented)"
                >
                  <Smile className="w-5 h-5 text-gray-500" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-gray-100"
                  aria-label="Attach"
                  disabled
                  title="Attach (not implemented)"
                >
                  <Paperclip className="w-5 h-5 text-gray-500" />
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
                  className="flex-1 bg-gray-100 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Type a message"
                />

                <button
                  onClick={() => sendText(selectedConversation.id)}
                  disabled={isTakenOverByOther}
                  className="p-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  aria-label="Send"
                  title="Send"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {showTemplateComposer && !isTakenOverByOther && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Template name (approved)"
                  />
                  <input
                    value={templateLanguage}
                    onChange={(e) => setTemplateLanguage(e.target.value)}
                    className="w-[110px] border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="en_US"
                  />
                  <button
                    onClick={() => sendTemplate(selectedConversation.id)}
                    className="px-4 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
                  >
                    Send Template
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
