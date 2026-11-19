# Changelog — Project-Labs

## M1: Pixel-Art 3D Isometric Pipeline
- Set up Vite + React + TypeScript + Three.js + Zustand + locally bundled pixel fonts (`Silkscreen`, `Pixelify Sans`).
- Built low-resolution `WebGLRenderTarget` pipeline (`pixelPipeline.ts`) with `NearestFilter` upscaling, disabled antialiasing, and `image-rendering: pixelated`.
- Implemented true isometric `OrthographicCamera` (45° yaw with smooth Q/E 90° tween, 35.264° pitch, discrete zoom steps) and pixel-snapped camera translation with sub-pixel quad UV remainder to eliminate panning shimmer.
- Added 4-band toon cel-shading (`MeshToonMaterial` + NearestFilter gradient map), 1px depth + normal ink outlines with lighter selection/hover outline pass, and 32-color palette quantization shader.
- Added grounded tech-park perimeter surroundings with instanced voxel trees and paved access road.

## M2: Isometric Grid, Build Mode & Ornate Pixel HUD
- Built pure `/src/sim/grid.ts` with footprint rotation (`R`), placement validation, move, sell refund, and floor zone painting (`Concrete`, `Research Lab`, `Raised Server Floor`, `Lounge Carpet`).
- Created composite 3–12 part voxel models (`models.ts`) for desks, dual-monitor bays, whiteboards, espresso machines, DIY GPU rigs, blade server racks, tensor pods, liquid-cooled clusters, AC units, cooling towers, generators, transformers, window walls, plants, and shelves.
- Implemented ghost placement preview (valid green / invalid coral tint) and ornate 9-slice pixel-art TopBar, BottomDock, BuildDrawer, and SelectionPanel.

## M3: Instanced Voxel Staff System & Hiring
- Built 5-draw-call `InstancedMesh` voxel character renderer (`staffRenderer.ts`) capable of 256 animated walking staff at 60 FPS.
- Implemented deterministic staff state machine (`staffSim.ts`) with 6 roles, traits, mood/energy needs, desk assignment, coffee breaks, whiteboard brainstorming, and server room inspections.
- Built StaffDrawer for hiring candidates, refreshing talent pools, managing team roster, and firing/dismissing staff.

## M4: Resource Simulation & Model Training Pipeline
- Built pure resource & throttling engine (`economy.ts`) tracking Compute (used/total), Power (demand/supply), Thermal Cooling (heat/cooling), payroll, and upkeep.
- Implemented real-time training pipeline (`training.ts`), datasets marketplace (`DataDrawer`), model training configurator & progress bars (`ModelsDrawer`), 4-axis benchmark scoring (Reasoning, Coding, Multimodal, Safety), and benchmark results modal.

## M5: Products, Funding, Rivals, Events & Era Tech Tree
- Added API/Product shipping from trained models with live user growth and recurring cashflow.
- Built Venture Funding / IPO ladder (`FinanceDrawer`), 5 fictional rival AI labs leaderboard (`RivalsDrawer`), random events with trade-off modals (`events.ts`), and 5-Era Research Tech Tree (`ResearchDrawer`, 2010–2025+) with automation unlocks (`Auto-Queue Training`, `Auto-Buy Power`, `Auto-Hire Staff`).

## M6: Idle/Offline Progress, Save/Load, Minimap, Day/Night & Polish
- Added versioned `localStorage` autosave + manual Save/Reset (`SAVE_VERSION = 1` with migration stub) and capped offline catch-up with welcome-back summary modal.
- Added interactive corner pixel-art `Minimap` with live camera viewport box and click-to-jump.
- Added full Day/Night lighting cycle with warm evening window/monitor glow, blinking server rack LEDs, zero-GC pooled voxel particles (cooling tower steam, coffee steam, GPU training sparks, placement dust), procedural Web Audio retro SFX (`audioManager.ts`), Quality Settings drawer, and backtick `` ` `` Debug Panel.

## Known Issues & Next Steps
- **Pathfinding**: Staff currently walk smoothly point-to-point across open lab space; adding tile-grid A* obstacle avoidance around dense walls/racks is a clean drop-in upgrade inside `/src/sim/staffSim.ts`.
- **1960s–1990s Historical Era Pack**: Era definitions in `/src/data/techs.ts` already carry `packId` and `startYear` metadata so a retro mainframe era pack can be added purely as data.
- **Touch Gestures**: Tap-to-place and tap-to-select work on touchscreens; pinch-to-zoom and two-finger pan can be added to `LabScene.ts` pointer handlers.
