export type SynthWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'membrane' | 'noise' | 'metal' | 'kick' | 'snare' | 'cowbell' | 'cowbell2' | 'reese';
export type TrackType = 'synth' | 'sampler';

export interface EffectData {
  enabled: boolean;
  wet: number;
}

export interface ReverbEffect extends EffectData {
  type: 'reverb';
  decay: number;
  preDelay: number;
}

export interface DelayEffect extends EffectData {
  type: 'delay';
  delayTime: string;
  feedback: number;
}

export interface FilterEffect extends EffectData {
  type: 'filter';
  frequency: number;
  rolloff: number;
}

export type TrackEffect = ReverbEffect | DelayEffect | FilterEffect;

export interface NoteData {
  id: string;
  pitch: string;      // e.g., 'C4'
  startStep: number;  // 0 to 64
  duration: number;   // in 16th steps
}

export interface ClipData {
  id: string;
  trackId: string;
  startStep: number;  // Absolute position on the global timeline
  duration: number;   // Total stretched duration on the timeline
  baseDuration: number; // Length of the internal loop (e.g., 16 steps = 1 bar)
  notes: NoteData[];
}

export interface TrackData {
  id: string;
  name: string;
  color: string;
  type: TrackType;
  synthType: SynthWaveform;
  sampleUrl?: string; 
  sampleName?: string;
  clips: ClipData[];
  muted: boolean;
  soloed: boolean;
  volume: number;
  effects: TrackEffect[];
}

export interface AppState {
  isPlaying: boolean;
  bpm: number;
  currentView: 'arrangement' | 'pianoroll';
  activeClipId: string | null;
  tracks: TrackData[];
  zoom: number;
  isLooping: boolean;
  loopEndStep: number | null;
}
