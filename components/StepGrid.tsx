import React from 'react';
import { TrackData } from '../types';
import { PIANO_ROLL_STEPS } from '../constants';

interface StepGridProps {
  tracks: TrackData[];
  currentStep: number;
  onToggleStep: (trackId: string, stepIndex: number) => void;
}

export const StepGrid: React.FC<StepGridProps> = ({
  tracks,
  currentStep,
  onToggleStep
}) => {
  // Generate header blocks (1, 2, 3, 4 for beats)
  const renderHeader = () => {
    const blocks = [];
    for (let i = 0; i < PIANO_ROLL_STEPS; i++) {
      const isBeat = i % 4 === 0;
      blocks.push(
        <div 
          key={`header-${i}`} 
          className={`flex-1 flex justify-center items-end pb-1 text-[10px] font-mono select-none ${isBeat ? 'text-daw-text font-bold' : 'text-daw-border'}`}
        >
          {isBeat ? (i / 4) + 1 : ''}
        </div>
      );
    }
    return blocks;
  };

  return (
    <div className="flex-1 bg-daw-bg overflow-x-auto overflow-y-auto relative flex flex-col">
      {/* Timeline Header */}
      <div className="h-8 border-b border-daw-border flex sticky top-0 bg-daw-bg z-20 shrink-0">
        <div className="flex w-full min-w-[600px] px-2">
          {renderHeader()}
        </div>
      </div>

      {/* Grid Area */}
      <div className="flex-1 relative min-w-[600px] flex flex-col pt-2 pb-8 px-2">
        {/* Playhead Overlay */}
        <div 
          className="absolute top-0 bottom-0 w-[calc(100%_/_16)] bg-white/[0.03] pointer-events-none z-10 border-l border-r border-daw-primary/20 transition-transform duration-75 ease-linear"
          style={{ 
            transform: `translateX(${currentStep * 100}%)`,
            left: '0.5rem', // Match px-2 padding
            width: `calc((100% - 1rem) / ${PIANO_ROLL_STEPS})`
          }}
        >
          {/* Playhead thumb */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-daw-primary"></div>
        </div>

        {/* Tracks */}
        {tracks.map((track) => {
          const steps = Array.from({ length: PIANO_ROLL_STEPS }, (_, i) => track.clips.flatMap(c => c.notes).some(n => n.startStep === i));
          return (
            <div key={track.id} className="flex h-16 mb-0 group">
              {steps.map((isActive, index) => {
                const isBeatStart = index % 4 === 0;
                return (
                  <div 
                    key={`${track.id}-${index}`}
                    className="flex-1 p-0.5"
                    onClick={() => onToggleStep(track.id, index)}
                  >
                    <div 
                      className={`
                        w-full h-full rounded-sm cursor-pointer transition-all duration-100 border
                        ${isActive 
                          ? 'shadow-[0_0_10px_rgba(var(--track-color-rgb),0.4)] border-transparent' 
                          : isBeatStart 
                            ? 'bg-[#1e222a] border-[#2a2d35] hover:bg-[#2a2d35]' 
                            : 'bg-[#15171d] border-[#1e222a] hover:bg-[#2a2d35]'
                        }
                        ${currentStep === index && isActive ? 'brightness-150 scale-[0.98]' : ''}
                      `}
                      style={{
                        backgroundColor: isActive ? track.color : undefined,
                        '--track-color-rgb': hexToRgb(track.color)
                      } as React.CSSProperties}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper for shadow color
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}