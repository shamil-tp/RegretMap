# REGRET MAP // Comprehensive Design System & Replication Specification

> **Document Purpose**: Complete, exhaustive design specification for replicating the **Regret Map** web interface. This document details every design token, typographic rule, structural constraint, layout geometry, component blueprint, animation curve, micro-interaction state, and JavaScript interaction mechanic without omitting any detail.

---

## 1. Design Philosophy & Aesthetic Essence

**Regret Map** blends **Modern Rounded Neo-Brutalism** with **Old-School Utilitarian Forum Architecture** (early Reddit / Hacker News) and **Tactical Geospatial Cartography**.

### Core Tenets
1. **Raw High Contrast**: Stark black ink (`#000000`) borders and text over an unbleached, raw paper off-white canvas (`#F7F6F2`).
2. **Solid Block Shadows (No Blur)**: Strict, un-blurred geometric drop shadows (`5px 5px 0px #000000`). Elevation is depicted solely through hard physical displacement, never diffuse Gaussian blur.
3. **Friendly Neo-Brutalist Curvature**: Unlike early brutalism's razor-sharp 0px edges, this system employs generous border radii (`14px`–`24px` for containers, `9999px` full pills for buttons/tags, and `50%` circles for avatars), balancing aggressive contrast with inviting ergonomics.
4. **Information Density with Breathing Room**: Preserves the dense multi-tier discussion and metadata capabilities of Reddit while avoiding cognitive overload through clean column distribution, ample whitespace, and focused typography.
5. **Purposeful Accent Coding**:
   - **Stark Red (`#FF3B30`)**: Reserved exclusively for "Regret" (high heat blobs, severe loss ratings, upvotes).
   - **Electric Blue (`#0055FF`)**: Reserved for downvotes, secondary metadata links, and navigation tags.
   - **Caution Yellow (`#FFD600`)**: Reserved for primary CTAs, location pins, and warning badges.

---

## 2. Complete Design Tokens & CSS Variables

Replicate these custom properties verbatim in `:root`:

```css
:root {
  /* --- Background & Surfaces --- */
  --bg-base: #F7F6F2;            /* Raw newspaper / subtle off-white base canvas */
  --surface: #FFFFFF;            /* Pure stark white for cards and modals */
  --border-color: #000000;       /* Absolute solid black */
  
  /* --- Typography Colors --- */
  --text-main: #111111;          /* High contrast charcoal-black for headlines/body */
  --text-muted: #666666;         /* Calm, readable metadata and timestamps */
  
  /* --- Brand Accents --- */
  --accent-regret: #FF3B30;      /* Stark aggressive red (upvotes, hot spots, severity) */
  --accent-map: #0055FF;         /* Electric blue (downvotes, map tags, interactive links) */
  --accent-highlight: #FFD600;   /* Caution yellow (primary CTAs, alert tags, location pills) */
  --accent-mint: #00E599;        /* Retro green (positive alternatives & tips) */
  --accent-orange: #FF7A00;      /* Mid-tier heat gradient color */
  
  /* --- Border Dimensions --- */
  --border-thick: 2.5px solid var(--border-color);
  --border-medium: 2px solid var(--border-color);
  --border-thin: 1.5px solid var(--border-color);
  
  /* --- Border Radius Scale --- */
  --radius-xs: 6px;              /* Small badges, timeline timestamps */
  --radius-sm: 10px;             /* Filter tags, vote buttons, collapse toggles */
  --radius-md: 14px;             /* Primary buttons, input fields, comment cards */
  --radius-lg: 18px;             /* Feed cards, view switcher, map frames */
  --radius-xl: 24px;             /* Large dialog windows and modals */
  --radius-pill: 9999px;         /* Full pill buttons, search bar, category chips */
  --radius-circle: 50%;          /* User avatars, radar sweep center, slider thumbs */
  
  /* --- Block Drop Shadows (Strict Zero Blur) --- */
  --shadow-sm: 3px 3px 0px #000000;
  --shadow-base: 5px 5px 0px #000000;
  --shadow-hover: 7px 7px 0px #000000;
  --shadow-modal: 8px 8px 0px #000000;
  
  /* --- Typography Font Families --- */
  --font-display: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'IBM Plex Mono', monospace;
  
  /* --- Micro-Interaction Curves --- */
  --transition-fast: 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  --transition-spring: 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
```

