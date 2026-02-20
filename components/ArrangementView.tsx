import React, { useRef, useState, useEffect } from 'react';
import { TrackData, ClipData } from '../types';
import { ARRANGEMENT_STEPS, STEP_WIDTH } from '../constants';

interface ArrangementViewProps {
  tracks: TrackData[];
  currentStep: number;
  zoom: number;
  loopEndStep: number | null;
  onSetLoopEnd: (step: number | null) => void;
  onUpdateClips: (trackId: string, clips: ClipData[]) => void;
  onOpenPianoRoll: (clipId: string) => void;
  onSeek: (step: number) => void;
}

export const ArrangementView: React.FC<ArrangementViewProps> = ({
  tracks,
  currentStep,
  zoom,
  loopEndStep,
  onSetLoopEnd,
  onUpdateClips,
  onOpenPianoRoll,
  onSeek
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragAction, setDragAction] = useState<{ type: 'move' | 'resize', clipId: string, trackId: string, startX: number, initialVal: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, trackId: string, clipId: string, confirm: boolean } | null>(null);

  const zoomedWidth = STEP_WIDTH * zoom;
  const totalWidth = ARRANGEMENT_STEPS * zoomedWidth;

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handlePointerDownGrid = (e: React.PointerEvent<HTMLDivElement>, trackId: string) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('.clip-block') || !gridRef.current) return;
    
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const step = Math.floor(x / zoomedWidth);
    
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const newClip: ClipData = {
      id: `clip-${Date.now()}`,
      trackId: track.id,
      startStep: step,
      duration: 16,
      baseDuration: 16,
      notes: []
    };

    onUpdateClips(track.id, [...track.clips, newClip]);
  };

  const startDrag = (e: React.PointerEvent, type: 'move' | 'resize', clip: ClipData) => {
    if (e.button !== 0) return; 
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragAction({
      type, clipId: clip.id, trackId: clip.trackId,
      startX: e.clientX,
      initialVal: type === 'move' ? clip.startStep : clip.duration
    });
    setContextMenu(null);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragAction) return;
    const deltaX = e.clientX - dragAction.startX;
    const deltaSteps = Math.round(deltaX / zoomedWidth);
    
    const track = tracks.find(t => t.id === dragAction.trackId);
    if (!track) return;

    const updatedClips = track.clips.map(c => {
      if (c.id !== dragAction.clipId) return c;
      if (dragAction.type === 'move') {
        return { ...c, startStep: Math.max(0, dragAction.initialVal + deltaSteps) };
      } else {
        return { ...c, duration: Math.max(1, dragAction.initialVal + deltaSteps) };
      }
    });

    onUpdateClips(track.id, updatedClips);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragAction) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragAction(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, trackId: string, clipId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContextMenu({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        trackId,
        clipId,
        confirm: false
      });
    }
  };

  const handleDeleteClip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!contextMenu) return;

    if (!contextMenu.confirm) {
      setContextMenu({ ...contextMenu, confirm: true });
      return;
    }

    const track = tracks.find(t => t.id === contextMenu.trackId);
    if (track) {
      onUpdateClips(track.id, track.clips.filter(c => c.id !== contextMenu.clipId));
    }
    setContextMenu(null);
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const step = Math.max(0, x / zoomedWidth);
    onSeek(step);
  };

  const handleTimelineRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const step = Math.max(0, Math.floor(x / zoomedWidth));

    if (loopEndStep === step) {
      onSetLoopEnd(null); // click again to remove
    } else {
      onSetLoopEnd(step);
    }
  };

  return (
    <div className="flex-1 bg-[#050505] flex flex-col relative select-none overflow-hidden">
      
      {/* Timeline Header */}
      <div className="h-8 border-b border-[#222] bg-[#0A0A0A] flex sticky top-0 z-30 shrink-0 overflow-hidden relative">
        <div 
           className="absolute inset-0 cursor-crosshair hover:bg-[#111] transition-colors z-10" 
           onMouseDown={handleTimelineClick} 
           onContextMenu={handleTimelineRightClick}
        />
        <div className="absolute top-0 bottom-0 flex pointer-events-none" style={{ width: totalWidth, transform: `translateX(-${scrollLeft}px)` }}>
            {Array.from({ length: ARRANGEMENT_STEPS }).map((_, i) => {
              const isBar = i % 16 === 0;
              const isBeat = i % 4 === 0;
              return (
                <div key={`head-${i}`} className={`h-full border-l flex items-end pb-1 pl-1 text-[9px] font-mono tracking-wider
                  ${isBar ? 'border-[#444] text-[#fff]' : isBeat ? 'border-[#222] text-[#666]' : 'border-transparent text-transparent'}
                `} style={{ width: zoomedWidth }}>
                  {isBar ? (i/16)+1 : ''}
                </div>
              );
            })}
            
            {/* Loop End Visual Marker */}
            {loopEndStep !== null && (
              <div 
                className="absolute top-0 bottom-0 bg-[#ff2a5f] z-20 opacity-80"
                style={{ width: 2, left: loopEndStep * zoomedWidth }}
              >
                 <div className="absolute top-0 left-[-6px] w-0 h-0 border-l-[7px] border-r-[7px] border-t-[8px] border-transparent border-t-[#ff2a5f]" />
              </div>
            )}
        </div>
      </div>

      {/* Main Scroll Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto custom-scrollbar relative bg-[#050505]"
        onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div 
          ref={gridRef}
          className="relative block" 
          style={{ width: totalWidth, minHeight: '100%', height: 'max-content' }}
        >
          
          <div className="absolute inset-0 pointer-events-none opacity-20"
               style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent ${zoomedWidth - 1}px, #444 ${zoomedWidth - 1}px, #444 ${zoomedWidth}px)` }} />
          <div className="absolute inset-0 pointer-events-none opacity-40"
               style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent ${(zoomedWidth * 16) - 1}px, #666 ${(zoomedWidth * 16) - 1}px, #666 ${zoomedWidth * 16}px)` }} />

          {tracks.map(track => (
            <div 
              key={track.id} 
              className="h-24 border-b border-[#222] relative shrink-0"
              onPointerDown={(e) => handlePointerDownGrid(e, track.id)}
            >
              {track.clips.map(clip => (
                <div
                  key={clip.id}
                  className="clip-block absolute top-1 bottom-1 rounded-[2px] border cursor-pointer overflow-hidden hover:brightness-125 shadow-md"
                  style={{
                    left: clip.startStep * zoomedWidth,
                    width: clip.duration * zoomedWidth,
                    backgroundColor: track.color + '40', 
                    borderColor: track.color
                  }}
                  onPointerDown={(e) => startDrag(e, 'move', clip)}
                  onDoubleClick={(e) => { e.stopPropagation(); onOpenPianoRoll(clip.id); }}
                  onContextMenu={(e) => handleContextMenu(e, track.id, clip.id)}
                >
                  <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent ${(clip.baseDuration * zoomedWidth) - 1}px, #fff ${(clip.baseDuration * zoomedWidth) - 1}px, #fff ${clip.baseDuration * zoomedWidth}px)` }}></div>
                  <div className="text-[9px] font-bold text-white uppercase tracking-wider px-2 py-1 truncate pointer-events-none drop-shadow-md">
                    {track.name} PATTERN
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/20 hover:bg-white/60 transition-colors"
                       onPointerDown={(e) => startDrag(e, 'resize', clip)} />
                </div>
              ))}
            </div>
          ))}

          <div className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none z-30 shadow-[0_0_10px_#fff]"
               style={{ left: currentStep * zoomedWidth }} />
               
          {loopEndStep !== null && (
             <div className="absolute top-0 bottom-0 w-[2px] bg-[#ff2a5f] pointer-events-none z-20 opacity-30"
                  style={{ left: loopEndStep * zoomedWidth }} />
          )}

          {contextMenu && contextMenu.visible && (
            <div 
              className="absolute z-50 bg-[#111] border border-[#333] shadow-2xl flex flex-col overflow-hidden min-w-[120px]"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider text-left transition-colors ${contextMenu.confirm ? 'bg-[#ff2a2a] text-white hover:bg-[#ff4a4a]' : 'text-[#aaa] hover:text-white hover:bg-[#222]'}`}
                onClick={handleDeleteClip}
              >
                {contextMenu.confirm ? 'SURE?' : 'Delete Pattern'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
