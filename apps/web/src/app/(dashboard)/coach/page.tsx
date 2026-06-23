'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coachApi } from '@/lib/api';
import { Plus } from 'lucide-react';

/* ─── Keyframes ─── */
const KEYFRAMES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes logoPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,.45); }
    50%       { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
  }
  @keyframes blink {
    0%, 80%, 100% { transform: scale(0.6); opacity: .4; }
    40%            { transform: scale(1);   opacity: 1; }
  }
`;

const SUGGESTIONS_FALLBACK = [
  'Perché il mio recovery è basso?',
  'Quanta proteina mi serve oggi?',
  'Cambia la panca con i manubri',
];

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

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
    onError: () => setIsTyping(false),
  });

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeSuggestions = (suggestions ?? []).length > 0 ? suggestions! : SUGGESTIONS_FALLBACK;

  return (
    <>
      <style>{KEYFRAMES}</style>

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
          background: '#111118',
          border: '1px solid rgba(99,102,241,.2)',
          borderRadius: 16,
          boxShadow: '0 0 40px rgba(99,102,241,.08)',
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
            fontSize: 17, fontWeight: 800, color: '#fff',
            animation: 'logoPulse 2.4s ease infinite',
            flexShrink: 0,
          }}>A</div>

          {/* Name + status */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e7e7ee', lineHeight: 1.2 }}>Athena</div>
            <div style={{ fontSize: 12, color: '#22c55e', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
              Online · conosce tutto il tuo profilo
            </div>
          </div>

          {/* New chat */}
          <button
            onClick={() => { setConversationId(undefined); setMessages([]); }}
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: '#a1a1b5',
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
                fontSize: 28,
                boxShadow: '0 8px 32px rgba(99,102,241,.3)',
              }}>✨</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#e7e7ee', marginBottom: 8 }}>Ciao! Sono Athena</div>
              <div style={{ fontSize: 13, color: '#a1a1b5', maxWidth: 320, margin: '0 auto 28px', lineHeight: 1.6 }}>
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
                    fontSize: 13, fontWeight: 800, color: '#fff',
                  }}>A</div>
                )}

                {/* Bubble */}
                <div style={isUser ? {
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  borderRadius: '16px 16px 4px 16px',
                  padding: '13px 16px',
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: '#fff',
                  maxWidth: '74%',
                } : {
                  background: '#15151d',
                  border: '1px solid #1e1e2e',
                  borderRadius: '16px 16px 16px 4px',
                  padding: '13px 16px',
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: '#e7e7ee',
                  maxWidth: '74%',
                }}>
                  {msg.content}
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
                fontSize: 13, fontWeight: 800, color: '#fff',
              }}>A</div>
              <div style={{
                background: '#15151d',
                border: '1px solid #1e1e2e',
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
                  style={{
                    fontSize: 12.5,
                    color: '#a1a1b5',
                    background: '#15151d',
                    border: '1px solid #1e1e2e',
                    padding: '8px 13px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'border-color .2s, color .2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.color = '#e7e7ee';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#1e1e2e';
                    e.currentTarget.style.color = '#a1a1b5';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div style={{
            background: '#111118',
            border: '1px solid #1e1e2e',
            borderRadius: 15,
            padding: '8px 8px 8px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
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
                color: '#e7e7ee',
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
                  ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                  : '#1a1a24',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: message.trim() && !chatMutation.isPending ? '#fff' : '#6b7280',
                cursor: message.trim() && !chatMutation.isPending ? 'pointer' : 'default',
                transition: 'background .2s, color .2s',
              }}
            >
              <SendIcon />
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
