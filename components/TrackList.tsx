import React, { useRef, useState } from 'react';
import { TrackData, TrackEffect } from '../types';
import { Volume2, VolumeX, Trash2, Upload, ChevronUp, ChevronDown, Wand2 } from 'lucide-react';
import { SYNTH_TYPES, EFFECT_TYPES, createDefaultEffect } from '../constants';

interface TrackListProps {
  tracks: TrackData[];
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onVolumeChange: (id: string, volume: number) => void;
  onSynthTypeChange: (id: string, type: string) => void;
  onTrackTypeChange: (id: string, type: 'synth' | 'sampler') => void;
  onUploadSample: (id: string, file: File) => void;
  onDeleteTrack: (id: string) => void;
  onMoveTrack: (id: string, direction: 'up' | 'down') => void;
  onRenameTrack: (id: string, name: string) => void;
  onColorChange: (id: string, color: string) => void;
  onEffectsChange: (id: string, effects: TrackEffect[]) => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onSynthTypeChange,
  onTrackTypeChange,
  onUploadSample,
  onDeleteTrack,
  onMoveTrack,
  onRenameTrack,
  onColorChange,
  onEffectsChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTrackIdRef = useRef<string | null>(null);
  const [expandedEffects, setExpandedEffects] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTrackIdRef.current) {
      onUploadSample(uploadTrackIdRef.current, file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    uploadTrackIdRef.current = null;
  };

  const triggerUpload = (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    uploadTrackIdRef.current = trackId;
    fileInputRef.current?.click();
  };

  const addEffect = (trackId: string, effectType: 'reverb' | 'delay' | 'filter') => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    const existingEffect = track.effects.find(e => e.type === effectType);
    if (existingEffect) return;
    const newEffect = createDefaultEffect(effectType);
    onEffectsChange(trackId, [...track.effects, newEffect]);
  };

  const updateEffect = (trackId: string, updatedEffect: TrackEffect) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    const newEffects = track.effects.map(e => e.type === updatedEffect.type ? updatedEffect : e);
    onEffectsChange(trackId, newEffects);
  };

  const removeEffect = (trackId: string, effectType: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    onEffectsChange(trackId, track.effects.filter(e => e.type !== effectType));
  };

  return (
    <div className="w-[300px] border-r border-[#222] bg-[#0A0A0A] flex flex-col shrink-0 z-10">
      <div className="h-8 border-b border-[#222] flex items-center px-4 shrink-0 bg-[#0A0A0A]">
        <span className="text-[9px] font-semibold text-[#666] uppercase tracking-[0.2em]">Channels</span>
      </div>
      
      <input 
        type="file" 
        accept="audio/wav,audio/mp3,audio/ogg" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />

      {tracks.map((track, idx) => (
        <div 
          key={track.id} 
          className="min-h-[160px] flex border-b border-[#222] bg-transparent group relative"
        >
          {/* Color Picker Indicator */}
          <div className="w-2 h-full relative shrink-0">
            <div className="absolute inset-0" style={{ backgroundColor: track.color }} />
            <input 
               type="color" 
               value={track.color} 
               onChange={(e) => onColorChange(track.id, e.target.value)}
               className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          
          <div className="p-2 pl-3 flex flex-col flex-1 gap-1 min-w-0">
            <div className="flex justify-between items-center">
              <input 
                 type="text"
                 value={track.name}
                 onChange={(e) => onRenameTrack(track.id, e.target.value)}
                 className="bg-transparent text-xs font-bold uppercase tracking-wider text-white outline-none w-28 truncate hover:bg-[#222] px-1 -ml-1"
              />
              <div className="flex gap-1">
                <button onClick={() => onToggleMute(track.id)} className={`w-5 h-5 flex items-center justify-center text-[9px] font-bold border ${track.muted ? 'bg-[#ff2a2a]/20 text-[#ff2a2a] border-[#ff2a2a]/40' : 'bg-[#1a1a1a] text-[#666] border-[#333] hover:text-white'}`}>M</button>
                <button onClick={() => onToggleSolo(track.id)} className={`w-5 h-5 flex items-center justify-center text-[9px] font-bold border ${track.soloed ? 'bg-[#1a44ff]/20 text-[#1a44ff] border-[#1a44ff]/40' : 'bg-[#1a1a1a] text-[#666] border-[#333] hover:text-white'}`}>S</button>
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-2 mt-1">
              {track.muted ? <VolumeX size={12} className="text-[#666]" /> : <Volume2 size={12} className="text-[#888]" />}
              <input 
                type="range" min="0" max="1" step="0.01" value={track.volume}
                onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
                className="flex-1 h-1 bg-[#333] appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            {/* Routing / Settings */}
            <div className="flex items-center justify-between gap-2 mt-auto">
                <select 
                  value={track.type}
                  onChange={(e) => onTrackTypeChange(track.id, e.target.value as any)}
                  className="bg-[#111] border border-[#333] text-[9px] text-[#aaa] px-1 py-0.5 outline-none uppercase"
                >
                  <option value="synth">Synth</option>
                  <option value="sampler">Sampler</option>
                </select>

                {track.type === 'synth' ? (
                  <select 
                    value={track.synthType}
                    onChange={(e) => onSynthTypeChange(track.id, e.target.value)}
                    className="bg-[#111] border border-[#333] text-[9px] text-[#aaa] px-1 py-0.5 outline-none uppercase w-20"
                  >
                    {SYNTH_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                ) : (
                  <button onClick={(e) => triggerUpload(e, track.id)} className="bg-[#1a44ff] text-white text-[9px] uppercase font-bold px-2 py-0.5 flex items-center gap-1 hover:bg-[#1d4ed8] truncate max-w-[80px]">
                    <Upload size={10} /> {track.sampleName || 'Load'}
                  </button>
                )}
            </div>

            {/* Effects Row */}
            <div className="relative">
              <button 
                onClick={() => setExpandedEffects(expandedEffects === track.id ? null : track.id)}
                className={`w-full text-[10px] px-2 py-1.5 border flex items-center justify-center gap-2 transition-colors ${track.effects.length > 0 ? 'border-[#1a44ff] bg-[#1a44ff]/10 text-[#1a44ff]' : 'border-[#333] text-[#666] hover:text-[#aaa] hover:border-[#444]'}`}
              >
                <Wand2 size={12} /> 
                <span className="font-semibold uppercase tracking-wider">Effects</span>
                {track.effects.length > 0 && (
                  <span className="bg-[#1a44ff] text-white text-[8px] px-1.5 rounded-full">{track.effects.length}</span>
                )}
              </button>
              
              {expandedEffects === track.id && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#0A0A0A] border border-[#333] z-50 p-3 shadow-xl">
                  <div className="flex gap-2 mb-3">
                    {EFFECT_TYPES.map(type => (
                      <button 
                        key={type}
                        onClick={() => addEffect(track.id, type)}
                        disabled={track.effects.some(e => e.type === type)}
                        className={`flex-1 text-[10px] px-3 py-2 uppercase font-bold tracking-wider transition-colors ${track.effects.some(e => e.type === type) ? 'bg-[#222] text-[#444] cursor-not-allowed' : 'bg-[#1a44ff] text-white hover:bg-[#2244ff]'}`}
                      >
                        + {type}
                      </button>
                    ))}
                  </div>
                  
                  {track.effects.length === 0 && (
                    <div className="text-[10px] text-[#555] text-center py-4 border border-dashed border-[#333]">
                      No effects added. Click above to add Reverb, Delay, or Filter.
                    </div>
                  )}
                  
                  {track.effects.map(effect => (
                    <div key={effect.type} className="border-t border-[#333] pt-3 mt-3">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[11px] text-[#fff] uppercase font-bold tracking-wider">{effect.type}</span>
                        <button onClick={() => removeEffect(track.id, effect.type)} className="text-[#666] hover:text-[#ff2a2a] text-xs px-2">✕</button>
                      </div>
                      
                      <label className="flex items-center gap-2 text-[10px] text-[#aaa] mb-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={effect.enabled}
                          onChange={(e) => updateEffect(track.id, { ...effect, enabled: e.target.checked })}
                          className="w-4 h-4 accent-[#1a44ff]"
                        />
                        <span className="font-semibold">Enable {effect.type}</span>
                      </label>
                      
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[9px] text-[#666] mb-1">
                            <span>Wet / Mix</span>
                            <span className="text-[#aaa]">{Math.round(effect.wet * 100)}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="1" step="0.01" 
                            value={effect.wet}
                            onChange={(e) => updateEffect(track.id, { ...effect, wet: parseFloat(e.target.value) })}
                            className="w-full h-2 accent-[#1a44ff] cursor-pointer"
                          />
                        </div>
                        
                        {effect.type === 'reverb' && (
                          <div>
                            <div className="flex justify-between text-[9px] text-[#666] mb-1">
                              <span>Decay</span>
                              <span className="text-[#aaa]">{effect.decay.toFixed(1)}s</span>
                            </div>
                            <input 
                              type="range" min="0.1" max="10" step="0.1" 
                              value={effect.decay}
                              onChange={(e) => updateEffect(track.id, { ...effect, decay: parseFloat(e.target.value) })}
                              className="w-full h-2 accent-[#1a44ff] cursor-pointer"
                            />
                          </div>
                        )}
                        
                        {effect.type === 'delay' && (
                          <div>
                            <div className="flex justify-between text-[9px] text-[#666] mb-1">
                              <span>Feedback</span>
                              <span className="text-[#aaa]">{Math.round(effect.feedback * 100)}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="0.9" step="0.01" 
                              value={effect.feedback}
                              onChange={(e) => updateEffect(track.id, { ...effect, feedback: parseFloat(e.target.value) })}
                              className="w-full h-2 accent-[#1a44ff] cursor-pointer"
                            />
                          </div>
                        )}
                        
                        {effect.type === 'filter' && (
                          <div>
                            <div className="flex justify-between text-[9px] text-[#666] mb-1">
                              <span>Frequency</span>
                              <span className="text-[#aaa]">{Math.round(effect.frequency)}Hz</span>
                            </div>
                            <input 
                              type="range" min="100" max="10000" step="100" 
                              value={effect.frequency}
                              onChange={(e) => updateEffect(track.id, { ...effect, frequency: parseFloat(e.target.value) })}
                              className="w-full h-2 accent-[#1a44ff] cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hover Actions: Move Up/Down/Delete */}
          <div className="w-6 flex flex-col items-center justify-center border-l border-[#222] bg-[#050505] opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onMoveTrack(track.id, 'up')} disabled={idx === 0} className="p-1 text-[#666] hover:text-white disabled:opacity-20"><ChevronUp size={14} /></button>
            <button onClick={() => onDeleteTrack(track.id)} className="p-1 text-[#666] hover:text-[#ff2a2a] my-1"><Trash2 size={12} /></button>
            <button onClick={() => onMoveTrack(track.id, 'down')} className="p-1 text-[#666] hover:text-white"><ChevronDown size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
};