### Canvas Background Texture
The body canvas uses a clean, tactile geometric dot grid:
```css
body {
  background-color: var(--bg-base);
  background-image: radial-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

---

## 3. Typography Hierarchy & Rules

| Element | Font Family | Size | Weight | Tracking (Letter Spacing) | Line Height | Case |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Page H1** | `Space Grotesk` | `1.95rem` (31px) | 800 | `-0.02em` | `1.2` | Sentence / Title |
| **Post Title (Feed)** | `Space Grotesk` | `1.22rem` (19.5px) | 800 | `-0.01em` | `1.3` | Title Case |
| **Card / Widget H4** | `Space Grotesk` | `0.95rem`–`1.0rem` | 700 | `-0.01em` | `1.25` | Title Case |
| **Body Story Text** | `IBM Plex Sans` | `0.94rem`–`0.96rem` | 400 | `normal` | `1.55`–`1.6` | Normal |
| **Metadata / Timestamps** | `JetBrains Mono` | `0.78rem` (12.5px) | 500 | `normal` | `1.4` | Normal |
| **Coordinates & IDs** | `JetBrains Mono` | `0.75rem` (12px) | 700 | `-0.01em` | `1.2` | Uppercase |
| **Pill Buttons** | `Space Grotesk` | `0.85rem`–`0.9rem` | 700 | `-0.01em` | `1.0` | Title / Capital |
| **Thread [ - ] Toggle** | `JetBrains Mono` | `0.80rem` (13px) | 700 | `normal` | `1.0` | Monospace |

---

## 4. Physics & Micro-Interaction States

All interactive elements (buttons, cards, chips, search inputs) follow uniform mechanical physical states:

### 1. Default State
- Border: `2.5px solid #000000`
- Shadow: `box-shadow: 5px 5px 0px #000000;`
- Position: `transform: translate(0, 0);`

### 2. Hover State
- Displacement: Translates up and left by `1px` to `2px`.
- Shadow expands to match the physical lift:
  ```css
  transform: translate(-2px, -2px);
  box-shadow: 7px 7px 0px #000000;
  ```

### 3. Active / Pressed State
- The button physically depresses into the page, fully collapsing the drop shadow:
  ```css
  transform: translate(3px, 3px);
  box-shadow: 0px 0px 0px #000000;
  ```

### 4. Focus State (Inputs & Textareas)
- Background shifts from `--bg-base` to pure `--surface` (`#FFFFFF`).
- Solid black block shadow appears: `box-shadow: 4px 4px 0px #000000;`.
- Outline: `none`.

---

## 5. Layout Architecture & Geometry

The application employs a **3-column desktop layout** contained within a centered `1320px` wrapper:

```
+---------------------------------------------------------------------------------------+
|  HEADER: [RM Stamp] REGRET MAP       [Search Pills...]          [+ Log Regret] (Avatar)|
+---------------------------------------------------------------------------------------+
|  LEFT (220px)      |  MAIN COLUMN (Flex 1, min 0)              |  RIGHT (310px)       |
|  Sticky top: 86px  |  Feed View / Deep Thread / Map View       |  Sticky top: 86px    |
|                    |                                           |                      |
|  - Nav Menu Card   |  - View Switcher ([Feed] [Map] [Split])   |  - Live Radar Box    |
|    - Feed Pill     |  - Sort Toolbar (Hot / New / Top)         |    (Conic sweep)     |
|    - Heatmap Pill  |  - Regret Cards Stack                     |                      |
|                    |    (Left vote column + Content + Image)   |  - Trending Hotspots |
|  - Category Chips  |                                           |    (Top 3 locations) |
|    (Traffic, etc.) |  - OR Mount Bromo Thread Expanded View    |                      |
+---------------------------------------------------------------------------------------+
```

