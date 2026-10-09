import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert, UserCheck, AlertTriangle } from 'lucide-react';

export default function UnifiedCheckpoint() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [verdict, setVerdict] = useState(null);
  const [info, setInfo] = useState(null);
  const [attack, setAttack] = useState(false); // simulate a live InSwapper impersonation attack
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      streamRef.current = stream;
      connectWS(attack);
      setActive(true);
    } catch (err) {
      console.error(err);
      setStatus("Camera Error");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (wsRef.current) wsRef.current.close();
    setActive(false);
    setStatus("Disconnected");
    setVerdict(null);
    setInfo(null);
  };

  const connectWS = (simulateAttack) => {
    const ws = new WebSocket(`ws://localhost:8001/ws/unified-verify?condition=${simulateAttack ? 'impersonation' : 'genuine'}`);
    ws.binaryType = "arraybuffer";
    
    ws.onopen = () => setStatus("Connected to Unified Secure Core");
    ws.onclose = () => { setVerdict(null); setInfo(null); setStatus("Disconnected"); };
    ws.onerror = () => setStatus("Connection error - is the backend running on :8001?");
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) { setStatus(data.error); setVerdict(null); setInfo(null); return; }  // never leave a stale VERIFIED on screen
      setInfo(data);
      setVerdict(data.overall_verdict); // "ATTACK_BLOCKED", "SECURE_VERIFIED", "UNKNOWN_IDENTITY", "NO_FACE"
    };

    wsRef.current = ws;
    captureLoop();
  };

  const captureLoop = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video && video.readyState === 4) {
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(blob);
        }
      }, 'image/jpeg', 0.8);
    }
    setTimeout(captureLoop, 200); // 5 FPS to reduce load
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const getVerdictStyle = () => {
    if (verdict === "ATTACK_BLOCKED") return { color: "#ff2d6b", text: "DEEPFAKE ATTACK DETECTED - VERIFICATION BLOCKED", icon: <ShieldAlert size={48} color="#ff2d6b"/> };
    if (verdict === "SECURE_VERIFIED") return { color: "#00e5ff", text: "IDENTITY VERIFIED - SECURE", icon: <UserCheck size={48} color="#00e5ff"/> };
    if (verdict === "UNKNOWN_IDENTITY") return { color: "#ffaa00", text: "FACE IS REAL BUT NOT ENROLLED - ACCESS DENIED", icon: <AlertTriangle size={48} color="#ffaa00"/> };
    if (verdict === "NO_FACE") return { color: "#8899aa", text: "NO FACE IN FRAME", icon: <AlertTriangle size={48} color="#8899aa"/> };
    return { color: "#ffaa00", text: "ANALYZING...", icon: <AlertTriangle size={48} color="#ffaa00"/> };
  };

  const vStyle = getVerdictStyle();

  return (
    <div style={{ padding: '2rem', color: 'white', fontFamily: 'monospace' }}>
      <h1>Unified Security Checkpoint</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        ArcFace identity matching + a face-swap detector that can veto an identity match.
      </p>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Threat model: live face-swap presentation attacks. The detector is NOT hardened against pixel-level adversarial perturbations (white-box PGD evades it; see README).
      </p>

      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        <div style={{ border: '2px solid rgba(0,229,255,0.2)', padding: '1rem', background: 'rgba(0,0,0,0.5)' }}>
          <video ref={videoRef} width="640" height="480" autoPlay playsInline muted style={{ width: '100%', maxWidth: '640px' }} />
          <canvas ref={canvasRef} width="640" height="480" style={{ display: 'none' }} />
          
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            <label style={{ alignSelf: 'center', opacity: active ? 0.5 : 1 }}>
              <input type="checkbox" checked={attack} disabled={active} onChange={e => setAttack(e.target.checked)} /> Simulate face-swap attack (impersonate enrolled "Alice")
            </label>
            <button onClick={active ? stopCamera : startCamera} style={{ padding: '10px 20px', cursor: 'pointer', background: active ? '#ff2d6b' : '#00e5ff', color: 'black', fontWeight: 'bold', border: 'none' }}>
              {active ? 'Terminate Session' : 'Initiate Secure Verification'}
            </button>
            <span style={{ color: 'var(--text-muted)' }}>Status: {status}</span>
          </div>
        </div>

        <div style={{ flex: 1, padding: '2rem', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
          {active ? (
            <>
              {vStyle.icon}
              <h2 style={{ color: vStyle.color, marginTop: '1rem', textAlign: 'center' }}>{vStyle.text}</h2>
              <div style={{ marginTop: '2rem', width: '100%', background: 'rgba(0,0,0,0.5)', padding: '1rem' }}>
                <p><strong>Swap probability:</strong> {info && info.swap_probability != null ? (info.swap_probability * 100).toFixed(1) + '%' : '-'}</p>
                <div style={{ width: '100%', height: '10px', background: '#333', marginTop: '10px' }}>
                  <div style={{ width: `${(info && info.swap_probability != null ? info.swap_probability : 0) * 100}%`, height: '100%', background: info && info.swap_probability >= 0.5 ? '#ff2d6b' : '#00e5ff' }} />
                </div>
                <p><strong>ArcFace identity:</strong> {info && info.identity ? `${info.identity} (similarity ${info.identity_similarity.toFixed(2)})` : 'no match'}</p>
                <p style={{ color: 'var(--text-muted)' }}>{info && info.reason}</p>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              <Shield size={64} opacity={0.2} style={{ margin: '0 auto 1rem auto', display: 'block' }} />
              SYSTEM STANDBY.<br/>Awaiting camera feed.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

