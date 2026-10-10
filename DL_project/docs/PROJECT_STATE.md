# Project State

Update this file after every approved phase.

## Current phase
`Phase 7 — Hardening + Final Demo + Telemetry`

## Approved architecture
- Model A: pretrained ArcFace identity recognizer.
- Swap Detector: MobileNetV2 anti-impersonation branch.
- Deep-Live-Cam / InSwapper: live face-swap generator/test layer.
- SimSwap or equivalent: controlled offline swap generation.
- LFW / VGGFace2: identity data.
- FaceForensics++: manipulation/external evaluation data.
- FastAPI + WebSocket + React: application layer with OpenTelemetry.

## Phase status
- Phase 0 — reconnaissance: `COMPLETED`
- Phase 1 — foundation + identity engine: `COMPLETED`
- Phase 2 — dataset + controlled swaps: `COMPLETED`
- Phase 3 — anti-impersonation model + C-Control: `COMPLETED`
- Phase 4 — adversarial training: `COMPLETED`
- Phase 5 — full evaluation: `COMPLETED`
- Phase 6 — Deep-Live-Cam + app integration: `COMPLETED`
- Phase 7 — hardening + final demo + telemetry: `COMPLETED`

## Checkpoints
- Model A: `buffalo_l` (InsightFace default)
- Swap Detector: `models/swapdet_deployed.pt`

## Known issues
- Swap detector is susceptible to white-box PGD adversarial attacks.

## Update protocol
After every phase record:
- status
- files created/modified
- commands run
- tests
- metrics
- checkpoints
- deviations
- known issues
- next approved phase

Never mark a phase complete merely because code exists.
