"use client";
import React, { useState, useEffect } from 'react';
import { Circle, CircleDashed, CircleX, Upload, FileText, Type, X, Terminal, AudioLines, Lightbulb, Check, Mail, CheckCircle2 } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

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
  summary: {
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

export default function NLPDashboard() {
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300, 500], [1, 0.5, 0]);
  const heroY = useTransform(scrollY, [0, 500], [0, 100]);

  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      if (latest > 300 && !hasEntered) {
        setHasEntered(true);
        window.scrollTo(0, 0);
      }
    });
    return () => unsubscribe();
  }, [scrollY, hasEntered]);

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
  
  // Calendar State
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'conflicts', label: 'Conflicts' },
    { id: 'members', label: 'Members & Roles' },
    { id: 'actions', label: 'Action Items' },
    { id: 'transcript', label: 'Transcript' }
  ] as const;

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
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

  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setResolvedActions(new Set());
    setShowAIRecommendation(true);
  }, [selectedMeeting]);

  useEffect(() => {
    fetch('/processed_data.json')
      .then((res) => res.json())
      .then((json: MeetingData) => {
        if (!json.title) json.title = "Legacy Uploaded Meeting";
        if (!json.timestamp) json.timestamp = new Date().toLocaleString();
        setPastMeetings([json]);
      })
      .catch((e) => console.log("No initial data found", e));
  }, []);

  const handleUpload = async () => {
    setUploading(true);
    const formData = new FormData();

    if (uploadMode === 'file' && file) {
      formData.append('transcript', file);
    } else if (uploadMode === 'text' && pastedText) {
      formData.append('text', pastedText);
      formData.append('title', meetingTitle || 'Meeting');
    } else {
      setUploading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/upload', {
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
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
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

  const meetingsByDay = new Map<number, MeetingData[]>();
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
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#FF9933] to-[#000080] shadow-[0_0_15px_rgba(255,153,51,0.3)]"></div>
        
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
          <div className="bg-[#000080]/15 border-l-2 border-[#FF9933] p-4 rounded-r-lg font-mono text-sm text-slate-300 shadow-[0_4px_15px_rgba(0,0,0,0.2)] animate-in fade-in slide-in-from-left-4 duration-300">
            <span className="text-[#FF9933] font-bold flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider">
              💡 AI Suggestion
            </span>
            <p className="leading-relaxed text-slate-300 text-xs md:text-sm whitespace-pre-line">{suggestion}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#0A0A0C] text-slate-200 font-sans selection:bg-purple-500/30">

      {/* Scrollable Hero Section */}
      {!hasEntered && (
        <motion.div 
          style={{ opacity: heroOpacity, y: heroY }}
          className="h-screen flex flex-col items-center justify-center relative overflow-hidden px-6"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-[#0A0A0C] to-[#0A0A0C] pointer-events-none"></div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="text-center z-10 max-w-5xl"
          >
            <img src="/kage_logo.svg" alt="Kage.ai Logo" className="w-48 h-48 mx-auto mb-8 drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]" />
            <h1 className="text-7xl md:text-9xl font-bold text-white tracking-tighter mb-6 drop-shadow-2xl">KAGE.ai</h1>
            <p className="text-2xl md:text-4xl text-purple-400 font-mono tracking-tight mb-8 drop-shadow-md">
              Transcribe. Analyze. Automate.
            </p>
            <p className="text-lg md:text-xl text-slate-400 font-sans leading-relaxed max-w-3xl mx-auto">
              Extract high-fidelity intelligence from your raw meeting transcripts. Kage employs advanced natural language processing to surface technical blockers, track action items, and detect alignment conflicts instantly.
            </p>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            animate={{ y: [0, 15, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 text-slate-500"
          >
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-[0.3em] font-mono mb-4">Scroll to Initialize</span>
              <div className="w-px h-16 bg-gradient-to-b from-purple-500/50 to-transparent"></div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Dashboard Section */}
      <div className="min-h-screen p-8 relative z-10 bg-[#0A0A0C]">
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
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Feed raw transcript into neural engine</p>
                    </div>
                  </div>

                  <div className="flex bg-[#0A0A0C] p-1 rounded-lg border border-slate-800 ml-auto md:ml-0">
                    <button
                      className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${uploadMode === 'file' ? 'bg-[#131316] text-white border border-slate-700' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
                      onClick={() => setUploadMode('file')}
                    >
                      <FileText size={16} /> File
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${uploadMode === 'text' ? 'bg-[#131316] text-white border border-slate-700' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
                      onClick={() => setUploadMode('text')}
                    >
                      <Type size={16} /> Text
                    </button>
                  </div>
                </div>

                {uploadMode === 'file' && (
                  <div className="flex items-center gap-4 p-4 border border-dashed border-slate-700 rounded-xl bg-black/40 hover:bg-black/60 transition-colors">
                    <input
                      type="file"
                      accept=".txt"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="text-sm file:mr-4 file:py-2.5 file:px-5 file:rounded-md file:border-0 file:text-xs file:font-mono file:font-bold file:uppercase file:tracking-wider file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20 file:transition-colors cursor-pointer w-full text-slate-400 focus:outline-none"
                    />
                  </div>
                )}

                {uploadMode === 'text' && (
                  <div className="space-y-4 animate-in fade-in">
                    <input
                      type="text"
                      placeholder="Meeting Title"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      className="w-full max-w-md px-4 py-3 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-purple-500/50 bg-[#0A0A0C] text-white transition-colors"
                    />
                    <textarea
                      placeholder="Raw transcript..."
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      className="w-full h-40 p-4 border border-slate-800 rounded-xl text-sm font-mono focus:outline-none focus:border-purple-500/50 bg-[#0A0A0C] text-slate-300 transition-colors resize-none"
                    ></textarea>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleUpload}
                    disabled={uploading || (uploadMode === 'file' ? !file : !pastedText)}
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
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors text-lg">{meeting.title}</h3>
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
            </motion.div>

            {/* Right Sidebar */}
            <motion.div variants={fadeUpVariant} className="lg:col-span-1 space-y-8 flex flex-col relative h-full">
              <div className="grid grid-cols-1 gap-6 sticky top-8">
                {/* Calendar Widget */}
                <div className="hud-glass p-6 rounded-2xl border border-slate-800/50 shadow-2xl">
                  <div className="flex justify-between items-center border-b border-slate-800/50 pb-4 mb-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tactical_Schedule</h3>
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
                      const hasMeeting = meetingsByDay.has(d);
                      return (
                        <div key={d} className="relative flex justify-center items-center">
                          <div 
                            onClick={() => handleDayClick(d)}
                            className={`p-1 text-[11px] font-mono rounded-full flex items-center justify-center w-7 h-7 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-500/20 text-white border border-purple-500'
                              : isToday 
                                ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                                : hasMeeting
                                  ? 'bg-purple-900/40 text-purple-200 border border-purple-500/30 hover:bg-purple-800/60'
                                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}>
                            {d}
                          </div>
                          {hasMeeting && (
                            <div className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-cyan-400'}`}></div>
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
                          className="p-3 bg-purple-500/5 border border-slate-800 rounded-lg cursor-pointer hover:border-purple-500/50 transition-all"
                        >
                          <p className="text-[11px] font-bold text-white mb-1">{m.title}</p>
                          <span className="text-[9px] font-mono text-slate-500 uppercase">{m.timestamp?.split(',')[1] || '09:00 AM'}</span>
                        </div>
                      )) || (
                        <div className="py-4 text-center">
                          <p className="text-[10px] font-mono text-slate-600 uppercase italic">No active deployments found</p>
                        </div>
                      )}
                    </div>

                    <button className="w-full py-3 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                      Manual Schedule Override
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
        <button className="flex items-center gap-3 bg-[#131316]/90 backdrop-blur-xl px-5 py-3 rounded-full border border-purple-500/30 shadow-[0_0_20px_rgba(128,90,213,0.15)] hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] transition-all group">
          <Terminal size={16} className="text-purple-400 group-hover:text-purple-300" />
          <span className="text-xs font-bold text-slate-300 group-hover:text-white tracking-wide">Ask Kage</span>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-1"></div>
        </button>
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
                {tabs.map((tab, idx) => (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    onClick={() => setActiveTab(tab.id as any)}
                    onKeyDown={(e) => handleTabKeyDown(e, idx)}
                    className={`pb-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131316] ${activeTab === tab.id
                        ? 'border-[#FF9933] text-white drop-shadow-[0_0_8px_rgba(255,153,51,0.5)]'
                        : 'border-transparent text-slate-600 hover:text-slate-300'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
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
                    <div className="bg-slate-100/95 backdrop-blur-xl border border-slate-300/50 rounded-xl p-10 shadow-[0_0_50px_rgba(168,85,247,0.1)] transform transition-transform">
                      <div className="space-y-8">
                        {selectedMeeting.summary.executive_summary.map((sum, i) => (
                          <div key={i} className="flex flex-col gap-3">
                            <span className="self-start text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-200/80 px-2 py-1 rounded">{sum.speaker}</span>
                            <p className="text-xl md:text-2xl text-slate-800 leading-snug font-semibold tracking-tight">{sum.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
    </div>
  );
}