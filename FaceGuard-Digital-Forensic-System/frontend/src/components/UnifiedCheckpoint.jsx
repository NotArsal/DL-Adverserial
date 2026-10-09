import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert, UserCheck, AlertTriangle } from 'lucide-react';

export default function UnifiedCheckpoint() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [verdict, setVerdict] = useState(null);
  const [fgScore, setFgScore] = useState(0);
  
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
      connectWS();
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
  };

  const connectWS = () => {
    const ws = new WebSocket(`ws://localhost:8000/ws/unified-verify`);
    ws.binaryType = "arraybuffer";
    
    ws.onopen = () => setStatus("Connected to Unified Secure Core");
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setFgScore(data.faceguard_score);
      setVerdict(data.overall_verdict); // "ATTACK_BLOCKED", "SECURE_VERIFIED", "UNKNOWN_IDENTITY"
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
    return { color: "#ffaa00", text: "ANALYZING IDENTITY...", icon: <AlertTriangle size={48} color="#ffaa00"/> };
  };

  const vStyle = getVerdictStyle();

  return (
    <div style={{ padding: '2rem', color: 'white', fontFamily: 'monospace' }}>
      <h1>Unified Security Checkpoint</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        Simultaneous Face Recognition (DL_project) + Deepfake Forensics (FaceGuard).
      </p>

      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        <div style={{ border: '2px solid rgba(0,229,255,0.2)', padding: '1rem', background: 'rgba(0,0,0,0.5)' }}>
          <video ref={videoRef} width="640" height="480" autoPlay playsInline muted style={{ width: '100%', maxWidth: '640px' }} />
          <canvas ref={canvasRef} width="640" height="480" style={{ display: 'none' }} />
          
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
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
                <p><strong>FaceGuard Forensic Score:</strong> {(fgScore * 100).toFixed(2)}% Fake</p>
                <div style={{ width: '100%', height: '10px', background: '#333', marginTop: '10px' }}>
                  <div style={{ width: `${fgScore * 100}%`, height: '100%', background: fgScore > 0.4 ? '#ff2d6b' : '#00e5ff' }} />
                </div>
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
