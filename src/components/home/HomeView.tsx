import { forwardRef } from 'react';
import VoiceAgent from '@/components/VoiceAgent';
import { Sparkles, ArrowRight, BookOpen, Users, Zap } from 'lucide-react';

import healthcareImg from '@/assets/healthcare.jpg';
import technologyImg from '@/assets/technology.jpg';
import legalImg from '@/assets/legal.jpg';
import educationImg from '@/assets/education.jpg';
import financeImg from '@/assets/finance.jpg';
import salesImg from '@/assets/sales.jpg';

interface SessionHistory {
  id: number;
  role: string;
  simulation: string;
  transcript: any[];
  visionAnalyses?: any[];
  audioUrl?: string | null;
  date: string;
  shareableLink: string;
}

interface HomeViewProps {
  sessions: SessionHistory[];
  setSessions: (sessions: SessionHistory[]) => void;
  onSpeakingChange: (speaker: string) => void;
  onAudioChunk: (chunk: string) => void;
}

export const HomeView = forwardRef<HTMLDivElement, HomeViewProps>(function HomeView({ sessions, setSessions, onSpeakingChange, onAudioChunk }, ref) {
  const domains = [
    { title: "Healthcare", image: healthcareImg, desc: "Medical practice & patient care", icon: "🏥" },
    { title: "Technology", image: technologyImg, desc: "Software & engineering scenarios", icon: "💻" },
    { title: "Legal", image: legalImg, desc: "Law practice & negotiations", icon: "⚖️" },
    { title: "Education", image: educationImg, desc: "Teaching & academic settings", icon: "📚" },
    { title: "Finance", image: financeImg, desc: "Banking & investment discussions", icon: "💰" },
    { title: "Sales", image: salesImg, desc: "Client pitches & negotiations", icon: "🤝" },
  ];

  const features = [
    { icon: <BookOpen className="w-5 h-5" />, title: "Learn Anything", desc: "Explore topics across all fields" },
    { icon: <Users className="w-5 h-5" />, title: "Role-Play Scenarios", desc: "Practice real-world situations" },
    { icon: <Zap className="w-5 h-5" />, title: "Instant Feedback", desc: "Get AI-powered insights" },
  ];

  return (
    <div ref={ref} className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-8 sm:py-16">
        <div className="max-w-5xl mx-auto">
          {/* Hero section - Compact */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Learning Companion</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              Meet <span className="text-gradient">Brenda</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Your intelligent guide for learning, practicing, and mastering any skill
            </p>
          </div>

          {/* Voice Agent - Prominent */}
          <div className="card-elevated mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <VoiceAgent
              onTranscript={(speaker, text) => console.log(`${speaker}: ${text}`)}
              onSpeakingChange={onSpeakingChange}
              onAudioChunk={onAudioChunk}
              onConversationUpdate={(msgs) => {
                if (msgs.length > 0) {
                  const lastMsg = msgs[msgs.length - 1];
                  if (lastMsg.role === 'system' && lastMsg.content === 'Session ended.') {
                    const conversationMsgs = msgs.filter(m => m.role !== 'system');
                    if (conversationMsgs.length > 0) {
                      const newSession: SessionHistory = {
                        id: Date.now(),
                        role: 'Learner',
                        simulation: 'Home Conversation with Brenda',
                        transcript: msgs.map(m => ({
                          timestamp: m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                          speaker: m.role === 'assistant' ? 'Brenda' : m.role === 'user' ? 'User' : 'System',
                          text: m.content
                        })),
                        date: new Date().toLocaleString(),
                        shareableLink: '',
                      };
                      const updatedSessions = [newSession, ...sessions].slice(0, 30);
                      setSessions(updatedSessions);
                      localStorage.setItem("brenda_sessions", JSON.stringify(updatedSessions));
                    }
                  }
                }
              }}
            />
          </div>

          {/* Features Row */}
          <div className="grid grid-cols-3 gap-4 mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {features.map((feature, i) => (
              <div key={i} className="text-center p-4 rounded-xl bg-card/50 border border-border/50">
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Knowledge domains */}
          <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>Knowledge Domains</span>
              </h2>
              <span className="text-sm text-muted-foreground">Click to explore</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {domains.map((domain, i) => (
                <div 
                  key={i} 
                  className="group relative overflow-hidden rounded-xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer"
                >
                  <div className="relative h-28 overflow-hidden">
                    <img 
                      src={domain.image} 
                      alt={domain.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                    <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center text-lg">
                      {domain.icon}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{domain.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{domain.desc}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Footer */}
          <div className="text-center mt-12 animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="inline-flex items-center gap-3 text-sm text-muted-foreground">
              <span className="live-dot" />
              <span>Brenda is ready to help you learn</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
