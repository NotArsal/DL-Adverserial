# Face-Swap Impersonation vs. Identity Verification — an attack/defense study

A face-verification demo where **the attack is real** (InSwapper live face swap) and **the defense is measured**, including the parts that failed.

**One-paragraph summary.** ArcFace identity matching alone is fooled by InSwapper face swaps on **99.6 %** of held-out pairs. We trained a swap detector (MobileNetV2) that, on identity-disjoint test data, catches **~90 % of swaps at ~1 % false alarms** (operating point 0.8) and, wired into the live pipeline, vetoes identity matches that come from a synthetic face. However, the detector is **not adversarially robust**: a white-box L∞ attack with ε = 1/255 drives detection to 0 %. Three adversarial-training configurations all collapsed into unusable detectors, and a randomized-transform defense only partly helps at a large accuracy cost. Those negative results are part of the deliverable.

## System

```
webcam frame ──(optional attack toggle: InSwapper swaps a victim's face onto the live face)──┐
                                                                                               ▼
                         ┌──────────────── ArcFace (buffalo_l) ── who is this? ── matched identity + similarity
frame the verifier sees ─┤
                         └──────────────── swap detector (MobileNetV2 on the face crop) ── P(swap)
                                                    │
                      decide(): P(swap) ≥ 0.8 → ATTACK_BLOCKED (even if ArcFace matched)   ← the detector can veto an identity match
                                no face → NO_FACE · real but unknown → UNKNOWN_IDENTITY · real + enrolled → SECURE_VERIFIED
```

`swapdet.decide` is a pure function covered by `test_decide.py`; any failure path never yields `SECURE_VERIFIED`.

## Results (all measured; raw JSON in `eval_results/`)

Held-out test = **identity-disjoint** (LFW people / FF++ videos not in training), 262 swap pairs + 263 real crops. Swapper = InSwapper-128, i.e. the same attacker used in the live demo.

### 1. The attack works against identity-only verification

| | value |
|---|---|
| Swap accepted as the *source* identity by ArcFace (thr 0.2445, calibrated by DL_project) | **99.6 %** |
| mean ArcFace similarity: swap→source / swap→original target | 0.88 / 0.07 |

### 2. The swap detector (clean training) — non-adversarial setting

| operating point | swaps detected | real users falsely blocked |
|---|---|---|
| threshold 0.5 | 94.7 % | 4.2 % |
| **threshold 0.8 (deployed)** | **90.5 %** | **1.1 %** |
| AUC / accuracy @0.5 | 0.993 / 95.2 % | |

End-to-end (ArcFace + detector) the swap attack success drops from 99.6 % to **≈ 9–10 %** at the deployed threshold (5.3 % at 0.5).
*Caveats:* one swapper (InSwapper) only; real faces from LFW + FF++ crops. On real webcam frames genuine users scored 0.31–0.46 (domain shift) and a live swap ~1.0 — the 0.8 threshold is a judgment call from that tiny sample (n=2 genuine webcam frames), not tuned on a webcam test set.

### 3. FaceGuard (the original FF++ classifier) — what it can and cannot do

| | |
|---|---|
| FF++ C32 cropped frames, 1000 real + 1000 fake, thr 0.40 | acc **61.5 %**, AUC **0.72**, **69 % of real faces flagged fake** (likely domain shift: it was trained on full frames) |
| Detects InSwapper on a real 640×480 webcam swap frame | **No** — scored 0.196 (= REAL). The earlier demo hid this with `fg_score = max(fg_score, 0.85)`; that override has been removed |
| FGSM ε=1/255 on frames it catches | detection 100 % → 2 %; PGD-10 → 0 % |

FaceGuard is kept only for its image/video forensics tabs; it is **not** part of the unified verdict.

### 4. Adversarial robustness of the swap detector — the negative results

White-box attacker perturbs the swapped crop (L∞), 262 swaps, detection at 0.5:

| detector | clean acc | false alarms | swaps detected, logit-margin PGD-50×2 ε=1 / 2 / 4 (/255) |
|---|---|---|---|
| clean-trained | 95.2 % | 4.2 % | **0 % / 0 % / 0 %** |
| clean fine-tune (control) | 95.1 % | 2.7 % | **0 % / 0 % / 0 %** |
| PGD adversarial fine-tune, ε=4/255 | 66.5 % | **62.4 %** | collapsed model (see below) |
| PGD adversarial fine-tune, ε=1/255 | 66.2 % | **66.2 %** | collapsed model |
| PGD adv. fine-tune, ε=1/255, 25 % adv. weight | 65.8 % | **67.3 %** | collapsed model |

* **All three adversarial-training runs collapsed**: ~66 % accuracy, 62–67 % of real users blocked. They learned "noise ⇒ fake" instead of robust swap cues. Swap detection *rising* with ε under attack is the tell-tale sign. Not deployable. (Plain PGD-BCE numbers for them, and for the control, look better than they are — see next point.)
* **Gradient masking was caught**: with the usual BCE-PGD the fine-tuned control appeared to keep 22 % detection; re-attacked with a logit-margin loss (no sigmoid saturation) and restarts it is **0 %**. `eval_margin_attack.py` is the authoritative check; earlier (v1/v2) logs are kept in `eval_results/*_v1_*`, `*_v2_*`.
* **Randomized input transforms** (noise + blur + resize, 8 samples) evaluated against an *adaptive* EOT attacker: swaps detected 31.9 % / 20.9 % / 0.8 % at ε = 1 / 2 / 4 (/255) (vs 0 % undefended) — but false alarms rise 4.2 % → 16.7 % and clean detection falls to 87.8 %. Partial, costly, not deployed. (EOT with only 4 draws/step: a stronger attacker may do better.)

