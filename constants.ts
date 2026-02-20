import { TrackData, TrackEffect } from './types';

export const ARRANGEMENT_STEPS = 1024; // 64 bars total
export const PIANO_ROLL_STEPS = 256;   // 16 bars total for internal clip edits
export const DEFAULT_BPM = 120;
export const STEP_WIDTH = 40; 
export const ROW_HEIGHT = 20; 

// Generate Piano Keys from C7 down to C2 for a full range
const NOTES = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];
export const PIANO_KEYS: string[] = [];
for (let oct = 7; oct >= 2; oct--) {
  if (oct === 7) PIANO_KEYS.push('C8');
  NOTES.forEach(n => PIANO_KEYS.push(`${n}${oct}`));
}
if (PIANO_KEYS[PIANO_KEYS.length - 1] !== 'C2') {
    PIANO_KEYS.push('C2');
}

export const DEFAULT_TRACKS: TrackData[] = [
  {
    id: 'track-1',
    name: '808 Bass',
    color: '#1a44ff',
    type: 'synth',
    synthType: 'sawtooth',
    muted: false,
    soloed: false,
    volume: 0.8,
    clips: [
      {
        id: 'clip-1',
        trackId: 'track-1',
        startStep: 0,
        duration: 32,
        baseDuration: 16,
        notes: [
          { id: 'n1', pitch: 'C3', startStep: 0, duration: 4 },
          { id: 'n2', pitch: 'D#3', startStep: 8, duration: 4 },
        ]
      }
    ],
    effects: []
  },
  {
    id: 'track-2',
    name: 'Lead Synth',
    color: '#ff2a5f',
    type: 'synth',
    synthType: 'square',
    muted: false,
    soloed: false,
    volume: 0.6,
    clips: [
      {
        id: 'clip-2',
        trackId: 'track-2',
        startStep: 16,
        duration: 16,
        baseDuration: 16,
        notes: [
          { id: 'n3', pitch: 'C5', startStep: 0, duration: 2 },
          { id: 'n4', pitch: 'G5', startStep: 4, duration: 2 },
          { id: 'n5', pitch: 'D#5', startStep: 8, duration: 2 },
        ]
      }
    ],
    effects: []
  },
  {
    id: 'track-3',
    name: 'Kick',
    color: '#22c55e',
    type: 'sampler',
    synthType: 'sine',
    sampleUrl: '/samples/kick.wav',
    sampleName: 'kick.wav',
    muted: false,
    soloed: false,
    volume: 0.9,
    clips: [
      {
        id: 'clip-3',
        trackId: 'track-3',
        startStep: 0,
        duration: 16,
        baseDuration: 16,
        notes: [
          { id: 'n6', pitch: 'C2', startStep: 0, duration: 2 },
          { id: 'n7', pitch: 'C2', startStep: 8, duration: 2 },
        ]
      }
    ],
    effects: []
  },
  {
    id: 'track-4',
    name: 'Snare',
    color: '#f59e0b',
    type: 'sampler',
    synthType: 'sine',
    sampleUrl: '/samples/snare.wav',
    sampleName: 'snare.wav',
    muted: false,
    soloed: false,
    volume: 0.8,
    clips: [
      {
        id: 'clip-4',
        trackId: 'track-4',
        startStep: 4,
        duration: 16,
        baseDuration: 16,
        notes: [
          { id: 'n8', pitch: 'D2', startStep: 4, duration: 2 },
        ]
      }
    ],
    effects: []
  },
  {
    id: 'track-5',
    name: 'Reese Bass',
    color: '#8b5cf6',
    type: 'sampler',
    synthType: 'sine',
    sampleUrl: '/samples/reesebass.wav',
    sampleName: 'reesebass.wav',
    muted: false,
    soloed: false,
    volume: 0.7,
    clips: [
      {
        id: 'clip-5',
        trackId: 'track-5',
        startStep: 0,
        duration: 32,
        baseDuration: 16,
        notes: [
          { id: 'n9', pitch: 'C2', startStep: 0, duration: 8 },
        ]
      }
    ],
    effects: []
  }
];

export const SYNTH_TYPES = ['sine', 'square', 'sawtooth', 'triangle', 'membrane', 'noise', 'metal'];

export const EFFECT_TYPES = ['reverb', 'delay', 'filter'] as const;

export const createDefaultEffect = (type: 'reverb' | 'delay' | 'filter'): TrackEffect => {
  switch (type) {
    case 'reverb':
      return { type: 'reverb', enabled: false, wet: 0.3, decay: 2.5, preDelay: 0.01 };
    case 'delay':
      return { type: 'delay', enabled: false, wet: 0.3, delayTime: '8n', feedback: 0.4 };
    case 'filter':
      return { type: 'filter', enabled: false, wet: 1, frequency: 2000, rolloff: -12 };
  }
};
