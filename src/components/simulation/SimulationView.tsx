//SimulationView.tsx
import { useState, useRef, useEffect, forwardRef, useCallback, memo } from 'react';
import VoiceAgent from '@/components/VoiceAgent';
import { useAIChat } from '@/hooks/useAIChat';
import { Send, Mic, FileText, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranscriptEntry {
  timestamp: string;
  speaker: 'Brenda' | 'User' | 'System';
  text: string;
}

interface VisionAnalysis {
  fileName: string;
  analysis: string;
}

interface UploadedFile {
  id: number;
  name: string;
  url: string;
  type: string;
  date: string;
  originalFile?: File;
  dataUrl?: string;
}

interface SimulationViewProps {
  activeSimulation: string;
  selectedRole: string;
  elapsed: string;
  simulationSteps: string[];
  currentStep: number;
  transcript: TranscriptEntry[];
  visionAnalyses: VisionAnalysis[];
  uploadedFiles: UploadedFile[];
  isAnalyzingFile: boolean;
  userFiles: UploadedFile[];
  onEndSimulation: () => void;
  onAddToTranscript: (speaker: 'Brenda' | 'User' | 'System', text: string) => void;
  onSpeakingChange: (speaker: string) => void;
  onAudioChunk: (chunk: string) => void;
  onAttachFile: (file: UploadedFile) => void;
  onSetShowFileViewer: (file: UploadedFile | null) => void;
}

// Memoized control buttons to prevent re-renders from timer
const ControlButtons = memo(function ControlButtons({
  onAttachClick,
  onEndClick,
}: {
  onAttachClick: () => void;
  onEndClick: () => void;
}) {
  return (
    <div
      className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-card/95 backdrop-blur-sm border border-border rounded-xl px-3 py-2 shadow-lg"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAttachClick();
        }}
        className="btn-primary text-sm px-3 py-1.5"
      >
        📎 Attach
      </button>

      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEndClick();
        }}
        className="btn-danger text-sm px-3 py-1.5"
      >
        End
      </button>
    </div>
  );
});

