# DHAVON — Frontend Architecture & UI Specification
**Master Visual Reference**: `DHAVON Futuristic AI Observatory.png`
*Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons*

---

## 1. Visual Specification & Aesthetic Directives

DHAVON's interface is an **AI Observatory** — an immersive, contemplative, high-intelligence environment that feels like stepping into a command sanctuary at the edge of the cosmos.

### Core Visual Principles
- **Atmospheric Supremacy**: Deep obsidian and graphite floor (`#040508`, `#0B0D13`) with hyper-realistic mirror reflections of the central light source and the exterior celestial horizon.
- **Cinematic Lighting Contrast**:
  - Warm solar amber and twilight gold (`#FF9E2C`, `#F5A623`, `#FFD15C`) cast across the left horizon and reflecting across the polished ground.
  - Cold electric cyan and celestial blue (`#2B6EFD`, `#4E8BFF`, `#60A5FA`) illuminating the core filaments.
  - Ethereal ultraviolet and magenta nebula (`#8B5CF6`, `#A855F7`, `#C084FC`) swirling within the sphere.
- **Micro-Detail Glassmorphism**: Ultra-thin glass borders (`border-white/[0.08]`), backdrop blur (`backdrop-blur-xl` to `backdrop-blur-2xl`), and subtle gradient rim lights.
- **No Clutter Rule**: Strict absence of sidebars, dashboard cards, tables, or generic chat bubbles. Every pixel serves atmospheric presence and intelligence focus.

---

## 2. Master Screen Spatial Composition & Depth Layers

