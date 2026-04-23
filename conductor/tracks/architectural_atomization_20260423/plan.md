# Implementation Plan: Authoritative Data Isolation & Project Atomization

## Phase 1: The ADI Transformation (Foundation)
- [x] Task: Atomic Data Processor (`flattenEvents`) (Done - Isolated record/x/y)
- [x] Task: Coordinate Authority Sync (Done - Temporal State & All Renderers)
- [x] Task: Fact Layer Restoration (Done - getTemplateData mapped to record)

## Phase 2: Viewport Atomization (The Big Split)
- [x] Task: Decompose `viewport.js` (Done - Split into 8 services/listeners)
- [x] Task: Decompose `handle-submit.js` (Done - Split into 4 submission services)

## Phase 3: Service Hardening
- [x] Task: Migrate `span-graph-utils.js` (Done - Barrel pattern established in subdirectory)