export const SimulationView = forwardRef<HTMLDivElement, SimulationViewProps>(function SimulationView({
  activeSimulation,
  selectedRole,
  elapsed,
  simulationSteps,
  currentStep,
  transcript,
  visionAnalyses,
  uploadedFiles,
  isAnalyzingFile,
  userFiles,
  onEndSimulation,
  onAddToTranscript,
  onSpeakingChange,
  onAudioChunk,
  onAttachFile,
  onSetShowFileViewer,
}, ref) {
  const [mode, setMode] = useState<'voice' | 'chat'>('voice');
  const [chatInput, setChatInput] = useState('');
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [fileToConfirm, setFileToConfirm] = useState<UploadedFile | null>(null);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const { messages, isLoading, error, sendMessage, clearMessages } = useAIChat();

  const lastAddedAssistantMessage = useRef<string | null>(null);
  const prevAnalysesCount = useRef(visionAnalyses.length);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Auto-scroll transcript only if user hasn't scrolled
  useEffect(() => {
    if (!userScrolled && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript, userScrolled]);

  // Auto-scroll chat messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    lastAddedAssistantMessage.current = null;
  }, [activeSimulation]);

// Sync AI chat assistant messages to transcript 
useEffect(() => {
  if (messages.length === 0 || isLoading) return;

  const lastMsg = messages[messages.length - 1];

  if (lastMsg.role === 'assistant' && lastMsg.content) {
    if (lastAddedAssistantMessage.current !== lastMsg.content) {
      onAddToTranscript('Brenda', lastMsg.content);
      lastAddedAssistantMessage.current = lastMsg.content;
    }
  }
}, [messages, isLoading, onAddToTranscript]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || isLoading) return;
    const input = chatInput.trim();
    setChatInput('');
    
    onAddToTranscript('User', input);
    
    await sendMessage(input, selectedRole || activeSimulation);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  // Stable callbacks to prevent re-renders
  const handleVoiceClick = useCallback(() => {
    setMode('voice');
  }, []);

  const handleChatClick = useCallback(() => {
    setMode('chat');
  }, []);

  const handleAttachClick = useCallback(() => {
    setShowFilePicker(true);
  }, []);

  const handleEndClick = useCallback(() => {
    onEndSimulation();
  }, [onEndSimulation]);

  useEffect(() => {
    if (visionAnalyses.length > prevAnalysesCount.current) {
      const newAnalysis = visionAnalyses[visionAnalyses.length - 1];
  
      onAddToTranscript('Brenda', 
        `🔍 I analyzed "${newAnalysis.fileName}" and here's what I see:\n\n${newAnalysis.analysis}`
      );
    }
    prevAnalysesCount.current = visionAnalyses.length;
  }, [visionAnalyses, onAddToTranscript]);

  useEffect(() => {
    return () => {
      prevAnalysesCount.current = 0; 
    };
  }, [activeSimulation]); 

  const renderSimulationProgress = () => {
    if (simulationSteps.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{currentStep + 1} / {simulationSteps.length}</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentStep + 1) / simulationSteps.length) * 100}%` }}
          />
        </div>
        {simulationSteps[currentStep] && (
          <p className="text-sm text-muted-foreground mt-2">
            Current Step: {simulationSteps[currentStep]}
          </p>
        )}
      </div>
    );
  };

  return (
    <div ref={ref} className="min-h-screen bg-background flex">
      {/* Transcript Sidebar */}
      <div className="w-full max-w-md bg-card/95 backdrop-blur-xl border-r border-border flex flex-col h-screen">
        {/* Header with Info Only - No buttons here */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-destructive mb-1">
            <span className="live-dot" />
            LIVE • {activeSimulation}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Role: {selectedRole}</p>
            <p className="text-lg font-mono font-bold">⏱ {elapsed}</p>
          </div>
        </div>

        {renderSimulationProgress()}

        {/* Transcript - Scrollable */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-3 relative"
          onScroll={(e) => {
            const target = e.currentTarget;
            const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
            setUserScrolled(!isAtBottom);
          }}
        >
          {transcript.map((t, i) => (
  <div 
    key={i} 
    className={`transcript-bubble ${t.speaker.toLowerCase()} relative group`}
  >
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
      <span>{t.timestamp}</span>
      <span className="font-semibold">{t.speaker}</span>
    </div>
    <p className="text-sm whitespace-pre-wrap pr-10">{t.text}</p>

    {/* Copy Button with Feedback */}
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(t.text);
        setCopiedIndex(i);
        setTimeout(() => setCopiedIndex(null), 2000); // Hide after 2 seconds
      }}
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all 
                 p-1.5 rounded bg-background/80 backdrop-blur border border-border 
                 hover:bg-primary hover:text-primary-foreground text-muted-foreground
                 flex items-center gap-1.5"
      title="Copy to clipboard"
      aria-label="Copy message"
    >
      {copiedIndex === i ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span className="text-xs font-medium">Copied!</span>
        </>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      )}
    </button>
  </div>
))}

          {/* Uploaded Files with Preview */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <h4 className="text-sm font-semibold mb-3">📎 Uploaded Files</h4>
              <div className="grid grid-cols-3 gap-2">
                {uploadedFiles.map((file) => (
                  <div 
                    key={file.id}
                    onClick={() => onSetShowFileViewer(file)}
                    className="cursor-pointer group relative rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                  >
                    {file.type.startsWith('image/') ? (
                      <img 
                        src={file.dataUrl || file.url} 
                        alt={file.name}
                        className="w-full h-16 object-cover"
                      />
                    ) : (
                      <div className="w-full h-16 bg-muted flex items-center justify-center">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs text-white">View</span>
                    </div>
                    <p className="text-[10px] p-1 truncate bg-card">{file.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading Spinner for File Analysis */}
          {isAnalyzingFile && (
            <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-primary">Analyzing file with Brenda Vision...</span>
              </div>
            </div>
          )}

          {/* Scroll to bottom button */}
          {userScrolled && (
            <div className="sticky bottom-4 left-1/2 -translate-x-1/2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setUserScrolled(false);
                  transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm hover:opacity-90"
              >
                <ChevronDown className="w-4 h-4" />
                New messages
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Simulation controls (memoized) */}
        <ControlButtons
          onAttachClick={handleAttachClick}
          onEndClick={handleEndClick}
        />

        {/* Analysis Panel Toggle */}
        {visionAnalyses.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAnalysisPanel(!showAnalysisPanel);
            }}
            className="absolute top-20 right-4 z-20 bg-card border border-border rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg hover:bg-card/80 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Analysis ({visionAnalyses.length})
            {showAnalysisPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}

        {/* Analysis Panel - Collapsible */}
        {showAnalysisPanel && visionAnalyses.length > 0 && (
          <div className="absolute top-32 right-4 z-20 w-96 max-h-[60vh] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">🔍 Analysis Results</h3>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAnalysisPanel(false);
                }} 
                className="btn-icon p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {visionAnalyses.map((v, i) => (
                <div key={i} className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-xs text-primary font-medium mb-2">📄 {v.fileName}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{v.analysis}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'voice' ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <VoiceAgent
              onTranscript={onAddToTranscript}
              onSpeakingChange={onSpeakingChange}
              onAudioChunk={onAudioChunk}
              onSwitchToChat={handleChatClick}
            />
          </div>
        ) : (
            <div className="flex-1 flex flex-col p-6 max-w-3xl mx-auto w-full">
              <div className="card-glass flex-1 flex flex-col mt-16">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">🧠</span>
                    Chat with Brenda
                  </h3>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleVoiceClick();
                    }}
                    className="btn-secondary flex items-center gap-2"
                    aria-label="Switch to voice"
                  >
                    <Mic className="w-4 h-4" />
                    Speak
                  </button>
                </div>
              
              {/* Chat messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto space-y-3 mb-4 p-2 min-h-[300px] max-h-[50vh]"
              >
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <p className="text-4xl mb-4">💬</p>
                    <p>Start a text conversation with Brenda</p>
                    <p className="text-sm mt-2">Type your message below</p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-3 rounded-xl max-w-[85%]',
                      msg.role === 'assistant' 
                        ? 'bg-secondary/50 mr-auto' 
                        : 'bg-primary text-primary-foreground ml-auto'
                    )}
                  >
                    <span className="font-medium block text-xs opacity-70 mb-1">
                      {msg.role === 'assistant' ? 'Brenda' : 'You'}
                    </span>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                ))}
                {isLoading && (
                  <div className="p-3 rounded-xl bg-secondary/50 max-w-[85%]">
                    <span className="font-medium block text-xs opacity-70 mb-1">Brenda</span>
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
                  type="button"
                  onClick={handleSendChat}
                  disabled={isLoading || !chatInput.trim()}
                  className="btn-primary px-4"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File Picker Modal */}
      {showFilePicker && (
        <div 
          className="modal-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setShowFilePicker(false);
          }}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">Select File to Attach</h3>
            <p className="text-sm text-muted-foreground mb-4">Only images and PDFs can be analyzed by Gemini Vision</p>
            {userFiles.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No files in your library yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                {userFiles
                  .filter((file) => file.type.startsWith("image/") || file.type === "application/pdf")
                  .map((file) => (
                  <div
                    key={file.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileToConfirm(file);
                      setShowFilePicker(false);
                    }}
                    className="card-interactive p-4 text-center cursor-pointer"
                  >
                    {file.type.startsWith("image/") ? (
                      <img src={file.url} alt="" className="w-full h-20 object-cover rounded-lg mb-2" />
                    ) : (
                      <div className="w-full h-20 bg-muted rounded-lg flex items-center justify-center mb-2">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-xs truncate">{file.name}</p>
                  </div>
                ))}
                {userFiles.filter((file) => file.type.startsWith("image/") || file.type === "application/pdf").length === 0 && (
                  <p className="col-span-2 text-muted-foreground text-center py-8">
                    No compatible files. Upload images or PDFs to analyze.
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={(e) => { 
                e.stopPropagation(); 
                setShowFilePicker(false); 
              }}
              className="btn-secondary w-full mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* File Confirmation Modal */}
      {fileToConfirm && (
        <div 
          className="modal-overlay"
          onClick={(e) => { 
            e.stopPropagation(); 
            setFileToConfirm(null); 
          }}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-2">Confirm Analysis</h3>
            <p className="text-muted-foreground mb-6">Send this file to Brenda for analysis?</p>
            <div className="text-center mb-6">
              <p className="font-medium mb-2">{fileToConfirm.name}</p>
              {fileToConfirm.type.startsWith("image/") && (
                <img src={fileToConfirm.url} alt="" className="max-h-40 mx-auto rounded-lg" />
              )}
              {fileToConfirm.type === "application/pdf" && (
                <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                  <FileText className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setFileToConfirm(null)} 
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onAttachFile(fileToConfirm);
                  setFileToConfirm(null);
                }}
                className="btn-success flex-1"
              >
                Send to Brenda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