**Honest conclusion:** the detector stops *presentation* attacks (a person using a live face-swap) but not a *digital* attacker who injects pixel-perturbed frames and knows the model. We did not find a defense that fixes that with this data/model size (1.9 k training pairs, MobileNetV2, 10 epochs per run).

## Threat model and limitations

* Defended: live InSwapper-style swap shown to the camera. Not defended: white-box pixel perturbations (digital injection / virtual camera), other swappers, replay/print attacks.
* Detector trained on InSwapper only; no cross-swapper evaluation. Test set small (n=262).
* Model selection used the same test split for 5 candidate models (small selection bias).
* `DL_project/experiments/model_c_adv` ("Model C") results predate this work, evaluate a model that is **not** in the live path, and overclaim — a correction note is at the top of its summary.
* Docker files were made consistent (ports 8001/3005, `.dockerignore`) but **not built or tested**. `onnxruntime-gpu` is pinned in `requirements.txt` while the dev machine ran CPU onnxruntime.

## Run the demo (Windows, local)

```bash
pip install -r requirements.txt
pip install "DL_project/insightface-0.7.3-cp310-cp310-win_amd64.whl"   # Windows only
python make_demo_identity.py                       # exports the victim identity "Alice" (LFW photos) the attack impersonates
python enroll_user.py YourName --webcam            # enroll YOU (6 snapshots, your demo lighting); does not change the swap source
uvicorn unified_api:app --host 127.0.0.1 --port 8001
# second terminal:
cd FaceGuard-Digital-Forensic-System/frontend && npm install && set PORT=3005 && npm start    # http://localhost:3005
```

Demo script: open **Unified Checkpoint** → *Initiate Secure Verification* → you are `SECURE_VERIFIED` → stop, tick **Simulate face-swap attack**, start again → ArcFace now "sees" Alice, the verdict is `ATTACK_BLOCKED` and the reason says ArcFace alone would have accepted Alice.
Trained detector: `models/swapdet_deployed.pt` (committed, 9 MB; other weights are git-ignored).

## Reproduce the experiments

```bash
python gen_swap_data.py 2400 1200        # InSwapper pairs -> data/swapdet (needs LFW via sklearn + FF++ C32 frames in eval_data/)
python train_swapdet.py 10               # clean model + clean-finetune control + PGD adversarial fine-tune
python train_swapdet.py 10 1 0.25        # extra adversarial runs: eps/255 and adversarial-loss weight
python eval_system.py                    # ArcFace-only vs +detector, with margin-PGD attacker  -> eval_results/system_results.json
python eval_margin_attack.py             # gradient-masking check
python eval_randomized.py clean          # randomized-transform defense vs EOT attacker
python eval_faceguard.py 1000            # FaceGuard on FF++ ; eval_adversarial.py for its FGSM/PGD evasion
python test_decide.py ; python smoke_unified.py   # verdict logic; full-stack WebSocket test on real webcam frames
```
FF++ frames used: Kaggle `fatimahirshad/faceforensics-c32-frames-cropped-aligned` (derived from FaceForensics++; respect its terms).

## Security and engineering fixes made during the audit

* **Arbitrary file read/delete** in FaceGuard `/analyze/video/stream` (client-supplied path was opened then `unlink`ed) → uploads now return an opaque id mapped to a private dir.
* Upload size caps (10 MB image / 200 MB video, 413), WebSocket frame cap, CORS restricted to local dev origins (was `*` + credentials), server errors clear the UI verdict instead of leaving a stale "VERIFIED".
* The attack toggle was a **silent no-op** (no swap source enrolled, yet reported `swap_applied=True`); now truthful and refuses to simulate without a source.
* `SECURE_VERIFIED` was unreachable (read a non-existent key); the UI never sent `?condition=`; landing page claimed "92.8 % accuracy" and a hardcoded "ONLINE" badge → removed; tab title/favicon fixed; production build has no source maps (183 kB gzipped).
* Removed junk (6.5 k-line `App.jsx_temp`, `desktop.ini`, a script with a foreign user path, temp images).

Not applicable to this project and intentionally not done: custom domain/SEO/schema, payments, DB indexes, tenancy, uptime monitoring (local course demo with no DB or accounts).

## Layout

`unified_api.py` API + WebSocket · `swapdet.py` detector + `decide()` · `gen_swap_data.py`, `train_swapdet.py`, `eval_*.py` experiments · `DL_project/` ArcFace pipeline and InSwapper wrapper · `FaceGuard-Digital-Forensic-System/` FF++ classifier + React UI · `eval_results/` all measured outputs (`summary.png` = the one-slide picture)
