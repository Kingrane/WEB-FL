import * as Tone from 'tone';
import { TrackData, TrackEffect, ReverbEffect, DelayEffect, FilterEffect } from '../types';
import { SAMPLE_URLS } from '../constants';

class AudioEngine {
  private synths: Map<string, Tone.Synth | Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth | Tone.Sampler> = new Map();
  private parts: Map<string, Tone.Part> = new Map();
  private volumes: Map<string, Tone.Volume> = new Map();
  
  private reverbs: Map<string, Tone.Reverb> = new Map();
  private delays: Map<string, Tone.FeedbackDelay> = new Map();
  private filters: Map<string, Tone.Filter> = new Map();
  private trackEvents: Map<string, Array<{time: number, note: string, duration: number}>> = new Map();
  
  private instrumentStates = new Map<string, { type: string, synthType: string, sampleUrl?: string }>();
  private effectStates = new Map<string, TrackEffect[]>();
  
  private masterChannel: Tone.Channel;
  private isInitialized = false;

  constructor() {
    this.masterChannel = new Tone.Channel().toDestination();
    this.masterChannel.volume.value = -6; 
  }

  public async initialize() {
    if (this.isInitialized) return;
    await Tone.start();
    Tone.Transport.setLoopPoints(0, "64m"); 
    Tone.Transport.loop = true;
    this.isInitialized = true;
  }

  public setBpm(bpm: number) {
    Tone.Transport.bpm.value = bpm;
  }

  public setLoopSettings(isLooping: boolean, loopEndStep: number | null) {
    Tone.Transport.loop = isLooping;
    const endTicks = (loopEndStep || 1024) * 48;
    Tone.Transport.setLoopPoints(0, `${endTicks}i`);
  }

  public async startPlayback() {
    if (!this.isInitialized) await this.initialize();
    await Tone.loaded(); 
    Tone.Transport.start();
  }

  public stopPlayback() {
    Tone.Transport.stop();
    Tone.Transport.ticks = 0; 
  }

  public pausePlayback() {
    Tone.Transport.pause();
  }

  public seekToStep(step: number) {
    if (!this.isInitialized) return;
    Tone.Transport.ticks = Math.floor(step * 48); 
  }

  public getPlaybackStep(): number {
    if (!this.isInitialized || Tone.Transport.state !== 'started') {
      return Tone.Transport.ticks / 48 || 0;
    }
    return Tone.Transport.ticks / 48;
  }

  private createEffect(effect: TrackEffect): Tone.ToneAudioNode {
    switch (effect.type) {
      case 'reverb': {
        const rev = effect as ReverbEffect;
        const reverb = new Tone.Reverb({ decay: rev.decay, preDelay: rev.preDelay });
        reverb.wet.value = rev.enabled ? rev.wet : 0;
        return reverb;
      }
      case 'delay': {
        const del = effect as DelayEffect;
        const delay = new Tone.FeedbackDelay({ delayTime: del.delayTime, feedback: del.feedback });
        delay.wet.value = del.enabled ? del.wet : 0;
        return delay;
      }
      case 'filter': {
        const filt = effect as FilterEffect;
        const filter = new Tone.Filter({ frequency: filt.frequency, rolloff: filt.rolloff });
        return filter;
      }
    }
  }

  private updateEffect(effectNode: Tone.ToneAudioNode, effect: TrackEffect): void {
    switch (effect.type) {
      case 'reverb': {
        const rev = effect as ReverbEffect;
        if (effectNode instanceof Tone.Reverb) {
          effectNode.wet.value = rev.enabled ? rev.wet : 0;
          effectNode.decay = rev.decay;
        }
        break;
      }
      case 'delay': {
        const del = effect as DelayEffect;
        if (effectNode instanceof Tone.FeedbackDelay) {
          effectNode.wet.value = del.enabled ? del.wet : 0;
          effectNode.delayTime.value = Tone.Time(del.delayTime).toSeconds();
          effectNode.feedback.value = del.feedback;
        }
        break;
      }
      case 'filter': {
        const filt = effect as FilterEffect;
        if (effectNode instanceof Tone.Filter) {
          effectNode.frequency.value = filt.frequency;
          effectNode.rolloff = filt.rolloff;
        }
        break;
      }
    }
  }

