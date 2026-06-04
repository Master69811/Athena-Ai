'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { coachApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Send, Brain, User, Sparkles, ChevronRight, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    select: (res: any) => res.data as string[],
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
    chatMutation.mutate({ message: content, conversationId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">Online · Pronto ad aiutarti</span>
          </div>
        </div>
        <button
          onClick={() => { setConversationId(undefined); setMessages([]); }}
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
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3', msg.role === 'USER' ? 'flex-row-reverse' : 'flex-row')}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1', msg.role === 'USER' ? 'bg-primary' : 'bg-gradient-to-br from-primary to-accent')}>
                {msg.role === 'USER' ? <User className="w-4 h-4 text-white" /> : <Brain className="w-4 h-4 text-white" />}
              </div>
              <div className={cn('max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed', msg.role === 'USER' ? 'bg-primary text-white rounded-tr-sm' : 'bg-surface-elevated text-foreground border border-border rounded-tl-sm')}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
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
          className="flex-1 bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none transition-all duration-200 max-h-32"
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
          disabled={!message.trim() || chatMutation.isPending}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
