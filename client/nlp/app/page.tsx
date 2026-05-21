"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Circle, CircleDashed, CircleX, Upload, FileText, Type, X, Terminal, AudioLines, Lightbulb, Check, Mail, CheckCircle2, ChevronDown, ChevronUp, ShieldCheck, Download, Clipboard, Send, MessageSquare, AlertTriangle, Search, Users, Flame, Activity, FileCheck, Bookmark, Lock, Plus } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import dynamic from 'next/dynamic';

const MeshGradient = dynamic(
  () => import('@paper-design/shaders-react').then((mod) => mod.MeshGradient),
  { ssr: false }
);

interface ActionItem {
  assigned_to: string;
  task: string;
  deadlines: string[];
  priority?: "High" | "Medium" | "Low";
}

interface SpeakerStats {
  participation: string;
  sentiment: string;
  role?: string;
}

interface TranscriptLine {
  time: string;
  speaker: string;
  text: string;
}

interface SummarySentence {
  speaker: string;
  text: string;
}

interface TranscriptData {
  segments: TranscriptLine[];
}

interface MeetingData {
  title: string;
  isGoogleEvent?: boolean;
  summary: {
    total_speakers?: number;
    keywords: string[];
    executive_summary?: SummarySentence[];
  };
  analytics: Record<string, SpeakerStats>;
  action_items: ActionItem[];
  transcript: TranscriptData;
  ai_recommendation?: string;
  timestamp?: string;
  conflicts?: {
    contradictions: string[];
    unresolved: string[];
  };
}

