import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import { TopBar } from './components/TopBar';
import { TrackList } from './components/TrackList';
import { ArrangementView } from './components/ArrangementView';
import { PianoRoll } from './components/PianoRoll';
import { AppState, TrackData, ClipData, NoteData } from './types';
import { DEFAULT_BPM, DEFAULT_TRACKS } from './constants';
import { audioEngine } from './services/AudioEngine';

export default function App() {
  const [state, setState] = useState<AppState>({
    isPlaying: false,
    bpm: DEFAULT_BPM,
    currentView: 'arrangement',
    activeClipId: null,
    tracks: DEFAULT_TRACKS,
    zoom: 1,
    isLooping: true,
    loopEndStep: null
  });

  const [timeString, setTimeString] = useState("00:00:00");
  const [currentStep, setCurrentStep] = useState(0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    audioEngine.setBpm(DEFAULT_BPM);
    audioEngine.updateTracks(state.tracks);
    audioEngine.setLoopSettings(state.isLooping, state.loopEndStep);

    const updateVisuals = () => {
      const step = audioEngine.getPlaybackStep();
      setCurrentStep(step);
      
      const totalSixteenths = Math.floor(step);
      const bars = Math.floor(totalSixteenths / 16).toString().padStart(2, '0');
      const beats = Math.floor((totalSixteenths % 16) / 4).toString().padStart(2, '0');
      const sixteenths = Math.floor(totalSixteenths % 4).toString().padStart(2, '0');
      setTimeString(`${bars}:${beats}:${sixteenths}`);

      animFrameRef.current = requestAnimationFrame(updateVisuals);
    };
    
    animFrameRef.current = requestAnimationFrame(updateVisuals);

    return () => cancelAnimationFrame(animFrameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        }
      }
      if (e.key === ' ') {
        e.preventDefault();
        if (state.isPlaying) {
          handlePause();
        } else {
          handlePlay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isPlaying]);

  useEffect(() => {
    audioEngine.updateTracks(state.tracks);
  }, [state.tracks]);

  useEffect(() => {
    audioEngine.setLoopSettings(state.isLooping, state.loopEndStep);
  }, [state.isLooping, state.loopEndStep]);

  // Transport
  const handlePlay = async () => {
    await audioEngine.startPlayback();
    setState(prev => ({ ...prev, isPlaying: true }));
  };
  const handleStop = () => {
    audioEngine.stopPlayback();
    setState(prev => ({ ...prev, isPlaying: false }));
  };
  const handlePause = () => {
    audioEngine.pausePlayback();
    setState(prev => ({ ...prev, isPlaying: false }));
  };
  const handleBpmChange = (newBpm: number) => {
    audioEngine.setBpm(newBpm);
    setState(prev => ({ ...prev, bpm: newBpm }));
  };
  const handleSeek = (step: number) => {
    audioEngine.initialize().then(() => {
      audioEngine.seekToStep(step);
      setCurrentStep(step);
    });
  };

  const handleToggleLoop = () => setState(prev => ({ ...prev, isLooping: !prev.isLooping }));
  const handleSetLoopEnd = (step: number | null) => setState(prev => ({ ...prev, loopEndStep: step }));
  const handleZoomIn = () => setState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.25, 3) }));
  const handleZoomOut = () => setState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.25, 0.3) }));

  // View
  const handleViewChange = (view: 'arrangement' | 'pianoroll') => setState(prev => ({ ...prev, currentView: view }));

  // Track Logic
  const handleToggleMute = useCallback((id: string) => setState(prev => ({ ...prev, tracks: prev.tracks.map(t => t.id === id ? { ...t, muted: !t.muted } : t) })), []);
  const handleToggleSolo = useCallback((id: string) => setState(prev => ({ ...prev, tracks: prev.tracks.map(t => t.id === id ? { ...t, soloed: !t.soloed } : t) })), []);
  const handleVolumeChange = useCallback((id: string, volume: number) => setState(prev => ({ ...prev, tracks: prev.tracks.map(t => t.id === id ? { ...t, volume } : t) })), []);
  const handleSynthTypeChange = useCallback((id: string, type: string) => setState(prev => ({ ...prev, tracks: prev.tracks.map(t => t.id === id ? { ...t, synthType: type as any } : t) })), []);
  const handleTrackTypeChange = useCallback((id: string, type: 'synth' | 'sampler') => setState(prev => ({ ...prev, tracks: prev.tracks.map(t => t.id === id ? { ...t, type } : t) })), []);
  const handleUploadSample = useCallback((id: string, file: File) => setState(prev => ({ ...prev, tracks: prev.tracks.map(t => t.id === id ? { ...t, sampleUrl: URL.createObjectURL(file), sampleName: file.name, type: 'sampler' } : t) })), []);
  const handleRenameTrack = useCallback((id: string, name: string) => setState(prev => ({ ...prev, tracks: prev.tracks.map(t => t.id === id ? { ...t, name } : t) })), []);
  const handleColorChange = useCallback((id: string, color: string) => setState(prev => ({ ...prev, tracks: prev.tracks.map(t => t.id === id ? { ...t, color } : t) })), []);
  const handleEffectsChange = useCallback((id: string, effects: any[]) => setState(prev => ({ ...prev, tracks: prev.tracks.map(t => t.id === id ? { ...t, effects } : t) })), []);
  
  const handleDeleteTrack = useCallback((id: string) => {
    setState(prev => ({ ...prev, tracks: prev.tracks.filter(t => t.id !== id), activeClipId: prev.tracks.find(t => t.id === id)?.clips.some(c => c.id === prev.activeClipId) ? null : prev.activeClipId }));
  }, []);

  const handleMoveTrack = useCallback((id: string, direction: 'up' | 'down') => {
    setState(prev => {
      const idx = prev.tracks.findIndex(t => t.id === id);
      if (idx < 0 || (direction === 'up' && idx === 0) || (direction === 'down' && idx === prev.tracks.length - 1)) return prev;
      const tCopy = [...prev.tracks];
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      [tCopy[idx], tCopy[swap]] = [tCopy[swap], tCopy[idx]];
      return { ...prev, tracks: tCopy };
    });
  }, []);

  const handleAddTrack = () => {
    const newTrack: TrackData = {
      id: `track-${Date.now()}`, name: `Channel ${state.tracks.length + 1}`, color: '#ffffff',
      type: 'synth', synthType: 'square', clips: [], muted: false, soloed: false, volume: 0.7,
      effects: []
    };
    setState(prev => ({ ...prev, tracks: [...prev.tracks, newTrack] }));
  };

  const handleExport = useCallback(async () => {
    const wasPlaying = state.isPlaying;
    if (wasPlaying) {
      audioEngine.stopPlayback();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
    
    try {
      const blob = await audioEngine.exportToAudio(30);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'webfl-export.wav';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [state.isPlaying]);

  // Clip & Note Logic
  const handleUpdateClips = useCallback((trackId: string, clips: ClipData[]) => {
    setState(prev => ({ ...prev, tracks: prev.tracks.map(t => t.id === trackId ? { ...t, clips } : t) }));
  }, []);

  const handleOpenPianoRoll = useCallback((clipId: string) => {
    setState(prev => ({ ...prev, currentView: 'pianoroll', activeClipId: clipId }));
  }, []);

  const handleNotesChange = useCallback((clipId: string, notes: NoteData[]) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => {
          if (c.id !== clipId) return c;
          const maxNoteEnd = notes.reduce((max, n) => Math.max(max, n.startStep + n.duration), 16);
          const newBase = maxNoteEnd > c.baseDuration ? Math.ceil(maxNoteEnd / 16) * 16 : c.baseDuration;
          return { ...c, notes, baseDuration: newBase, duration: Math.max(c.duration, newBase) };
        })
      }))
    }));
  }, []);

  let activeClip: ClipData | null = null;
  let activeTrackColor = '#fff';
  for (const t of state.tracks) {
    const found = t.clips.find(c => c.id === state.activeClipId);
    if (found) {
      activeClip = found;
      activeTrackColor = t.color;
      break;
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col font-sans select-none overflow-hidden bg-[#000]">
      <TopBar 
        isPlaying={state.isPlaying} onPlay={handlePlay} onStop={handleStop} onPause={handlePause}
        bpm={state.bpm} onBpmChange={handleBpmChange} timeString={timeString}
        currentView={state.currentView} onViewChange={handleViewChange}
        zoom={state.zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut}
        isLooping={state.isLooping} onToggleLoop={handleToggleLoop}
        onExport={handleExport}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex flex-col z-10 border-r border-[#222] h-full">
          <div className="flex-1 overflow-y-auto">
            <TrackList 
              tracks={state.tracks}
              onToggleMute={handleToggleMute} onToggleSolo={handleToggleSolo} onVolumeChange={handleVolumeChange}
              onSynthTypeChange={handleSynthTypeChange} onTrackTypeChange={handleTrackTypeChange} onUploadSample={handleUploadSample}
              onDeleteTrack={handleDeleteTrack} onMoveTrack={handleMoveTrack} onRenameTrack={handleRenameTrack} onColorChange={handleColorChange}
              onEffectsChange={handleEffectsChange}
            />
          </div>
          <div className="p-4 bg-[#0A0A0A] border-t border-[#222]">
             <button onClick={handleAddTrack} className="w-full py-2 bg-[#111] hover:bg-[#222] text-[#fff] border border-[#333] font-mono uppercase text-[10px] tracking-widest transition-colors">
               + Insert Track
             </button>
          </div>
        </div>

        {state.currentView === 'arrangement' ? (
          <ArrangementView 
            tracks={state.tracks}
            currentStep={currentStep}
            zoom={state.zoom}
            loopEndStep={state.loopEndStep}
            onSetLoopEnd={handleSetLoopEnd}
            onUpdateClips={handleUpdateClips}
            onOpenPianoRoll={handleOpenPianoRoll}
            onSeek={handleSeek}
          />
        ) : (
          <PianoRoll 
            activeClip={activeClip}
            trackColor={activeTrackColor}
            onNotesChange={handleNotesChange}
            currentStep={currentStep}
            zoom={state.zoom}
            onSeek={handleSeek}
          />
        )}
      </div>
    </div>
  );
}
