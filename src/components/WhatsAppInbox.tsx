import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../lib/apiClient';
import { useAuth, supabase } from '../lib/authContext';

type ReplyMode = 'ai' | 'human';

type Conversation = {
  id: string;
  phone_number: string;
  display_name: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  reply_mode: ReplyMode;
  taken_over_by: string | null;
  taken_over_at: string | null;
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

  const isTakenOverByOther = useMemo(() => {
    if (!selectedConversation) return false;
    if (selectedConversation.reply_mode !== 'human') return false;
    if (!selectedConversation.taken_over_by) return false;
    const myUserId = session?.user?.id;
    return !!myUserId && selectedConversation.taken_over_by !== myUserId;
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
    const channel = supabase
      .channel('whatsapp-inbox-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          const newMsg = payload.new as any;
          const convId = String(newMsg?.conversation_id || '');

          // Keep it simple and consistent: refresh conversations; refresh open thread if affected.
          loadConversations();
          if (selectedConversationId && convId === selectedConversationId) {
            loadMessages(selectedConversationId);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_conversations' },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, authHeader]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex h-[calc(100vh-73px-48px)] min-h-[520px]">
        {/* Conversation List */}
        <div className="w-[340px] border-r border-gray-200 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">WhatsApp Inbox</h2>
                <p className="text-xs text-gray-500">Conversations</p>
              </div>
              {loadingConversations && (
                <span className="text-xs text-gray-400">Loading...</span>
              )}
            </div>
            {loadError && (
              <div className="mt-2 text-xs text-red-600 break-words">{loadError}</div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {conversations.length === 0 && !loadingConversations ? (
              <div className="p-4 text-sm text-gray-500">No conversations yet.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {conversations.map((c) => {
                  const isActive = c.id === selectedConversationId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConversationId(c.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                        isActive ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {c.display_name || c.phone_number}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {c.last_message_preview || ''}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {c.unread_count > 0 && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
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
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {selectedConversation.display_name || selectedConversation.phone_number}
                  </div>
                  <div className="text-xs text-gray-500">
                    Mode: {selectedConversation.reply_mode === 'ai' ? 'AI auto-replies' : 'Human takeover'}
                  </div>
                  {isTakenOverByOther && (
                    <div className="text-xs text-orange-700 mt-1">
                      Taken over by another admin. Sending disabled.
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedConversation.reply_mode === 'ai' ? (
                    <button
                      onClick={() => takeOver(selectedConversation.id)}
                      disabled={isTakenOverByOther}
                      className="px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50"
                    >
                      Take Over
                    </button>
                  ) : (
                    <button
                      onClick={() => returnToAI(selectedConversation.id)}
                      disabled={isTakenOverByOther}
                      className="px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50"
                    >
                      Return to AI
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 bg-gray-50">
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
                          : 'bg-blue-600 text-white';

                      return (
                        <div
                          key={m.id}
                          className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${bubbleStyle}`}>
                            <div className="whitespace-pre-wrap break-words">{m.body || ''}</div>
                            <div className={`mt-1 text-[10px] ${isInbound ? 'text-gray-400' : m.direction === 'ai' ? 'text-purple-700' : 'text-blue-100'}`}>
                              {new Date(m.created_at).toLocaleString()} • {m.status}
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
                {sendError && (
                  <div className="mb-2 text-xs text-red-600">{sendError}</div>
                )}

                <div className="flex items-center gap-2">
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
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type a message..."
                  />
                  <button
                    onClick={() => sendText(selectedConversation.id)}
                    disabled={isTakenOverByOther}
                    className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Send
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
