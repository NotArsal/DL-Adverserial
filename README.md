# Face-Swap Impersonation vs. Identity Verification — an attack/defense study

A face-verification demo where **the attack is real** (InSwapper live face swap) and **the defense is measured**, including the implementation details and limitations.

**One-paragraph summary.** Traditional identity matching systems are vulnerable to live face-swap impersonations. To address this, we developed a custom swap detector (MobileNetV2) that achieves **~96% detection accuracy** on identity-disjoint test data. Integrated into the live processing pipeline with temporal smoothing, the model successfully intercepts and vetoes fraudulent identity matches. This provides an effective defense against real-time synthetic face presentations.

## System

```text
webcam frame ──(optional attack toggle: InSwapper swaps a victim's face onto the live face)──┐
                                                                                               ▼
                         ┌──────────────── ArcFace (buffalo_l) ── who is this? ── matched identity + similarity
frame the verifier sees ─┤
                         └──────────────── swap detector (MobileNetV2 on the face crop) ── P(swap)
                                                    │
                      decide(): stat ≥ 0.3 → ATTACK_BLOCKED (even if ArcFace matched)   ← the detector can veto an identity match
                                stat = mean of top-2 P(swap) over the last 8 frames; no verification before 3 frames (ANALYZING)
                                no face → NO_FACE · real but unknown → UNKNOWN_IDENTITY · real + enrolled → SECURE_VERIFIED
```

`swapdet.decide` is a pure function covered by `test_decide.py`; any failure path never yields `SECURE_VERIFIED`.

## System Capabilities

* **Real-Time Integration**: Intercepts InSwapper-based impersonations in a live video stream.
* **Authentication Pipeline**: Verifies enrolled users while providing a secondary check against spoofed identities.
* **Architecture**: Dockerized FastAPI backend and React frontend.

> 📚 **Detailed Documentation**: For a deep dive into the system design, check out the [Official Documentation in the `docs/` folder](docs/index.md), which includes architectural diagrams, security audits, and full evaluation metrics.

## Run the demo (Windows, local)

```bash
pip install -r requirements.txt
pip install "DL_project/insightface-0.7.3-cp310-cp310-win_amd64.whl"   # Windows only
python make_demo_identity.py                       # exports the victim identity "Alice" (LFW photos) the attack impersonates
python enroll_user.py YourName --webcam            # enroll YOU (6 snapshots, your demo lighting); does not change the swap source
uvicorn unified_api:app --host 127.0.0.1 --port 8001
# second terminal:
cd FaceGuard-Digital-Forensic-System/frontend && npm install && npm start   # http://localhost:3005 (port + loopback bind set in .env.development)
```

Demo script: open **Unified Checkpoint** → *Initiate Secure Verification* → after ~3 frames you are `SECURE_VERIFIED` → stop, tick **Simulate face-swap attack**, start again → ArcFace now "sees" Alice, the verdict is `ATTACK_BLOCKED` and the reason says ArcFace alone would have accepted Alice.
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

## Layout

`unified_api.py` API + WebSocket · `swapdet.py` detector + `decide()` · `gen_swap_data.py`, `train_swapdet.py`, `eval_*.py` experiments · `DL_project/` ArcFace pipeline and InSwapper wrapper · `FaceGuard-Digital-Forensic-System/` FF++ classifier + React UI · `eval_results/` all measured outputs (`summary.png` = the one-slide picture)
