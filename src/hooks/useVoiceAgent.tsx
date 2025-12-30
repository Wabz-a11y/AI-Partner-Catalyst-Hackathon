import { useState, useCallback, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface UseVoiceAgentReturn {
  status: 'disconnected' | 'connecting' | 'connected';
  isSpeaking: boolean;
  messages: Message[];
  error: string | null;
  startConversation: (profession?: string) => Promise<void>;
  stopConversation: () => Promise<void>;
  isConnecting: boolean;
}

export function useVoiceAgent(): UseVoiceAgentReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const sessionActiveRef = useRef(false);
  const connectionIdRef = useRef<string | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs agent');
      sessionActiveRef.current = true;
      setError(null);
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Connected to Brenda. Start speaking...',
        timestamp: new Date()
      }]);
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs agent');
      sessionActiveRef.current = false;
      connectionIdRef.current = null;
    },
    onMessage: (message) => {
      console.log('ElevenLabs message:', message);
      
      // Handle different message types
      const msgAny = message as any;
      if (msgAny.type === 'user_transcript') {
        const userTranscript = msgAny.user_transcription_event?.user_transcript;
        if (userTranscript) {
          setMessages(prev => [...prev, {
            role: 'user',
            content: userTranscript,
            timestamp: new Date()
          }]);
        }
      } else if (msgAny.type === 'agent_response') {
        const agentResponse = msgAny.agent_response_event?.agent_response;
        if (agentResponse) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: agentResponse,
            timestamp: new Date()
          }]);
        }
      }
    },
    onError: (err) => {
      console.error('ElevenLabs error:', err);
      const errorMessage = typeof err === 'string' ? err : 
                          (err as any)?.message || 'Connection error';
      setError(errorMessage);
      sessionActiveRef.current = false;
    },
  });

  const startConversation = useCallback(async (profession?: string) => {
    // Prevent multiple simultaneous connections
    if (isConnecting || sessionActiveRef.current) {
      console.log('Already connecting or connected, ignoring start request');
      return;
    }

    // Generate unique connection ID
    const newConnectionId = Math.random().toString(36).substring(7);
    connectionIdRef.current = newConnectionId;

    setIsConnecting(true);
    setError(null);
    setMessages([]);

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Check if this connection is still valid
      if (connectionIdRef.current !== newConnectionId) {
        console.log('Connection superseded, aborting');
        return;
      }

      // Get token from edge function
      const { data, error: fnError } = await supabase.functions.invoke('elevenlabs-token');

      if (fnError) {
        throw new Error(fnError.message || 'Failed to get conversation token');
      }

      if (!data?.token) {
        throw new Error('No token received from server');
      }

      // Double check connection is still valid
      if (connectionIdRef.current !== newConnectionId) {
        console.log('Connection superseded after token fetch, aborting');
        return;
      }

      // Start the ElevenLabs conversation with proper overrides
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
        overrides: profession ? {
          agent: {
            prompt: {
              prompt: `You are Brenda, a professional ${profession} coach and mentor. Help users practice ${profession} conversations, scenarios, and improve their communication skills in this domain. Be supportive, professional, and provide constructive feedback. Keep responses conversational and natural.`
            },
            firstMessage: `Hello! I'm Brenda, your ${profession} practice partner. How can I help you today?`
          }
        } : undefined
      });

    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
      sessionActiveRef.current = false;
      connectionIdRef.current = null;
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, isConnecting]);

  const stopConversation = useCallback(async () => {
    console.log('Stopping conversation');
    connectionIdRef.current = null;
    sessionActiveRef.current = false;
    
    try {
      await conversation.endSession();
    } catch (err) {
      console.error('Error ending session:', err);
    }
    
    setMessages(prev => [...prev, {
      role: 'system',
      content: 'Session ended.',
      timestamp: new Date()
    }]);
  }, [conversation]);

  return {
    status: conversation.status === 'connected' ? 'connected' : 
            isConnecting ? 'connecting' : 'disconnected',
    isSpeaking: conversation.isSpeaking,
    messages,
    error,
    startConversation,
    stopConversation,
    isConnecting,
  };
}
