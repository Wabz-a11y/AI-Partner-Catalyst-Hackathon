import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Mic, PhoneOff, Volume2, User, MessageSquare } from 'lucide-react';

interface VoiceAgentProps {
  onTranscript?: (speaker: 'Brenda' | 'User', text: string) => void;
  onSpeakingChange?: (speaker: 'brenda' | 'user' | '') => void;
  onAudioChunk?: (base64Chunk: string) => void;
  context?: string;
  onConversationUpdate?: (messages: Array<{ role: string; content: string; timestamp: Date }>) => void;
  onSwitchToChat?: () => void;
}

export interface VoiceAgentRef {
  stop: () => Promise<void>;
  isActive: boolean;
}

// Brenda avatar component
const BrendaAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl',
  };
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center shadow-lg`}>
      <span>🧠</span>
    </div>
  );
};

// Global state to prevent multiple simultaneous connections
let globalActiveSession: string | null = null;

const VoiceAgent = forwardRef<VoiceAgentRef, VoiceAgentProps>(({ 
  onTranscript, 
  onSpeakingChange,
  onAudioChunk,
  context = "You are Brenda, a friendly and knowledgeable AI learning companion.",
  onConversationUpdate,
  onSwitchToChat,
}, ref) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [useBackendToken, setUseBackendToken] = useState(true);
  
  // Fallback mode states (Web Speech API)
  const [fallbackListening, setFallbackListening] = useState(false);
  const [fallbackSpeaking, setFallbackSpeaking] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string; timestamp: Date }>>([]);
  
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string>(Math.random().toString(36).substring(7));
  const mountedRef = useRef(true);

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      if (!mountedRef.current) return;
      console.log('Connected to ElevenLabs agent');
      setError(null);
      onSpeakingChange?.('');
      addMessage('system', 'Connected to Brenda. Start speaking...');
    },
    onDisconnect: () => {
      if (!mountedRef.current) return;
      console.log('Disconnected from ElevenLabs agent');
      if (globalActiveSession === sessionIdRef.current) {
        globalActiveSession = null;
      }
      onSpeakingChange?.('');
      addMessage('system', 'Session ended.');
    },
    onMessage: (message: any) => {
      if (!mountedRef.current) return;
      if (message?.type === 'user_transcript') {
        const text = message?.user_transcription_event?.user_transcript;
        if (text) {
          onTranscript?.('User', text);
          addMessage('user', text);
        }
      } else if (message?.type === 'agent_response') {
        const text = message?.agent_response_event?.agent_response;
        if (text) {
          onTranscript?.('Brenda', text);
          addMessage('assistant', text);
        }
      }
    },
    onError: (err) => {
      if (!mountedRef.current) return;
      console.error('ElevenLabs error:', err);
      const errorMessage = typeof err === 'string' ? err : 
                          (err as any)?.message || 'Connection error';
      setError(errorMessage);
      setUseBackendToken(false);
      if (globalActiveSession === sessionIdRef.current) {
        globalActiveSession = null;
      }
    },
  });

  const addMessage = (role: string, content: string) => {
    const newMessage = { role, content, timestamp: new Date() };
    setMessages(prev => {
      const updated = [...prev, newMessage];
      return updated;
    });
  };

  // Notify parent of conversation updates
  useEffect(() => {
    if (onConversationUpdate && messages.length > 0) {
      onConversationUpdate(messages);
    }
  }, [messages, onConversationUpdate]);

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (globalActiveSession === sessionIdRef.current) {
        globalActiveSession = null;
        try {
          conversation.endSession();
        } catch (e) {}
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    stop: stopConversation,
    isActive: isConnected || fallbackListening,
  }), [isConnected, fallbackListening]);

  // Start ElevenLabs conversation via backend token
  const startElevenLabsConversation = useCallback(async () => {
    if (globalActiveSession && globalActiveSession !== sessionIdRef.current) {
      setError('Another conversation is already active');
      return;
    }

    if (isConnecting || isConnected) {
      console.log('Already connecting or connected, ignoring');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setMessages([]);
    globalActiveSession = sessionIdRef.current;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID?.trim();

      if (!agentId) {
        throw new Error('VITE_ELEVENLABS_AGENT_ID is missing in .env');
      }

      console.log('Connecting to agent:', agentId);

      await conversation.startSession({
        agentId,
        connectionType: 'webrtc',
      });

    } catch (err: any) {
      console.error('Failed to start ElevenLabs conversation:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to connect');
        if (err.message !== 'Session cancelled') {
          setUseBackendToken(false);
        }
      }
      if (globalActiveSession === sessionIdRef.current) {
        globalActiveSession = null;
      }
    } finally {
      if (mountedRef.current) {
        setIsConnecting(false);
      }
    }
  }, [conversation, isConnecting, isConnected]);

  // Stop all conversations
  const stopConversation = useCallback(async () => {
    console.log('Stopping conversation');
    
    if (isConnected) {
      try {
        await conversation.endSession();
      } catch (e) {
        console.error('Error ending ElevenLabs session:', e);
      }
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setFallbackListening(false);
    
    window.speechSynthesis?.cancel();
    setFallbackSpeaking(false);

    if (globalActiveSession === sessionIdRef.current) {
      globalActiveSession = null;
    }

    onSpeakingChange?.('');
  }, [conversation, isConnected, onSpeakingChange]);

  // === FALLBACK: Web Speech API ===
  useEffect(() => {
    if (useBackendToken || typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        if (!mountedRef.current) return;
        
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(interimTranscript || finalTranscript);

        if (finalTranscript) {
          handleFallbackSpeech(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (!mountedRef.current) return;
        if (event.error !== 'no-speech') {
          setFallbackListening(false);
        }
      };

      recognition.onend = () => {
        if (!mountedRef.current) return;
        if (fallbackListening && !fallbackSpeaking) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [useBackendToken, fallbackListening, fallbackSpeaking]);

  const handleFallbackSpeech = async (text: string) => {
    if (!text.trim() || !mountedRef.current) return;

    onTranscript?.('User', text);
    addMessage('user', text);
    setTranscript('');
    setFallbackLoading(true);

    try {
      const response = await generateMockResponse(text);
      if (!mountedRef.current) return;
      
      onTranscript?.('Brenda', response);
      addMessage('assistant', response);
      
      if (!isMuted) {
        await speakFallbackResponse(response);
      }
    } catch (err) {
      console.error('Error generating response:', err);
    } finally {
      if (mountedRef.current) {
        setFallbackLoading(false);
      }
    }
  };

  const generateMockResponse = async (userMessage: string): Promise<string> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: userMessage }],
          }),
        }
      );

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) result += content;
              } catch {}
            }
          }
        }
        
        if (result) return result;
      }
    } catch (e) {
      console.log('Backend AI not available, using mock responses');
    }

    const lowerMsg = userMessage.toLowerCase();
    
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
      return "Hello! I'm Brenda, your learning companion. What would you like to explore today?";
    }
    if (lowerMsg.includes('thank')) {
      return "You're welcome! Is there anything else I can help you with?";
    }
    
    const responses = [
      "That's a great question! Let me share what I know about this topic.",
      "I find this fascinating! There are several perspectives to consider here.",
      "Excellent point! What specific aspect would you like to focus on?",
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const speakFallbackResponse = async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.1;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes('Samantha') || v.name.includes('Google UK English Female')
      );
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => {
        if (!mountedRef.current) return;
        setFallbackSpeaking(true);
        onSpeakingChange?.('brenda');
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
      };

      utterance.onend = () => {
        if (!mountedRef.current) { resolve(); return; }
        setFallbackSpeaking(false);
        onSpeakingChange?.('');
        if (fallbackListening && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (e) {}
        }
        resolve();
      };

      utterance.onerror = () => {
        if (mountedRef.current) setFallbackSpeaking(false);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  const toggleFallbackListening = useCallback(async () => {
    if (globalActiveSession && globalActiveSession !== sessionIdRef.current) {
      setError('Another conversation is already active');
      return;
    }

    if (fallbackListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setFallbackListening(false);
      if (globalActiveSession === sessionIdRef.current) {
        globalActiveSession = null;
      }
      onSpeakingChange?.('');
      addMessage('system', 'Session ended.');
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        globalActiveSession = sessionIdRef.current;
        setMessages([]);
        addMessage('system', 'Connected. Start speaking...');
        if (recognitionRef.current) {
          recognitionRef.current.start();
          setFallbackListening(true);
          onSpeakingChange?.('user');
        }
      } catch (err) {
        setError('Please allow microphone access to use voice features.');
      }
    }
  }, [fallbackListening, onSpeakingChange]);

  // Determine current state
  const isActive = useBackendToken ? isConnected : fallbackListening;
  const currentlySpeaking = useBackendToken ? isSpeaking : fallbackSpeaking;
  const isLoading = useBackendToken ? isConnecting : fallbackLoading;

  const handleMainButtonClick = useCallback(async () => {
    if (useBackendToken) {
      if (isConnected) {
        await stopConversation();
      } else if (!isConnecting) {
        await startElevenLabsConversation();
      }
    } else {
      await toggleFallbackListening();
    }
  }, [useBackendToken, isConnected, isConnecting, startElevenLabsConversation, stopConversation, toggleFallbackListening]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="card-glass flex flex-col">
        {/* Status indicator at top - no animation */}
        {isActive && (
          <div className="flex items-center justify-center gap-2 py-3 border-b border-border bg-primary/10">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm font-medium text-primary">Active</span>
          </div>
        )}

        {/* Conversation area with speaker indicators */}
        <div className="p-4 min-h-[250px] max-h-[350px] overflow-y-auto space-y-4">
          {messages.length === 0 && !isActive && (
            <div className="text-center text-muted-foreground py-8">
              <BrendaAvatar size="lg" />
              <p className="mt-4">Click below to start talking with Brenda</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Speaker avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'assistant' 
                  ? 'bg-gradient-to-br from-primary to-accent' 
                  : msg.role === 'user'
                    ? 'bg-accent'
                    : 'bg-muted'
              }`}>
                {msg.role === 'assistant' ? (
                  <span className="text-xs">🧠</span>
                ) : msg.role === 'user' ? (
                  <User className="w-4 h-4 text-accent-foreground" />
                ) : (
                  <span className="text-xs">⚙️</span>
                )}
              </div>
              
              {/* Message bubble */}
              <div className={`flex-1 max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                <span className={`text-xs font-medium mb-1 block ${
                  msg.role === 'assistant' ? 'text-primary' : 
                  msg.role === 'user' ? 'text-accent' : 'text-muted-foreground'
                }`}>
                  {msg.role === 'assistant' ? 'Brenda' :
                   msg.role === 'user' ? 'You' : 'System'}
                </span>
                <div className={`inline-block rounded-2xl px-4 py-2 text-sm ${
                  msg.role === 'assistant' 
                    ? 'bg-primary/10 text-foreground rounded-tl-sm' 
                    : msg.role === 'user'
                      ? 'bg-accent/10 text-foreground rounded-tr-sm'
                      : 'bg-muted/50 text-muted-foreground'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          
          {/* Speaking indicator */}
          {currentlySpeaking && (
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

        {/* Error display */}
        {error && (
          <div className="mx-4 mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Brenda button at bottom */}
        <div className="p-4 border-t border-border/50">
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMainButtonClick();
              }}
              disabled={isLoading}
              className={`flex-1 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 ${
                isActive
                  ? 'bg-destructive hover:bg-destructive/80 text-destructive-foreground'
                  : 'btn-success'
              } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isActive ? (
                <>
                  <PhoneOff className="w-5 h-5" />
                  End Conversation
                </>
              ) : isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-t-transparent border-current rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <BrendaAvatar size="sm" />
                  <span>Talk to Brenda</span>
                </>
              )}
            </button>

            {onSwitchToChat && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    await stopConversation();
                  } catch {}
                  onSwitchToChat();
                }}
                disabled={isLoading}
                className="btn-secondary px-3 rounded-xl flex items-center justify-center"
                aria-label="Type instead of speaking"
                title="Type instead"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

VoiceAgent.displayName = 'VoiceAgent';

export default VoiceAgent;