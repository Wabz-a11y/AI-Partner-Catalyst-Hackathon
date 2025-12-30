// SimulationPage.tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Mic, Send, MessageSquare } from 'lucide-react';
import { VoiceAgentPanel, VoiceAgentPanelRef } from '@/components/VoiceAgentPanel';
import { VisionAnalysisPanel } from '@/components/VisionAnalysisPanel';
import { useAIChat } from '@/hooks/useAIChat';
import { useVisionAnalysis } from '@/hooks/useVisionAnalysis';
import { cn } from '@/lib/utils';

interface SimulationPageProps {
  profession: string;
  professionLabel: string;
  onBack: () => void;
}

export function SimulationPage({ profession, professionLabel, onBack }: SimulationPageProps) {
  const [mode, setMode] = useState<'voice' | 'chat'>('voice');
  const [chatInput, setChatInput] = useState('');
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);
  const voiceRef = useRef<VoiceAgentPanelRef>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, error, sendMessage, clearMessages } = useAIChat();
  const { 
    analyses, 
    isAnalyzing, 
    error: visionError, 
    analyzeFile, 
    removeAnalysis 
  } = useVisionAnalysis();

  // Handle file upload for vision analysis
  const handleFileUpload = useCallback(async (file: File) => {
    const result = await analyzeFile(file, profession);
    if (result) {
      setExpandedAnalysisId(result.id);
    }
  }, [analyzeFile, profession]);

  // Auto scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || isLoading) return;
    const input = chatInput;
    setChatInput('');
    await sendMessage(input, profession);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  const handleBack = useCallback(() => {
    // Stop voice conversation before leaving
    if (voiceRef.current?.status === 'connected') {
      voiceRef.current.stop();
    }
    onBack();
  }, [onBack]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="btn-ghost flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <h1 className="text-xl font-bold">{professionLabel} Practice</h1>

          <div className="flex gap-2">
            <button
              onClick={() => setMode('voice')}
              className={cn(
                'tab-item flex items-center gap-2',
                mode === 'voice' && 'active'
              )}
            >
              <Mic className="w-4 h-4" />
              Voice
            </button>
            <button
              onClick={() => setMode('chat')}
              className={cn(
                'tab-item flex items-center gap-2',
                mode === 'chat' && 'active'
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Vision Analysis Panel - always visible */}
          <div className="mb-6">
            <VisionAnalysisPanel
              analyses={analyses}
              isAnalyzing={isAnalyzing}
              error={visionError}
              onFileSelect={handleFileUpload}
              onRemove={removeAnalysis}
              expandedId={expandedAnalysisId}
              onToggleExpand={setExpandedAnalysisId}
            />
          </div>

          {mode === 'voice' ? (
            <VoiceAgentPanel ref={voiceRef} profession={profession} />
          ) : (
            <div className="card-glass">
              <h3 className="text-lg font-semibold mb-4">Text Chat with Brenda</h3>
              
              {/* Chat messages */}
              <div
                ref={chatContainerRef}
                className="h-96 overflow-y-auto space-y-3 mb-4 p-2"
              >
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    Start a conversation with Brenda about {professionLabel.toLowerCase()}
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'transcript-bubble',
                      msg.role === 'assistant' ? 'brenda' : 'user'
                    )}
                  >
                    <span className="font-medium block text-xs text-muted-foreground mb-1">
                      {msg.role === 'assistant' ? 'Brenda' : 'You'}
                    </span>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
                {isLoading && (
                  <div className="transcript-bubble brenda">
                    <span className="font-medium block text-xs text-muted-foreground mb-1">
                      Brenda
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="input-modern flex-1"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendChat}
                  disabled={isLoading || !chatInput.trim()}
                  className="btn-primary px-4"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border">
            <h4 className="font-semibold mb-2">Practice Tips for {professionLabel}</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Speak clearly and at a natural pace</li>
              <li>• Ask questions to keep the conversation flowing</li>
              <li>• Practice handling difficult scenarios</li>
              <li>• Request feedback from Brenda on your communication</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
