# DHAVON — Phase 8 Final Observatory UI & Real-Time Integration Specification

## 1. Visual Architecture & Spatial Hierarchy
The DHAVON Observatory UI is the definitive human interface of the **DHAVON Personal AI Operating System**. Derived directly from the visual source of truth (`DHAVON Futuristic AI Observatory.png`), it creates an immersive, contemplative, high-intelligence environment that positions the AI as a living cognitive partner rather than a transactional chat assistant or conventional enterprise dashboard.

### Core Visual Principles
- **No Clutter Rule:** Absolute elimination of sidebars, grids, table views, dense cards, and administrative widgets.
- **Atmospheric Supremacy:** Deep obsidian architectural frame (`#040508`) with panoramic celestial backdrop (sunset alpine ridges on left, starlit glacial peaks on right, crescent moon, and twilight star field).
- **Obsidian Floor Mirror Reflection:** Specular reflection pool reflecting the amber pedestal corona and starlit horizon light across the ground.
- **Glassmorphic Micro-Detail:** Thin translucent rim lighting (`border-white/[0.08]`), backdrop blur (`backdrop-blur-2xl`), and restrained gold and azure accents.

---

## 2. Component Hierarchy (`apps/web`)

```text
apps/web/src/
├── app/
│   ├── globals.css                # Glass capsules, floor reflection masks, typography tokens
│   ├── layout.tsx                 # Root layout, Google Fonts (Outfit & Inter), metadata
│   └── page.tsx                   # Renders DhavonShell
├── components/
│   └── dhavon/
│       ├── ObservatoryScene.tsx   # Layer 0-4: Cosmic backdrop, SVG mountains, glass mullions, obsidian floor
│       ├── DhavonHeader.tsx       # Layer 6: Luminous 'D' mark, status pill, user avatar, settings trigger
│       ├── DhavonGreeting.tsx     # Layer 7: Dynamic time-of-day salutation, 'D H A N U S H', subtext
│       ├── DhavonOrb.tsx          # Layer 5: High-DPI Volumetric Canvas, SVG orbital trajectories, gold 'D'
│       ├── CommandPod.tsx         # Layer 8: Acoustic-reactive soundwave, input, mic toggle, send arrow
│       ├── ActionControls.tsx     # Layer 9: Mode selectors (Ask, Plan, Create, Analyze)
│       ├── AmbientText.tsx        # Layer 10: Low-opacity side vertical typography (IDEAS INTO REALITY)
│       ├── TelemetryIndicator.tsx # Layer 10: Live connection pulse, 3-phase state, active task status
│       ├── MindsetBadge.tsx      # Layer 10: Dynamic cognitive mode indicator ('Powered by Your Mindset')
│       └── SettingsModal.tsx      # Layer 11: Real-time subsystem status dialog (AI, Voice, MCP, Security)
├── hooks/
│   ├── useOrbState.ts             # State transitions, active mode, interactive triggers
│   └── useVoiceIntelligence.ts   # Web Audio analyser (live audioLevel), Groq Whisper STT, TTS, barge-in
└── lib/
    └── dhavon-client.ts           # Socket.IO client, real-time telemetry, ephemeral tool confirmations
```

---

## 3. Real Runtime State Mapping
The central Orb and system telemetry strictly mirror actual DHAVON Core execution states rather than simulated animations:

| DHAVON Runtime State | Visual Orb State | Core Energy Behavior | Telemetry Active Text |
|---|---|---|---|
| `IDLE` / `READY` | `CALM` | Serene harmonic breathing, celestial azure/violet drift, gold lower base | None (Steady baseline) |
| `LISTENING` / Voice Recording | `LISTENING` | Heightened electric cyan focus, acoustic waveform reacting to mic | `LISTENING` (Sky blue glow) |
| `TRANSCRIBING` / Whisper STT | `THINKING` | Accelerated orbital trajectories, intensified magenta/violet nebula | `THINKING` (Purple glow) |
| `CONTEXT_RETRIEVAL` / Memory | `THINKING` | Radial plasma vortices swirl counter-clockwise | `THINKING` (Purple glow) |
| `PLANNING` / Goal Decomposition | `THINKING` | Multi-dimensional orbital acceleration | `THINKING` (Purple glow) |
| `WAITING_FOR_APPROVAL` (MCP) | `THINKING` | Pulsing focus; prompts user with single-use confirmation dialog | `THINKING` + Paused |
| `EXECUTING` / MCP Execution | `ACTING` | Warm amber energy ascends from pedestal; golden core filaments | `ACTING` (Amber gold glow) |
| `SPEAKING` / Voice Synthesis | `ACTING` | Harmonic golden aura, vocal pacing rhythm | `ACTING` (Amber gold glow) |
| `INTERRUPTED` / Voice Barge-In | `LISTENING` | Instant audio flush, immediate return to listening focus | `LISTENING` (Sky blue glow) |
| `ERROR` / System Exception | `ERROR` | Controlled deep ruby/crimson stabilizer pulse (auto-clears to CALM) | `ERROR` (Rose glow) |

