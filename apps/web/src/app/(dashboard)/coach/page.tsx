'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coachApi } from '@/lib/api';
import { Plus, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const SUGGESTIONS_FALLBACK = [
  'Perché il mio recovery è basso?',
  'Quanta proteina mi serve oggi?',
  'Cambia la panca con i manubri',
];

export default function CoachPage() {
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: suggestions } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn: coachApi.getSuggestions,
    select: (res: any) => (Array.isArray(res?.data) ? res.data : null) as string[] | null,
  });

  const chatMutation = useMutation({
    mutationFn: coachApi.chat,
    onMutate: () => setIsTyping(true),
    onSuccess: (res: any) => {
      setConversationId(res.data.conversationId);
      setMessages(prev => [...prev, res.data.message]);
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (_err: any, variables: any) => {
      setIsTyping(false);
      toast.error('Messaggio non inviato, riprova');
      // Mark the failed user message so we can offer a retry affordance,
      // and fall back to restoring the text into the input if we can't find it.
      let marked = false;
      setMessages(prev => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === 'USER' && next[i].content === variables?.message && !next[i].failed) {
            next[i] = { ...next[i], failed: true };
            marked = true;
            break;
          }
        }
        return next;
      });
      if (!marked && variables?.message) {
        setMessage(variables.message);
      }
    },
  });

  // Hydrate the chat from the most recent persisted conversation on mount,
  // so navigating away and back (or refreshing) doesn't reset to the empty
  // welcome screen when a conversation already exists server-side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const listRes = await coachApi.getConversations();
        const conversations = listRes?.data;
        if (cancelled || !Array.isArray(conversations) || conversations.length === 0) return;
        const latest = conversations[0];
        const convRes = await coachApi.getConversation(latest.id);
        const conversation = convRes?.data;
        if (cancelled || !conversation?.messages?.length) return;
        setConversationId(conversation.id);
        setMessages(conversation.messages);
      } catch {
        // No persisted conversation available (or request failed) — fall back
        // to the empty welcome state, which is already the initial state.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = (text?: string) => {
    const content = text || message.trim();
    if (!content) return;
    setMessages(prev => [...prev, { role: 'USER', content, createdAt: new Date() }]);
    setMessage('');
    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = 'auto';
    chatMutation.mutate({ message: content, conversationId });
  };

  const retryMessage = (content: string) => {
    setMessages(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'USER' && next[i].content === content && next[i].failed) {
          next[i] = { ...next[i], failed: false };
          break;
        }
      }
      return next;
    });
    chatMutation.mutate({ message: content, conversationId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeSuggestions = (suggestions ?? []).length > 0 ? suggestions! : SUGGESTIONS_FALLBACK;

  return (
    <>
      <div style={{
        maxWidth: 820,
        margin: '0 auto',
        height: 'calc(100vh - 68px - 64px)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeUp .4s ease',
      }}>

        {/* ── Presence header ── */}
        <div style={{
          flexShrink: 0,
          padding: '14px 18px',
          background: 'hsl(var(--surface))',
          border: '1px solid rgba(99,102,241,.2)',
          borderRadius: 16,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          {/* Avatar */}
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 700, color: '#fff',
            flexShrink: 0,
          }}>A</div>

          {/* Name + status */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--foreground))', lineHeight: 1.2 }}>Athena</div>
            <div className="text-success" style={{ fontSize: 12, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="bg-success" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%' }} />
              Online
            </div>
          </div>

          {/* New chat */}
          <button
            onClick={() => { setConversationId(undefined); setMessages([]); }}
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: 'hsl(var(--content-secondary))',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Plus size={13} />
            Nuova chat
          </button>
        </div>

        {/* ── Chat area ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: '8px 4px 20px',
        }}>

          {/* Empty state */}
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 48, animation: 'fadeUp .4s ease' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
              }}>
                <Sparkles size={28} color="#fff" />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 8 }}>Ciao! Sono Athena</div>
              <div style={{ fontSize: 13, color: 'hsl(var(--content-secondary))', maxWidth: 320, margin: '0 auto 28px', lineHeight: 1.6 }}>
                Il tuo coach AI di élite. Chiedimi qualsiasi cosa su allenamento, nutrizione, recupero o tecnica.
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => {
            const isUser = msg.role === 'USER';
            return (
              <div key={msg.id ?? `${msg.role}-${i}`} style={{
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: 10,
                animation: 'fadeUp .3s ease',
              }}>
                {/* Avatar */}
                {!isUser && (
                  <div style={{
                    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff',
                  }}>A</div>
                )}

                {/* Bubble (+ failed/retry affordance) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 5, maxWidth: '74%' }}>
                  <div
                    className={isUser ? undefined : 'card-inner'}
                    style={isUser ? {
                      background: 'hsl(var(--primary))',
                      borderRadius: '16px 16px 4px 16px',
                      padding: '13px 16px',
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: '#fff',
                      opacity: msg.failed ? .6 : 1,
                    } : {
                      borderRadius: '16px 16px 16px 4px',
                      padding: '13px 16px',
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: 'hsl(var(--foreground))',
                    }}>
                    {msg.content}
                  </div>
                  {isUser && msg.failed && (
                    <button
                      onClick={() => retryMessage(msg.content)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: 'hsl(var(--destructive))',
                        cursor: 'pointer',
                      }}
                    >
                      Non inviato — tocca per riprovare
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
              }}>A</div>
              <div className="card-inner" style={{
                borderRadius: '16px 16px 16px 4px',
                padding: '13px 16px',
                display: 'flex', gap: 5, alignItems: 'center',
              }}>
                {[0, 1, 2].map(idx => (
                  <span key={idx} style={{
                    display: 'inline-block',
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#6366f1',
                    animation: `blink 1.2s ease infinite`,
                    animationDelay: `${idx * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Footer ── */}
        <div style={{ flexShrink: 0 }}>

          {/* Suggestion chips — show only when no messages yet */}
          {messages.length === 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {activeSuggestions.slice(0, 3).map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="chip hover:border-primary/40"
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div
            className="rounded-2xl border border-border-strong focus-within:border-primary/50"
            style={{
              background: 'hsl(var(--surface))',
              padding: '8px 8px 8px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              transition: 'border-color .15s',
            }}
          >
            <textarea
              ref={inputRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Chiedi ad Athena…"
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: 14,
                color: 'hsl(var(--foreground))',
                lineHeight: 1.5,
                minHeight: 24,
                maxHeight: 128,
                padding: 0,
              }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 128) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!message.trim() || chatMutation.isPending}
              style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: message.trim() && !chatMutation.isPending
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--surface-3))',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: message.trim() && !chatMutation.isPending ? '#fff' : 'hsl(var(--content-tertiary))',
                cursor: message.trim() && !chatMutation.isPending ? 'pointer' : 'default',
                transition: 'background .2s, color .2s',
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
