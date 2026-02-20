import React, { useState, useEffect } from 'react';
import { Play, Square, Pause, Settings, Layers, ListMusic, Piano, ZoomIn, ZoomOut, Repeat, Download } from 'lucide-react';

interface TopBarProps {
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onPause: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  timeString: string;
  currentView: 'arrangement' | 'pianoroll';
  onViewChange: (view: 'arrangement' | 'pianoroll') => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  onExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isPlaying,
  onPlay,
  onStop,
  onPause,
  bpm,
  onBpmChange,
  timeString,
  currentView,
  onViewChange,
  zoom,
  onZoomIn,
  onZoomOut,
  isLooping,
  onToggleLoop,
  onExport
}) => {
  const [bpmInput, setBpmInput] = useState(bpm.toString());

  useEffect(() => {
    setBpmInput(bpm.toString());
  }, [bpm]);

  const handleBpmSubmit = () => {
    const val = parseInt(bpmInput);
    if (!isNaN(val) && val >= 40 && val <= 300) {
      onBpmChange(val);
    } else {
      setBpmInput(bpm.toString());
    }
  };

  return (
    <div className="h-14 border-b border-[#222] bg-[#0A0A0A] flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#1a44ff] flex items-center justify-center shadow-[0_0_10px_#1a44ff40]">
            <Layers size={16} className="text-white" />
          </div>
          <span className="font-sans font-semibold text-sm tracking-widest uppercase text-white hidden sm:block">
            WEB-FL
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={isPlaying ? onPause : onPlay}
            className={`w-10 h-10 flex items-center justify-center transition-all ${isPlaying ? 'bg-[#1a44ff] text-white shadow-[0_0_15px_#1a44ff80]' : 'bg-[#111] text-[#aaa] hover:bg-[#222] hover:text-white border border-[#222]'}`}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
          <button
            onClick={onStop}
            className="w-10 h-10 flex items-center justify-center bg-[#111] text-[#aaa] hover:bg-[#222] hover:text-white border border-[#222] transition-colors"
          >
            <Square size={14} fill="currentColor" />
          </button>
        </div>
      </div>

      <div className="hidden md:flex flex-col items-center justify-center bg-[#050505] border border-[#222] px-6 py-1 h-10 min-w-[140px] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(90deg, #1a44ff 1px, transparent 1px)', backgroundSize: '4px 100%' }}></div>
        <div className="text-[10px] text-[#666] uppercase tracking-[0.2em] mb-0.5 relative z-10">Timeline</div>
        <div className="text-sm font-mono font-medium tracking-widest text-white relative z-10">
          {timeString}
        </div>
      </div>

      <div className="flex items-center gap-4">
        
        {/* Zoom & Loop Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onToggleLoop}
            className={`h-10 px-3 flex items-center gap-2 border border-[#222] transition-colors ${isLooping ? 'bg-[#1a44ff]/20 text-[#1a44ff]' : 'bg-[#111] text-[#666] hover:text-[#aaa] hover:bg-[#222]'}`}
            title="Toggle Loop"
          >
            <Repeat size={14} />
          </button>

          <div className="flex h-10 bg-[#111] border border-[#222]">
            <button onClick={onZoomOut} className="px-3 text-[#666] hover:text-white hover:bg-[#222] transition-colors"><ZoomOut size={14} /></button>
            <div className="text-[10px] text-[#666] font-mono flex items-center justify-center w-10 bg-[#050505] border-x border-[#222]">{Math.round(zoom * 100)}%</div>
            <button onClick={onZoomIn} className="px-3 text-[#666] hover:text-white hover:bg-[#222] transition-colors"><ZoomIn size={14} /></button>
          </div>
        </div>

        {/* View Toggles */}
        <div className="flex h-10 bg-[#111] border border-[#222]">
          <button 
            onClick={() => onViewChange('arrangement')}
            className={`px-3 flex items-center gap-2 transition-colors ${currentView === 'arrangement' ? 'bg-[#222] text-white' : 'text-[#666] hover:text-[#aaa]'}`}
          >
            <ListMusic size={14} />
          </button>
          <button 
            onClick={() => onViewChange('pianoroll')}
            className={`px-3 flex items-center gap-2 transition-colors ${currentView === 'pianoroll' ? 'bg-[#222] text-white' : 'text-[#666] hover:text-[#aaa]'}`}
          >
            <Piano size={14} />
          </button>
        </div>

        <div className="flex items-center h-10 bg-[#111] border border-[#222] px-3">
          <div className="text-[10px] text-[#666] uppercase tracking-widest mr-3">BPM</div>
          <input
            type="text"
            value={bpmInput}
            onChange={(e) => setBpmInput(e.target.value)}
            onBlur={handleBpmSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleBpmSubmit()}
            className="w-10 bg-transparent text-sm font-mono text-white outline-none text-right"
          />
        </div>
        
        <button 
          onClick={onExport}
          className="h-10 px-3 flex items-center justify-center text-[#666] hover:text-white transition-colors bg-[#111] border border-[#222] gap-2"
          title="Export to WAV"
        >
          <Download size={16} />
          <span className="text-[10px] uppercase">Export</span>
        </button>

        <button className="h-10 px-3 flex items-center justify-center text-[#666] hover:text-white transition-colors bg-[#111] border border-[#222]">
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
};