  private buildEffectChain(track: TrackData, synth: Tone.ToneAudioNode, volume: Tone.Volume): void {
    this.reverbs.get(track.id)?.dispose();
    this.delays.get(track.id)?.dispose();
    this.filters.get(track.id)?.dispose();
    
    const reverb = new Tone.Reverb({ decay: 2.5, preDelay: 0.01 });
    const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.4 });
    const filter = new Tone.Filter({ frequency: 2000, rolloff: -12 });
    
    reverb.wet.value = 0;
    delay.wet.value = 0;
    
    this.reverbs.set(track.id, reverb);
    this.delays.set(track.id, delay);
    this.filters.set(track.id, filter);
    
    const hasReverb = track.effects.some(e => e.type === 'reverb' && e.enabled);
    const hasDelay = track.effects.some(e => e.type === 'delay' && e.enabled);
    const hasFilter = track.effects.some(e => e.type === 'filter' && e.enabled);
    
    synth.disconnect();
    synth.connect(filter);
    
    if (hasReverb) {
      filter.connect(reverb);
      reverb.connect(delay);
      delay.connect(volume);
    } else if (hasDelay) {
      filter.connect(delay);
      delay.connect(volume);
    } else {
      filter.connect(volume);
    }
    
    for (const effect of track.effects) {
      if (effect.type === 'reverb' && this.reverbs.has(track.id)) {
        this.updateEffect(this.reverbs.get(track.id)!, effect);
      } else if (effect.type === 'delay' && this.delays.has(track.id)) {
        this.updateEffect(this.delays.get(track.id)!, effect);
      } else if (effect.type === 'filter' && this.filters.has(track.id)) {
        this.updateEffect(this.filters.get(track.id)!, effect);
      }
    }
  }

  private async createInstrument(track: TrackData): Promise<Tone.Synth | Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth | Tone.Sampler> {
    const sampleUrl = SAMPLE_URLS[track.synthType] || track.sampleUrl;
    
    if (sampleUrl) {
      return new Promise((resolve) => {
        let isResolved = false;
        const complete = (inst: any) => {
           if (!isResolved) {
               isResolved = true;
               resolve(inst);
           }
        };

        const sampler = new Tone.Sampler({
          urls: { C4: sampleUrl },
          onload: () => complete(sampler),
          onerror: (err) => {
             console.error("Sampler error, falling back to Synth:", err);
             complete(new Tone.Synth()); 
          }
        });
        
        setTimeout(() => complete(sampler), 3000);
      });
    }

    switch (track.synthType) {
      case 'membrane': return new Tone.MembraneSynth();
      case 'noise': return new Tone.NoiseSynth({ envelope: { decay: 0.1 } });
      case 'metal': return new Tone.MetalSynth({ envelope: { decay: 0.1 }, resonance: 4000 });
      case 'square':
      case 'sawtooth':
      case 'triangle':
      case 'sine':
      default:
        return new Tone.Synth({ oscillator: { type: track.synthType as any } });
    }
  }

  public async updateTracks(tracks: TrackData[]) {
    const trackIds = new Set(tracks.map(t => t.id));

    for (const track of tracks) {
      let synth = this.synths.get(track.id);
      const state = this.instrumentStates.get(track.id);
      const prevEffects = this.effectStates.get(track.id);
      
      const effectsChanged = JSON.stringify(track.effects) !== JSON.stringify(prevEffects);
      
      const needsRebuild = !synth || 
                           !state || 
                           state.type !== track.type || 
                           state.synthType !== track.synthType || 
                           state.sampleUrl !== track.sampleUrl ||
                           effectsChanged;

      if (needsRebuild) {
        if (synth) synth.dispose();
        synth = await this.createInstrument(track);
        
        const vol = new Tone.Volume(this.linearToDecibels(track.volume)).connect(this.masterChannel);
        
        this.buildEffectChain(track, synth as Tone.ToneAudioNode, vol);
        
        this.synths.set(track.id, synth);
        this.volumes.set(track.id, vol);
        this.instrumentStates.set(track.id, { type: track.type, synthType: track.synthType, sampleUrl: track.sampleUrl });
        this.effectStates.set(track.id, [...track.effects]);
      } else {
        const vol = this.volumes.get(track.id);
        if (vol) {
           vol.volume.rampTo(this.linearToDecibels(track.volume), 0.1);
           vol.mute = track.muted || (tracks.some(t => t.soloed) && !track.soloed);
        }
        
        for (const effect of track.effects) {
          if (effect.type === 'reverb' && this.reverbs.has(track.id)) {
            this.updateEffect(this.reverbs.get(track.id)!, effect);
          } else if (effect.type === 'delay' && this.delays.has(track.id)) {
            this.updateEffect(this.delays.get(track.id)!, effect);
          } else if (effect.type === 'filter' && this.filters.has(track.id)) {
            this.updateEffect(this.filters.get(track.id)!, effect);
          }
        }
      }

      let part = this.parts.get(track.id);
      if (part) {
        part.dispose();
      }

      const events: Array<{time: number, note: string, duration: number}> = [];

      for (const clip of track.clips) {
        const loops = Math.ceil(clip.duration / clip.baseDuration);
        
        for (let i = 0; i < loops; i++) {
          const loopOffset = i * clip.baseDuration;
          
          for (const note of clip.notes) {
            const absoluteStep = clip.startStep + loopOffset + note.startStep;
            if (loopOffset + note.startStep >= clip.duration) continue;

            events.push({
              time: absoluteStep * Tone.Time("16n").toSeconds(),
              note: note.pitch,
              duration: note.duration * Tone.Time("16n").toSeconds(),
            });
          }
        }
      }

      part = new Tone.Part((time, value) => {
        const instr = this.synths.get(track.id);
        if (instr && !this.volumes.get(track.id)?.mute) {
          if (instr instanceof Tone.NoiseSynth || instr instanceof Tone.MetalSynth) {
            instr.triggerAttackRelease(value.duration, time);
          } else {
            // @ts-ignore
            instr.triggerAttackRelease(value.note, value.duration, time);
          }
        }
      }, events).start(0);
      
      this.trackEvents.set(track.id, events);
      
      this.parts.set(track.id, part);
    }

    for (const id of Array.from(this.synths.keys())) {
      if (!trackIds.has(id)) {
        this.synths.get(id)?.dispose();
        this.volumes.get(id)?.dispose();
        this.parts.get(id)?.dispose();
        this.reverbs.get(id)?.dispose();
        this.delays.get(id)?.dispose();
        this.filters.get(id)?.dispose();
        this.instrumentStates.delete(id);
        this.effectStates.delete(id);
        this.trackEvents.delete(id);
        this.synths.delete(id);
        this.volumes.delete(id);
        this.parts.delete(id);
        this.reverbs.delete(id);
        this.delays.delete(id);
        this.filters.delete(id);
      }
    }
  }

  public async exportToAudio(loopEndStep: number | null = null): Promise<Blob> {
    await this.initialize();
    
    let maxDuration = 30;
    
    for (const [trackId, events] of this.trackEvents) {
      if (events && events.length > 0) {
        for (const event of events) {
          const eventEnd = event.time + event.duration;
          if (eventEnd > maxDuration) {
            maxDuration = eventEnd;
          }
        }
      }
    }
    
    if (loopEndStep) {
      const loopEndTime = loopEndStep * Tone.Time("16n").toSeconds();
      if (loopEndTime > maxDuration) {
        maxDuration = loopEndTime;
      }
    }
    
    maxDuration = Math.min(maxDuration + 2, 120);
    
    const sampleRate = 44100;
    const numChannels = 2;
    const length = Math.ceil(maxDuration * sampleRate);
    
    const offlineContext = new OfflineAudioContext(numChannels, length, sampleRate);
    const masterGain = offlineContext.createGain();
    masterGain.gain.value = Math.pow(10, -6 / 20);
    masterGain.connect(offlineContext.destination);
    
    for (const [trackId, events] of this.trackEvents) {
      if (!events || events.length === 0) continue;
      
      const state = this.instrumentStates.get(trackId);
      if (!state) continue;
      
      for (const event of events) {
        if (event.time >= maxDuration) continue;
        
        try {
          const osc = offlineContext.createOscillator();
          const gainNode = offlineContext.createGain();
          
          const freq = this.noteToFrequency(event.note);
          osc.frequency.value = freq;
          osc.type = this.getOscillatorType(trackId);
          
          const startTime = event.time;
          const duration = Math.min(0.01, event.duration, maxDuration - startTime);
          
          gainNode.gain.setValueAtTime(0.25, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          
          osc.connect(gainNode);
          gainNode.connect(masterGain);
          
          osc.start(startTime);
          osc.stop(startTime + duration);
        } catch (e) {
          console.warn('Export note error:', e);
        }
      }
    }
    
    try {
      const renderedBuffer = await offlineContext.startRendering();
      const wavBlob = this.audioBufferToWav(renderedBuffer);
      return wavBlob;
    } catch (e) {
      console.error('Export rendering error:', e);
      throw e;
    }
  }

  private audioBufferToWav(abuffer: AudioBuffer): Blob {
    const numOfChan = abuffer.numberOfChannels;
    const length = abuffer.length;
    const sampleRate = abuffer.sampleRate;
    
    const wavLength = 44 + length * numOfChan * 2;
    const buffer = new ArrayBuffer(wavLength);
    const view = new DataView(buffer);
    const channels: Float32Array[] = [];
    
    for (let i = 0; i < numOfChan; i++) {
      channels.push(abuffer.getChannelData(i));
    }
    
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, wavLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChan * 2, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numOfChan * 2, true);
    
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numOfChan; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, int16, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  private linearToDecibels(linear: number): number {
    if (linear <= 0) return -100;
    return 20 * Math.log10(linear);
  }
}

export const audioEngine = new AudioEngine();
