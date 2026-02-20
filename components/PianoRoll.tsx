import React, { useState, useRef, useEffect } from 'react';
import { ClipData, NoteData } from '../types';
import { STEP_WIDTH, ROW_HEIGHT, PIANO_KEYS, PIANO_ROLL_STEPS, ARRANGEMENT_STEPS } from '../constants';

let clipboardNotes: NoteData[] = [];

interface PianoRollProps {
  activeClip: ClipData | null;
  trackColor: string;
  onNotesChange: (clipId: string, notes: NoteData[]) => void;
  currentStep: number;
  zoom: number;
  onSeek: (step: number) => void;
}

export const PianoRoll: React.FC<PianoRollProps> = ({
  activeClip,
  trackColor,
  onNotesChange,
  currentStep,
  zoom,
  onSeek
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // Track cursor strictly over the grid for perfect pasting
  const hoverStepRef = useRef<number>(0);
  const hoverRowRef = useRef<number>(0);
  
  const activeClipRef = useRef(activeClip);
  const selectedNotesRef = useRef<Set<string>>(new Set());
  const onNotesChangeRef = useRef(onNotesChange);
  
  const zoomedWidth = STEP_WIDTH * zoom;

  const [activeDrag, setActiveDrag] = useState<{ 
    mode: 'move' | 'resize'; 
    startX: number; 
    startY: number; 
    notes: { id: string; initialStep: number; initialRow: number; initialDuration: number }[] 
  } | null>(null);
  
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [selectBox, setSelectBox] = useState<{ startX: number, startY: number, currX: number, currY: number } | null>(null);

  useEffect(() => { activeClipRef.current = activeClip; }, [activeClip]);
  useEffect(() => { selectedNotesRef.current = selectedNotes; }, [selectedNotes]);
  useEffect(() => { onNotesChangeRef.current = onNotesChange; }, [onNotesChange]);

  useEffect(() => {
    if (containerRef.current) {
      const c4Index = PIANO_KEYS.indexOf('C4');
      if (c4Index !== -1) {
        containerRef.current.scrollTop = (c4Index * ROW_HEIGHT) - 100;
      }
    }
  }, [activeClip?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const clip = activeClipRef.current;
      if (!clip) return;
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          clipboardNotes = clip.notes.filter(n => selectedNotesRef.current.has(n.id));
        } else if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          if (clipboardNotes.length === 0) return;
          
          const minStep = Math.min(...clipboardNotes.map(n => n.startStep));
          const minRow = Math.min(...clipboardNotes.map(n => PIANO_KEYS.indexOf(n.pitch)));
          const pasteTargetStep = hoverStepRef.current;
          const pasteTargetRow = hoverRowRef.current;
          const stepOffset = pasteTargetStep - minStep;
          const rowOffset = pasteTargetRow - minRow;

          const newNotes = clipboardNotes.map(n => {
            const originalRow = PIANO_KEYS.indexOf(n.pitch);
            const newRow = Math.max(0, Math.min(PIANO_KEYS.length - 1, originalRow + rowOffset));
            return {
              ...n,
              id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              startStep: Math.max(0, n.startStep + stepOffset),
              pitch: PIANO_KEYS[newRow]
            };
          });
          
          onNotesChangeRef.current(clip.id, [...clip.notes, ...newNotes]);
          setSelectedNotes(new Set(newNotes.map(n => n.id)));
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const toDelete = selectedNotesRef.current;
        if (toDelete.size > 0) {
           onNotesChangeRef.current(clip.id, clip.notes.filter(n => !toDelete.has(n.id)));
           setSelectedNotes(new Set());
        }
      } else if (e.key === 'q' || e.key === 'Q') {
        const selected = selectedNotesRef.current;
        if (selected.size > 0) {
          const quantizeValue = 4;
          const quantizedNotes = clip.notes.map(n => {
            if (!selected.has(n.id)) return n;
            const quantizedStep = Math.round(n.startStep / quantizeValue) * quantizeValue;
            return { ...n, startStep: Math.max(0, quantizedStep) };
          });
          onNotesChangeRef.current(clip.id, quantizedNotes);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!activeClip) {
    return (
      <div className="flex-1 bg-[#050505] flex items-center justify-center relative overflow-hidden">
        <div className="text-[#333] font-mono tracking-[0.3em] uppercase z-10 text-xl border border-[#222] px-8 py-4 bg-[#0A0A0A]">Select a pattern</div>
      </div>
    );
  }

  const totalWidth = PIANO_ROLL_STEPS * zoomedWidth;

  const updateHoverStep = (e: React.MouseEvent) => {
    if (gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      hoverStepRef.current = Math.max(0, Math.floor(x / zoomedWidth));
      hoverRowRef.current = Math.max(0, Math.min(PIANO_KEYS.length - 1, Math.floor(y / ROW_HEIGHT)));
    }
  };

  const handlePointerDownGrid = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('.note-block') || !gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.shiftKey) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setSelectBox({ startX: x, startY: y, currX: x, currY: y });
      setSelectedNotes(new Set()); 
      return;
    }

    const step = Math.floor(x / zoomedWidth);
    const row = Math.floor(y / ROW_HEIGHT);

    if (step >= 0 && step < PIANO_ROLL_STEPS && row >= 0 && row < PIANO_KEYS.length) {
      const pitch = PIANO_KEYS[row];
      const newNote: NoteData = {
        id: `note-${Date.now()}`,
        pitch,
        startStep: step,
        duration: 2
      };
      
      onNotesChange(activeClip.id, [...activeClip.notes, newNote]);
      setSelectedNotes(new Set([newNote.id]));
    }
  };

  const startDrag = (e: React.PointerEvent, note: NoteData, mode: 'move' | 'resize') => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    let currentSelection = selectedNotes;
    if (!selectedNotes.has(note.id)) {
      if (!e.shiftKey) {
         currentSelection = new Set([note.id]);
         setSelectedNotes(currentSelection);
      } else {
         currentSelection = new Set(selectedNotes).add(note.id);
         setSelectedNotes(currentSelection);
      }
    }

    e.currentTarget.setPointerCapture(e.pointerId);

    const notesToDrag = activeClip.notes
       .filter(n => currentSelection.has(n.id))
       .map(n => ({
          id: n.id,
          initialStep: n.startStep,
          initialRow: PIANO_KEYS.indexOf(n.pitch),
          initialDuration: n.duration
       }));

    setActiveDrag({ mode, startX: e.clientX, startY: e.clientY, notes: notesToDrag });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    updateHoverStep(e); // Constantly update for Paste

    if (selectBox && gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setSelectBox({ ...selectBox, currX: x, currY: y });
      return;
    }

    if (!activeDrag) return;
    const deltaX = e.clientX - activeDrag.startX;
    const deltaSteps = Math.round(deltaX / zoomedWidth);

    if (activeDrag.mode === 'resize') {
      const updatedNotes = activeClip.notes.map(n => {
        const dragInfo = activeDrag.notes.find(d => d.id === n.id);
        if (dragInfo) {
           const newDuration = Math.max(1, dragInfo.initialDuration + deltaSteps);
           return { ...n, duration: newDuration };
        }
        return n;
      });
      onNotesChange(activeClip.id, updatedNotes);
    } else if (activeDrag.mode === 'move') {
      const deltaY = e.clientY - activeDrag.startY;
      const deltaRows = Math.round(deltaY / ROW_HEIGHT);
      
      const updatedNotes = activeClip.notes.map(n => {
        const dragInfo = activeDrag.notes.find(d => d.id === n.id);
        if (dragInfo) {
           const newStep = Math.max(0, dragInfo.initialStep + deltaSteps);
           const newRow = Math.max(0, Math.min(PIANO_KEYS.length - 1, dragInfo.initialRow + deltaRows));
           return { ...n, startStep: newStep, pitch: PIANO_KEYS[newRow] };
        }
        return n;
      });
      onNotesChange(activeClip.id, updatedNotes);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (selectBox) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      
      const minX = Math.min(selectBox.startX, selectBox.currX);
      const maxX = Math.max(selectBox.startX, selectBox.currX);
      const minY = Math.min(selectBox.startY, selectBox.currY);
      const maxY = Math.max(selectBox.startY, selectBox.currY);

      const newlySelected = new Set<string>();
      activeClip.notes.forEach(note => {
        const rowIndex = PIANO_KEYS.indexOf(note.pitch);
        if (rowIndex === -1) return;
        
        const noteX1 = note.startStep * zoomedWidth;
        const noteX2 = noteX1 + (note.duration * zoomedWidth);
        const noteY1 = rowIndex * ROW_HEIGHT;
        const noteY2 = noteY1 + ROW_HEIGHT;

        if (noteX1 < maxX && noteX2 > minX && noteY1 < maxY && noteY2 > minY) {
          newlySelected.add(note.id);
        }
      });
      setSelectedNotes(newlySelected);
      setSelectBox(null);
      return;
    }

    if (activeDrag) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveDrag(null);
    }
  };

  const handleNoteClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (e.shiftKey) {
      const newSel = new Set(selectedNotes);
      if (newSel.has(noteId)) newSel.delete(noteId);
      else newSel.add(noteId);
      setSelectedNotes(newSel);
    } else {
      setSelectedNotes(new Set([noteId]));
    }
  };

  const handleDeleteNote = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onNotesChange(activeClip.id, activeClip.notes.filter(n => n.id !== noteId));
    
    if (selectedNotes.has(noteId)) {
      const newSel = new Set(selectedNotes);
      newSel.delete(noteId);
      setSelectedNotes(newSel);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const localStep = x / zoomedWidth;
    onSeek(activeClip.startStep + localStep);
  };

  const isBlackKey = (key: string) => key.includes('#');
  
  // Calculate relative playback position for inside the clip
  const localPlayheadStep = currentStep - activeClip.startStep;
  const isPlayheadVisible = localPlayheadStep >= 0 && localPlayheadStep <= activeClip.baseDuration;

  let boxStyle = {};
  if (selectBox) {
    const minX = Math.min(selectBox.startX, selectBox.currX);
    const maxX = Math.max(selectBox.startX, selectBox.currX);
    const minY = Math.min(selectBox.startY, selectBox.currY);
    const maxY = Math.max(selectBox.startY, selectBox.currY);
    boxStyle = { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
  }

  return (
    <div className="flex-1 bg-[#050505] flex flex-col relative select-none overflow-hidden">
      
      {/* Header Area */}
      <div className="h-8 border-b border-[#222] bg-[#0A0A0A] flex sticky top-0 z-30 shrink-0">
        <div className="w-16 border-r border-[#222] shrink-0 bg-[#0A0A0A] flex flex-col items-center justify-center relative z-20">
            <span className="text-[9px] text-[#666] font-bold tracking-widest uppercase pointer-events-none">P-ROLL</span>
            <span className="text-[7px] text-[#444]">Q=Quant</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
           <div 
             className="absolute inset-0 cursor-crosshair hover:bg-[#111] transition-colors z-10" 
             onMouseDown={handleTimelineClick} 
           />
           <div className="absolute top-0 bottom-0 flex pointer-events-none" style={{ width: totalWidth, transform: `translateX(-${scrollLeft}px)` }}>
              {Array.from({ length: PIANO_ROLL_STEPS }).map((_, i) => {
                const isBar = i % 16 === 0;
                const isBeat = i % 4 === 0;
                return (
                  <div key={`head-${i}`} className={`h-full border-l flex items-end pb-1 pl-1 text-[9px] font-mono tracking-wider
                    ${isBar ? 'border-[#444] text-[#fff]' : isBeat ? 'border-[#222] text-[#666]' : 'border-transparent text-transparent'}
                  `} style={{ width: zoomedWidth }}>
                    {isBar ? (i/16)+1 : isBeat ? (i/4)+1 : ''}
                  </div>
                );
              })}
           </div>
        </div>
      </div>

      {/* Main Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto custom-scrollbar relative bg-[#050505]"
        onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
      >
        <div style={{ width: totalWidth + 64, height: PIANO_KEYS.length * ROW_HEIGHT }} className="relative flex">
          
          {/* Piano Keys Sidebar */}
          <div className="w-16 flex flex-col sticky left-0 z-20 shrink-0 border-r border-[#111] bg-[#0A0A0A]">
            {PIANO_KEYS.map((key) => {
              const black = isBlackKey(key);
              const isC = key.startsWith('C') && key.length === 2;
              return (
                <div 
                  key={key} 
                  className={`w-full flex items-center justify-end pr-2 text-[9px] font-mono border-b transition-colors relative
                    ${black ? 'bg-[#151515] border-[#000] text-[#555] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]' : 'bg-[#e5e5e5] border-[#aaa] text-[#111] z-10'}
                    ${isC ? '!bg-[#fff] !text-[#000] font-bold shadow-md z-10' : ''}
                  `}
                  style={{ height: ROW_HEIGHT }}
                >
                  {!black && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-black/20 to-transparent" />}
                  {isC || !black ? key : ''}
                </div>
              );
            })}
          </div>

          {/* Grid Area - onMouseMove handles continuous hover step updates */}
          <div 
            ref={gridRef}
            className="relative block" 
            style={{ width: totalWidth, height: PIANO_KEYS.length * ROW_HEIGHT }}
            onPointerDown={handlePointerDownGrid}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onMouseMove={updateHoverStep} 
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="absolute inset-0 pointer-events-none opacity-20"
              style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent ${zoomedWidth - 1}px, #444 ${zoomedWidth - 1}px, #444 ${zoomedWidth}px), repeating-linear-gradient(180deg, transparent, transparent ${ROW_HEIGHT - 1}px, #444 ${ROW_HEIGHT - 1}px, #444 ${ROW_HEIGHT}px)` }} />
            <div className="absolute inset-0 pointer-events-none opacity-50"
              style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent ${(zoomedWidth * 16) - 1}px, #666 ${(zoomedWidth * 16) - 1}px, #666 ${zoomedWidth * 16}px)` }} />

            <div className="absolute inset-0 pointer-events-none flex flex-col opacity-[0.03]">
               {PIANO_KEYS.map((key, i) => (
                  <div key={i} className={`w-full ${isBlackKey(key) ? 'bg-white' : 'bg-transparent'}`} style={{ height: ROW_HEIGHT }} />
               ))}
            </div>

            <div className="absolute top-0 bottom-0 border-r-2 border-[#1a44ff] opacity-50 pointer-events-none z-10"
                 style={{ width: activeClip.baseDuration * zoomedWidth }} />

            {selectBox && (
              <div 
                className="absolute bg-white/10 border border-white/50 z-30 pointer-events-none"
                style={boxStyle}
              />
            )}

            {activeClip.notes.map(note => {
              const rowIndex = PIANO_KEYS.indexOf(note.pitch);
              if (rowIndex === -1) return null;
              
              const isSelected = selectedNotes.has(note.id);

              return (
                <div
                  key={note.id}
                  className={`note-block absolute rounded-[2px] cursor-pointer group flex items-stretch border hover:brightness-125 z-20 shadow-[0_2px_5px_rgba(0,0,0,0.5)] transition-shadow
                    ${isSelected ? 'border-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'border-black/50'}
                  `}
                  style={{ left: note.startStep * zoomedWidth, top: rowIndex * ROW_HEIGHT, width: note.duration * zoomedWidth, height: ROW_HEIGHT, backgroundColor: trackColor }}
                  onPointerDown={(e) => startDrag(e, note, 'move')}
                  onContextMenu={(e) => handleDeleteNote(e, note.id)} 
                >
                  <div className="flex-1 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.5) 50%)', backgroundSize: '4px 100%' }}></div>
                  <div className="w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/40 hover:bg-white/80 transition-opacity absolute right-0 top-0 bottom-0"
                    onPointerDown={(e) => startDrag(e, note, 'resize')} />
                </div>
              );
            })}

            {isPlayheadVisible && (
              <div className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none z-30 shadow-[0_0_10px_#fff]"
                   style={{ left: localPlayheadStep * zoomedWidth }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
