/**
 * pages/Messages/index.jsx — Per-Trade Direct Messaging
 *
 * A conversation opens automatically the instant a trade is accepted —
 * either a cash trade request or a no-money chain swap — so the two
 * sides can coordinate the session. It closes automatically (and its
 * history is deleted) the instant that trade fully settles: full payment
 * for a cash trade, or both sides confirming a chain swap. A member can
 * be in many conversations at once — one per active trade, shown as a
 * normal two-pane inbox, never a single merged thread per person.
 */

import { useEffect, useRef, useState } from 'react';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { getInitials } from '../../utils/formatters';

const RELATED_TYPE_LABELS = { TradeProposal: 'Trade', ChainSwap: 'Chain Swap' };

const CONVERSATIONS_POLL_MS = 8000;
const MESSAGES_POLL_MS = 4000;

const formatTime = iso =>
  new Date(iso).toLocaleTimeString('en-BD', { hour: 'numeric', minute: '2-digit' });

const ConversationListItem = ({ conversation, isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-start gap-3 border-b border-concrete-200 p-4 text-left transition-colors ${
      isActive ? 'bg-navy-50' : 'hover:bg-concrete-50'
    }`}
  >
    <Avatar initials={getInitials(conversation.counterparty?.name)} src={conversation.counterparty?.avatar || undefined} size="sm" />
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-slate-950">{conversation.counterparty?.name || 'Unknown'}</p>
        <Badge color="gray">{RELATED_TYPE_LABELS[conversation.relatedType] || conversation.relatedType}</Badge>
      </div>
      <p className="mt-0.5 truncate text-xs text-steel-500">{conversation.listingTitle}</p>
      {conversation.lastMessagePreview && (
        <p className="mt-1 truncate text-xs text-steel-600">{conversation.lastMessagePreview}</p>
      )}
    </div>
  </button>
);

const MessageBubble = ({ message, isMine }) => (
  <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMine ? 'bg-navy-900 text-white' : 'bg-concrete-100 text-slate-950'}`}>
      <p className="whitespace-pre-wrap break-words">{message.text}</p>
      <p className={`mt-1 text-[10px] ${isMine ? 'text-white/60' : 'text-steel-500'}`}>{formatTime(message.createdAt)}</p>
    </div>
  </div>
);

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadConversations = () => {
    api
      .get('/conversations/mine')
      .then(res => setConversations(res.data.data))
      .catch(() => setConversations([]))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    loadConversations();
    api.patch('/notifications/read-all', {}, { params: { category: 'message' } }).catch(() => {});
    const interval = setInterval(loadConversations, CONVERSATIONS_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const loadMessages = id => {
    setLoadingMessages(true);
    api
      .get(`/conversations/${id}/messages`)
      .then(res => {
        setMessages(res.data.data);
        setConversationEnded(false);
      })
      .catch(err => {
        if (err.response?.status === 404) {
          setConversationEnded(true);
          setMessages([]);
        }
      })
      .finally(() => setLoadingMessages(false));
  };

  useEffect(() => {
    if (!activeId) {return;}
    loadMessages(activeId);
    const interval = setInterval(() => loadMessages(activeId), MESSAGES_POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelect = id => {
    setActiveId(id);
    setConversationEnded(false);
    setMessages([]);
  };

  const handleSend = async e => {
    e.preventDefault();
    if (!draft.trim() || !activeId || sending) {return;}
    setSending(true);
    try {
      await api.post(`/conversations/${activeId}/messages`, { text: draft.trim() });
      setDraft('');
      loadMessages(activeId);
      loadConversations();
    } catch (err) {
      if (err.response?.status === 404) {setConversationEnded(true);}
    } finally {
      setSending(false);
    }
  };

  const activeConversation = conversations.find(c => c._id === activeId);

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow mb-2">Communication</span>
        <h1 className="text-3xl font-semibold text-slate-950">Messages</h1>
        <p className="mt-2 text-sm text-steel-600">
          Message the other side of an accepted trade or chain swap. A conversation closes
          automatically once that trade is fully settled.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* ── Conversation list ─────────────────────────────────────────── */}
        <Card className={`overflow-hidden p-0 ${activeId ? 'hidden lg:block' : ''}`}>
          <div className="border-b border-concrete-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">Conversations</h2>
          </div>
          {loadingList ? (
            <p className="p-4 text-sm text-steel-500">Loading…</p>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-steel-500">
              No active conversations. Accepting a trade request or a chain swap opens one
              automatically.
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              {conversations.map(c => (
                <ConversationListItem
                  key={c._id}
                  conversation={c}
                  isActive={c._id === activeId}
                  onClick={() => handleSelect(c._id)}
                />
              ))}
            </div>
          )}
        </Card>

        {/* ── Active thread ─────────────────────────────────────────────── */}
        <Card className={`flex min-h-[500px] flex-col p-0 ${!activeId ? 'hidden lg:flex' : 'flex'}`}>
          {!activeId ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-steel-500">
              Select a conversation to start messaging.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-concrete-200 px-4 py-3">
                <button type="button" className="text-steel-500 hover:text-navy-900 lg:hidden" onClick={() => setActiveId(null)}>
                  ← Back
                </button>
                <Avatar
                  initials={getInitials(activeConversation?.counterparty?.name)}
                  src={activeConversation?.counterparty?.avatar || undefined}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {activeConversation?.counterparty?.name || 'Unknown'}
                  </p>
                  <p className="truncate text-xs text-steel-500">{activeConversation?.listingTitle}</p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingMessages && messages.length === 0 ? (
                  <p className="text-sm text-steel-500">Loading messages…</p>
                ) : conversationEnded ? (
                  <div className="rounded-md border border-concrete-200 bg-concrete-50 p-4 text-center text-sm text-steel-600">
                    This conversation has ended — the trade is fully settled.
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-steel-500">No messages yet — say hello!</p>
                ) : (
                  messages.map(m => (
                    <MessageBubble key={m._id} message={m} isMine={m.sender?._id === user?.id} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {!conversationEnded && (
                <form onSubmit={handleSend} className="flex gap-2 border-t border-concrete-200 p-3">
                  <input
                    type="text"
                    className="input-base flex-1"
                    placeholder="Type a message…"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    maxLength={2000}
                  />
                  <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
                    {sending ? 'Sending…' : 'Send'}
                  </Button>
                </form>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Messages;