```
+--------------------------------------------------------------------------------------------------------+
| [D] DHAVON               THINK  •  PLAN  •  BUILD  •  GROW                    (•) Online | (D) Dhanush  (⚙) |
|     PERSONAL AI OS                                                                                     |
|                                                                                                        |
|                                         G O O D   E V E N I N G                                        |
|                                      D  H  A  N  U  S  H                                              |
|                              Y O U R   P E R S O N A L   A I ,   A L W A Y S   W I T H   Y O U         |
|                                                                                                        |
|   I D E A S                              .----~----.                                         A  M O R E|
|   I N T O                              /   *    .   \   (o)                                  F O C U S |
|   R E A L I T Y                       |   ( [D] )    |       (o)                             Y O U     |
|                                        \      .     /                                                  |
|                                          `----~----'                                                   |
|                                      /=================\                                               |
|                                     [   Glowing Plinth  ]                                              |
|                                                                                                        |
|                       +---------------------------------------------------+                            |
|                       |  ||||||  Talk to DHAVON...                    (🎙️) |                            |
|                       +---------------------------------------------------+                            |
|                                [🔍 Ask]  [📋 Plan]  [✨ Create]  [📊 Analyze]                           |
|                                                                                                        |
|  (o) LISTENING                                                                                         |
|      THINKING                                                                     [ ∞ | Powered by     |
|      ACTING                                                                             Your Mindset ] |
+--------------------------------------------------------------------------------------------------------+
```

### Depth Layer Breakdown

| Layer | Component | Rendering Technique | Visual Description |
| :--- | :--- | :--- | :--- |
| **Layer 0** | Panoramic Sky & Terrains | High-resolution layered digital matte + Canvas atmospheric haze | Panoramic glass view: crescent planet, sunset mountain range on left, starlit alpine peaks on right |
| **Layer 1** | Observatory Structure | SVG / CSS Architecture | Curved graphite architectural columns, panoramic window mullions, subtle rim lighting |
| **Layer 2** | High-Gloss Reflective Floor | WebGL / Multi-layered CSS gradients & blend modes | Polished obsidian surface with inverted live reflection of the orb, plinth glow, and horizon light |
| **Layer 3** | Concentric Plinth & Light Beams | Framer Motion + SVG radial paths | Multi-tiered circular platform with concentric amber/gold neon tracks and faint vertical laser guide pillars |
| **Layer 4** | The Living Intelligence Orb | HTML5 Canvas / WebGL Shader + Framer Motion | 3D-like spherical glass envelope, swirling dual-vortex plasma filaments, floating golden central 'D' mark, 3 orbital elliptical rings with travelling celestial micro-spheres |
| **Layer 5** | HUD & Spatial Typography | HTML5 Semantic text with Framer Motion entry | Header navigation, central greeting gradient, ambient vertical side text (`IDEAS INTO REALITY`, `A MORE FOCUSED YOU`) |
| **Layer 6** | Command Pod & Interaction Controls | React Glassmorphic components | Soundwave audio waveform, input bar, radiant microphone action button with pulse halo, 4 action pills |
| **Layer 7** | Telemetry & Mindset Badges | React + SVG micro-orb | Bottom-left tri-state status ("LISTENING / THINKING / ACTING") and bottom-right "Powered by Your Mindset" pill |

---

## 3. The Central Intelligence Orb — Detailed Specification

The DHAVON Intelligence Orb is the heart of the interface. It conveys living intelligence, situational awareness, and calm authority.

### Visual Components of the Orb
1. **The Glass Sphere Envelope**:
   - Diameter: `380px` on desktop (scales dynamically between `280px` to `440px`).
   - Outer Rim: Ultra-soft cyan/violet fresnel glow with subtle specular highlight at top-left.
   - Depth: Semi-transparent deep cosmic core with radial absorption.
2. **Internal Plasma & Energy Vortices**:
   - Vortex A (Electric Blue / Cyan): Swirling counter-clockwise, fluid mathematical noise (Simplex/Perlin-inspired).
   - Vortex B (Ultraviolet / Magenta): Swirling clockwise, creating dynamic interference patterns.
   - Warm Solar Flare: Radiant golden-amber corona emerging from the base, anchoring the orb to the pedestal.
3. **Floating Central Identity Mark**:
   - The stylized DHAVON 'D' emblem rendered in luminous golden-white.
   - Floats precisely in the spatial center of the orb with a gentle 3D parallax float (`y: [-4px, 4px]`, `duration: 4s`, ease: "easeInOut").
4. **Orbital Rings & Micro-Satellites**:
   - Three fine elliptical orbit tracks inclined at 15°, 45°, and -30° relative to the horizontal plane.
   - Four micro-spheres (amber and cyan luminous satellites) slowly revolving along the orbital paths at varying harmonic velocities (12s, 18s, 24s revolutions).
5. **Dynamic Core States**:
   - `CALM` (Default): Slow, deep rhythmic breathing (0.2 Hz), soft celestial blue & violet, steady orbit.
   - `LISTENING`: Heightened blue radiance, audio waveform reactivity, micro-particles drawn inwards.
   - `THINKING`: Swirling speed doubles, magenta filaments intensify, orbital satellites accelerate.
   - `ACTING`: Warm amber/gold energy ascends from the pedestal through the core, emitting subtle harmonic pulses.
   - `ERROR`: Subdued crimson-violet stabilization aura, controlled pulse.

---

## 4. Typography & Color System

### Typography Palette
- **Primary Display & Headings**: `Outfit` or `Inter Display` (Google Fonts), geometric, clean, modern.
- **Body & Micro-HUD**: `Inter` / `Space Grotesk` (clean sans-serif with tabular numerical lining).
- **Branding & Spacing**:
  - `DHAVON`: `font-semibold tracking-[0.35em] text-white`
  - `PERSONAL AI OS`: `font-medium text-[10px] tracking-[0.28em] text-white/50`
  - `D H A N U S H`: `font-light text-4xl lg:text-5xl tracking-[0.3em] bg-gradient-to-r from-blue-100 via-white to-amber-200 bg-clip-text text-transparent`
  - `THINK • PLAN • BUILD • GROW`: `text-xs font-medium tracking-[0.25em] text-white/60`
  - Ambient side text: `text-[11px] font-medium tracking-[0.3em] leading-relaxed text-white/30 uppercase`

### Harmonious Color Tokens

```css
:root {
  /* Ambient Observatory Canvas */
  --color-obsidian-950: #040508;
  --color-obsidian-900: #07090E;
  --color-graphite-800: #0D1017;
  --color-graphite-700: #141923;

  /* Energy Filaments */
  --color-cyan-glow: #38BDF8;
  --color-electric-blue: #2563EB;
  --color-celestial-blue: #4F46E5;
  --color-ethereal-violet: #8B5CF6;
  --color-nebula-magenta: #C084FC;

  /* Solar Pedestal & Accents */
  --color-amber-gold: #F59E0B;
  --color-solar-flare: #FCD34D;
  --color-warm-amber-glow: rgba(245, 158, 11, 0.35);

  /* Glassmorphic Surfaces */
  --glass-bg-standard: rgba(13, 16, 23, 0.55);
  --glass-bg-elevated: rgba(20, 25, 35, 0.70);
  --glass-border-subtle: rgba(255, 255, 255, 0.08);
  --glass-border-luminous: rgba(255, 255, 255, 0.16);

  /* HUD & Text */
  --text-pure: #FFFFFF;
  --text-silver: #E2E8F0;
  --text-muted: #94A3B8;
  --text-ghost: #475569;
}
```

---

## 5. Component Hierarchy (`apps/web`)

```
src/
├── app/
│   ├── layout.tsx                     # Global html, body, Outfit/Inter font imports
│   ├── page.tsx                       # Master Observatory Command Screen
│   ├── globals.css                    # Tailwind directives & custom atmospheric utilities
│   └── api/                           # Next.js BFF (Backend-for-Frontend) route proxy if needed
│
├── components/
│   ├── observatory/
│   │   ├── ObservatoryContainer.tsx   # Viewport frame, perspective manager & responsive scaler
│   │   ├── ObservatoryBackdrop.tsx    # Layer 0 & 1: Panoramic glass horizon, mountains, stars
│   │   ├── ReflectivePlinth.tsx       # Layer 2 & 3: Glossy reflective floor + concentric glowing rings
│   │   ├── IntelligenceOrb.tsx        # Layer 4: Living orb (Canvas / WebGL / Framer Motion)
│   │   ├── OrbOrbitRings.tsx          # Elliptical SVG tracks with orbiting micro-satellites
│   │   ├── AmbientSideText.tsx        # "IDEAS INTO REALITY" & "A MORE FOCUSED YOU"
│   │   └── ObservatoryHeader.tsx      # Top bar (Logo, Philosophy, Status, Profile)
│   │
│   ├── controls/
│   │   ├── CommandPod.tsx             # Primary capsule input container
│   │   ├── VoiceVisualizer.tsx        # Real-time animated audio wave bars
│   │   ├── MicActionButton.tsx        # Glowing purple/cyan action trigger with pulse ring
│   │   └── QuickActionPills.tsx       # Horizontal action array: Ask, Plan, Create, Analyze
│   │
│   ├── hud/
│   │   ├── SystemStatusWidget.tsx     # Bottom-left mini-orb + LISTENING/THINKING/ACTING stack
│   │   ├── MindsetBadge.tsx          # Bottom-right "∞ | Powered by Your Mindset" pill
│   │   └── SettingsModal.tsx          # Minimalist glass dialog for preferences & provider choice
│   │
│   └── ui/
│       ├── GlassCard.tsx              # Reusable glassmorphic container with customizable glow
│       └── GlowingBadge.tsx           # Status indicators and tag components
│
├── hooks/
│   ├── useVoiceInput.ts               # Web Speech API / MediaRecorder & audio stream hooks
│   ├── useAudioVisualizer.ts          # Web AudioContext frequency analyser for reactive waveform
│   ├── useOrbState.ts                 # Reactive orb state machine (CALM, LISTENING, THINKING, ACTING)
│   └── useDhavonSocket.ts             # Bi-directional WebSocket communication with NestJS backend
│
└── stores/
    └── useObservatoryStore.ts         # Zustand store for interaction state, prompt, active mode
