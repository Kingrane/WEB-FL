# AGENTS.md

This document provides guidance for AI coding agents working in this codebase.

## Project Overview

A web-based Digital Audio Workstation (DAW) built with React 19, TypeScript, Vite, and Tone.js. Features include multi-track audio, piano roll editor, arrangement view, and real-time synthesis.

## Build/Lint/Test Commands

```bash
# Install dependencies
npm install

# Development server (runs on port 3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

**Note**: No lint, typecheck, or test commands are currently configured. Consider adding them:
- `npm run lint` - ESLint for code quality
- `npm run typecheck` - TypeScript type checking
- `npm test` - Run tests (framework not yet set up)

## Environment Setup

- Node.js required
- Set `GEMINI_API_KEY` in `.env.local` for API features

## Code Style Guidelines

### Imports

```typescript
// React imports - import hooks explicitly
import React, { useState, useEffect, useCallback, useRef } from 'react';

// External libraries - use * as for namespace imports when appropriate
import * as Tone from 'tone';

// Internal components - use relative paths from current file
import { ComponentName } from './components/ComponentName';

// Types - import from types.ts
import { TypeName } from '../types';

// Constants - import from constants.ts
import { CONSTANT_NAME } from '../constants';

// Path alias available: @/* maps to ./*
import { Something } from '@/path/to/module';
```

### TypeScript

- Target: ES2022
- Module: ESNext with bundler resolution
- JSX transform: react-jsx
- Use explicit interfaces for all props and data structures
- Prefer union types over enums: `'synth' | 'sampler'`
- Use `React.FC<PropsName>` pattern for component typing
- Avoid `any` - use proper types or `unknown` with type guards

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `PianoRoll`, `TrackList` |
| Files (components) | PascalCase.tsx | `TopBar.tsx` |
| Files (utilities) | camelCase.ts | `audioEngine.ts` |
| Functions/handlers | camelCase + handle prefix | `handlePlay`, `handleBpmChange` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_BPM`, `STEP_WIDTH` |
| Interfaces | PascalCase | `TrackData`, `TopBarProps` |
| Type aliases | PascalCase | `SynthWaveform`, `TrackType` |
| Private class members | camelCase with private | `private synths: Map` |

### React Patterns

- Use functional components with hooks
- Destructure props in function signature
- Use `useCallback` for handlers passed as props to prevent re-renders
- Use `useRef` for mutable values that don't trigger renders
- Use `useEffect` with proper dependency arrays
- Default exports for main components, named exports for utilities

```typescript
export const ComponentName: React.FC<ComponentNameProps> = ({
  prop1,
  prop2,
}) => {
  const handler = useCallback((id: string) => {
    // implementation
  }, [dependencies]);
  
  return <div>...</div>;
};
```

### Formatting

- Indentation: 2 spaces
- Quotes: Single quotes for strings
- Semicolons: Yes
- Trailing commas: Yes (in multiline)
- Max line length: No explicit limit, but prefer readable lines

### Comments

- **No comments in code** unless explicitly requested
- Code should be self-documenting through clear naming

### Error Handling

- Use console.error for non-critical errors
- Provide fallback values for graceful degradation
- Throw errors only for critical failures that halt execution

```typescript
// Fallback pattern
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Graceful degradation
onerror: (err) => {
  console.error("Sampler error, falling back to Synth:", err);
  complete(new Tone.Synth());
}
```

### State Management

- Local component state with `useState` for UI state
- Lift state up to parent components when shared
- Use refs for values that don't need to trigger re-renders
- State updates: use functional form when depending on previous state

```typescript
setState(prev => ({ ...prev, isPlaying: true }));
```

### CSS/Styling

- Tailwind CSS for all styling
- Dark theme with custom colors: `#0A0A0A`, `#111`, `#222`, `#333`
- Primary accent: `#1a44ff`
- Secondary accent: `#ff2a5f`
- Use Tailwind arbitrary values for specific colors: `bg-[#050505]`

### File Structure

```
/
├── App.tsx              # Main application component
├── index.tsx            # Entry point
├── types.ts             # TypeScript interfaces and types
├── constants.ts         # Application constants and defaults
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies and scripts
├── components/          # React components
│   ├── TopBar.tsx
│   ├── TrackList.tsx
│   ├── ArrangementView.tsx
│   ├── PianoRoll.tsx
│   └── StepGrid.tsx
└── services/            # Business logic and services
    └── AudioEngine.ts
```

### Component Guidelines

- Keep components focused on single responsibility
- Extract reusable logic into custom hooks
- Pass data down, events up
- Use composition over inheritance

### Testing (When Implemented)

- Test files should be named `*.test.ts` or `*.test.tsx`
- Place test files adjacent to the code they test
- Run single test file: configure test framework first

## Key Dependencies

- **React 19**: UI framework
- **Tone.js**: Web Audio API wrapper for synthesis and scheduling
- **Lucide React**: Icon library
- **Vite**: Build tool and dev server

## Common Tasks

### Adding a new component

1. Create file in `components/` with PascalCase name
2. Define Props interface
3. Export component with `React.FC<Props>`
4. Import and use in parent component

### Adding a new track type

1. Add type to `TrackType` in `types.ts`
2. Add handling in `AudioEngine.ts` `createInstrument()`
3. Update UI in `TrackList.tsx`

### Adding new synth waveform

1. Add to `SynthWaveform` type in `types.ts`
2. Add to `SYNTH_TYPES` array in `constants.ts`
3. Add case in `AudioEngine.ts` switch statement
