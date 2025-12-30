import { useState, useEffect, useRef, ChangeEvent } from 'react';
import VoiceAgent from '@/components/VoiceAgent';
import DashboardModal from '@/components/DashboardModal';
import { SimulationView } from '@/components/simulation/SimulationView';
import { FileViewerModal } from '@/components/simulation/FileViewerModal';
import { HomeView } from '@/components/home/HomeView';
import { useVisionAnalysis } from '@/hooks/useVisionAnalysis';
import LZString from 'lz-string';

// Import real images for knowledge domains
import healthcareImg from '@/assets/healthcare.jpg';
import technologyImg from '@/assets/technology.jpg';
import legalImg from '@/assets/legal.jpg';
import educationImg from '@/assets/education.jpg';
import financeImg from '@/assets/finance.jpg';
import salesImg from '@/assets/sales.jpg';

// === Types ===
interface Simulation {
  title: string;
  icon: string;
  desc?: string;
  steps?: string[];
}

interface PortalConfig {
  title: string;
  icon: string;
  bgImage: string;
  color: string;
  simulations: Simulation[];
  roles: string[];
}

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

interface Profession {
  key: string;
  name: string;
  icon: string;
}

export default function MainApp() {
  const [view, setView] = useState("home");
  const [portalField, setPortalField] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [activeSimulation, setActiveSimulation] = useState("");
  const [simulationStartTime, setSimulationStartTime] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [simulationSteps, setSimulationSteps] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState("00:00");
  const [currentSpeaker, setCurrentSpeaker] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [showHistoryDetail, setShowHistoryDetail] = useState<SessionHistory | null>(null);
  const [showFileViewer, setShowFileViewer] = useState<UploadedFile | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: "Learner",
    avatar: null as string | null,
    bio: "Exploring knowledge with Brenda"
  });
  const [userFiles, setUserFiles] = useState<UploadedFile[]>([]);
  const [userRecordings, setUserRecordings] = useState<UserRecording[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState("history");
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [fileToConfirm, setFileToConfirm] = useState<UploadedFile | null>(null);
  const [brendaChunks, setBrendaChunks] = useState<string[]>([]);
  const mixedRecorderRef = useRef<MediaRecorder | null>(null);
  const mixedChunksRef = useRef<Blob[]>([]);

  const illustrationRef = useRef<any>(null);
  const threeRef = useRef<HTMLDivElement>(null);
  const avatarsRef = useRef<any>({});
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Auto-scroll transcript only if user hasn't scrolled
  useEffect(() => {
    if (!userScrolled) {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript, userScrolled]);

  // Vision Analysis Hook
  const {
    analyses: visionAnalyses,
    isAnalyzing: isAnalyzingFile,
    error: visionError,
    analyzeFile,
    clearAnalyses,
  } = useVisionAnalysis();

  // Update transcript on vision error
  useEffect(() => {
    if (visionError) {
      addToTranscript('System', `Vision analysis error: ${visionError}`);
    }
  }, [visionError]);


  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      userRecordings.forEach(rec => rec.url && URL.revokeObjectURL(rec.url));
      userFiles.forEach(file => file.url && URL.revokeObjectURL(file.url));
      uploadedFiles.forEach(file => file.url && URL.revokeObjectURL(file.url));
    };
  }, []);
  
  // Persistence - Load
  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = localStorage.getItem("brenda_simulation_state");
        if (saved) {
          const data = JSON.parse(saved);
          if (data.portalField && data.role && data.simulation) {
            setPortalField(data.portalField);
            setSelectedRole(data.role);
            setActiveSimulation(data.simulation);
            setSimulationSteps(data.steps || []);
            setCurrentStep(data.currentStep || 0);
            setSimulationStartTime(data.startTime || null);
            setView("portal");
          }
        }
      } catch (err) {
        console.log("No valid saved state");
      }
    };
    loadState();
  }, []);

  // Persistence - Save
  useEffect(() => {
    const saveState = async () => {
      if (portalField || activeSimulation || selectedRole) {
        try {
          localStorage.setItem("brenda_simulation_state", JSON.stringify({
            portalField,
            role: selectedRole,
            simulation: activeSimulation,
            steps: simulationSteps,
            currentStep,
            startTime: simulationStartTime
          }));
        } catch (err) {
          console.error("Save failed:", err);
        }
      }
    };
    saveState();
  }, [portalField, selectedRole, activeSimulation, currentStep, simulationStartTime, simulationSteps]);

  // Body classes
  useEffect(() => {
    if (activeSimulation) {
      document.body.classList.add("simulation-mode");
    } else {
      document.body.classList.remove("simulation-mode");
    }

    if (view === "home") {
      document.body.classList.add("home-view");
    } else {
      document.body.classList.remove("home-view");
    }
  }, [view, activeSimulation]);

  // Timer
  useEffect(() => {
    if (simulationStartTime) {
      const interval = setInterval(() => {
        const diff = Math.floor((Date.now() - simulationStartTime) / 1000);
        const m = String(Math.floor(diff / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        setElapsed(`${m}:${s}`);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsed("00:00");
    }
  }, [simulationStartTime]);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const profile = localStorage.getItem("brenda_user_profile");
        if (profile) setUserProfile(JSON.parse(profile));
      } catch (err) { console.log("No valid profile found"); }

      try {
        const files = localStorage.getItem("brenda_user_files");
        if (files) {
          const savedFiles: UploadedFile[] = JSON.parse(files);
          const restored: UploadedFile[] = [];

          for (const f of savedFiles) {
            if (f.dataUrl) {
              try {
                const res = await fetch(f.dataUrl);
                const blob = await res.blob();
                f.originalFile = new File([blob], f.name, { type: f.type });
              } catch (err) {
                console.warn("Failed to restore file blob:", f.name);
              }
            }
            restored.push(f);
          }
          setUserFiles(restored);
        }
      } catch (err) { console.log("No valid files found"); }

      try {
        const recordings = localStorage.getItem("brenda_user_recordings");
        if (recordings) setUserRecordings(JSON.parse(recordings));
      } catch (err) { console.log("No valid recordings found"); }
    };
    loadUserData();
  }, []);

  // Save profile
  useEffect(() => {
    const saveProfile = async () => {
      try {
        localStorage.setItem("brenda_user_profile", JSON.stringify(userProfile));
      } catch (err) { console.error("Save profile failed:", err); }
    };
    saveProfile();
  }, [userProfile]);

  // Save user data
  useEffect(() => {
    const saveUserData = async () => {
      try {
        localStorage.setItem("brenda_user_files", JSON.stringify(userFiles));
        localStorage.setItem("brenda_user_recordings", JSON.stringify(userRecordings));
      } catch (err) { console.error("Save user data failed:", err); }
    };
    saveUserData();
  }, [userFiles, userRecordings]);

  // Load sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const savedSessions = localStorage.getItem("brenda_sessions");
        if (savedSessions) setSessions(JSON.parse(savedSessions));
      } catch (err) {
        console.log("No sessions");
      }
    };
    loadSessions();
  }, []);

  const openPortal = (field: string) => {
    setPortalField(field);
    setView("portal");
    setSidebarOpen(false);
    setSelectedRole("");
    setActiveSimulation("");
  };

  const backToHome = async () => {
    if (activeSimulation) {
      if (!confirm("End current simulation and return to home? Progress will be saved in history.")) {
        return;
      }
      await endSimulation();
    }
    setView("home");
    setPortalField(null);
    setSelectedRole("");
    setActiveSimulation("");
    try {
      localStorage.removeItem("brenda_simulation_state");
    } catch (err) {
      console.error("Delete state failed:", err);
    }
  };

  const addToTranscript = (speaker: 'Brenda' | 'User' | 'System', text: string) => {
    if (!mountedRef.current) return;
    setTranscript(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      speaker,
      text: text.trim()
    }]);
  };

  const startSimulation = (title: string, steps: string[] = []) => {
    if (!selectedRole) return alert("Please select a role first!");

    const wantsRecording = confirm(`Start "${title}" as ${selectedRole}?\n\nRecord both voices? (Requires mic + system audio)`);

    setActiveSimulation(title);
    setSimulationStartTime(Date.now());
    setSimulationSteps(steps);
    setCurrentStep(0);
    setTranscript([]);
    setUploadedFiles([]);
    setCurrentSpeaker("");

    addToTranscript('System', `Simulation started: "${title}" | Role: ${selectedRole}`);

    if (wantsRecording) {
      startRecording();
    } else {
      addToTranscript('System', 'Text-only mode');
    }
  };

  const attachFileToSimulation = async (file: UploadedFile) => {
    setUploadedFiles(prev => [...prev, file]);
    addToTranscript('System', `Attached: "${file.name}" — sending to Brenda for analysis...`);
  
    if (file.originalFile) {
      addToTranscript('System', `Analyzing "${file.name}" with Vision...`);
      const result = await analyzeFile(file.originalFile, selectedRole || portalField, activeSimulation);
      if (result) {
        addToTranscript('Brenda', `I've analyzed "${result.fileName}". Here's what I found:`);
        addToTranscript('Brenda', result.analysis);
      }
    }
  };

  const createBrendaCleanBlob = () => {
    if (brendaChunks.length === 0) return null;
    const binary = brendaChunks.map(chunk => atob(chunk)).join('');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: 'audio/mpeg' });
  };

  const finalizeRecording = () => {
    let mixedUrl: string | null = null;
    let cleanUrl: string | null = null;

    if (mixedChunksRef.current.length > 0) {
      const mixedBlob = new Blob(mixedChunksRef.current, { type: 'audio/webm' });
      mixedUrl = URL.createObjectURL(mixedBlob);
    }

    const cleanBlob = createBrendaCleanBlob();
    if (cleanBlob) cleanUrl = URL.createObjectURL(cleanBlob);

    if (mixedUrl || cleanUrl) {
      const newRec: UserRecording = {
        id: Date.now(),
        url: mixedUrl || cleanUrl!,
        cleanBrendaUrl: cleanUrl,
        date: new Date().toLocaleString(),
        simulation: activeSimulation,
        role: selectedRole,
      };
      setUserRecordings(prev => [newRec, ...prev]);
      return { mixedUrl, cleanUrl };
    }
    return { mixedUrl: null, cleanUrl: null };
  };

  const startRecording = async () => {
    setIsRecording(true);
    setBrendaChunks([]);
    mixedChunksRef.current = [];

    try {
      // Get user microphone
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      // Connect microphone to destination
      if (micStream.getAudioTracks().length) {
        audioContext.createMediaStreamSource(micStream).connect(destination);
      }

      // Try to capture system audio (Brenda's voice) using getDisplayMedia
      // This requires user permission and works in most browsers
      let systemStream: MediaStream | null = null;
      try {
        // Request display media with audio to capture system audio
        systemStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1, height: 1 }, // Minimal video
          audio: true // System audio
        });
        
        // Stop the video track immediately (we only want audio)
        systemStream.getVideoTracks().forEach(track => track.stop());
        
        // Connect system audio to destination
        const systemAudioTracks = systemStream.getAudioTracks();
        if (systemAudioTracks.length > 0) {
          const systemAudioStream = new MediaStream(systemAudioTracks);
          audioContext.createMediaStreamSource(systemAudioStream).connect(destination);
          addToTranscript('System', '🎙️ Recording both voices (mic + system audio)');
        }
      } catch (displayErr) {
        console.warn('System audio capture not available:', displayErr);
        addToTranscript('System', '🎙️ Recording mic only (system audio unavailable)');
      }

      const mixedStream = destination.stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';

      const recorder = new MediaRecorder(mixedStream, { mimeType });
      mixedRecorderRef.current = recorder;

      recorder.ondataavailable = e => e.data.size > 0 && mixedChunksRef.current.push(e.data);
      recorder.start(1000);

    } catch (err) {
      console.warn('Recording failed:', err);
      addToTranscript('System', '🎙️ Recording unavailable - check mic permissions');
    }
  };

  const stopRecording = () => {
    setIsRecording(false);

    if (mixedRecorderRef.current) {
      if (mixedRecorderRef.current.state !== "inactive") {
        mixedRecorderRef.current.stop();
      }
      mixedRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      mixedRecorderRef.current = null;
    }

    mixedChunksRef.current = [];
  };

  const cleanupMediaStreams = () => {
    if (mixedRecorderRef.current?.stream) {
      mixedRecorderRef.current.stream.getTracks().forEach(track => {
        track.stop();
      });
    }
    mixedRecorderRef.current = null;
    mixedChunksRef.current = [];
    setBrendaChunks([]);
    setIsRecording(false);
  };

  const endSimulation = async () => {
    cleanupMediaStreams();
    if (isRecording) {
      stopRecording();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    const { mixedUrl, cleanUrl } = finalizeRecording();
  
    const sessionData = {
      role: selectedRole,
      simulation: activeSimulation,
      transcript,
      visionAnalyses: visionAnalyses.length ? visionAnalyses : undefined,
      date: new Date().toLocaleString(),
      audioUrl: mixedUrl || cleanUrl || null,
    };
  
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(sessionData));
    const shareableLink = `data:application/json;charset=utf-8,${encodeURIComponent(compressed)}`;
  
    const newSession: SessionHistory = {
      id: Date.now(),
      ...sessionData,
      shareableLink,
    };
  
    const updatedSessions = [newSession, ...sessions].slice(0, 30);
    setSessions(updatedSessions);
    localStorage.setItem("brenda_sessions", JSON.stringify(updatedSessions));
  
    setCurrentSpeaker("");     
    setBrendaChunks([]);       
    setActiveSimulation("");
    setSelectedRole("");
    setSimulationStartTime(null);
    setTranscript([]);
    setVisionAnalyses([]);
    setUploadedFiles([]);
    setSimulationSteps([]);
    setCurrentStep(0);
    setView("portal");
    localStorage.removeItem("brenda_simulation_state");
  };

  const professions: Profession[] = [
    { key: "law", name: "Law", icon: "⚖️" },
    { key: "medicine", name: "Medicine", icon: "🩺" },
    { key: "engineering", name: "Engineering", icon: "🔧" },
    { key: "architecture", name: "Architecture", icon: "🏛️" },
    { key: "science", name: "Chemistry & Biology", icon: "🧪" },
    { key: "psychology", name: "Psychology", icon: "🧠" },
    { key: "business", name: "Business", icon: "💼" },
    { key: "education", name: "Education", icon: "📚" },
    { key: "finance", name: "Finance", icon: "💰" },
    { key: "software", name: "Software Development", icon: "💻" },
    { key: "nursing", name: "Nursing", icon: "🩹" },
    { key: "aviation", name: "Aviation", icon: "✈️" },
    { key: "journalism", name: "Journalism", icon: "📰" },
    { key: "design", name: "Graphic Design", icon: "🎨" },
    { key: "research", name: "Academic Research", icon: "🔬" },
  ];

  const filteredProfessions = professions.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const portals: Record<string, PortalConfig> = {
    law: {
      title: "Courtroom",
      icon: "⚖️",
      bgImage: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?ixlib=rb-4.0.3&auto=format&fit=crop&q=80",
      color: "from-amber-900 via-amber-800 to-black",
      simulations: [
        { title: "Mock Criminal Trial", icon: "🏛️", desc: "Practice courtroom procedures from jury selection to verdict delivery", steps: ["Jury Selection", "Opening Statements", "Direct Examination", "Cross-Examination", "Closing Arguments", "Verdict"] },
        { title: "Client Consultation", icon: "👥", desc: "Learn effective client intake and legal strategy communication", steps: ["Intake", "Case Assessment", "Strategy Planning", "Advice"] },
        { title: "Appellate Argument", icon: "📜", desc: "Master appellate advocacy with oral arguments and rebuttals", steps: ["Brief Review", "Oral Argument", "Rebuttal", "Questions from Bench"] }
      ],
      roles: ["Judge", "Prosecutor", "Defense Attorney", "Witness", "Defendant", "Court Clerk"]
    },
    medicine: {
      title: "Medical Practice Portal",
      icon: "🩺",
      bgImage: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&q=80",
      color: "from-teal-900 via-cyan-900 to-blue-900",
      simulations: [
        { title: "Patient Diagnosis", icon: "🩻", desc: "Develop clinical reasoning through patient history and examination", steps: ["History", "Exam", "Differential", "Treatment Plan"] },
        { title: "Lab Review", icon: "🔬", desc: "Interpret diagnostic tests including bloodwork, imaging, and pathology", steps: ["Interpret Bloodwork", "Imaging", "Pathology"] },
        { title: "Grand Rounds", icon: "💊", desc: "Present and discuss complex cases with the medical team", steps: ["Present Case", "Discuss Complex Case with Team"] }
      ],
      roles: ["Attending Physician", "Resident", "Nurse", "Patient", "Specialist", "Medical Student"]
    },
    engineering: {
      title: "Engineering Design Hub",
      icon: "🔧",
      bgImage: "https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?ixlib=rb-4.0.3&auto=format&fit=crop&q=80",
      color: "from-blue-900 via-indigo-900 to-gray-900",
      simulations: [
        { title: "Design Review", icon: "📐", desc: "Present technical drawings and receive constructive feedback", steps: ["Technical Drawings", "Stress Analysis", "Feedback"] },
        { title: "Failure Analysis", icon: "⚠️", desc: "Investigate root causes and prepare system failure reports", steps: ["Root Cause Investigation", "System Failure Report"] },
        { title: "Project Pitch", icon: "🏭", desc: "Present engineering solutions to stakeholders and answer questions", steps: ["Present Solution", "Stakeholder Q&A"] }
      ],
      roles: ["Lead Engineer", "Project Manager", "Safety Officer", "Client", "Fabricator", "QA Tester"]
    },
    architecture: {
      title: "Architecture Studio",
      icon: "🏛️",
      bgImage: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?ixlib=rb-4.0.3&auto=format&fit=crop&q=80",
      color: "from-purple-900 via-pink-900 to-indigo-900",
      simulations: [
        { title: "Client Presentation", icon: "🏠", desc: "Present design concepts, renders, and material selections", steps: ["Concept", "Renders", "Materials", "Feedback"] },
        { title: "Site Visit", icon: "🌆", desc: "Conduct site walkthroughs with zoning and environmental review", steps: ["Walkthrough", "Zoning", "Environmental Review"] },
        { title: "Code Compliance", icon: "📏", desc: "Review building plans against local codes and regulations", steps: ["Review Plans", "Building Codes Check"] }
      ],
      roles: ["Lead Architect", "Client", "Contractor", "Structural Engineer", "Interior Designer", "City Planner"]
    },
    science: {
      title: "Laboratory Portal",
      icon: "🧪",
      bgImage: "https://images.unsplash.com/photo-1532094344-d0f99f9c20f2?ixlib=rb-4.0.3&auto=format&fit=crop&q=80",
      color: "from-green-900 via-emerald-900 to-teal-900",
      simulations: [
        { title: "Biology Experiment", icon: "🧬", desc: "Plan and execute molecular biology protocols and cell culture", steps: ["CRISPR Planning", "PCR Setup", "Cell Culture Planning"] },
        { title: "Chemical Synthesis", icon: "⚗️", desc: "Design reactions with safety protocols and yield optimization", steps: ["Reaction Design", "Safety Protocol", "Yield Optimization"] },
        { title: "Research Debate", icon: "📊", desc: "Review papers and engage in scientific discussion", steps: ["Paper Review", "Scientific Discussion"] }
      ],
      roles: ["Principal Investigator", "Postdoc", "Grad Student", "Lab Tech", "Safety Officer", "Peer Reviewer"]
    },
    psychology: {
      title: "Psychology Practice",
      icon: "🧠",
      bgImage: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&auto=format&fit=crop&q=80",
      color: "from-violet-900 via-purple-900 to-indigo-900",
      simulations: [
        { title: "Therapy Session", icon: "💭", desc: "Practice therapeutic techniques and patient rapport building", steps: ["Intake Assessment", "Active Listening", "Intervention", "Session Wrap-up"] },
        { title: "Psychological Assessment", icon: "📋", desc: "Administer and interpret psychological evaluations", steps: ["Test Selection", "Administration", "Scoring", "Report Writing"] }
      ],
      roles: ["Psychologist", "Patient", "Counselor", "Social Worker", "Supervisor"]
    },
    business: {
      title: "Business Strategy Hub",
      icon: "💼",
      bgImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&q=80",
      color: "from-slate-900 via-gray-900 to-zinc-900",
      simulations: [
        { title: "Investor Pitch", icon: "📈", desc: "Present business plans and handle tough investor questions", steps: ["Vision Statement", "Market Analysis", "Financials", "Q&A"] },
        { title: "Negotiation Practice", icon: "🤝", desc: "Practice deal-making and contract negotiation strategies", steps: ["Opening Position", "Concessions", "Closing Deal"] }
      ],
      roles: ["CEO", "Investor", "Business Analyst", "Consultant", "Board Member"]
    },
    finance: {
      title: "Financial Services Portal",
      icon: "💰",
      bgImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&auto=format&fit=crop&q=80",
      color: "from-emerald-900 via-green-900 to-teal-900",
      simulations: [
        { title: "Investment Analysis", icon: "📊", desc: "Analyze portfolios and present investment recommendations", steps: ["Market Research", "Risk Assessment", "Portfolio Review", "Recommendations"] },
        { title: "Client Advisory", icon: "💳", desc: "Advise clients on financial planning and wealth management", steps: ["Needs Assessment", "Strategy Development", "Product Selection"] }
      ],
      roles: ["Financial Advisor", "Client", "Portfolio Manager", "Analyst", "Compliance Officer"]
    },
    software: {
      title: "Software Development Lab",
      icon: "💻",
      bgImage: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&q=80",
      color: "from-cyan-900 via-blue-900 to-indigo-900",
      simulations: [
        { title: "Code Review", icon: "🔍", desc: "Practice giving and receiving constructive code feedback", steps: ["Code Walkthrough", "Issue Identification", "Suggestions", "Resolution"] },
        { title: "Technical Interview", icon: "🎯", desc: "Practice coding interviews and system design discussions", steps: ["Problem Understanding", "Solution Design", "Implementation", "Optimization"] },
        { title: "Sprint Planning", icon: "📅", desc: "Plan sprints and estimate work with agile methodologies", steps: ["Backlog Review", "Story Pointing", "Sprint Goal", "Commitment"] }
      ],
      roles: ["Senior Developer", "Junior Developer", "Tech Lead", "Product Manager", "QA Engineer", "DevOps"]
    },
    education: {
      title: "Education & Training Portal",
      icon: "📚",
      bgImage: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&auto=format&fit=crop&q=80",
      color: "from-amber-900 via-orange-900 to-red-900",
      simulations: [
        { title: "Classroom Management", icon: "🏫", desc: "Practice effective teaching and classroom control techniques", steps: ["Lesson Planning", "Delivery", "Student Engagement", "Assessment"] },
        { title: "Parent Conference", icon: "👨‍👩‍👧", desc: "Navigate parent meetings with professionalism and empathy", steps: ["Preparation", "Progress Discussion", "Concerns", "Action Plan"] }
      ],
      roles: ["Teacher", "Student", "Parent", "Principal", "Counselor", "Teaching Assistant"]
    }
  };

  const getPortalConfig = (key: string | null): PortalConfig | null => {
    if (!key) return null;
    if (portals[key]) return portals[key];
  
    const prof = professions.find(p => p.key === key);
    if (!prof) return null;
  
    return {
      title: prof.name + " Simulation",
      icon: prof.icon,
      bgImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&q=80",
      color: "from-indigo-900 via-purple-900 to-pink-900",
      simulations: [{
        icon: "🎯",
        title: "Open Practice",
        desc: "Free-form professional scenario with Brenda guiding you through real-world tasks and challenges"
      }],
      roles: ["Practitioner", "Client", "Colleague", "Supervisor", "Trainee"]
    };
  };

  // === VIEWS ===

  const HomeViewWrapper = () => (
    <HomeView
      sessions={sessions}
      setSessions={setSessions}
      onSpeakingChange={(speaker) => setCurrentSpeaker(speaker)}
      onAudioChunk={(chunk) => setBrendaChunks(prev => [...prev, chunk])}
    />
  );

  const ProfessionalSidebar = () => (
    <div className={`fixed inset-0 z-50 transition-all duration-300 ${sidebarOpen ? 'visible' : 'invisible'}`}>
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => setSidebarOpen(false)}
      />
      
      <div className={`absolute left-0 top-0 h-full w-80 max-w-[90vw] bg-card border-r border-border transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gradient">Professional Portals</h2>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="btn-icon"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Search professions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-modern"
          />
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(100vh-150px)] space-y-3">
          {filteredProfessions.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">🔍</span>
              <p className="font-semibold">No professions found</p>
              <p className="text-sm text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            filteredProfessions.map(prof => (
              <button
                key={prof.key}
                onClick={() => { openPortal(prof.key); setSidebarOpen(false); }}
                className="w-full card-interactive p-4 text-left flex items-center gap-4 group"
              >
                <span className="text-2xl">{prof.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold">{prof.name}</p>
                  <p className="text-xs text-muted-foreground">Professional simulation & role-play</p>
                </div>
                <span className="text-muted-foreground group-hover:text-primary transition-colors">→</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const PortalFrame = ({ title, icon, bgImage, simulations, roles }: PortalConfig) => (
    <div className="min-h-screen relative">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/90 to-background" />

      {/* Header */}
      <div className="relative z-10 p-6 border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between">
          <button onClick={backToHome} className="btn-ghost">
            ← Back to Home
          </button>
          <h1 className="text-2xl font-bold">
            {icon} {title}
          </h1>
          <div className="w-24" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Role Selection First */}
        <div className="card-elevated max-w-3xl mx-auto mb-10">
          <h3 className="text-xl font-bold mb-2 text-center">👤 Choose Your Role</h3>
          <p className="text-muted-foreground text-center text-sm mb-6">Select a role before starting a simulation</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`py-4 rounded-xl font-semibold transition-all ${
                  selectedRole === role 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground hover:bg-muted'
                }`}
              >
                {selectedRole === role ? "✓" : "👤"} {role}
              </button>
            ))}
          </div>
        </div>

        {/* Simulations */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-6 text-center">🎯 Available Simulations</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {simulations.map((sim, i) => (
              <div key={i} className="card-glass group">
                <div className="flex items-start gap-4 mb-4">
                  <span className="text-4xl">{sim.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1">{sim.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {sim.desc ?? "Professional role-play scenario with AI guidance"}
                    </p>
                  </div>
                </div>
                
                {sim.steps && sim.steps.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground mb-2">Steps:</p>
                    <div className="flex flex-wrap gap-1">
                      {sim.steps.slice(0, 4).map((step, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {idx + 1}. {step}
                        </span>
                      ))}
                      {sim.steps.length > 4 && (
                        <span className="text-xs px-2 py-1 text-muted-foreground">
                          +{sim.steps.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => startSimulation(sim.title, sim.steps ?? [])}
                  disabled={!selectedRole}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${
                    selectedRole ? 'btn-success' : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {selectedRole ? `Start as ${selectedRole}` : "Select a role first"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const CurrentPortal = () => {
    const config = getPortalConfig(portalField);
    if (!config) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl mb-4">Portal configuration not found</p>
            <button onClick={backToHome} className="btn-primary">
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return <PortalFrame {...config} />;
  };

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="btn-secondary flex items-center gap-2"
        >
          🎓 Professions
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDashboard(true)}
            className="btn-secondary flex items-center gap-2"
          >
            📊 Dashboard
          </button>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center avatar-ring">
              {userProfile.avatar ? (
                <img src={userProfile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="font-bold text-primary">
                  {userProfile.name[0]?.toUpperCase() || "U"}
                </span>
              )}
            </div>
            <span className="text-sm font-medium hidden sm:block">{userProfile.name}</span>
          </div>
        </div>
      </div>
    </header>
  );

  const SimulationProgress = () => {
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

  const simulationView = (
    <>
      <SimulationView
        activeSimulation={activeSimulation}
        selectedRole={selectedRole}
        elapsed={elapsed}
        simulationSteps={simulationSteps}
        currentStep={currentStep}
        transcript={transcript}
        visionAnalyses={visionAnalyses}
        uploadedFiles={uploadedFiles}
        isAnalyzingFile={isAnalyzingFile}
        userFiles={userFiles}
        onEndSimulation={endSimulation}
        onAddToTranscript={addToTranscript}
        onSpeakingChange={(speaker) => setCurrentSpeaker(speaker)}
        onAudioChunk={(chunk) => setBrendaChunks(prev => [...prev, chunk])}
        onAttachFile={attachFileToSimulation}
        onSetShowFileViewer={setShowFileViewer}
      />
      {showFileViewer && (
        <FileViewerModal
          file={showFileViewer}
          onClose={() => setShowFileViewer(null)}
        />
      )}
    </>
  );

  // Dashboard Modal is now imported from components

  return (
    <div className="min-h-screen bg-background text-foreground">
      {view !== "portal" && <Header />}

      {/* Home */}
      {view === "home" && (
        <div className="pt-16">
          <HomeViewWrapper />
        </div>
      )}

      {/* Sidebar */}
      {sidebarOpen && <ProfessionalSidebar />}

      {/* Portal */}
      {view === "portal" && portalField && !activeSimulation && (
        <div className="pt-16">
          <CurrentPortal />
        </div>
      )}

      {/* Simulation */}
      {activeSimulation && simulationView}
      {/* Dashboard Modal */}
      {showDashboard && (
        <DashboardModal
          sessions={sessions}
          setSessions={setSessions}
          userFiles={userFiles}
          setUserFiles={setUserFiles}
          userRecordings={userRecordings}
          setUserRecordings={setUserRecordings}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          onClose={() => setShowDashboard(false)}
        />
      )}
    </div>
  );
}
