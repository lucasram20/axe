# Project-Labs

**Project-Labs** is a 3D isometric pixel-art AI Lab Tycoon (idle + management) built with Vite, React, TypeScript, Three.js, and Zustand. Start in a 2010 garage with consumer GPU rigs and scale into a frontier AI research lab competing on global benchmarks.

## Running Locally

```bash
npm install
npm run dev
```

Run deterministic simulation unit tests:

```bash
npx --yes tsx --test src/sim/sim.test.ts
```

## Controls

| Input | Action |
| --- | --- |
| `WASD` / Arrow Keys / Drag | Pan isometric camera |
| `Q` / `E` | Rotate camera in smooth 90° snaps |
| Mouse Wheel | Discrete isometric zoom steps |
| `B` | Open / close Build drawer |
| `R` | Rotate item footprint (90°) in Build / Move mode |
| Left Click | Place item / Select equipment or staff / Sell item |
| Right Click / `Esc` | Cancel build mode / Close drawer / Pause menu |
| `Space` / `1` / `2` / `3` | Pause, 1x, 2x, 4x simulation speed |
| `M` | Mute / unmute procedural Web Audio SFX |
| `` ` `` (Backtick) | Toggle Debug Panel (+Cash, +Compute, Skip Time, Trigger Event, +25 Instanced Staff) |
| Minimap Click | Jump camera to any coordinate in the lab |

## Architecture Overview

- **`/src/sim`** — 100% pure TypeScript fixed-timestep deterministic simulation engine with **zero React or Three.js imports**:
  - `types.ts`: Game state schema and deterministic LCG PRNG.
  - `grid.ts`: Footprint rotation, placement/move/sell validation, floor painting, walkable tile queries.
  - `economy.ts`: Compute, power, cooling/thermal throttling, payroll, tech tree unlocking, and funding rounds.
  - `staffSim.ts`: Candidate generation, desk slot capacity, mood/energy decay, and tile-space walking state machine (desks, espresso station, whiteboards, server racks).
  - `training.ts`: Real-time model training jobs, benchmark scoring, model library, and shipping API products.
  - `engine.ts`: Master `stepSimulation` tick, calendar/era transitions, rival progression, automation unlocks, random events, and capped offline idle catch-up.
  - `save.ts`: Versioned `localStorage` persistence (`SAVE_VERSION = 1`) with `migrateSave` stub.
- **`/src/render`** — Isolated Three.js isometric pixel-art rendering engine:
  - `pixelPipeline.ts`: Renders the scene to a low-resolution `WebGLRenderTarget` (`viewport / pixelScale`, ~480×270 at 3x on desktop) with `NearestFilter`, runs a view-space normal + depth 1px outline & 32-color palette quantization pass, and blits to screen with a sub-pixel UV offset from the pixel-snapped `OrthographicCamera`.
  - `models.ts` & `textures.ts`: Procedural 16×16/32×32 `NearestFilter` pixel textures, 4-band toon `DataTexture` gradient map, and composite multi-part voxel `THREE.Group` props.
  - `staffRenderer.ts`: 5-draw-call `InstancedMesh` voxel character system supporting 256 animated staff at 60 FPS.
  - `particles.ts`: Zero-GC pooled `InstancedMesh` voxel particles for cooling-tower steam, espresso wisps, training sparks, and build puffs.
  - `LabScene.ts` & `LabViewport.tsx`: Camera rig, day/night cycle, ghost placement preview, and software-WebGL `afterDraw()` pacing.
- **`/src/data`** — Pure data-driven configs (`palette.ts`, `balance.ts`, `items.ts`, `staff.ts`, `techs.ts`, `datasets.ts`, `events.ts`, `rivals.ts`, `funding.ts`).
- **`/src/store`** — Zustand + Immer store bridging `/src/sim` with React HUD and `localStorage` autosave.
- **`/src/ui`** — Ornate 9-slice pixel-art DOM HUD overlay with locally bundled `Silkscreen` and `Pixelify Sans` pixel fonts and crisp SVG pixel icons.

## How to Add Content (No Engine Changes Required)

- **New Equipment / Room Floor**: Append an entry to `CATALOG_ITEMS` in `/src/data/items.ts` and add its composite voxel geometry case in `/src/render/models.ts` plus its 16×16 pixel icon in `/src/ui/PixelIcons.tsx`.
- **New Era Pack (e.g., 1960s–1990s Classic AI)**: `ERAS` in `/src/data/techs.ts` is keyed by `packId` and `startYear`. Prepend historical eras (Perceptrons, Expert Systems, Backprop Winter) and matching `TECH_NODES`, `DATASETS`, and `CATALOG_ITEMS` (e.g., Mainframe Tape Drives) and set `BALANCE.startYear = 1965` in `/src/data/balance.ts`.
- **Rebalancing Economy**: Edit `/src/data/balance.ts` (starting cash, day duration, salaries, power/cooling penalties, offline caps).

## How to Tweak the Pixel Look

- **In-game**: Open the **Settings** drawer to toggle **Pixel Scale** (`2x`, `3x`, `4x`), **1px Ink Outlines**, **32-Color Palette Quantize**, and **Pixel Shadows**.
- **Palette**: Edit `RAW_HEX` (32 colors) in `/src/data/palette.ts`; the GLSL palette-quantization shader automatically consumes it via `uPalette[32]`.
- **Outline Sensitivity**: Adjust `step(0.0055, depthEdge)` and `step(0.45, nDiff)` in `/src/render/pixelPipeline.ts`.
- **Toon Shading Bands**: Edit the 4 luminance values in `createToonGradientMap()` inside `/src/render/textures.ts`.