### Grid Breakpoints
```css
.app-layout-grid {
  display: grid;
  grid-template-columns: 220px 1fr 310px;
  max-width: 1320px;
  margin: 0 auto;
  gap: 24px;
  padding: 24px 20px;
}

/* Tablet: Hide Right Sidebar */
@media (max-width: 1100px) {
  .app-layout-grid {
    grid-template-columns: 200px 1fr;
  }
  .sidebar-right { display: none; }
}

/* Mobile: Single Column Stack */
@media (max-width: 780px) {
  .app-layout-grid {
    grid-template-columns: 1fr;
    padding: 12px;
  }
  .sidebar-left, .header-search-bar { display: none; }
}
```

---

## 6. Detailed Component Blueprints

### Component 1: Global Sticky Header
- **Container**: `position: sticky; top: 0; z-index: 1000; background: #FFFFFF; border-bottom: 2.5px solid #000;`
- **Brand Stamp**: Square badge with `background: #FF3B30; color: #FFF; border: 2.5px solid #000; border-radius: 10px; padding: 4px 8px; font-weight: 800; font-family: Space Grotesk; box-shadow: 2px 2px 0px #000;`
- **Search Bar**: `border: 2.5px solid #000; border-radius: 9999px; background: #F7F6F2; padding: 9px 14px 9px 38px; box-shadow: 2px 2px 0px #000;`
- **User Avatar**: `width: 34px; height: 34px; border: 2px solid #000; border-radius: 50%; background: #FFD600; font-weight: 700;`

### Component 2: Regret Card (Reddit-Style)
- **Container**: CSS Grid with `grid-template-columns: 52px 1fr; border: 2.5px solid #000; border-radius: 18px; background: #FFF; box-shadow: 5px 5px 0px #000; overflow: hidden;`
- **Voting Column (Left)**:
  - Background: `#FAF9F5` (slightly warm neutral tint).
  - Border right: `2px solid #000000`.
  - Chevrons: `32px x 32px`, `border-radius: 10px`, stroke width `3`.
  - **Upvoted State**:
    - Button background: `#FFF0F0`
    - Border: `2px solid #FF3B30`
    - Icon stroke: `#FF3B30`
    - Vote number color: `#FF3B30`
  - **Downvoted State**:
    - Button background: `#F0F4FF`
    - Border: `2px solid #0055FF`
    - Icon stroke: `#0055FF`
    - Vote number color: `#0055FF`
- **Image Preview**:
  - `border: 2px solid #000; border-radius: 14px; max-height: 240px; overflow: hidden; position: relative;`
  - Severity badge overlay: `position: absolute; top: 12px; right: 12px; background: #FF3B30; color: #FFF; border: 2px solid #000; border-radius: 9999px; padding: 4px 10px; font-weight: 700; box-shadow: 2px 2px 0px #000;`
- **Footer Action Pills**:
  - `padding: 5px 12px; border: 1.5px solid #000; border-radius: 9999px; background: #F7F6F2; font-family: JetBrains Mono; font-size: 0.75rem; font-weight: 700;`
  - Comments pill has `background: #FFD600; font-weight: 800;`.

### Component 3: Deep Nested Comment Thread Architecture
- **Breadcrumb Navigation**:
  - Sticky at top: `← Back to Feed` pill button with location coordinates right-aligned.
- **Indentation Guide Line**:
  - Every nested child container indents `margin-left: 24px; padding-left: 16px;`.
  - Connected by a strict guide line: `border-left: 2.5px solid #000000;`.
