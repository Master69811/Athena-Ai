'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { coachApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Send, Brain, User, Sparkles, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Message {
  id?: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: Date;
  streaming?: boolean;
}

export default function CoachPage() {
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const { data: suggestions } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn: coachApi.getSuggestions,
    select: (res: any) => res.data as string[],
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text?: string) => {
    const content = text || message.trim();
    if (!content || isStreaming) return;

    setMessage('');
    setIsStreaming(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'USER', content, createdAt: new Date() }]);

    // Add placeholder for AI response
    const placeholderId = `streaming-${Date.now()}`;
    setMessages(prev => [...prev, { id: placeholderId, role: 'ASSISTANT', content: '', createdAt: new Date(), streaming: true }]);

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    abortRef.current = new AbortController();

    try {
      const response = await fetch(`${API_URL}/api/v1/ai-coach/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: content, conversationId }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentConvId = conversationId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.conversationId) {
              currentConvId = data.conversationId;
              setConversationId(data.conversationId);
            }

            if (data.text) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === placeholderId
                    ? { ...m, content: m.content + data.text }
                    : m,
                ),
              );
            }

            if (data.done) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === placeholderId ? { ...m, streaming: false } : m,
                ),
              );
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
            }

            if (data.error) throw new Error(data.error);
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages(prev =>
        prev.map(m =>
          m.id === placeholderId
            ? { ...m, content: 'Si è verificato un errore. Riprova.', streaming: false }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [message, conversationId, isStreaming, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    if (abortRef.current) abortRef.current.abort();
    setConversationId(undefined);
    setMessages([]);
    setIsStreaming(false);
  };

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-foreground">Athena — AI Coach</h2>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', isStreaming ? 'bg-accent animate-pulse' : 'bg-success animate-pulse')} />
            <span className="text-xs text-muted-foreground">
              {isStreaming ? 'Rispondo...' : 'Online · Pronto ad aiutarti'}
            </span>
          </div>
        </div>
        <button
          onClick={startNewChat}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuova chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 no-scrollbar">

        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-lg mb-2">Ciao! Sono Athena</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Il tuo coach AI di élite. Chiedimi qualsiasi cosa su allenamento, nutrizione, recupero o tecnica.
            </p>
            {suggestions && suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">DOMANDE FREQUENTI</p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted text-left text-sm text-foreground transition-colors group"
                    >
                      <span className="flex-1">{s}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id ?? `${msg.role}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3', msg.role === 'USER' ? 'flex-row-reverse' : 'flex-row')}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1',
                msg.role === 'USER' ? 'bg-primary' : 'bg-gradient-to-br from-primary to-accent',
              )}>
                {msg.role === 'USER' ? <User className="w-4 h-4 text-white" /> : <Brain className="w-4 h-4 text-white" />}
              </div>

              <div className={cn(
                'max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                msg.role === 'USER'
                  ? 'bg-primary text-white rounded-tr-sm'
                  : 'bg-surface-elevated text-foreground border border-border rounded-tl-sm',
              )}>
                {msg.role === 'USER' ? (
                  <span>{msg.content}</span>
                ) : msg.content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                      li: ({ children }) => <li className="text-sm">{children}</li>,
                      h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-2.5 first:mt-0 text-primary">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                      code: ({ children, className }) => {
                        const isBlock = className?.includes('language-');
                        return isBlock ? (
                          <pre className="bg-muted rounded-lg p-3 my-2 overflow-x-auto text-xs"><code>{children}</code></pre>
                        ) : (
                          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                        );
                      },
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground my-2">{children}</blockquote>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : null}

                {msg.streaming && (
                  <span className="inline-flex gap-0.5 ml-1">
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 bg-primary/60 rounded-full inline-block"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
                      />
                    ))}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator when waiting for first chunk */}
        {isStreaming && messages[messages.length - 1]?.role === 'USER' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="bg-surface-elevated border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-2 h-2 bg-primary rounded-full"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3 pt-3 border-t border-border">
        <textarea
          ref={inputRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Chiedi al tuo coach AI..."
          rows={1}
          disabled={isStreaming}
          className="flex-1 bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none transition-all duration-200 max-h-32 disabled:opacity-60"
          style={{ minHeight: '48px' }}
          onInput={e => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 128) + 'px';
          }}
        />
        <Button
          variant="gradient"
          size="icon"
          onClick={() => sendMessage()}
          disabled={!message.trim() || isStreaming}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
