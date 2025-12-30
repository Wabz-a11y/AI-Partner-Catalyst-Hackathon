import { Mic, PhoneOff, Volume2, User } from 'lucide-react';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { cn } from '@/lib/utils';
import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';

// Brenda avatar image
const BrendaAvatar = () => (
  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center shadow-lg">
    <span className="text-2xl">🧠</span>
  </div>
);

interface VoiceAgentPanelProps {
  profession?: string;
  compact?: boolean;
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected') => void;
  onConversationUpdate?: (messages: Array<{ role: string; content: string; timestamp: Date }>) => void;
}

export interface VoiceAgentPanelRef {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  status: 'disconnected' | 'connecting' | 'connected';
}

export const VoiceAgentPanel = forwardRef<VoiceAgentPanelRef, VoiceAgentPanelProps>(
  ({ profession, compact = false, onStatusChange, onConversationUpdate }, ref) => {
    const {
      status,
      isSpeaking,
      messages,
      error,
      startConversation,
      stopConversation,
      isConnecting,
    } = useVoiceAgent();

    const startRef = useRef(startConversation);
    const stopRef = useRef(stopConversation);
    startRef.current = startConversation;
    stopRef.current = stopConversation;

    useImperativeHandle(ref, () => ({
      start: () => startRef.current(profession),
      stop: () => stopRef.current(),
      status,
    }), [profession, status]);

    // Notify parent of status changes
    useEffect(() => {
      if (onStatusChange) {
        onStatusChange(status);
      }
    }, [status, onStatusChange]);

    // Notify parent of conversation updates
    useEffect(() => {
      if (onConversationUpdate && messages.length > 0) {
        onConversationUpdate(messages);
      }
    }, [messages, onConversationUpdate]);

    const handleToggle = async () => {
      if (status === 'connected') {
        await stopConversation();
      } else if (status === 'disconnected') {
        await startConversation(profession);
      }
    };

    if (compact) {
      return (
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            disabled={isConnecting}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
              status === 'connected' 
                ? 'bg-destructive hover:bg-destructive/80' 
                : 'btn-primary',
              isConnecting && 'opacity-50 cursor-wait'
            )}
          >
            {status === 'connected' ? (
              <PhoneOff className="w-5 h-5" />
            ) : isConnecting ? (
              <div className="w-5 h-5 border-2 border-t-transparent border-current rounded-full animate-spin" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
          
          {isSpeaking && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span>Brenda is speaking...</span>
            </div>
          )}
          
          {error && (
            <span className="text-sm text-destructive">{error}</span>
          )}
        </div>
      );
    }

    return (
      <div className="card-glass flex flex-col h-full">
        {/* Recording indicator at top */}
        {status === 'connected' && (
          <div className="flex items-center justify-center gap-2 py-3 border-b border-border bg-destructive/10">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium text-destructive">Recording</span>
          </div>
        )}

        {/* Status indicator */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <BrendaAvatar />
            <div>
              <h3 className="font-semibold">Brenda</h3>
              <span className="text-xs text-muted-foreground">
                {status === 'connected' ? 'In conversation' :
                 status === 'connecting' ? 'Connecting...' :
                 'Ready to talk'}
              </span>
            </div>
          </div>
          {status === 'connected' && (
            <span className="flex items-center gap-1 text-xs text-success px-2 py-1 rounded-full bg-success/10">
              <span className="live-dot" />
              Live
            </span>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Conversation area with speaker indicators */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[200px]">
          {messages.length === 0 && status !== 'connected' && (
            <div className="text-center text-muted-foreground py-8">
              <p>Click the button below to start talking with Brenda</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                'flex gap-3 items-start',
                msg.role === 'user' && 'flex-row-reverse'
              )}
            >
              {/* Speaker avatar */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                msg.role === 'assistant' 
                  ? 'bg-gradient-to-br from-primary to-accent' 
                  : msg.role === 'user'
                    ? 'bg-accent'
                    : 'bg-muted'
              )}>
                {msg.role === 'assistant' ? (
                  <span className="text-xs">🧠</span>
                ) : msg.role === 'user' ? (
                  <User className="w-4 h-4 text-accent-foreground" />
                ) : (
                  <span className="text-xs">⚙️</span>
                )}
              </div>
              
              {/* Message bubble */}
              <div className={cn(
                'flex-1 max-w-[80%]',
                msg.role === 'user' && 'text-right'
              )}>
                <span className={cn(
                  'text-xs font-medium mb-1 block',
                  msg.role === 'assistant' ? 'text-primary' : 
                  msg.role === 'user' ? 'text-accent' : 'text-muted-foreground'
                )}>
                  {msg.role === 'assistant' ? 'Brenda' :
                   msg.role === 'user' ? 'You' : 'System'}
                </span>
                <div className={cn(
                  'inline-block rounded-2xl px-4 py-2 text-sm',
                  msg.role === 'assistant' 
                    ? 'bg-primary/10 text-foreground rounded-tl-sm' 
                    : msg.role === 'user'
                      ? 'bg-accent/10 text-foreground rounded-tr-sm'
                      : 'bg-muted/50 text-muted-foreground'
                )}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          
          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-xs">🧠</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-2xl rounded-tl-sm">
                <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Brenda button at bottom */}
        <div className="p-4 border-t border-border/50">
          <button
            onClick={handleToggle}
            disabled={isConnecting}
            className={cn(
              'w-full py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3',
              status === 'connected'
                ? 'bg-destructive hover:bg-destructive/80 text-destructive-foreground'
                : 'btn-success',
              isConnecting && 'opacity-50 cursor-wait'
            )}
          >
            {status === 'connected' ? (
              <>
                <PhoneOff className="w-5 h-5" />
                End Conversation
              </>
            ) : isConnecting ? (
              <>
                <div className="w-5 h-5 border-2 border-t-transparent border-current rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <BrendaAvatar />
                <span>Talk to Brenda</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
);

VoiceAgentPanel.displayName = 'VoiceAgentPanel';