```

---

## 6. Motion & Animation Specification (Framer Motion)

Animations in DHAVON are **restrained, natural, and purposeful**:

1. **Page Entrance Sequence (Staggered orchestration)**:
   - `0.0s`: Deep black background fades into ambient panoramic horizon (`duration: 1.6s`, ease: `[0.16, 1, 0.3, 1]`).
   - `0.4s`: Plinth concentric rings ignite with golden amber glow from center outward.
   - `0.8s`: Central intelligence orb materializes with subtle scale-up (`scale: [0.85, 1]`, `opacity: [0, 1]`, `duration: 1.2s`).
   - `1.2s`: Central greeting typography fades in with upward drift (`y: [12, 0]`, `opacity: [0, 1]`).
   - `1.5s`: Command Pod and quick action pills float into position.
   - `1.8s`: Top HUD and ambient side text resolve into crisp clarity.

2. **Orb Breathing Loop**:
   - `scale: [1.0, 1.025, 1.0]`, `duration: 6.0s`, ease: `"easeInOut"`, repeat: `Infinity`.
   - Core filament opacity pulsation: `opacity: [0.8, 1.0, 0.8]`, `duration: 4.5s`.

3. **Orbital Rings Rotation**:
   - Ring 1 (15° tilt): `rotateZ: 360deg`, `duration: 16s`, linear, repeat: `Infinity`.
   - Ring 2 (45° tilt): `rotateZ: -360deg`, `duration: 22s`, linear, repeat: `Infinity`.
   - Ring 3 (-30° tilt): `rotateZ: 360deg`, `duration: 28s`, linear, repeat: `Infinity`.

4. **Mic Interaction State**:
   - Idle: Subtle breathing border aura.
   - Hover: Radiant violet/cyan ring intensifies, scale `1.05`.
   - Active (Listening): Continuous radial soundwaves expand from mic button outward (`scale: [1, 1.8]`, `opacity: [0.8, 0]`, `duration: 1.2s`, repeat: `Infinity`).

---

## 7. Responsive Breakpoint Strategy

Rather than simply collapsing or wrapping cards, the layout preserves the **Observatory Sanctuary** experience across all form factors:

| Breakpoint | Dimensions | Layout Adjustments |
| :--- | :--- | :--- |
| **Desktop (Master)** | `>= 1440px` | Full panoramic aspect ratio, `380px` orb, side ambient typography visible, horizontal action pills. |
| **Laptop** | `1024px - 1439px` | Scaled `320px` orb, side typography opacity reduced to 0.25, compact command pod padding. |
| **Tablet (Landscape/Port)**| `768px - 1023px` | `280px` orb, ambient side text hidden, command pod width 85vw, action pills arranged in 2x2 or 4x1 tight grid. |
| **Mobile** | `< 768px` | `240px` orb centered, greeting typography scaled down (`text-2xl`), top navigation simplified to emblem + status icon, command pod docked with safe-area bottom padding. |
