/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, BarChart2, Calendar, Clock, ChevronRight, Database, CheckCircle2 } from 'lucide-react';
import { format, differenceInMilliseconds, isAfter, isBefore, parseISO } from 'date-fns';
import { get, set } from 'idb-keyval';
import { cn } from './lib/utils';

type View = 'progress' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('progress');
  const [isLoaded, setIsLoaded] = useState(false);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString());
  const [endDate, setEndDate] = useState<string>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

  // Load from IndexedDB
  useEffect(() => {
    async function loadData() {
      const savedStart = await get('horizon_start');
      const savedEnd = await get('horizon_end');
      
      if (savedStart) setStartDate(savedStart);
      if (savedEnd) setEndDate(savedEnd);
      setIsLoaded(true);
    }
    loadData();
  }, []);

  // Save to IndexedDB
  const handleSetStart = async (s: string) => {
    setStartDate(s);
    await set('horizon_start', s);
  };

  const handleSetEnd = async (e: string) => {
    setEndDate(e);
    await set('horizon_end', e);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <motion.div 
          animate={{ opacity: [0.4, 1, 0.4] }} 
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 font-mono text-xs uppercase tracking-widest"
        >
          Initializing DB...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-zinc-500/30">
      <AnimatePresence mode="wait">
        {view === 'progress' ? (
          <ProgressPage 
            key="progress" 
            startDate={startDate} 
            endDate={endDate} 
            onNavigate={() => setView('settings')} 
          />
        ) : (
          <SettingsPage 
            key="settings" 
            startDate={startDate} 
            endDate={endDate} 
            onSetStart={handleSetStart} 
            onSetEnd={handleSetEnd} 
            onNavigate={() => setView('progress')} 
          />
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-900/50 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-4 sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 sm:bottom-6 sm:rounded-full sm:border sm:shadow-2xl">
        <button 
          onClick={() => setView('progress')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            view === 'progress' ? "text-white scale-110" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <BarChart2 size={20} strokeWidth={view === 'progress' ? 2.5 : 2} />
          <span className="text-[10px] font-medium tracking-wider uppercase">Progress</span>
        </button>
        <button 
          onClick={() => setView('settings')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            view === 'settings' ? "text-white scale-110" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Settings size={20} strokeWidth={view === 'settings' ? 2.5 : 2} />
          <span className="text-[10px] font-medium tracking-wider uppercase">Settings</span>
        </button>
      </nav>
    </div>
  );
}

function ProgressPage({ startDate, endDate, onNavigate }: { startDate: string, endDate: string, onNavigate: () => void, key?: string }) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const now = new Date();

      if (isBefore(now, start)) {
        setProgress(0);
        setTimeLeft('Starts soon');
        return;
      }

      if (isAfter(now, end)) {
        setProgress(100);
        setTimeLeft('Completed');
        return;
      }

      const total = differenceInMilliseconds(end, start);
      const elapsed = differenceInMilliseconds(now, start);
      const p = (elapsed / total) * 100;
      setProgress(Math.min(100, Math.max(0, p)));

      // Human readable time left
      const remainingMs = differenceInMilliseconds(end, now);
      const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) setTimeLeft(`${days}d ${hours}h left`);
      else if (hours > 0) setTimeLeft(`${hours}h ${mins}m left`);
      else setTimeLeft(`${mins}m left`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-6 pt-16 flex flex-col items-center justify-center min-h-screen text-center max-w-lg mx-auto"
    >
      <header className="mb-12">
        <h1 className="text-4xl font-light tracking-tight mb-2 text-zinc-100 italic font-serif">Horizon</h1>
        <p className="text-zinc-500 text-sm flex items-center justify-center gap-2">
          <Calendar size={14} />
          {format(parseISO(startDate), 'MMM d, yyyy')} — {format(parseISO(endDate), 'MMM d, yyyy')}
        </p>
      </header>

      <div className="w-full space-y-8">
        <div className="relative pt-1">
          <div className="flex mb-4 items-end justify-between">
            <div>
              <span className="text-6xl font-bold tracking-tighter text-white">
                {progress.toFixed(1)}%
              </span>
              <span className="text-zinc-500 ml-2 text-sm uppercase tracking-widest font-medium">covered</span>
            </div>
          </div>
          
          <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-zinc-900 border border-white/5 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-white rounded-full"
            />
          </div>

          <div className="flex justify-between items-center text-xs text-zinc-500 uppercase tracking-tighter">
            <div className="flex items-center gap-1.5">
              <Clock size={12} />
              {timeLeft}
            </div>
            <div className="font-mono">{format(new Date(), 'HH:mm:ss')}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="p-4 rounded-3xl bg-zinc-900/50 border border-white/5 flex flex-col items-start gap-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Start</span>
            <span className="text-sm font-medium">{format(parseISO(startDate), 'dd MMM')}</span>
          </div>
          <div className="p-4 rounded-3xl bg-zinc-900/50 border border-white/5 flex flex-col items-start gap-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Target</span>
            <span className="text-sm font-medium">{format(parseISO(endDate), 'dd MMM')}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={onNavigate}
        className="mt-12 group flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
      >
        Adjust Timeline
        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
}

function SettingsPage({ 
  startDate, 
  endDate, 
  onSetStart, 
  onSetEnd, 
  onNavigate 
}: { 
  startDate: string, 
  endDate: string, 
  onSetStart: (s: string) => void, 
  onSetEnd: (e: string) => void,
  onNavigate: () => void,
  key?: string
}) {
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (type: 'start' | 'end', val: string) => {
    setSaving(true);
    if (type === 'start') onSetStart(val);
    else onSetEnd(val);
    // Simulate slight delay for "Professional DB" feel
    setTimeout(() => setSaving(false), 600);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="p-6 pt-24 pb-32 max-w-md mx-auto"
    >
      <header className="mb-12">
        <h2 className="text-3xl font-light tracking-tight text-white flex items-center gap-3">
          Timeline
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 uppercase tracking-widest">Settings</span>
        </h2>
        <p className="text-zinc-500 text-sm mt-2">Manage your persistent chronology.</p>
      </header>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-4 flex items-center gap-2">
            Start Reference
            {saving && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full border border-zinc-500 border-t-transparent" />}
          </label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="datetime-local" 
              value={format(parseISO(startDate), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => handleUpdate('start', new Date(e.target.value).toISOString())}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-4 pl-12 text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-4 flex items-center gap-2">
            Target Horizon
          </label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="datetime-local" 
              value={format(parseISO(endDate), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => handleUpdate('end', new Date(e.target.value).toISOString())}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-4 pl-12 text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-8 flex flex-col gap-4">
          <button 
            onClick={onNavigate}
            className="w-full bg-white text-black font-semibold rounded-2xl p-4 active:scale-95 transition-transform"
          >
            Update Dashboard
          </button>
          
          <div className="p-4 rounded-2xl bg-zinc-900/30 border border-dashed border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database size={16} className="text-zinc-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Database Status</span>
                <span className="text-[11px] text-zinc-600">IndexedDB / Chrome Native</span>
              </div>
            </div>
            <CheckCircle2 size={16} className="text-emerald-500/50" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