// Decode Effect Component
const DecodeText = ({ text }: { text: string }) => {
  const [decoded, setDecoded] = useState("");
  const [hasRevealed, setHasRevealed] = useState(false);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";

  useEffect(() => {
    if (!hasRevealed) {
      setDecoded(text.replace(/[a-zA-Z0-9]/g, '*'));
      return;
    }

    let iteration = 0;
    const interval = setInterval(() => {
      setDecoded(text.split("").map((letter, index) => {
        if (index < iteration) return text[index];
        if (letter === ' ') return ' ';
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(""));

      if (iteration >= text.length) {
        clearInterval(interval);
        setDecoded(text); // Ensure final string is perfect
      }
      iteration += 1;
    }, 15);

    return () => clearInterval(interval);
  }, [text, hasRevealed]);

  return (
    <span
      onMouseEnter={() => setHasRevealed(true)}
      className="font-mono cursor-default inline-block whitespace-pre-wrap"
    >
      {decoded}
    </span>
  );
};
// Highlight Word Assets
const IMPORTANT_WORDS = [
  "Node.js", "Nodejs", "Express", "React", "Vite", "Tailwind", "TailwindCSS", "MongoDB", "Mongoose", "Swagger", "API", "APIs", "endpoint", "endpoints", 
  "Waterproofing", "Telemetry", "OOM", "OOMEvents", "memory leak", "memory leaks", "K8s", "Kubernetes", "Docker", "Zod", "TypeScript", "JavaScript", 
  "Aadhaar", "Passport", "biometrics", "cryptographic", "audit", "auditing", "verification", "logistics", "checkInDate", "itineraryDate", 
  "Casing Material", "O-ring Seals", "Pressure Testing", "Bill of Materials", "polycarbonate", "silicon", "budget", 
  "payload", "contradiction", "blocker", "blockers", "unresolved", "resolved", "action items"
];

const renderHighlightedText = (text: string, keywords: string[] = []) => {
  if (!text) return null;
  
  const allKeywords = Array.from(new Set([
    ...IMPORTANT_WORDS,
    ...(keywords || [])
  ])).filter(k => k && k.trim().length > 1);

  if (allKeywords.length === 0) return <span>{text}</span>;

  const escapedKeywords = allKeywords
    .map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);

  const regex = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return <span>{text}</span>;

  return (
    <span>
      {parts.map((part, i) => {
        const isMatch = escapedKeywords.some(k => new RegExp(`^${k}$`, 'i').test(part));
        if (isMatch) {
          const useSaffron = i % 2 === 1;
          if (useSaffron) {
            return (
              <span 
                key={i} 
                className="inline-block px-1.5 py-0.5 mx-0.5 bg-[#FF9933]/15 text-[#D97706] rounded border border-[#FF9933]/30 font-bold text-[0.95em]"
                title="Corporate Keyword"
              >
                {part}
              </span>
            );
          } else {
            return (
              <span 
                key={i} 
                className="inline-block px-1.5 py-0.5 mx-0.5 bg-[#000080]/10 text-[#000080] rounded border border-[#000080]/20 font-bold text-[0.95em]"
                title="Tech Accent"
              >
                {part}
              </span>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

// Shadow Suggestion Logic
const getShadowSuggestion = (meeting: MeetingData | null) => {
  if (!meeting) return { task: "Awaiting data...", icon: <CircleDashed size={16} />, action: null };
  
  // Priority 1: High Priority Action Items
  const highPriority = meeting.action_items?.find(item => item.priority === 'High');
  if (highPriority) {
    return {
      task: `Pending Blocker: ${highPriority.assigned_to} is assigned to "${highPriority.task}".`,
      action: `Email ${highPriority.assigned_to} for status`,
      icon: <Lightbulb size={16} className="text-amber-400" />
    };
  }

  // Priority 2: Keyword based automation
  const text = JSON.stringify(meeting).toLowerCase();
  if (text.includes("memory leak") || text.includes("oom")) {
    return { task: "Initialize Auto-Heap-Dump on K8s OOMEvents", action: "Deploy Script", icon: <Terminal size={16} /> };
  }
  if (text.includes("api") || text.includes("endpoint")) {
    return { task: "Generate Zod Schemas from current API trace", action: "Run Generator", icon: <Terminal size={16} /> };
  }
  
  return { task: "Monitor technical debt in recent commit clusters", action: "View Insights", icon: <Terminal size={16} /> };
};

const ShadowSuggestion = ({ meeting }: { meeting: MeetingData | null }) => {
  const suggestion = getShadowSuggestion(meeting);

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (suggestion.action?.startsWith("Email")) {
      const subject = encodeURIComponent(`Kage Intelligence: Tactical Followup`);
      const body = encodeURIComponent(`Hi,\n\nI'm following up on a pending tactical blocker identified by Kage:\n\n"${suggestion.task}"\n\nLet's discuss the status.\n\nSent from Kage Dashboard.`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="hud-glass p-4 rounded-lg border-l-4 border-purple-500 shadow-lg relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-1 bg-purple-500/10 text-[8px] font-black uppercase tracking-tighter text-purple-400">Tactical_Pulse</div>
      <div className="flex items-center gap-4">
        <div className="p-2 bg-purple-500/20 text-purple-400 rounded-md">
          {suggestion.icon}
        </div>
        <div className="flex-1">
          <h4 className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Shadow Suggestion</h4>
          <p className="text-xs font-bold text-white tracking-tight leading-snug">{suggestion.task}</p>
        </div>
        {suggestion.action && (
          <button 
            onClick={handleAction}
            className="px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-wider rounded-sm hover:bg-purple-400 transition-colors"
          >
            {suggestion.action}
          </button>
        )}
      </div>
    </motion.div>
  );
};



const HISTORICAL_MEETINGS: MeetingData[] = [
  {
    title: "Hardware Casing & Pressure Threshold Review",
    timestamp: "2026-05-18, 10:00:00 AM",
    summary: {
      total_speakers: 4,
      keywords: ["Waterproofing", "Casing Material", "O-ring Seals", "Pressure Testing", "Bill of Materials"],
      executive_summary: [
        { speaker: "Executive Overview", text: "Reviewed pressure testing data for the crawler housing under 5 meters of depth." },
        { speaker: "Key Insights", text: "Found that standard acrylic tubing failed at 3.2 bars. The team discussed switching to aluminum casing or polycarbonate tubing." },
        { speaker: "Resolution", text: "Decided to increase the casing budget by $450 to purchase heavy-duty polycarbonate casing. O-ring seals must be upgraded to dual silicon." }
      ]
    },
    analytics: {
      "Srini": { participation: "40%", sentiment: "Determined", role: "Lead" },
      "Rahul": { participation: "10%", sentiment: "Neutral", role: "Frontend" },
      "Ananya": { participation: "35%", sentiment: "Optimistic", role: "Backend" },
      "Bruno": { participation: "15%", sentiment: "Anxious", role: "Product" }
    },
    conflicts: {
      contradictions: [
        "Hardware casing switch to aluminum increases weight by 1.2kg, which exceeds the motor payload limit of 800g. \n \n 💡 AI Suggestion: Switch to heavy-duty polycarbonate casing instead of aluminum to keep weight under 400g while maintaining the 5-bar pressure threshold."
      ],
      unresolved: [
        "No pressure testing rigs are available locally for depths greater than 3 meters. \n \n 💡 AI Suggestion: Partner with Chennai Ocean Tech institute for high-pressure chamber testing."
      ]
    },
    action_items: [
      { assigned_to: "BRUNO", task: "Procure heavy-duty polycarbonate casing samples for pressure testing", priority: "High", deadlines: ["Friday morning"] },
      { assigned_to: "SRINI", task: "Contact Chennai Ocean Tech institute for pressure testing facility access", priority: "Medium", deadlines: ["Next Tuesday"] }
    ],
    transcript: {
      segments: [
        { time: "00:00:05", speaker: "Srini", text: "Let's review the waterproofing casing. Acrylic isn't holding up." },
        { time: "00:01:20", speaker: "Bruno", text: "Aluminum works but it's too heavy. It will overload our active motors." },
        { time: "00:02:10", speaker: "Ananya", text: "Switching to thick polycarbonate keeps it lightweight and pressure-resistant." }
      ]
    },
    ai_recommendation: "Switch casing materials to polycarbonate to resolve the weight vs pressure structural conflict."
  },
  {
    title: "API Architecture & Real-Time Telemetry Bridge",
    timestamp: "2026-05-15, 02:00:00 PM",
    summary: {
      total_speakers: 3,
      keywords: ["JSON bridge", "Telemetry", "WebSockets", "API Integration", "Telemetry Parsing"],
      executive_summary: [
        { speaker: "Executive Overview", text: "Designed the telemetry bridge for piping raw binary data from crawler to dashboard." },
        { speaker: "Key Insights", text: "Determined that REST endpoints will have too much latency. WebSockets are required for real-time telemetry." },
        { speaker: "Resolution", text: "Agreed to use Socket.io for bidirectional communication. Rahul will implement the frontend hooks, Ananya will implement the server bridge." }
      ]
    },
    analytics: {
      "Rahul": { participation: "40%", sentiment: "Neutral", role: "Frontend" },
      "Ananya": { participation: "45%", sentiment: "Optimistic", role: "Backend" },
      "Srini": { participation: "15%", sentiment: "Neutral", role: "Lead" }
    },
    conflicts: {
      contradictions: [
        "Rahul wants to use REST polling for simplicity, while Ananya states that polling every 100ms will overload the server. \n \n 💡 AI Suggestion: Standardize on Socket.io for low-latency telemetry updates."
      ],
      unresolved: [
        "Security protocol for WebSocket authentication was not finalized. \n \n 💡 AI Suggestion: Implement short-lived JWTs via the query parameter during the socket handshake."
      ]
    },
    action_items: [
      { assigned_to: "RAHUL", task: "Implement React Socket.io listener hooks", priority: "High", deadlines: ["Monday afternoon"] },
      { assigned_to: "ANANYA", task: "Setup Socket.io gateway server on Node.js backend", priority: "High", deadlines: ["Monday afternoon"] }
    ],
    transcript: {
      segments: [
        { time: "00:00:10", speaker: "Rahul", text: "Can we just use REST polling for telemetry? It's much easier to implement." },
        { time: "00:00:55", speaker: "Ananya", text: "No, polling every 100ms will melt our server. WebSockets are necessary here." }
      ]
    },
    ai_recommendation: "Implement WebSocket gateway with Socket.io to achieve real-time telemetry bridge safely."
  },
  {
    title: "Sprint 3 Scope & Budget Alignment",
    timestamp: "2026-05-10, 11:30:00 AM",
    summary: {
      total_speakers: 4,
      keywords: ["Budget", "Scope", "Sprint Timeline", "Core Architecture"],
      executive_summary: [
        { speaker: "Executive Overview", text: "Reviewed sprint velocity and client milestone alignment for core dashboard launch." },
        { speaker: "Key Insights", text: "Client requested early integration of the real-time telemetry widget before the end of May." },
        { speaker: "Resolution", text: "Agreed to prioritize the telemetry socket pipeline inside the sprint and defer the historical logs analytics." }
      ]
    },
    analytics: {
      "Srini": { participation: "30%", sentiment: "Determined", role: "Lead" },
      "Rahul": { participation: "25%", sentiment: "Neutral", role: "Frontend" },
      "Ananya": { participation: "20%", sentiment: "Optimistic", role: "Backend" },
      "Bruno": { participation: "25%", sentiment: "Concerned", role: "Product" }
    },
    conflicts: {
      contradictions: [
        "Rahul notes that adding the telemetry socket pipeline in this sprint will delay the historical log analytics, but Bruno says the client insists on real-time widgets. \n \n 💡 AI Suggestion: Defer the advanced log visualizer to Sprint 4 and implement the telemetry socket pipeline now."
      ],
      unresolved: [
        "How to query the system API securely in sandbox mode. \n \n 💡 AI Suggestion: Use a mock sandbox gateway with token header validation."
      ]
    },
    action_items: [
      { assigned_to: "RAHUL", task: "Build the high-density Bento Box card for real-time telemetry analytics", priority: "High", deadlines: ["This Friday"] },
      { assigned_to: "SRINI", task: "Setup mock gateway for hardware pipeline telemetry data feeds", priority: "Medium", deadlines: ["Next Wednesday"] }
    ],
    transcript: {
      segments: [
        { time: "00:00:15", speaker: "Bruno", text: "The client needs the telemetry pipeline running ASAP." },
        { time: "00:01:00", speaker: "Rahul", text: "That means pushing out our beautiful log analytics to next sprint." },
        { time: "00:02:15", speaker: "Srini", text: "Yes, let's prioritize the telemetry dashboard first. It's high priority." }
      ]
    },
    ai_recommendation: "Re-prioritize sprint checklist to deploy the real-time telemetry analytics dashboard immediately."
  }
];

const getApiUrl = (path: string) => {
  if (typeof window === 'undefined') return `http://localhost:5000${path}`;
  const hostname = window.location.hostname;
  return `http://${hostname}:5000${path}`;
};

export default function NLPDashboard() {
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300, 500], [1, 0.5, 0]);
  const heroY = useTransform(scrollY, [0, 500], [0, -150]);

  const [hasEntered, setHasEntered] = useState<boolean>(false);
  const isScrollingRef = useRef<boolean>(false);

  const scrollToDashboard = () => {
    isScrollingRef.current = true;
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth'
    });
    
    setTimeout(() => {
      const htmlEl = document.documentElement;
      const prevScrollBehavior = htmlEl.style.scrollBehavior;
      htmlEl.style.scrollBehavior = 'auto';
      
      setHasEntered(true);
      window.scrollTo(0, 0);
      
      setTimeout(() => {
        htmlEl.style.scrollBehavior = prevScrollBehavior;
        isScrollingRef.current = false;
      }, 50);
    }, 800);
  };

  useEffect(() => {
    if (hasEntered) return;
    const handleScroll = () => {
      if (isScrollingRef.current) return;
      if (window.scrollY >= window.innerHeight - 10) {
        const htmlEl = document.documentElement;
        const prevScrollBehavior = htmlEl.style.scrollBehavior;
        htmlEl.style.scrollBehavior = 'auto';
        
        setHasEntered(true);
        window.scrollTo(0, 0);
        
        setTimeout(() => {
          htmlEl.style.scrollBehavior = prevScrollBehavior;
        }, 50);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasEntered]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedMeeting(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const [pastMeetings, setPastMeetings] = useState<MeetingData[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingData | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'members' | 'actions' | 'transcript' | 'conflicts'>('summary');
  const [resolvedActions, setResolvedActions] = useState<Set<number>>(new Set());
  const [showAIRecommendation, setShowAIRecommendation] = useState<boolean>(true);

  // Bookmarking & Export States
  const [bookmarkedMeetings, setBookmarkedMeetings] = useState<Set<string>>(new Set());
  const [bookmarkedSentences, setBookmarkedSentences] = useState<Set<number>>(new Set());

  // Chatbot Drawer States
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'kage'; text: string }>>([
    { sender: 'kage', text: "Hello! I am Kage, your Lead Project Architect and Meeting Intelligence Analyst. Ask me anything about the active meeting, draft follow-up emails, or analyze technical conflicts! I was created by Shashwat Srinivasan Gopi" }
  ]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'briefing'>('chat');



  // --- Pre-meeting Brief States ---
  const [briefTopic, setBriefTopic] = useState<string>("");
  const [briefResults, setBriefResults] = useState<any>(null);

  // --- Conflict Heatmap States ---
  const [heatmapHoverCell, setHeatmapHoverCell] = useState<{ topicIdx: number; meetingIdx: number } | null>(null);


  
  // Calendar State
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Google Calendar Integration State
  const [isCalendarConnected, setIsCalendarConnected] = useState<boolean>(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // Modal State
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState<boolean>(false);

  // New Event Form State
  const [newMeetingTitle, setNewMeetingTitle] = useState<string>("");
  const [newMeetingDate, setNewMeetingDate] = useState<string>("");
  const [newMeetingStartTime, setNewMeetingStartTime] = useState<string>("");
  const [newMeetingEndTime, setNewMeetingEndTime] = useState<string>("");
  const [newMeetingDescription, setNewMeetingDescription] = useState<string>("");
  const [newMeetingAttendees, setNewMeetingAttendees] = useState<string>("");
  const [newMeetingLoading, setNewMeetingLoading] = useState<boolean>(false);

  // Fetch status and events
  const fetchCalendarStatus = async () => {
    try {
      const res = await fetch(getApiUrl('/api/calendar/status'));
      const data = await res.json();
      setIsCalendarConnected(data.connected);
      if (data.connected) {
        fetchCalendarEvents();
      }
    } catch (e) {
      console.error("Failed to fetch calendar connection status", e);
    }
  };

  const fetchCalendarEvents = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(getApiUrl('/api/calendar/events'));
      const data = await res.json();
      if (data.success && data.events) {
        setCalendarEvents(data.events);
      }
    } catch (e) {
      console.error("Failed to fetch calendar events", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(getApiUrl(`/api/auth/google?origin=${encodeURIComponent(origin)}`));
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error("Failed to initiate calendar connection", e);
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      const res = await fetch(getApiUrl('/api/auth/google/disconnect'), { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsCalendarConnected(false);
        setCalendarEvents([]);
      }
    } catch (e) {
      console.error("Failed to disconnect calendar", e);
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle || !newMeetingDate || !newMeetingStartTime || !newMeetingEndTime) {
      return;
    }
    setNewMeetingLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/calendar/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMeetingTitle,
          date: newMeetingDate,
          startTime: newMeetingStartTime,
          endTime: newMeetingEndTime,
          description: newMeetingDescription,
          attendees: newMeetingAttendees
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsSchedulingModalOpen(false);
        // Clear fields
        setNewMeetingTitle("");
        setNewMeetingDate("");
        setNewMeetingStartTime("");
        setNewMeetingEndTime("");
        setNewMeetingDescription("");
        setNewMeetingAttendees("");
        // Reload events
        fetchCalendarEvents();
      } else {
        alert(data.error || "Failed to schedule event.");
      }
    } catch (e) {
      console.error("Failed to schedule meeting", e);
    } finally {
      setNewMeetingLoading(false);
    }
  };

  // Handle callback parameter loading
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('sandbox_connect') === 'true') {
      const origin = window.location.origin;
      fetch(getApiUrl(`/api/auth/google/callback?sandbox=true&origin=${encodeURIComponent(origin)}`), {
        headers: { 'Accept': 'application/json' }
      })
        .then(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          fetchCalendarStatus();
        });
    } else if (urlParams.get('google_auth') === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchCalendarStatus();
    } else {
      fetchCalendarStatus();
    }
  }, []);

  // Periodic polling for events if connected (every 30s)
  useEffect(() => {
    if (!isCalendarConnected) return;
    const interval = setInterval(() => {
      fetchCalendarEvents();
    }, 30000);
    return () => clearInterval(interval);
  }, [isCalendarConnected]);

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'conflicts', label: 'Conflicts' },
    { id: 'members', label: 'Members & Roles' },
    { id: 'actions', label: 'Action Items' },
    { id: 'transcript', label: 'Transcript' }
  ] as const;

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (selectedMeeting?.isGoogleEvent) return;
    let newIndex = index;
    if (e.key === 'ArrowRight') {
      newIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      newIndex = (index - 1 + tabs.length) % tabs.length;
    }
    if (newIndex !== index) {
      setActiveTab(tabs[newIndex].id as any);
      const btn = document.getElementById(`tab-${tabs[newIndex].id}`);
      if (btn) btn.focus();
    }
  };

  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setResolvedActions(new Set());
    setShowAIRecommendation(true);
    setBookmarkedSentences(new Set());
  }, [selectedMeeting]);

  useEffect(() => {
    fetch('/processed_data.json')
      .then((res) => res.json())
      .then((json: MeetingData) => {
        if (!json.title) json.title = "Legacy Uploaded Meeting";
        if (!json.timestamp) json.timestamp = new Date().toLocaleString();
        setPastMeetings([json, ...HISTORICAL_MEETINGS]);
      })
      .catch((e) => {
        console.log("No initial data found, using historical mocks", e);
        setPastMeetings(HISTORICAL_MEETINGS);
      });
  }, []);





  // --- Pre-meeting Brief Helper ---
  const generatePreMeetingBrief = (topic: string) => {
    if (!topic.trim()) {
      setBriefResults(null);
      return;
    }
    const cleanTopic = topic.toLowerCase();
    
    const matches = pastMeetings.filter(m => {
      const titleMatch = m.title.toLowerCase().includes(cleanTopic);
      const keywordMatch = m.summary.keywords.some(k => k.toLowerCase().includes(cleanTopic));
      const summaryMatch = m.summary.executive_summary?.some(s => s.text.toLowerCase().includes(cleanTopic));
      return titleMatch || keywordMatch || summaryMatch;
    });

    if (matches.length === 0) {
      setBriefResults({
        topic,
        found: false,
        blockers: [],
        decisions: [],
        attendees: {},
        actionItems: []
      });
      return;
    }

    const blockers: string[] = [];
    matches.forEach(m => {
      if (m.conflicts) {
        m.conflicts.contradictions.forEach(c => {
          if (c.toLowerCase().includes(cleanTopic) || cleanTopic.length > 2) {
            blockers.push(`${m.title}: ${c}`);
          }
        });
        m.conflicts.unresolved.forEach(u => {
          if (u.toLowerCase().includes(cleanTopic) || cleanTopic.length > 2) {
            blockers.push(`${m.title}: ${u}`);
          }
        });
      }
    });

    const decisions: string[] = [];
    matches.forEach(m => {
      m.summary.executive_summary?.forEach(s => {
        if (s.speaker.toLowerCase().includes("resolution") || s.text.toLowerCase().includes("decided") || s.text.toLowerCase().includes("resolved") || s.text.toLowerCase().includes("agreed") || s.text.toLowerCase().includes("insights")) {
          decisions.push(`${m.title} (${s.speaker}): ${s.text}`);
        }
      });
    });

    const attendees: Record<string, { role: string; participation: string; sentiment: string; meetingsDiscussed: number }> = {};
    matches.forEach(m => {
      Object.entries(m.analytics).forEach(([name, stats]) => {
        if (!attendees[name]) {
          attendees[name] = {
            role: stats.role || "Participant",
            participation: stats.participation,
            sentiment: stats.sentiment,
            meetingsDiscussed: 1
          };
        } else {
          attendees[name].meetingsDiscussed += 1;
        }
      });
    });

    const actionItems: any[] = [];
    matches.forEach(m => {
      m.action_items.forEach(item => {
        const cleanTask = item.task.toLowerCase();
        if (cleanTask.includes(cleanTopic) || Object.keys(attendees).some(name => name.toLowerCase() === item.assigned_to.toLowerCase())) {
          actionItems.push({
            meeting: m.title,
            ...item
          });
        }
      });
    });

    setBriefResults({
      topic,
      found: true,
      blockers: Array.from(new Set(blockers)),
      decisions: Array.from(new Set(decisions)),
      attendees,
      actionItems
    });
  };

  const exportPreMeetingBrief = (format: 'download' | 'copy') => {
    if (!briefResults || !briefResults.found) return;

    let md = `# KAGE.ai Intell_Brief: ${briefResults.topic.toUpperCase()}\n`;
    md += `*Generated dynamically on ${new Date().toLocaleString()}*\n`;
    md += `========================================\n\n`;

    md += `## ⚠️ Open Blockers & Contradictions\n`;
    if (briefResults.blockers.length === 0) {
      md += `*No active blockers detected regarding this topic.*\n\n`;
    } else {
      briefResults.blockers.forEach((b: string) => {
        md += `- ${b}\n`;
      });
      md += `\n`;
    }

    md += `## 🤝 Prior Decisions & Resolutions\n`;
    if (briefResults.decisions.length === 0) {
      md += `*No historical decisions recorded for this topic.*\n\n`;
    } else {
      briefResults.decisions.forEach((d: string) => {
        md += `- ${d}\n`;
      });
      md += `\n`;
    }

    md += `## 👥 Relevant Attendee History & Sentiment\n`;
    Object.entries(briefResults.attendees).forEach(([name, stats]: [string, any]) => {
      md += `- **${name}** (${stats.role}): ${stats.participation} participation avg, Sentiment trend: *${stats.sentiment}* (${stats.meetingsDiscussed} sync match(es))\n`;
    });
    md += `\n`;

    md += `## 📋 Associated Action Items\n`;
    if (briefResults.actionItems.length === 0) {
      md += `*No action items associated with this topic or attendees.*\n\n`;
    } else {
      briefResults.actionItems.forEach((item: any) => {
        md += `- **${item.assigned_to}**: ${item.task} [${item.priority || 'Medium'}] (Due: ${item.deadlines.join(', ')} in *${item.meeting}*)\n`;
      });
      md += `\n`;
    }

    if (format === 'copy') {
      navigator.clipboard.writeText(md).then(() => {
        alert("Pre-meeting Brief copied to clipboard as Markdown!");
      });
    } else {
      const filename = `Kage_Brief_${briefResults.topic.replace(/\s+/g, '_')}.md`;
      const element = document.createElement("a");
      const file = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = filename;
      element.click();
      URL.revokeObjectURL(element.href);
    }
  };

  // --- Conflict Heatmap Helpers ---
  const TOPIC_CLUSTERS = [
    { id: "waterproofing", label: "Waterproofing & Casing" },
    { id: "budget", label: "Sprint Budget & Scope" },
    { id: "telemetry", label: "Telemetry & Sockets" },
    { id: "frontend", label: "React Frontend App" },
    { id: "architecture", label: "Core System Architecture" }
  ];

  const getHeatIntensity = (topicId: string, meeting: MeetingData) => {
    const cleanTitle = meeting.title.toLowerCase();
    const cleanKeywords = meeting.summary.keywords.map(k => k.toLowerCase());
    const cleanContradictions = meeting.conflicts?.contradictions.map(c => c.toLowerCase()) || [];
    const cleanUnresolved = meeting.conflicts?.unresolved.map(u => u.toLowerCase()) || [];

    let hasHigh = false;
    if (topicId === "waterproofing" && (cleanTitle.includes("waterproof") || cleanTitle.includes("casing") || cleanKeywords.includes("waterproofing"))) {
      hasHigh = cleanContradictions.some(c => c.includes("waterproof") || c.includes("casing") || c.includes("material") || c.includes("pressure"));
    } else if (topicId === "budget" && (cleanTitle.includes("budget") || cleanTitle.includes("scope") || cleanKeywords.includes("budget") || cleanKeywords.includes("scope"))) {
      hasHigh = cleanContradictions.some(c => c.includes("budget") || c.includes("scope") || c.includes("bill of materials"));
    } else if (topicId === "telemetry" && (cleanTitle.includes("telemetry") || cleanTitle.includes("api") || cleanTitle.includes("bridge") || cleanKeywords.includes("telemetry") || cleanKeywords.includes("json bridge"))) {
      hasHigh = cleanContradictions.some(c => c.includes("telemetry") || c.includes("polling") || c.includes("websocket") || c.includes("auth"));
    } else if (topicId === "frontend" && (cleanTitle.includes("frontend") || cleanTitle.includes("react") || cleanKeywords.includes("react frontend"))) {
      hasHigh = cleanContradictions.some(c => c.includes("frontend") || c.includes("react") || c.includes("display"));
    } else if (topicId === "architecture" && (cleanTitle.includes("architecture") || cleanTitle.includes("design") || cleanKeywords.includes("architecture") || cleanKeywords.includes("integration"))) {
      hasHigh = cleanContradictions.some(c => c.includes("architecture") || c.includes("payload") || c.includes("design") || c.includes("rest") || c.includes("latency") || c.includes("websocket"));
    }

    if (hasHigh) return { level: "high", color: "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.85)] animate-pulse", label: "Critical Blocker / Contradiction" };

    let hasMedium = false;
    if (topicId === "waterproofing") {
      hasMedium = cleanUnresolved.some(u => u.includes("waterproof") || u.includes("pressure") || u.includes("rig")) || cleanContradictions.some(c => c.includes("waterproof"));
    } else if (topicId === "budget") {
      hasMedium = cleanUnresolved.some(u => u.includes("budget") || u.includes("timeline") || u.includes("bom")) || cleanContradictions.some(c => c.includes("budget"));
    } else if (topicId === "telemetry") {
      hasMedium = cleanUnresolved.some(u => u.includes("telemetry") || u.includes("security") || u.includes("websocket")) || cleanContradictions.some(c => c.includes("polling"));
    } else if (topicId === "frontend") {
      hasMedium = cleanUnresolved.some(u => u.includes("frontend") || u.includes("graph")) || cleanContradictions.some(c => c.includes("frontend"));
    } else if (topicId === "architecture") {
      hasMedium = cleanUnresolved.some(u => u.includes("security") || u.includes("auth") || u.includes("sandbox") || u.includes("api")) || cleanContradictions.some(c => c.includes("architecture"));
    }

    if (hasMedium) return { level: "medium", color: "bg-purple-500/70 shadow-[0_0_8px_rgba(168,85,247,0.45)]", label: "Minor Blocker / Active Contradiction" };

    let isDiscussed = false;
    if (topicId === "waterproofing") {
      isDiscussed = cleanKeywords.includes("waterproofing") || cleanKeywords.includes("cad designs") || cleanKeywords.includes("pipeline robotics");
    } else if (topicId === "budget") {
      isDiscussed = cleanKeywords.includes("budget") || cleanKeywords.includes("scope") || cleanKeywords.includes("bill of materials");
    } else if (topicId === "telemetry") {
      isDiscussed = cleanKeywords.includes("json bridge") || cleanKeywords.includes("swagger") || cleanKeywords.includes("telemetry") || cleanKeywords.includes("node.js middleware");
    } else if (topicId === "frontend") {
      isDiscussed = cleanKeywords.includes("react frontend") || cleanKeywords.includes("json bridge");
    } else if (topicId === "architecture") {
      isDiscussed = cleanKeywords.includes("architecture") || cleanKeywords.includes("integration") || cleanKeywords.includes("design") || cleanKeywords.includes("budget") || cleanKeywords.includes("scope");
    }

    if (isDiscussed) return { level: "discussed", color: "bg-indigo-600/90 border border-indigo-400/30 shadow-[0_0_10px_rgba(99,102,241,0.3)]", label: "Discussed Neutrally" };

    return { level: "none", color: "bg-slate-800/20 border border-slate-700/20", label: "Not Discussed" };
  };

  const getHeatmapCellDetail = (topicIdx: number, meetingIdx: number) => {
    const topic = TOPIC_CLUSTERS[topicIdx];
    const meeting = pastMeetings[meetingIdx];
    if (!topic || !meeting) return null;

    const heat = getHeatIntensity(topic.id, meeting);
    let detailsText = "Discussed neutrally during sync. Status stable.";
    
    if (heat.level === "high") {
      detailsText = meeting.conflicts?.contradictions.find(c => {
        const lc = c.toLowerCase();
        return lc.includes(topic.id) || (topic.id === "architecture" && (lc.includes("design") || lc.includes("pipeline") || lc.includes("endpoint") || lc.includes("websocket")));
      }) || meeting.conflicts?.contradictions[0] || "Critical structural conflict identified.";
    } else if (heat.level === "medium") {
      detailsText = meeting.conflicts?.unresolved.find(u => {
        const lu = u.toLowerCase();
        return lu.includes(topic.id) || (topic.id === "architecture" && (lu.includes("security") || lu.includes("auth") || lu.includes("sandbox") || lu.includes("api")));
      }) || meeting.conflicts?.unresolved[0] || "Active pending blocker under review.";
    }

    return {
      meetingTitle: meeting.title,
      topicLabel: topic.label,
      level: heat.level,
      labelText: heat.label,
      details: detailsText
    };
  };

  const exportAsFile = (content: string, filename: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const getMarkdownContent = (bookmarksOnly = false) => {
    if (!selectedMeeting) return "";
    let md = `# Meeting Audit Report: ${selectedMeeting.title}\n`;
    md += `**Timestamp:** ${selectedMeeting.timestamp || 'N/A'}\n\n`;
    
    md += `## Executive Summary\n`;
    const summarySentences = selectedMeeting.summary.executive_summary || [];
    if (bookmarksOnly) {
      const bookmarked = summarySentences.filter((_, idx) => bookmarkedSentences.has(idx));
      if (bookmarked.length === 0) {
        md += `*No sections bookmarked.*\n`;
      } else {
        bookmarked.forEach(s => {
          md += `> **[BOOKMARKED]** *${s.speaker}*: ${s.text}\n\n`;
        });
      }
    } else {
      summarySentences.forEach((s, idx) => {
        const isB = bookmarkedSentences.has(idx);
        md += `${isB ? '> **[BOOKMARKED]** ' : ''}*${s.speaker}*: ${s.text}\n\n`;
      });
    }

    if (!bookmarksOnly) {
      md += `## Regulated Action Items & Commitments\n`;
      selectedMeeting.action_items.forEach((item, idx) => {
        md += `${idx + 1}. **${item.assigned_to}**: ${item.task} (Priority: ${item.priority || 'Medium'}, Deadline: ${item.deadlines?.join(', ') || 'N/A'})\n`;
      });
      md += `\n`;

      if (selectedMeeting.conflicts) {
        md += `## Technical Conflicts & Blockers\n`;
        md += `### Contradictions\n`;
        selectedMeeting.conflicts.contradictions.forEach(c => md += `- ${c}\n`);
        md += `\n### Unresolved Blocker Items\n`;
        selectedMeeting.conflicts.unresolved.forEach(u => md += `- ${u}\n`);
      }
    }
    return md;
  };

  const getPlaintextContent = (bookmarksOnly = false) => {
    if (!selectedMeeting) return "";
    let txt = `MEETING AUDIT REPORT: ${selectedMeeting.title}\n`;
    txt += `Timestamp: ${selectedMeeting.timestamp || 'N/A'}\n`;
    txt += `========================================\n\n`;
    txt += `EXECUTIVE SUMMARY:\n`;
    
    const summarySentences = selectedMeeting.summary.executive_summary || [];
    if (bookmarksOnly) {
      const bookmarked = summarySentences.filter((_, idx) => bookmarkedSentences.has(idx));
      bookmarked.forEach(s => {
        txt += `[BOOKMARKED] ${s.speaker}: ${s.text}\n\n`;
      });
    } else {
      summarySentences.forEach((s, idx) => {
        const isB = bookmarkedSentences.has(idx);
        txt += `${isB ? '[BOOKMARKED] ' : ''}${s.speaker}: ${s.text}\n\n`;
      });
    }

    if (!bookmarksOnly) {
      txt += `REGULATED ACTION ITEMS & COMMITMENTS:\n`;
      selectedMeeting.action_items.forEach((item, idx) => {
        txt += `${idx + 1}. [${item.priority || 'Medium'}] ${item.assigned_to}: ${item.task} (Deadline: ${item.deadlines?.join(', ') || 'N/A'})\n`;
      });
      txt += `\n`;
    }
    return txt;
  };

  const handleExport = (format: 'md' | 'json' | 'txt' | 'copy', bookmarksOnly = false) => {
    if (!selectedMeeting) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${selectedMeeting.title.replace(/\s+/g, '_')}_Audit_${dateStr}`;

    if (format === 'md') {
      const content = getMarkdownContent(bookmarksOnly);
      exportAsFile(content, `${filename}.md`, 'text/markdown;charset=utf-8');
    } else if (format === 'txt') {
      const content = getPlaintextContent(bookmarksOnly);
      exportAsFile(content, `${filename}.txt`, 'text/plain;charset=utf-8');
    } else if (format === 'json') {
      let content = "";
      if (bookmarksOnly) {
        const bookmarked = (selectedMeeting.summary.executive_summary || []).filter((_, idx) => bookmarkedSentences.has(idx));
        content = JSON.stringify(bookmarked, null, 2);
      } else {
        content = JSON.stringify(selectedMeeting, null, 2);
      }
      exportAsFile(content, `${filename}.json`, 'application/json;charset=utf-8');
    } else if (format === 'copy') {
      const content = getPlaintextContent(bookmarksOnly);
      navigator.clipboard.writeText(content).then(() => {
        alert("Meeting summary copied to clipboard!");
      }).catch(err => {
        console.error("Could not copy text: ", err);
      });
    }
  };

  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = customMessage || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    const userMsg = { sender: 'user' as const, text: textToSend };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          transcript: selectedMeeting || pastMeetings[0] || null,
          history: chatHistory
        })
      });

      const data = await res.json();
      if (data.success) {
        setChatHistory(prev => [...prev, { sender: 'kage' as const, text: data.reply }]);
      } else {
        setChatHistory(prev => [...prev, { sender: 'kage' as const, text: `Error: ${data.error || 'Failed to get reply.'}` }]);
      }
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { sender: 'kage' as const, text: "Error connecting to AI backend. Make sure the server is running." }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    const chatContainer = document.getElementById("chat-container");
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatHistory, chatLoading]);

  const handleUpload = async () => {
    setUploading(true);
    const formData = new FormData();

    if (file) {
      formData.append('transcript', file);
    } else if (pastedText) {
      formData.append('text', pastedText);
      formData.append('title', meetingTitle || 'Meeting');
    } else {
      setUploading(false);
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/upload'), {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (result.success) {
        const newData = result.data as MeetingData;
        if (!newData.timestamp) newData.timestamp = new Date().toLocaleString();
        setPastMeetings(prev => [newData, ...prev]);
        setFile(null);
        setPastedText("");
        setMeetingTitle("");
      } else {
        alert("Processing failed: " + result.error);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to connect to backend");
    } finally {
      setUploading(false);
    }
  };

  const getSentimentIcon = (sentimentStr: string) => {
    const s = sentimentStr.toLowerCase();
    if (s.includes('frustrated') || s.includes('negative')) return <CircleX size={16} className="text-red-500 shrink-0" />;
    if (s.includes('neutral')) return <CircleDashed size={16} className="text-slate-500 shrink-0" />;
    return <Circle size={16} className="text-emerald-500 fill-emerald-500 shrink-0" />;
  };

  const SentimentGlyph = ({ speaker }: { speaker: string }) => {
    if (!selectedMeeting) return null;
    const stats = selectedMeeting.analytics[speaker] || Object.values(selectedMeeting.analytics).find(s => speaker.includes(s.role || ''));
    if (!stats) return null;
    return <span className="inline-block ml-2">{getSentimentIcon(stats.sentiment)}</span>;
  };

  // Animation variants
  const fadeUpVariant = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  // Calendar Logic
  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();
  const currentMonthName = viewDate.toLocaleString('default', { month: 'long' });
  
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === viewMonth && today.getFullYear() === viewYear;
  const currentDay = today.getDate();

  const meetingsByDay = new Map<number, any[]>();
  pastMeetings.forEach(m => {
    if (m.timestamp) {
      const mDate = new Date(m.timestamp);
      if (mDate.getMonth() === viewMonth && mDate.getFullYear() === viewYear) {
        const d = mDate.getDate();
        if (!meetingsByDay.has(d)) meetingsByDay.set(d, []);
        meetingsByDay.get(d)!.push(m);
      }
    }
  });

  calendarEvents.forEach(evt => {
    if (evt.timestamp) {
      const mDate = new Date(evt.timestamp);
      if (mDate.getMonth() === viewMonth && mDate.getFullYear() === viewYear) {
        const d = mDate.getDate();
        if (!meetingsByDay.has(d)) meetingsByDay.set(d, []);
        const alreadyExists = meetingsByDay.get(d)!.some(existing => existing.id === evt.id);
        if (!alreadyExists) {
          meetingsByDay.get(d)!.push({
            id: evt.id,
            title: evt.title,
            timestamp: evt.timestamp,
            isGoogleEvent: true,
            summary: {
              keywords: ["Google Calendar", "External Sync"],
              executive_summary: [{ speaker: "Google Calendar", text: evt.description || "Synchronized calendar entry." }]
            },
            conflicts: { contradictions: [], unresolved: [] },
            action_items: [],
            analytics: {},
            transcript: { segments: [{ time: "00:00:00", speaker: "Google Calendar", text: evt.description || "Synchronized calendar entry." }] }
          });
        }
      }
    }
  });

  const handleDayClick = (d: number) => {
    setSelectedDay(d);
    if (meetingsByDay.has(d)) {
      // If there's exactly one meeting, maybe open it? 
      // But user wants a list first.
    }
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewYear, viewMonth + offset, 1));
  };

  const renderConflictCard = (c: string, type: 'contradiction' | 'unresolved', index: number) => {
    // Check if there is an AI Suggestion
    const hasSuggestion = c.includes('💡 AI Suggestion:') || c.includes('AI Suggestion:');
    let details = c;
    let suggestion = '';
    
    if (hasSuggestion) {
      const parts = c.split(/💡?\s*AI Suggestion:/i);
      details = parts[0]?.trim() || '';
      suggestion = parts[1]?.trim() || '';
    }

    // Check if details starts with a sequential number (e.g. "1. ")
    const numMatch = details.match(/^(\d+\.)\s*(.*)/);
    let cardNumber = '';
    if (numMatch) {
      cardNumber = numMatch[1];
      details = numMatch[2];
    }

    return (
      <div 
        key={`${type}-${index}`} 
        className="hud-glass bg-[#131316]/50 hover:bg-[#1a1a24]/60 border border-white/10 p-8 rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative overflow-hidden transition-all duration-300 hover:border-red-500/30 group"
      >
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-500 to-indigo-600 shadow-[0_0_15px_rgba(168,85,247,0.3)]"></div>
        
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-[10px] font-mono text-red-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            {type === 'contradiction' ? 'Technical Conflict' : 'Unresolved Blocker'}
          </h3>
          {cardNumber && (
            <span className="text-[10px] font-mono bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
              {cardNumber}
            </span>
          )}
        </div>

        <p className="text-lg text-white font-mono leading-relaxed mb-6 whitespace-pre-line">{details}</p>
        
        {suggestion && (
          <div className="bg-purple-950/20 border-l-2 border-purple-500 p-4 rounded-r-lg font-mono text-sm text-slate-300 shadow-[0_4px_15px_rgba(0,0,0,0.2)] animate-in fade-in slide-in-from-left-4 duration-300">
            <span className="text-purple-400 font-bold flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider">
              💡 AI Suggestion
            </span>
            <p className="leading-relaxed text-slate-300 text-xs md:text-sm whitespace-pre-line">{suggestion}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0C] text-slate-200 font-sans selection:bg-purple-500/30 overflow-hidden">

      {/* Background Mesh Gradient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-25 mesh-gradient-container">
        <MeshGradient
          width={1280}
          height={720}
          colors={["#3b2a8d", "#000080", "#FF9933", "#0A0A0C"]}
          distortion={1.2}
          swirl={1.5}
          grainMixer={0.05}
          grainOverlay={0.05}
          speed={0.8}
        />
      </div>

      {/* Scrollable Hero Section */}
      {!hasEntered && (
        <motion.div 
          style={{ opacity: heroOpacity, y: heroY }}
          className="h-screen flex flex-col items-center justify-center relative overflow-hidden px-6"
        >
          {/* Subtle background radial to enhance contrast without box frames */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-950/20 via-transparent to-transparent pointer-events-none z-0"></div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="text-center z-10 max-w-5xl"
          >
            <img src="/kage_logo.svg" alt="Kage.ai Logo" className="w-48 h-48 mx-auto mb-8 drop-shadow-[0_0_30px_rgba(168,85,247,0.3)] animate-pulse" style={{ animationDuration: '4s' }} />
            <h1 className="text-7xl md:text-9xl font-bold tracking-tighter mb-6 font-mono uppercase glass-text">KAGE.ai</h1>
            
            <p className="text-2xl md:text-4xl text-purple-400 font-mono tracking-tight mb-8 drop-shadow-md uppercase">
              Transcribe. Analyze. Automate.
            </p>
            
            <p className="text-lg md:text-xl text-slate-400 font-sans leading-relaxed max-w-3xl mx-auto">
              Extract high-fidelity intelligence from your raw meeting transcripts. Kage employs advanced natural language processing to surface technical blockers, track action items, and detect alignment conflicts instantly.
            </p>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.button
            onClick={scrollToDashboard}
            animate={{ y: [0, 15, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 text-slate-500 cursor-pointer hover:text-purple-400 focus:outline-none transition-colors group z-20"
          >
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-[0.3em] font-mono mb-4 transition-colors duration-300">Scroll to Initialize</span>
              <div className="w-px h-16 bg-gradient-to-b from-purple-500/50 to-transparent group-hover:from-purple-400 transition-colors duration-300"></div>
            </div>
          </motion.button>
        </motion.div>
      )}

      {/* Dashboard Section */}
      <div className="min-h-screen p-8 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-7xl mx-auto"
        >
          {/* Dashboard Header */}
          <motion.div variants={fadeUpVariant} className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-slate-800 pb-6 gap-4">
            <div className="flex items-center gap-5">
              <img src="/kage_logo.svg" alt="Kage.ai Logo" className="w-14 h-14 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Kage.ai</h2>
                <p className="text-slate-500 font-mono text-xs mt-1 uppercase tracking-widest">Intelligence in the Shadows</p>
              </div>
            </div>
            <div className="md:text-right flex justify-end">
              <div className="group relative flex items-center justify-center cursor-pointer w-10 h-10 rounded-full bg-[#131316] border border-slate-700 shadow-[0_0_15px_rgba(128,90,213,0.1)] hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-300">
                <span className="text-sm font-bold text-slate-300 group-hover:text-purple-400 transition-colors font-mono uppercase">S</span>
                
                {/* Tooltip */}
                <div className="absolute top-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                  <div className="bg-[#131316]/95 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-md shadow-[0_0_15px_rgba(0,0,0,0.5)] whitespace-nowrap">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">shash</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* HUD Status Bar */}
          <motion.div variants={fadeUpVariant} className="mb-8">
            <ShadowSuggestion meeting={pastMeetings[0]} />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div variants={fadeUpVariant} className="lg:col-span-2 space-y-8 flex flex-col">
              {/* Upload Section */}
              <div className="p-6 hud-glass rounded-2xl border border-slate-800/50 shadow-2xl hud-border scanline-container">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                      <Terminal size={24} />
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-lg tracking-wide uppercase font-mono">Terminal_Input</h2>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Ingest meeting transcripts or media files for intelligence synthesis</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Meeting Title (Optional - auto-named if file attached)"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    className="w-full max-w-md px-4 py-3 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-purple-500/50 bg-[#0A0A0C] text-white transition-colors placeholder:text-slate-600 font-mono"
                  />
                  
                  <div className="relative border border-slate-800 rounded-xl bg-[#0A0A0C] focus-within:border-purple-500/50 transition-colors overflow-hidden">
                    <textarea
                      placeholder="Paste raw meeting transcript here, or click the '+' button to attach a .txt, .mp3, or .mp4 file..."
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      className="w-full h-44 p-4 pb-14 border-0 focus:ring-0 text-sm font-sans focus:outline-none bg-transparent text-slate-300 transition-colors resize-none placeholder:text-slate-600"
                    ></textarea>

                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between border-t border-slate-800/40 pt-2 shrink-0">
                      <div className="flex items-center gap-3">
                        <label className="p-2 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center border border-slate-800">
                          <Plus size={18} />
                          <input
                            type="file"
                            accept=".txt,.mp3,.mp4"
                            className="hidden"
                            onChange={(e) => {
                              const selectedFile = e.target.files?.[0];
                              if (selectedFile) {
                                setFile(selectedFile);
                                if (!meetingTitle) {
                                  setMeetingTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
                                }
                              }
                            }}
                          />
                        </label>

                        {file && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-400 rounded-md border border-purple-500/20 text-xs font-mono">
                            <FileText size={12} className="shrink-0" />
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <button
                              onClick={() => {
                                setFile(null);
                                if (meetingTitle === file.name.replace(/\.[^/.]+$/, "")) {
                                  setMeetingTitle("");
                                }
                              }}
                              className="hover:text-red-400 transition-colors p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase hidden sm:inline">
                        Supports .txt, .mp3, .mp4
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleUpload}
                    disabled={uploading || (!file && !pastedText)}
                    className="px-8 py-3 bg-white text-black font-bold tracking-wide rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  >
                    {uploading ? (
                      <div className="flex items-end gap-1.5 h-4">
                        <div className="w-1 bg-black animate-[pulse_1s_ease-in-out_infinite] h-2"></div>
                        <div className="w-1 bg-black animate-[pulse_1.2s_ease-in-out_infinite] h-4"></div>
                        <div className="w-1 bg-black animate-[pulse_0.8s_ease-in-out_infinite] h-3"></div>
                        <div className="w-1 bg-black animate-[pulse_1.5s_ease-in-out_infinite] h-full"></div>
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-widest font-black">Analyzing</span>
                      </div>
                    ) : 'Execute Analysis'}
                  </button>
                </div>
              </div>

              {/* Past Meetings List */}
              <div>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  Archives
                  <div className="h-px bg-slate-800 flex-1"></div>
                </h2>
                {pastMeetings.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl text-slate-600 bg-[#131316]/30 font-mono text-sm">No archives found. System awaiting input.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pastMeetings.map((meeting, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedMeeting(meeting)}
                        className="hud-glass p-6 rounded-2xl border border-slate-800/50 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(128,90,213,0.15)] transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-3 w-full gap-2">
                          <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors text-lg">{meeting.title}</h3>
                          {bookmarkedMeetings.has(meeting.title) && (
                            <Bookmark size={16} className="text-[#FF9933] fill-[#FF9933] drop-shadow-[0_0_4px_rgba(255,153,51,0.3)] shrink-0 mt-1" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono mb-4 block">{meeting.timestamp}</span>
                        <p className="text-sm text-slate-400 line-clamp-2 mb-6 font-mono leading-relaxed">
                          {meeting.summary.executive_summary?.[0]?.text || "Analyzed meeting data."}
                        </p>
                        <div className="flex items-center gap-3 mt-auto">
                          <span className="text-[10px] uppercase tracking-wider font-mono text-cyan-400 bg-cyan-900/20 px-2.5 py-1 rounded-sm border border-cyan-800/40">{meeting.summary.total_speakers} Speakers</span>
                          <span className="text-[10px] uppercase tracking-wider font-mono text-purple-400 bg-purple-900/20 px-2.5 py-1 rounded-sm border border-purple-800/40">{meeting.action_items.length} Tasks</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>



              {/* --- Conflict Heatmap High-Density Bento Grid --- */}
              <div className="mt-8">
                
                {/* Recurring Conflict Heatmap Card */}
                <div className="p-6 hud-glass rounded-2xl border border-slate-800/50 shadow-2xl relative overflow-hidden flex flex-col justify-start">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 to-indigo-500" />
                  
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/30">
                        <Flame size={20} className="animate-pulse" />
                      </div>
                      <div>
                        <h2 className="font-bold text-white text-lg tracking-wide uppercase font-mono">Conflict_Heatmap</h2>
                        <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Structural Org-Level Friction & Blocker Matrix</p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="grid grid-cols-12 items-center text-[9px] font-mono text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2 mb-2">
                        <span className="col-span-4">Topic Cluster / Meeting</span>
                        <div className="col-span-8 flex items-center justify-end gap-3">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-rose-500 rounded-sm"></span> High</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-purple-500/70 rounded-sm"></span> Med</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-indigo-600/90 rounded-sm"></span> Neut</span>
                        </div>
                      </div>

                      <div className="space-y-3 font-mono text-[10px]">
                        {TOPIC_CLUSTERS.map((topic, tIdx) => (
                          <div key={topic.id} className="grid grid-cols-12 items-center gap-4">
                            <div className="col-span-4 text-slate-400 truncate pr-4 text-xs font-semibold" title={topic.label}>
                              {topic.label}
                            </div>
                            
                            <div className="col-span-8 flex gap-3.5 items-center">
                              {pastMeetings.map((meeting, mIdx) => {
                                const heat = getHeatIntensity(topic.id, meeting);
                                const isHovered = heatmapHoverCell?.topicIdx === tIdx && heatmapHoverCell?.meetingIdx === mIdx;

                                return (
                                  <div
                                    key={mIdx}
                                    onMouseEnter={() => setHeatmapHoverCell({ topicIdx: tIdx, meetingIdx: mIdx })}
                                    onMouseLeave={() => setHeatmapHoverCell(null)}
                                    onClick={() => setSelectedMeeting(meeting)}
                                    className={`w-6 h-6 rounded cursor-pointer transition-all duration-200 transform hover:scale-105 flex items-center justify-center font-bold ${heat.color} ${
                                      isHovered ? "ring-2 ring-white" : ""
                                    }`}
                                    title={`${meeting.title} - ${heat.label}`}
                                  >
                                    <span className="text-[7px] text-white/50">{mIdx + 1}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#0A0A0C] p-4 rounded-xl border border-slate-800/80 h-[130px] flex flex-col justify-between font-mono text-xs overflow-hidden">
                      {heatmapHoverCell ? (
                        (() => {
                          const detail = getHeatmapCellDetail(heatmapHoverCell.topicIdx, heatmapHoverCell.meetingIdx);
                          if (!detail) return null;
                          return (
                            <div className="space-y-2 animate-in fade-in duration-200">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-[10px] text-slate-500 uppercase tracking-widest">CELL FOCUS // M-{heatmapHoverCell.meetingIdx + 1}</h4>
                                  <div className="text-white font-bold tracking-tight mt-0.5">{detail.topicLabel}</div>
                                </div>
                                <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                                  detail.level === "high" 
                                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30" 
                                    : detail.level === "medium"
                                      ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                                      : "bg-indigo-600/20 text-cyan-400 border border-indigo-500/30"
                                }`}>
                                  {detail.labelText}
                                </span>
                              </div>
                              <p className="text-slate-300 leading-relaxed text-[11px] line-clamp-2">
                                "{detail.details}"
                              </p>
                              <div className="text-[8px] text-purple-400 uppercase font-bold tracking-widest mt-1">
                                Click cell to review full sync records &rarr;
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-4 text-center text-slate-600">
                          <Activity size={24} className="mb-1.5 opacity-30" />
                          <p className="italic text-[10px] uppercase tracking-wider text-slate-600">Hover over matrix cells to decode historical friction details</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-800/60 font-mono">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Org Friction Score</span>
                      <span className="text-xs font-bold text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]">68 // HIGH FRICTION</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-3">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 h-full rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]" 
                        style={{ width: "68%" }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-snug space-y-1">
                      <div className="flex justify-between border-b border-slate-900 pb-1">
                        <span className="font-bold text-rose-400">Hardware vs Product Mgmt</span>
                        <span className="text-slate-500">Waterproofing (3 conflicts)</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="font-bold text-cyan-400">Frontend vs Backend Dev</span>
                        <span className="text-slate-500">API Handshake (1 conflict)</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </motion.div>

            {/* Right Sidebar */}
            <motion.div variants={fadeUpVariant} className="lg:col-span-1 space-y-8 flex flex-col relative h-full">
              <div className="grid grid-cols-1 gap-6 sticky top-8">
                {/* Calendar Widget */}
                <div className="hud-glass p-6 rounded-2xl border border-slate-800/50 shadow-2xl">
                  <div className="flex justify-between items-center border-b border-slate-800/50 pb-4 mb-4">
                    <div className="flex flex-col">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tactical_Schedule</h3>
                      
                      <button 
                        onClick={isCalendarConnected ? handleDisconnectCalendar : handleConnectCalendar}
                        className={`text-[8px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-full flex items-center gap-1.5 transition-all outline-none ${
                          isCalendarConnected 
                            ? 'bg-blue-950/30 text-blue-400 border border-blue-500/20 hover:bg-blue-900/20 hover:border-blue-500/40 cursor-pointer' 
                            : 'bg-slate-900 text-slate-500 border border-slate-800 hover:bg-slate-800 hover:text-slate-400 cursor-pointer'
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${isCalendarConnected ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`}></span>
                        {isCalendarConnected ? 'Cal Connected' : 'Connect Google Cal'}
                        {isSyncing && <span className="animate-spin text-[7px]">&bull;</span>}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-white">
                        &larr;
                      </button>
                      <span className="text-[10px] text-purple-400 font-mono uppercase tracking-widest whitespace-nowrap">{currentMonthName} {viewYear}</span>
                      <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-white">
                        &rarr;
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center mb-3">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="p-1"></div>)}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                      const isToday = isCurrentMonth && d === currentDay;
                      const isSelected = selectedDay === d;
                      const dayMeetings = meetingsByDay.get(d) || [];
                      const hasNLPEvent = dayMeetings.some(m => !m.isGoogleEvent);
                      const hasGoogleEvent = dayMeetings.some(m => m.isGoogleEvent);
                      const hasMeeting = dayMeetings.length > 0;
                      return (
                        <div key={d} className="relative flex justify-center items-center">
                          <div 
                            onClick={() => handleDayClick(d)}
                            className={`p-1 text-[11px] font-mono rounded-full flex items-center justify-center w-7 h-7 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-500/20 text-white border border-purple-500'
                              : isToday 
                                ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                                : hasNLPEvent
                                  ? 'bg-purple-900/40 text-purple-200 border border-purple-500/30 hover:bg-purple-800/60'
                                  : hasGoogleEvent
                                    ? 'bg-blue-950/40 text-blue-200 border border-blue-500/30 hover:bg-blue-800/60'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}>
                            {d}
                          </div>
                          {hasMeeting && (
                            <div className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                              isToday 
                                ? 'bg-white' 
                                : hasNLPEvent 
                                  ? 'bg-cyan-400' 
                                  : 'bg-blue-400'
                            }`}></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Day Details Intelligence */}
                {selectedDay && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hud-glass p-6 rounded-2xl border border-slate-800/50 shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-2 bg-purple-500/10 text-[9px] font-mono text-purple-400 uppercase tracking-tighter">Day_Intell</div>
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                        {currentMonthName} {selectedDay}, {viewYear}
                      </h4>
                      <button onClick={() => setSelectedDay(null)} className="text-slate-600 hover:text-white"><X size={14} /></button>
                    </div>

                    <div className="space-y-4 mb-8">
                      {meetingsByDay.get(selectedDay)?.map((m, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedMeeting(m)}
                          className={`p-3 border rounded-lg cursor-pointer hover:border-purple-500/50 transition-all ${
                            m.isGoogleEvent 
                              ? 'bg-blue-950/10 border-blue-900/30 hover:border-blue-500/50' 
                              : 'bg-purple-500/5 border-slate-800 hover:border-purple-500/50'
                          }`}
                        >
                          <p className="text-[11px] font-bold text-white mb-1 flex items-center gap-1.5">
                            {m.isGoogleEvent && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
                            {m.title}
                          </p>
                          <span className="text-[9px] font-mono text-slate-500 uppercase flex justify-between items-center">
                            <span>{m.timestamp?.split(',')[1] || '09:00 AM'}</span>
                            {m.isGoogleEvent && <span className="text-blue-400 text-[8px] font-bold tracking-widest uppercase">Google Cal</span>}
                          </span>
                        </div>
                      )) || (
                        <div className="py-4 text-center">
                          <p className="text-[10px] font-mono text-slate-600 uppercase italic">No active deployments found</p>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => setIsSchedulingModalOpen(true)}
                      className="w-full py-3 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                    >
                      Schedule via Google Cal
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Minimal Floating Ask Kage */}
      <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-500">
        <button 
          onClick={() => setIsChatOpen(true)}
          className="flex items-center gap-3 bg-[#131316]/90 backdrop-blur-xl px-5 py-3 rounded-full border border-purple-500/30 shadow-[0_0_20px_rgba(128,90,213,0.15)] hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] transition-all group"
        >
          <Terminal size={16} className="text-purple-400 group-hover:text-purple-300" />
          <span className="text-xs font-bold text-slate-300 group-hover:text-white tracking-wide">Ask Kage</span>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-1"></div>
        </button>
      </div>

      {/* Ask Kage Chatbot sliding drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-[#0A0A0C]/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl z-50 flex flex-col transition-all duration-300 transform ${
          isChatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-[#131316] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30">
              <Terminal size={16} />
            </div>
            <div>
              <h3 className="font-bold text-white font-mono text-sm tracking-wide">Ask_Kage</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${selectedMeeting ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                  {selectedMeeting ? `Context: ${selectedMeeting.title}` : 'General Mode'}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsChatOpen(false)}
            className="p-1.5 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Double-tab selectors */}
        <div className="flex border-b border-slate-800 bg-[#0E0E11] shrink-0">
          <button 
            onClick={() => setSidebarTab('chat')}
            className={`flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors border-b-2 ${
              sidebarTab === 'chat' 
                ? 'border-purple-500 text-white bg-purple-500/5' 
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Kage Chat
          </button>
          <button 
            onClick={() => setSidebarTab('briefing')}
            className={`flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors border-b-2 ${
              sidebarTab === 'briefing' 
                ? 'border-purple-500 text-white bg-purple-500/5' 
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Neural Briefing
          </button>
        </div>

        {sidebarTab === 'chat' ? (
          <>
            {/* Scrollable Chat Area */}
            <div 
              id="chat-container"
              className="flex-1 p-6 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-800 animate-in fade-in"
            >
              {chatHistory.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-xl p-4 font-mono text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-purple-500/10 text-slate-200 border border-purple-500/30 rounded-br-none'
                        : 'bg-[#131316] text-slate-300 border border-slate-800 rounded-bl-none shadow-md'
                    }`}
                  >
                    {msg.sender === 'kage' ? (
                      // Simple Safe Markdown Rendering for Bold, lists, code
                      <div className="space-y-2 whitespace-pre-wrap">
                        {msg.text.split('\n').map((line, idx) => {
                          // Check for bold matches
                          const boldRegex = /\*\*(.*?)\*\*/g;
                          const parts = [];
                          let lastIndex = 0;
                          let match;
                          while ((match = boldRegex.exec(line)) !== null) {
                            if (match.index > lastIndex) {
                              parts.push(line.substring(lastIndex, match.index));
                            }
                            parts.push(<strong key={match.index} className="text-white font-bold">{match[1]}</strong>);
                            lastIndex = boldRegex.lastIndex;
                          }
                          if (lastIndex < line.length) {
                            parts.push(line.substring(lastIndex));
                          }
                          
                          const element = parts.length > 0 ? parts : line;
                          
                          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                            return (
                              <div key={idx} className="flex gap-2 pl-2">
                                <span className="text-purple-400">•</span>
                                <span>{element}</span>
                              </div>
                            );
                          }
                          return <p key={idx}>{element}</p>;
                        })}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#131316] border border-slate-800 rounded-xl rounded-bl-none p-4 max-w-[85%]">
                    <div className="flex items-center gap-1.5 h-3">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-200"></div>
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-300"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-6 py-3 border-t border-slate-800/50 bg-[#0A0A0C] flex flex-wrap gap-2 shrink-0">
              <button 
                onClick={() => handleSendMessage("What were the key blockers or technical conflicts discussed?")}
                className="px-2.5 py-1.5 bg-[#131316] hover:bg-slate-800 border border-slate-800 rounded text-[9px] font-mono text-slate-400 hover:text-white tracking-tight uppercase"
              >
                Blockers Audit
              </button>
              <button 
                onClick={() => handleSendMessage("Draft a concise professional follow-up email for the action items.")}
                className="px-2.5 py-1.5 bg-[#131316] hover:bg-slate-800 border border-slate-800 rounded text-[9px] font-mono text-slate-400 hover:text-white tracking-tight uppercase"
              >
                Draft Action Email
              </button>
              <button 
                onClick={() => handleSendMessage("Summarize the roles, participation rate, and overall sentiment of the members.")}
                className="px-2.5 py-1.5 bg-[#131316] hover:bg-slate-800 border border-slate-800 rounded text-[9px] font-mono text-slate-400 hover:text-white tracking-tight uppercase"
              >
                Speaker Roles & Sentiment
              </button>
            </div>

            {/* Input area */}
            <div className="p-6 border-t border-slate-800 bg-[#131316] flex gap-3 shrink-0">
              <input 
                type="text" 
                placeholder="Ask Kage..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                className="flex-1 px-4 py-2.5 bg-[#0A0A0C] border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-purple-500/50"
              />
              <button 
                onClick={() => handleSendMessage()}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-colors"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Neural Briefing Area */}
            <div className="p-6 border-b border-slate-800/50 bg-[#0A0A0C] space-y-4 shrink-0">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Select/Type Agenda Topic</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="e.g., Waterproofing, Telemetry, Budget..."
                    value={briefTopic}
                    onChange={(e) => {
                      setBriefTopic(e.target.value);
                      generatePreMeetingBrief(e.target.value);
                    }}
                    className="flex-1 px-3 py-2 bg-[#0A0A0C] border border-slate-800 focus:border-purple-500/50 focus:outline-none rounded text-xs font-mono text-white transition-colors"
                  />
                  <button
                    onClick={() => generatePreMeetingBrief(briefTopic)}
                    className="px-3 bg-slate-900 border border-slate-800 hover:border-purple-500 hover:text-white rounded text-xs font-mono transition-colors uppercase font-bold"
                  >
                    Query
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {["Waterproofing", "Telemetry", "Budget", "Scope", "Architecture"].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setBriefTopic(chip);
                      generatePreMeetingBrief(chip);
                    }}
                    className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider rounded border transition-all ${
                      briefTopic.toLowerCase() === chip.toLowerCase()
                        ? "bg-purple-500/15 text-purple-400 border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.2)]"
                        : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Results Viewport */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-800 font-mono text-xs bg-[#070709]/30">
              {!briefResults ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-600">
                  <FileCheck size={28} className="mb-2 opacity-30" />
                  <p className="italic text-[10px] uppercase tracking-wider text-slate-600">Awaiting topic input to generate neural briefing...</p>
                </div>
              ) : !briefResults.found ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                  <AlertTriangle size={24} className="mb-2 text-purple-400/80" />
                  <p className="font-bold text-[11px] uppercase tracking-wider text-white">No sync records found</p>
                  <p className="text-[10px] text-slate-600 mt-1">Topic cluster "{briefResults.topic}" has not been discussed in past meetings.</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-purple-400 tracking-widest flex items-center gap-1.5 mb-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                      Open Blockers & Conflicts
                    </h4>
                    {briefResults.blockers.length === 0 ? (
                      <p className="text-slate-600 italic pl-3 text-[10px]">No active contradictions found in this cluster.</p>
                    ) : (
                      <ul className="space-y-2.5 pl-3 list-disc text-slate-300 text-[11px]">
                        {briefResults.blockers.map((b: string, i: number) => (
                          <li key={i} className="leading-relaxed border-b border-slate-900 pb-1.5 last:border-0">{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest flex items-center gap-1.5 mb-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      Prior Sync Decisions
                    </h4>
                    {briefResults.decisions.length === 0 ? (
                      <p className="text-slate-600 italic pl-3 text-[10px]">No decisions indexed regarding this topic.</p>
                    ) : (
                      <ul className="space-y-2.5 pl-3 list-disc text-slate-300 text-[11px]">
                        {briefResults.decisions.map((d: string, i: number) => (
                          <li key={i} className="leading-relaxed border-b border-slate-900 pb-1.5 last:border-0">{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-purple-400 tracking-widest flex items-center gap-1.5 mb-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      Associated Attendees Intel
                    </h4>
                    <div className="space-y-2 pl-3">
                      {Object.entries(briefResults.attendees).map(([name, stats]: [string, any]) => (
                        <div key={name} className="flex justify-between items-center text-[10px] border-b border-slate-900 pb-1.5 last:border-0">
                          <span className="text-white font-bold">{name} <span className="text-slate-500 font-normal">({stats.role})</span></span>
                          <span className="text-purple-300 italic">{stats.sentiment} ({stats.meetingsDiscussed} sync)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action Area */}
            <div className="p-6 border-t border-slate-800 bg-[#131316] shrink-0">
              {briefResults && briefResults.found ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => exportPreMeetingBrief('copy')}
                    className="flex-1 py-2.5 bg-[#131316] hover:bg-purple-500/10 border border-slate-800 hover:border-purple-500/40 text-slate-300 hover:text-white rounded-lg font-mono text-[10px] uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Clipboard size={12} /> Copy Brief
                  </button>
                  <button
                    onClick={() => exportPreMeetingBrief('download')}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-mono text-[10px] uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                  >
                    <Download size={12} /> Download Brief
                  </button>
                </div>
              ) : (
                <div className="text-center py-2.5 text-[10px] text-slate-600 uppercase font-mono tracking-widest italic">
                  Enter agenda topic above to enable action utilities
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Expanded Meeting Modal */}
      {selectedMeeting && (
        <div 
          onClick={() => setSelectedMeeting(null)}
          className="fixed inset-0 bg-[#0A0A0C]/90 bg-aurora backdrop-blur-xl z-50 flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-300"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="hud-glass w-full max-w-6xl max-h-full rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
          >
            {/* Modal Header */}
            <div className="px-8 pt-8 border-b border-slate-800 shrink-0 bg-gradient-to-b from-[#1a1a24] to-[#131316]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">{selectedMeeting.title}</h2>
                  <p className="text-xs text-slate-500 mt-2 font-mono tracking-widest uppercase">{selectedMeeting.timestamp}</p>
                </div>
                <button
                  onClick={() => setSelectedMeeting(null)}
                  className="p-2 bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-8 border-b border-transparent overflow-x-auto scrollbar-hide" role="tablist">
                {tabs.map((tab, idx) => {
                  const isLocked = selectedMeeting?.isGoogleEvent && tab.id !== 'summary';
                  return (
                    <button
                      key={tab.id}
                      id={`tab-${tab.id}`}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      tabIndex={isLocked ? -1 : (activeTab === tab.id ? 0 : -1)}
                      disabled={isLocked}
                      onClick={() => !isLocked && setActiveTab(tab.id as any)}
                      onKeyDown={(e) => !isLocked && handleTabKeyDown(e, idx)}
                      className={`pb-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131316] flex items-center gap-1.5 ${
                        isLocked
                          ? 'border-transparent text-slate-500/30 cursor-not-allowed pointer-events-none'
                          : activeTab === tab.id
                            ? 'border-purple-500 text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                            : 'border-transparent text-slate-600 hover:text-slate-300'
                      }`}
                    >
                      {isLocked && <Lock size={12} className="text-slate-500/50 shrink-0 mr-1.5" />}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-8 overflow-y-auto flex-1 relative bg-[#0A0A0C]">
              {activeTab === 'summary' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* DYNAMIC CONFLICT PRIORITY CARD */}
                  {selectedMeeting.conflicts && (selectedMeeting.conflicts.contradictions.length > 1 || selectedMeeting.conflicts.unresolved.length > 1) && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`hud-glass border-l-4 border-red-500/50 p-8 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.1)] relative overflow-hidden ${
                        (selectedMeeting.conflicts.contradictions.length + selectedMeeting.conflicts.unresolved.length) > 3 ? 'scale-105 border-red-500' : ''
                      }`}
                    >
                      <div className="absolute top-0 right-0 p-2 bg-red-500/10 text-[10px] font-black uppercase tracking-widest text-red-400">Critical Priority</div>
                      <div className="flex items-start gap-5">
                        <div className="p-3 bg-red-500/20 text-red-400 rounded-full animate-pulse">
                          <X size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-tighter">Conflict Detection_Active</h3>
                          <div className="space-y-4">
                            {selectedMeeting.conflicts.contradictions.filter(c => !c.includes("No explicit contradictions")).map((c, i) => (
                              <div key={i} className="flex gap-3 text-sm text-red-200/80 font-mono bg-red-950/20 p-3 rounded border border-red-900/30">
                                <span className="text-red-500 font-bold shrink-0">!</span>
                                {c}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Spotlight T5 Summary */}
                  {selectedMeeting.summary.executive_summary && selectedMeeting.summary.executive_summary.length > 0 && (
                    <div className="bg-slate-100/95 backdrop-blur-xl border border-slate-300/50 rounded-xl p-10 shadow-[0_0_50px_rgba(168,85,247,0.1)] transform transition-transform text-slate-800">
                      <div className="space-y-8">
                        {selectedMeeting.summary.executive_summary.map((sum, i) => {
                          const isBookmarked = bookmarkedSentences.has(i);
                          return (
                            <div 
                              key={i} 
                              onClick={() => {
                                const next = new Set(bookmarkedSentences);
                                if (next.has(i)) next.delete(i);
                                else next.add(i);
                                setBookmarkedSentences(next);
                              }}
                              className={`flex flex-col gap-3 p-5 rounded-xl transition-all duration-300 relative cursor-pointer group hover:bg-slate-200/50 ${
                                isBookmarked 
                                  ? 'bg-white shadow-[0_10px_30px_rgba(255,153,51,0.08)] border-l-4 border-l-[#FF9933]' 
                                  : 'border border-transparent bg-slate-50/50 hover:bg-slate-100'
                              }`}
                            >
                              {isBookmarked && (
                                <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-xl bg-[#FF9933]" />
                              )}
                              <div className="flex justify-between items-center z-10">
                                <span className="self-start text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-200/80 px-2 py-1 rounded">
                                  {sum.speaker}
                                </span>
                                <Bookmark 
                                  size={16} 
                                  className={`transition-all ${
                                    isBookmarked 
                                      ? 'text-[#FF9933] fill-[#FF9933] drop-shadow-[0_0_4px_rgba(255,153,51,0.3)]' 
                                      : 'text-slate-300 hover:text-[#FF9933] opacity-60 group-hover:opacity-100'
                                  }`} 
                                />
                              </div>
                              <p className="text-xl md:text-2xl text-slate-800 leading-snug font-semibold tracking-tight z-10">
                                {renderHighlightedText(sum.text, selectedMeeting.summary.keywords)}
                              </p>
                              {selectedMeeting.isGoogleEvent && (
                                <p className="text-xs font-bold text-slate-500 mt-3 font-mono tracking-wide z-10 uppercase flex items-center gap-1.5 animate-pulse">
                                  <Lock size={14} className="text-slate-400 shrink-0" />
                                  Upload your transcript to analyze
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedMeeting.isGoogleEvent && (
                    <div className="mt-8 hud-glass border border-dashed border-purple-500/20 hover:border-purple-500/40 transition-colors p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-4">
                      <div className="p-3 bg-purple-500/10 text-purple-400 rounded-full">
                        <Upload size={24} className="animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Upload your transcript to analyze</h4>
                        <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                          This is an upcoming synchronized Google Calendar meeting. Process its audio transcript to unlock AI summary extraction, conflict heatmaps, action item trackers, and key analytics.
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2 pt-2">
                        <label className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-xs font-bold font-mono uppercase tracking-wider cursor-pointer flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                          <Upload size={12} />
                          <span>Select Transcript File</span>
                          <input 
                            type="file" 
                            accept=".txt" 
                            className="hidden" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              const formData = new FormData();
                              formData.append('transcript', file);
                              
                              try {
                                setIsSyncing(true);
                                const res = await fetch(getApiUrl('/api/upload'), {
                                  method: 'POST',
                                  body: formData
                                });
                                const result = await res.json();
                                if (result.success) {
                                  const newData = result.data;
                                  setSelectedMeeting({
                                    ...selectedMeeting,
                                    isGoogleEvent: false,
                                    summary: newData.summary,
                                    action_items: newData.action_items,
                                    conflicts: newData.conflicts,
                                    analytics: newData.analytics,
                                    transcript: newData.transcript,
                                    ai_recommendation: newData.ai_recommendation
                                  });
                                } else {
                                  alert(result.error || "Failed to process transcript.");
                                }
                              } catch (err) {
                                console.error("Upload failed", err);
                                alert("Failed to connect to processing engine.");
                              } finally {
                                setIsSyncing(false);
                              }
                            }}
                          />
                        </label>
                        <span className="text-[10px] text-slate-600 font-mono">Supports raw .txt meeting logs</span>
                      </div>
                    </div>
                  )}

                  {/* Export & Bookmark Control Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 mt-6 bg-[#131316] border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (!selectedMeeting) return;
                          const next = new Set(bookmarkedMeetings);
                          if (next.has(selectedMeeting.title)) {
                            next.delete(selectedMeeting.title);
                          } else {
                            next.add(selectedMeeting.title);
                          }
                          setBookmarkedMeetings(next);
                        }}
                        className={`px-4 py-2 rounded-md text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${
                          bookmarkedMeetings.has(selectedMeeting.title) 
                            ? 'bg-[#FF9933] text-white shadow-[0_0_15px_rgba(255,153,51,0.4)]' 
                            : 'bg-[#0A0A0C] text-[#FF9933] border border-[#FF9933]/30 hover:border-[#FF9933]/60'
                        }`}
                      >
                        <Bookmark size={14} className={bookmarkedMeetings.has(selectedMeeting.title) ? 'fill-white text-white' : 'text-[#FF9933]'} />
                        {bookmarkedMeetings.has(selectedMeeting.title) ? 'Summary Bookmarked' : 'Bookmark Summary'}
                      </button>
                      {bookmarkedSentences.size > 0 && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {bookmarkedSentences.size} sentence(s) bookmarked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative group">
                        <button className="px-4 py-2 bg-[#FF9933] hover:bg-[#FF9933]/90 text-white rounded-md text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all">
                          <Upload size={12} className="rotate-180" /> Export Options
                        </button>
                        
                        {/* Dropdown Menu */}
                        <div className="absolute right-0 bottom-full mb-2 w-56 bg-[#131316] border border-slate-800 rounded-lg shadow-xl py-2 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all z-30">
                          <button 
                            onClick={() => handleExport('md')}
                            className="w-full text-left px-4 py-2 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            Download Markdown (.md)
                          </button>
                          <button 
                            onClick={() => handleExport('json')}
                            className="w-full text-left px-4 py-2 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            Download JSON (.json)
                          </button>
                          <button 
                            onClick={() => handleExport('txt')}
                            className="w-full text-left px-4 py-2 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            Download Plain Text (.txt)
                          </button>
                          <button 
                            onClick={() => handleExport('copy')}
                            className="w-full text-left px-4 py-2 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            Copy to Clipboard
                          </button>

                          {bookmarkedSentences.size > 0 && (
                            <>
                              <div className="border-t border-slate-800 my-1"></div>
                              <button 
                                onClick={() => handleExport('md', true)}
                                className="w-full text-left px-4 py-2 text-xs font-mono text-[#FF9933] hover:bg-slate-800 transition-colors font-semibold"
                              >
                                Export Bookmarks Only (.md)
                              </button>
                              <button 
                                onClick={() => handleExport('json', true)}
                                className="w-full text-left px-4 py-2 text-xs font-mono text-[#FF9933] hover:bg-slate-800 transition-colors font-semibold"
                              >
                                Export Bookmarks Only (.json)
                              </button>
                              <button 
                                onClick={() => handleExport('copy', true)}
                                className="w-full text-left px-4 py-2 text-xs font-mono text-[#FF9933] hover:bg-slate-800 transition-colors font-semibold"
                              >
                                Copy Bookmarks Only
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'conflicts' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {selectedMeeting.conflicts && (selectedMeeting.conflicts.contradictions?.length > 0 || selectedMeeting.conflicts.unresolved?.length > 0) ? (
                    <>
                      {selectedMeeting.conflicts.contradictions?.filter(c => !c.includes("No explicit contradictions")).map((c, i) => renderConflictCard(c, 'contradiction', i))}
                      {selectedMeeting.conflicts.unresolved?.filter(u => !u.includes("No ignored questions")).map((u, i) => renderConflictCard(u, 'unresolved', i))}
                    </>
                  ) : (
                    <div className="text-center p-20 text-slate-600 font-mono border border-dashed border-slate-800 rounded-xl">No conflicts detected in system analysis.</div>
                  )}
                </div>
              )}

              {activeTab === 'members' && (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(selectedMeeting.analytics).map(([name, stats]) => (
                      <div key={name} className="flex flex-col gap-6 p-6 bg-[#131316] rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-white text-xl">{name}</span>
                              <span>{getSentimentIcon(stats.sentiment)}</span>
                            </div>
                            {stats.role && (
                              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-2">{stats.role}</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-auto pt-4 border-t border-slate-800/50">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">
                            <span>Participation Threshold</span>
                            <span className="text-cyan-400">{stats.participation}</span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-cyan-500 h-full rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: stats.participation }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="max-w-4xl mx-auto space-y-4 pb-24 group/actions relative animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {selectedMeeting.action_items.map((item, i) => {
                    const isResolved = resolvedActions.has(i);
                    return (
                      <div key={i}
                        className={`p-6 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center gap-5 transition-all duration-300 ease-in-out ${isResolved ? 'opacity-0 scale-95 pointer-events-none absolute w-full' : 'bg-[#131316] hover:border-slate-700 relative opacity-100 scale-100 shadow-lg'}`}>
                        <div className="shrink-0 flex items-center gap-3">
                          <button 
                            onClick={() => {
                              const newSet = new Set(resolvedActions);
                              if (isResolved) newSet.delete(i);
                              else newSet.add(i);
                              setResolvedActions(newSet);
                            }}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isResolved ? 'bg-purple-600 border-purple-600' : 'border-slate-600 hover:border-purple-500'}`}
                          >
                            {isResolved && <Check size={12} className="text-white" />}
                          </button>
                          <span className="text-[10px] font-mono text-slate-300 uppercase tracking-widest border border-slate-700 px-2.5 py-1.5 bg-slate-900/50 rounded">{item.assigned_to}</span>
                        </div>
                        <p className={`text-sm flex-1 font-mono leading-relaxed transition-all ${isResolved ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{item.task}</p>
                        <div className="shrink-0 flex items-center gap-4">
                          {item.deadlines?.length > 0 && <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest border border-cyan-900/50 bg-cyan-950/30 px-3 py-1.5 rounded">{item.deadlines.join(', ')}</span>}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const subject = encodeURIComponent(`Action Item: ${item.task}`);
                              const body = encodeURIComponent(`Hi ${item.assigned_to},\n\nI'm following up on this action item from our meeting: \n\n"${item.task}"\n\nPriority: ${item.priority}\nDeadline: ${item.deadlines?.join(', ') || 'N/A'}\n\nSent from Kage Dashboard.`);
                              window.location.href = `mailto:?subject=${subject}&body=${body}`;
                            }}
                            className="p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white rounded transition-all group"
                          >
                            <span className="sr-only">Email Followup</span>
                            <Mail size={14} className="group-hover:scale-110" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {resolvedActions.size === selectedMeeting.action_items.length && selectedMeeting.action_items.length > 0 && (
                    <div className="text-center p-20 text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl bg-[#131316]/30">All tasks resolved.</div>
                  )}
                </div>
              )}

              {activeTab === 'transcript' && (
                <div className="max-w-4xl mx-auto bg-[#131316] p-10 rounded-xl border border-slate-800 group/transcript animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-6">
                    {selectedMeeting.transcript.segments.map((line, i) => (
                      <div key={i} className="flex gap-6 transition-opacity duration-300 hover:!opacity-100 group-hover/transcript:opacity-30 py-2 rounded">
                        <span className="text-[10px] font-mono text-slate-600 mt-1 w-16 shrink-0 tracking-widest">{line.time}</span>
                        <div className="flex-1">
                          <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest mb-2 flex items-center">
                            {line.speaker}
                            <SentimentGlyph speaker={line.speaker} />
                          </span>
                          <p className="text-[15px] text-slate-300 font-mono leading-relaxed">{line.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Floating AI Recommendation */}
              {activeTab === 'summary' && selectedMeeting.ai_recommendation && showAIRecommendation && (
                <div className="absolute bottom-8 right-8 max-w-sm bg-[#0A0A0C]/90 backdrop-blur-xl p-6 border border-purple-500/30 shadow-[0_0_30px_rgba(128,90,213,0.15)] rounded-xl z-10 group/tip animate-in slide-in-from-bottom-8 fade-in duration-500">
                  <button
                    onClick={() => setShowAIRecommendation(false)}
                    className="absolute top-3 right-3 text-slate-600 hover:text-white p-1.5 bg-slate-900/50 hover:bg-slate-800 rounded-full transition-all"
                    aria-label="Close"
                  >
                    <X size={14} />
                  </button>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg shrink-0 mt-0.5 border border-purple-500/20">
                      <Lightbulb size={18} />
                    </div>
                    <div className="pr-4">
                      <h3 className="font-mono text-[10px] text-purple-500 uppercase tracking-widest mb-2 font-bold">System Intelligence</h3>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                        <DecodeText text={selectedMeeting.ai_recommendation} />
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {isSchedulingModalOpen && (
        <div className="fixed inset-0 bg-[#0A0A0C]/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="hud-glass p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-lg w-full relative"
          >
            <div className="flex justify-between items-center border-b border-slate-800/50 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Schedule_Google_Cal_Event</h3>
              </div>
              <button 
                onClick={() => setIsSchedulingModalOpen(false)}
                className="text-slate-600 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleScheduleMeeting} className="space-y-5 font-mono text-xs text-slate-300">
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Meeting Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sprint API Design Review"
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  className="w-full bg-[#131316] border border-slate-800 focus:border-blue-500/50 rounded-lg px-4.5 py-3 outline-none transition-colors text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 block">Date</label>
                  <input
                    type="date"
                    required
                    value={newMeetingDate}
                    onChange={(e) => setNewMeetingDate(e.target.value)}
                    className="w-full bg-[#131316] border border-slate-800 focus:border-blue-500/50 rounded-lg px-3 py-3 outline-none transition-colors text-white text-xs"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 block">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newMeetingStartTime}
                    onChange={(e) => setNewMeetingStartTime(e.target.value)}
                    className="w-full bg-[#131316] border border-slate-800 focus:border-blue-500/50 rounded-lg px-3 py-3 outline-none transition-colors text-white text-xs"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 block">End Time</label>
                  <input
                    type="time"
                    required
                    value={newMeetingEndTime}
                    onChange={(e) => setNewMeetingEndTime(e.target.value)}
                    className="w-full bg-[#131316] border border-slate-800 focus:border-blue-500/50 rounded-lg px-3 py-3 outline-none transition-colors text-white text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-slate-500 block">Description / Agenda</label>
                <textarea
                  placeholder="Outline key blockers, topic parameters, and context guidelines..."
                  rows={3}
                  value={newMeetingDescription}
                  onChange={(e) => setNewMeetingDescription(e.target.value)}
                  className="w-full bg-[#131316] border border-slate-800 focus:border-blue-500/50 rounded-lg px-4.5 py-3 outline-none transition-colors text-white text-xs resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-slate-500 block">Attendee Emails (comma separated)</label>
                <input
                  type="text"
                  placeholder="rahul@kage.ai, bruno@kage.ai"
                  value={newMeetingAttendees}
                  onChange={(e) => setNewMeetingAttendees(e.target.value)}
                  className="w-full bg-[#131316] border border-slate-800 focus:border-blue-500/50 rounded-lg px-4.5 py-3 outline-none transition-colors text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSchedulingModalOpen(false)}
                  className="px-4.5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-[10px] uppercase font-bold tracking-wider hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newMeetingLoading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 text-white rounded-lg text-[10px] uppercase font-bold tracking-wider hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] disabled:hover:shadow-none transition-all flex items-center gap-1.5"
                >
                  {newMeetingLoading ? 'Scheduling...' : 'Confirm Sync'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}