- **Collapse / Expand Toggle Button**:
  - Monospace text `[ – ]` (when open) and `[ + ]` (when collapsed).
  - Border: `1px solid #000; border-radius: 6px; padding: 1px 5px; background: #F7F6F2;`.
  - When collapsed: entire subtree hides; placeholder banner displays:
    `[ + ] Thread collapsed (X replies hidden)`.
- **Inline Reply Composer**:
  - Triggered by clicking "Reply" on any comment node.
  - Appends an inline box directly under the comment:
    `border: 1.5px solid #000; border-radius: 10px; background: #F7F6F2; padding: 10px;`.
  - Contains a textarea and two pill buttons: `[Cancel]` and `[Post]`.
- **Comment Voting**:
  - Inline miniature chevrons (▲ and ▼) with identical `#FF3B30` and `#0055FF` active states.

### Component 4: Monochromatic Geographic Heatmap
- **Base Map**: Rendered with **Leaflet.js** using Carto Voyager / Positron tiles.
- **Monochrome Tile Filter**:
  ```css
  .leaflet-tile {
    filter: grayscale(100%) contrast(140%) brightness(95%);
  }
  ```
- **Heat Blob Rendering (Dual Circle Stacking)**:
  For each coordinate, two stacked SVG circles simulate heat density:
  1. *Outer Aura*: `fillColor: '#FFD600', fillOpacity: 0.38, stroke: false, radius: spot.radius * 18000 meters`.
  2. *Core Intense Red*: `fillColor: '#FF3B30', fillOpacity: 0.85, stroke: true, weight: 1.5, color: '#000000', radius: spot.radius * 0.45 * 18000 meters`.
- **Interactive HTML Markers**:
  - Custom Leaflet `divIcon`:
    ```html
    <div class="brutal-pin-inner" onclick="window.regretApp.onMapPinClick('bromo-sunset')">
      <span>🔥 4,812</span>
      <span style="font-size: 10px; background: #000; color: #FFF; padding: 1px 4px; border-radius: 9999px;">Mt. Bromo</span>
    </div>
    ```
  - Pin style: `background: #FF3B30; color: #FFF; border: 2px solid #000; border-radius: 9999px; box-shadow: 2px 2px 0px #000;`.
- **Leaflet Popup Override**:
  - Content wrapper: `border: 2px solid #000; border-radius: 14px; box-shadow: 5px 5px 0px #000; background: #FFF;`.
  - Tip triangle: `display: none !important;`.

### Component 5: Right Sidebar Mini-Radar Widget
- **Preview Box**: `width: 100%; height: 140px; border: 2px solid #000; border-radius: 14px; background: #1a1a1a; position: relative; overflow: hidden;`
- **Spinning Sweep Line Animation**:
  ```css
  .radar-sweep-line {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: conic-gradient(from 0deg, rgba(255, 59, 48, 0.4) 0deg, transparent 60deg);
    border-radius: 50%;
    transform-origin: center center;
    animation: radar-spin 4s linear infinite;
  }
  @keyframes radar-spin {
    100% { transform: rotate(360deg); }
  }
  ```
- **Pulsing Blips**:
  - Small circular red dots: `width: 7px; height: 7px; background: #FF3B30; border: 1px solid #FFF; border-radius: 50%; box-shadow: 0 0 5px #FF3B30;`

### Component 6: "Log a Regret" Modal
- **Overlay**: `position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: none;`
- **Window**: `max-width: 540px; background: #FFF; border: 2.5px solid #000; border-radius: 24px; box-shadow: 8px 8px 0px #000; overflow: hidden;`
- **Header**: `background: #FFD600; border-bottom: 2px solid #000; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center;`
- **Severity Slider**:
  - Track: `height: 10px; background: #E5E4DE; border: 1.5px solid #000; border-radius: 9999px;`
  - Thumb: `width: 22px; height: 22px; background: #FF3B30; border: 2px solid #000; border-radius: 50%; box-shadow: 1px 1px 0px #000; cursor: pointer;`

---

## 7. Interactive State Machine & Transitions