---

## 4. Voice Command Pod & Acoustic Reactivity
- **Acoustic Reactive Waveform:** Using Web Audio API (`AudioContext` + `AnalyserNode`), `useVoiceIntelligence` extracts live microphone frequency amplitude and passes `audioLevel: number` to `CommandPod`.
- **Harmonic Modulation:** The 7-bar waveform dynamically modulates its height with real voice intensity as the user speaks.
- **Contextual Placeholders:**
  - `Ask`: "Talk or type to DHAVON..."
  - `Plan`: "Describe a goal to plan..."
  - `Create`: "Tell DHAVON what to create..."
  - `Analyze`: "Specify what you want to analyze..."
  - When recording: "Listening to your voice..."
- **Mobile Send Button:** An accessible send arrow appears seamlessly whenever text is entered, enabling tap submission on touch devices.

---

## 5. Responsive Behavior Across Viewports

| Viewport | Tested Width | Behavior & Hierarchy |
|---|---|---|
| **Mobile Portrait** | `375px`, `390px`, `414px` | Orb scales to 210px; header collapses Dhanush name; side text hidden; inner window mullions hidden; dvh prevents vertical clipping; zero horizontal scroll. |
| **Tablet** | `768px`, `1024px` | Orb scales to 260px; philosophy text hidden on small tablets; command pod full width; action buttons well-spaced; side text hidden on narrow tablet. |
| **Desktop / Laptop**| `1280px`, `1440px` | Orb scales to 310px; full atmospheric side text enabled; philosophy center text enabled; complete negative space preserved. |
| **Ultra-Wide / 4K** | `1920px+` | Viewport centered, generous obsidian floor reflections, 500px High-DPI canvas scaled at 2x devicePixelRatio for razor-sharp rendering. |

---

## 6. Accessibility & Inclusivity (WCAG 2.1 AA)
1. **Semantic HTML:** Native `<header>`, `<main>`, `<button>`, `<input>` elements utilized throughout.
2. **Keyboard Navigation:** Full tab order across all interactive controls with visible focus rings (`focus-visible:ring-2 focus-visible:ring-sky-400/80`).
3. **Reduced Motion:** Automatic detection of `window.matchMedia('(prefers-reduced-motion: reduce)')`. Canvas speed scaled down to 0.2x; CSS transitions dampened.
4. **ARIA Standards:** `role="dialog"`, `role="search"`, `role="group"`, `aria-pressed`, `aria-live="polite"` for dynamic streaming and telemetry announcements.

---

## 7. Performance Engineering
- **Target Framerate:** Sustained 60 FPS on standard desktop and laptop GPUs.
- **Canvas Lifecycle:** Proper `requestAnimationFrame` cleanup with `cancelAnimationFrame` on unmount.
- **Web Audio Teardown:** Audio contexts and microphone media streams cleanly terminated when voice recording ends.
- **CSS GPU Offload:** Heavy blur and gradient filters confined to hardware-accelerated layers via `will-change: transform`.

---

## 8. Security Non-Negotiables Maintained
- **Zero Frontend Secrets:** No private keys or JWT tokens embedded in browser bundles.
- **Authorization Gating:** MCP mutating actions require explicit confirmation tokens through the single-use 5-minute TTL gateway.
- **Sanitized Outputs:** Error notices returned to the UI are human-friendly and free of stack traces or database schema leaks.
