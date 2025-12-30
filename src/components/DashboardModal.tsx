import { useState, ChangeEvent } from 'react';
import { X, Trash2, Eye, Download, Play, Upload, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface TranscriptEntry {
  timestamp: string;
  speaker: 'Brenda' | 'User' | 'System';
  text: string;
}

interface VisionAnalysis {
  fileName: string;
  analysis: string;
}

interface SessionHistory {
  id: number;
  role: string;
  simulation: string;
  transcript: TranscriptEntry[];
  visionAnalyses?: VisionAnalysis[];
  audioUrl?: string | null;
  date: string;
  shareableLink: string;
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

interface UserRecording {
  id: number;
  url: string;
  date: string;
  simulation: string;
  role: string;
  cleanBrendaUrl?: string | null;
}

interface UserProfile {
  name: string;
  avatar: string | null;
  bio: string;
}

interface DashboardModalProps {
  sessions: SessionHistory[];
  setSessions: (sessions: SessionHistory[]) => void;
  userFiles: UploadedFile[];
  setUserFiles: (files: UploadedFile[]) => void;
  userRecordings: UserRecording[];
  setUserRecordings: (recordings: UserRecording[]) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  onClose: () => void;
}

// Brenda icon options
const brendaIcons = ['🧠', '🤖', '💡', '✨', '🎓', '📚', '🌟', '💜'];
const brendaColors = [
  { name: 'Purple', value: '250 85% 65%' },
  { name: 'Cyan', value: '190 95% 50%' },
  { name: 'Emerald', value: '142 76% 45%' },
  { name: 'Orange', value: '25 95% 55%' },
  { name: 'Pink', value: '330 85% 60%' },
  { name: 'Blue', value: '210 95% 55%' },
];

const DashboardModal = ({
  sessions,
  setSessions,
  userFiles,
  setUserFiles,
  userRecordings,
  setUserRecordings,
  userProfile,
  setUserProfile,
  onClose,
}: DashboardModalProps) => {
  const [activeTab, setActiveTab] = useState<'history' | 'files' | 'recordings' | 'profile' | 'settings'>('history');
  const [viewingSession, setViewingSession] = useState<SessionHistory | null>(null);
  const [viewingFile, setViewingFile] = useState<UploadedFile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: number } | null>(null);
  
  // Brenda customization state
  const [brendaIcon, setBrendaIcon] = useState(() => localStorage.getItem('brenda_icon') || '🧠');
  const [brendaColor, setBrendaColor] = useState(() => localStorage.getItem('brenda_color') || '250 85% 65%');

  const updateBrendaIcon = (icon: string) => {
    setBrendaIcon(icon);
    localStorage.setItem('brenda_icon', icon);
  };

  const updateBrendaColor = (color: string) => {
    setBrendaColor(color);
    localStorage.setItem('brenda_color', color);
    // Update CSS variable
    document.documentElement.style.setProperty('--primary', color);
  };

  // Settings Tab Component
  const SettingsTab = () => (
    <div className="max-w-md mx-auto space-y-6">
      <h3 className="text-lg font-semibold mb-4">Settings</h3>
      
      {/* Theme Toggle */}
      <div className="card-interactive p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Theme</h4>
            <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
          </div>
          <button
            onClick={() => {
              const root = document.documentElement;
              const isDark = root.classList.contains('dark');
              if (isDark) {
                root.classList.remove('dark');
                root.classList.add('light');
                localStorage.setItem('theme', 'light');
              } else {
                root.classList.remove('light');
                root.classList.add('dark');
                localStorage.setItem('theme', 'dark');
              }
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <Sun className="w-4 h-4" />
            <span>/</span>
            <Moon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Brenda Icon */}
      <div className="card-interactive p-4">
        <h4 className="font-medium mb-2">Brenda's Icon</h4>
        <p className="text-sm text-muted-foreground mb-4">Choose an icon for Brenda</p>
        <div className="flex flex-wrap gap-2">
          {brendaIcons.map((icon) => (
            <button
              key={icon}
              onClick={() => updateBrendaIcon(icon)}
              className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                brendaIcon === icon 
                  ? 'bg-primary/20 border-2 border-primary' 
                  : 'bg-secondary hover:bg-muted'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Brenda Color */}
      <div className="card-interactive p-4">
        <h4 className="font-medium mb-2">Brenda's Color Theme</h4>
        <p className="text-sm text-muted-foreground mb-4">Choose a primary color for the interface</p>
        <div className="flex flex-wrap gap-2">
          {brendaColors.map((color) => (
            <button
              key={color.value}
              onClick={() => updateBrendaColor(color.value)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border-2 ${
                brendaColor === color.value ? 'border-foreground' : 'border-transparent'
              }`}
              style={{ backgroundColor: `hsl(${color.value})` }}
              title={color.name}
            >
              {brendaColor === color.value && <span className="text-white text-lg">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Reset Settings */}
      <div className="card-interactive p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Reset to Defaults</h4>
            <p className="text-sm text-muted-foreground">Reset all customizations</p>
          </div>
          <button
            onClick={() => {
              updateBrendaIcon('🧠');
              updateBrendaColor('250 85% 65%');
            }}
            className="btn-secondary text-sm"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );

  // Delete handlers
  const deleteSession = (id: number) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    localStorage.setItem('brenda_sessions', JSON.stringify(updated));
    setConfirmDelete(null);
  };

  const deleteFile = (id: number) => {
    const file = userFiles.find(f => f.id === id);
    if (file?.url) URL.revokeObjectURL(file.url);
    const updated = userFiles.filter(f => f.id !== id);
    setUserFiles(updated);
    localStorage.setItem('brenda_user_files', JSON.stringify(updated));
    setConfirmDelete(null);
  };

  const deleteRecording = (id: number) => {
    const rec = userRecordings.find(r => r.id === id);
    if (rec?.url) URL.revokeObjectURL(rec.url);
    if (rec?.cleanBrendaUrl) URL.revokeObjectURL(rec.cleanBrendaUrl);
    const updated = userRecordings.filter(r => r.id !== id);
    setUserRecordings(updated);
    localStorage.setItem('brenda_user_recordings', JSON.stringify(updated));
    setConfirmDelete(null);
  };

  // File upload handler
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const processedFiles: UploadedFile[] = [];

    for (const file of files) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      processedFiles.push({
        id: Date.now() + Math.random(),
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        date: new Date().toLocaleString(),
        originalFile: file,
        dataUrl,
      });
    }

    const updated = [...userFiles, ...processedFiles];
    setUserFiles(updated);
    localStorage.setItem('brenda_user_files', JSON.stringify(updated));
    e.target.value = '';
  };

  // Avatar upload
  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const updated = { ...userProfile, avatar: reader.result as string };
      setUserProfile(updated);
      localStorage.setItem('brenda_user_profile', JSON.stringify(updated));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Clear avatar
  const clearAvatar = () => {
    const updated = { ...userProfile, avatar: null };
    setUserProfile(updated);
    localStorage.setItem('brenda_user_profile', JSON.stringify(updated));
  };

  const tabs = ['history', 'files', 'recordings', 'profile', 'settings'] as const;

  return (
    <div className="fixed inset-0 bg-black/92 z-50 flex items-center justify-center p-4 backdrop-blur-xl" onClick={onClose}>
      <div className="glass-panel rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden bg-card/98" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-2xl font-bold gradient-text">Dashboard</h2>
          <button onClick={onClose} className="btn-icon"><X className="w-6 h-6" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === tab 
                  ? 'text-primary border-b-2 border-primary bg-primary/5' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-4">📜</p>
                  <p className="text-muted-foreground">No session history yet.</p>
                  <p className="text-sm text-muted-foreground">Complete a simulation to see it here!</p>
                </div>
              ) : (
                sessions.map(session => (
                  <div key={session.id} className="card-interactive p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{session.simulation}</h4>
                        <p className="text-sm text-muted-foreground">Role: {session.role}</p>
                        <p className="text-xs text-muted-foreground mt-1">{session.date}</p>
                        <p className="text-xs text-muted-foreground">{session.transcript.length} messages</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setViewingSession(session)} 
                          className="btn-icon" 
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {session.audioUrl && (
                          <a 
                            href={session.audioUrl} 
                            download={`session-${session.id}.webm`} 
                            className="btn-icon"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <button 
                          onClick={() => setConfirmDelete({ type: 'session', id: session.id })} 
                          className="btn-icon text-destructive hover:bg-destructive/20"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* FILES TAB */}
          {activeTab === 'files' && (
            <div>
              <div className="mb-6">
                <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Files
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              {userFiles.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-4">📁</p>
                  <p className="text-muted-foreground">No files uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {userFiles.map(file => (
                    <div key={file.id} className="card-interactive p-3 group relative">
                      {file.type.startsWith('image/') ? (
                        <img 
                          src={file.dataUrl || file.url} 
                          alt={file.name} 
                          className="w-full h-24 object-cover rounded-lg mb-2 cursor-pointer"
                          onClick={() => setViewingFile(file)}
                        />
                      ) : (
                        <div 
                          className="w-full h-24 bg-muted rounded-lg flex items-center justify-center mb-2 cursor-pointer"
                          onClick={() => setViewingFile(file)}
                        >
                          <span className="text-2xl">📄</span>
                        </div>
                      )}
                      <p className="text-xs truncate font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.date}</p>
                      
                      {/* Delete button */}
                      <button 
                        onClick={() => setConfirmDelete({ type: 'file', id: file.id })}
                        className="absolute top-2 right-2 btn-icon bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RECORDINGS TAB */}
          {activeTab === 'recordings' && (
            <div className="space-y-4">
              {userRecordings.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-4">🎙️</p>
                  <p className="text-muted-foreground">No recordings yet.</p>
                  <p className="text-sm text-muted-foreground">Record a simulation to see it here!</p>
                </div>
              ) : (
                userRecordings.map(rec => (
                  <div key={rec.id} className="card-interactive p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{rec.simulation}</h4>
                        <p className="text-sm text-muted-foreground">Role: {rec.role}</p>
                        <p className="text-xs text-muted-foreground">{rec.date}</p>
                      </div>
                      <div className="flex gap-2">
                        <a 
                          href={rec.url} 
                          download={`recording-${rec.id}.webm`} 
                          className="btn-icon"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button 
                          onClick={() => setConfirmDelete({ type: 'recording', id: rec.id })}
                          className="btn-icon text-destructive hover:bg-destructive/20"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <audio controls src={rec.url} className="w-full" />
                    {rec.cleanBrendaUrl && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Brenda only:</p>
                        <audio controls src={rec.cleanBrendaUrl} className="w-full" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="max-w-md mx-auto space-y-6">
              {/* Avatar */}
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center mx-auto avatar-ring overflow-hidden">
                    {userProfile.avatar ? (
                      <img src={userProfile.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-primary">
                        {userProfile.name[0]?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-center gap-2">
                  <label className="btn-secondary cursor-pointer text-sm">
                    Upload Photo
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                  {userProfile.avatar && (
                    <button onClick={clearAvatar} className="btn-secondary text-sm text-destructive">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              
              {/* Name */}
              <div>
                <label className="text-sm text-muted-foreground block mb-2">Name</label>
                <input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => {
                    const updated = { ...userProfile, name: e.target.value };
                    setUserProfile(updated);
                    localStorage.setItem('brenda_user_profile', JSON.stringify(updated));
                  }}
                  className="input-modern"
                  placeholder="Your name"
                />
              </div>
              
              {/* Bio */}
              <div>
                <label className="text-sm text-muted-foreground block mb-2">Bio</label>
                <textarea
                  value={userProfile.bio}
                  onChange={(e) => {
                    const updated = { ...userProfile, bio: e.target.value };
                    setUserProfile(updated);
                    localStorage.setItem('brenda_user_profile', JSON.stringify(updated));
                  }}
                  className="input-modern min-h-[120px] resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{sessions.length}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{userFiles.length}</p>
                  <p className="text-xs text-muted-foreground">Files</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{userRecordings.length}</p>
                  <p className="text-xs text-muted-foreground">Recordings</p>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <SettingsTab />
          )}
        </div>
      </div>

      {/* Session Detail Modal */}
      {viewingSession && (
        <div 
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          onClick={() => setViewingSession(null)}
        >
          <div 
            className="glass-panel rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{viewingSession.simulation}</h3>
                <p className="text-sm text-muted-foreground">Role: {viewingSession.role} • {viewingSession.date}</p>
              </div>
              <button onClick={() => setViewingSession(null)} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
              {viewingSession.transcript.map((entry, i) => (
                <div key={i} className={`p-3 rounded-lg ${
                  entry.speaker === 'Brenda' ? 'bg-primary/10 ml-4' :
                  entry.speaker === 'User' ? 'bg-accent/10 mr-4' :
                  'bg-muted/50 text-center text-sm'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                    <span className="font-semibold text-sm">{entry.speaker}</span>
                  </div>
                  <p className="text-sm">{entry.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewingFile && (
        <div 
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          onClick={() => setViewingFile(null)}
        >
          <div 
            className="glass-panel rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-bold">{viewingFile.name}</h3>
                <p className="text-xs text-muted-foreground">{viewingFile.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={viewingFile.dataUrl || viewingFile.url} 
                  download={viewingFile.name}
                  className="btn-secondary text-sm px-3 py-1"
                >
                  <Download className="w-4 h-4 mr-1 inline" />
                  Download
                </a>
                <button onClick={() => setViewingFile(null)} className="btn-icon">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[70vh] overflow-auto">
              {viewingFile.type.startsWith('image/') ? (
                <img 
                  src={viewingFile.dataUrl || viewingFile.url} 
                  alt={viewingFile.name} 
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                />
              ) : viewingFile.type === 'application/pdf' ? (
                <iframe
                  src={viewingFile.dataUrl || viewingFile.url}
                  title={viewingFile.name}
                  className="w-full h-[60vh] rounded-lg border border-border"
                />
              ) : (
                <div className="text-center py-12 w-full">
                  <p className="text-6xl mb-4">📄</p>
                  <p className="text-lg font-medium mb-2">{viewingFile.name}</p>
                  <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
                  <a 
                    href={viewingFile.dataUrl || viewingFile.url} 
                    download={viewingFile.name}
                    className="btn-primary inline-block"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div 
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div 
            className="glass-panel rounded-2xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-2">Confirm Delete</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this {confirmDelete.type}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (confirmDelete.type === 'session') deleteSession(confirmDelete.id);
                  else if (confirmDelete.type === 'file') deleteFile(confirmDelete.id);
                  else if (confirmDelete.type === 'recording') deleteRecording(confirmDelete.id);
                }}
                className="btn-primary bg-destructive hover:bg-destructive/80 flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardModal;