### View Switching Mechanic
The segmented toggle slider switches between 3 discrete states:
1. `feed`: Shows `#feed-view-container` (or `#deep-thread-container` if a post is active). Hides map.
2. `map`: Hides feed and thread. Shows `#heatmap-view-section`. Calls `map.invalidateSize()` and fits world bounds.
3. `split`: Displays `#split-view-section` in a `1fr 1fr` side-by-side grid. Synchronizes feed items with `flyToSpot()` coordinates on click.

### Transition to Deep Thread View
- Triggered by: Clicking the post title, post image, or "Comments" pill.
- Implementation:
  1. Sets `state.activeThreadPostId = postId`.
  2. Updates browser URL hash: `window.location.hash = 'post-' + postId`.
  3. Sets `#feed-view-container.style.display = 'none'`.
  4. Sets `#deep-thread-container.style.display = 'flex'`.
  5. Triggers CSS keyframe animation:
     ```css
     @keyframes threadFadeIn {
       from { opacity: 0; transform: translateY(8px); }
       to { opacity: 1; transform: translateY(0); }
     }
     ```
  6. Smooth scrolls window to top: `window.scrollTo({ top: 0, behavior: 'smooth' })`.
- Return to Feed:
  Clicking "← Back to Feed" clears `activeThreadPostId`, clears the hash, toggles display properties back, and re-renders the feed preserving scroll position.

### Voting State Logic
```javascript
function handleVote(id, direction) {
  const current = state.userVotes[id];
  if (current === direction) {
    // Clicking the same direction un-votes (returns to neutral)
    delete state.userVotes[id];
  } else {
    // Toggles between 'up' and 'down'
    state.userVotes[id] = direction;
  }
  reRenderActiveView();
}
```

---

## 8. Step-by-Step Implementation Checklist for Replication

To build this exact design from scratch in any tech stack (React, Svelte, Vue, or Vanilla):

1. [ ] **Fonts Setup**: Import `Space Grotesk` (700/800), `IBM Plex Sans` (400/600), and `JetBrains Mono` (400/700) from Google Fonts.
2. [ ] **CSS Variables**: Copy all variables from Section 2 into your global stylesheet.
3. [ ] **Reset**: Ensure `box-sizing: border-box;` without enforcing universal `border-radius: 0px`.
4. [ ] **Header**: Create a sticky header with a yellow pill CTA button, round user avatar, and centered pill search input.
5. [ ] **Layout Grid**: Setup a 3-column CSS grid (`220px 1fr 310px`) with `max-width: 1320px` and `gap: 24px`.
6. [ ] **Left Nav**: Implement rounded menu cards with active pill highlight (`#FFD600`) and category filter chips.
7. [ ] **Main View Switcher**: Build a segmented pill slider (`Feed`, `Heatmap`, `Split`) with active pill button inversion.
8. [ ] **Feed Cards**: Build the 2-column card (`52px` vote column + content area). Include up/down chevrons with `#FF3B30` and `#0055FF` active states.
9. [ ] **Thread Transition**: Build the Mount Bromo drill-down view with chronological breakdown and recursive nested comments.
10. [ ] **Nested Guide Lines**: Indent each comment depth by `24px` with a `2.5px solid #000000` left border line.
11. [ ] **Collapse Mechanics**: Wire up the `[ – ]` and `[ + ]` toggle buttons to hide comment subtrees.
12. [ ] **Inline Reply Composer**: Add dynamic reply boxes with pill action buttons.
13. [ ] **Leaflet Heatmap**: Initialize Leaflet with grayscale toner tile filter, dual stacked SVG heat circles (`#FFD600` and `#FF3B30`), and custom pill markers.
14. [ ] **Radar Scanner**: Implement CSS `conic-gradient` 4s rotation for the live scanner blip.
15. [ ] **Modal & Toast**: Add a rounded modal with a red severity slider thumb and non-intrusive floating toasts.
