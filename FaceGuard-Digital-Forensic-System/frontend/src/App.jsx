import React, { useState, useEffect } from 'react';
import './index.css';
import LandingPage from './components/LandingPage';
import Aurora from './components/Aurora';
import ImageAnalysis from './components/ImageAnalysis';
import VideoForensics from './components/VideoForensics';
import WebcamScan from './components/WebcamScan';
import DeepfakeGenerator from './components/DeepfakeGenerator';
import UnifiedCheckpoint from './components/UnifiedCheckpoint';
import { Image, Film, Camera, ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const MODES = [
  { id: 'image',  label: 'Image Analysis',   Icon: Image  },
  { id: 'video',  label: 'Video Forensics',   Icon: Film   },
  { id: 'webcam', label: 'Live Surveillance', Icon: Camera },
  { id: 'generator', label: 'Deepfake Generator', Icon: RefreshCw },
  { id: 'unified', label: 'Unified Checkpoint', Icon: ShieldCheck },
];

export default function App() {
  const [view, setView]             = useState('landing');
  const [mode, setMode]             = useState('image');
  const [threshold, setThreshold]   = useState(0.40);
  const [apiOnline, setApiOnline]   = useState(null);
  const [transState, setTransState] = useState('idle');

  useEffect(() => {
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(d => setApiOnline(d.model_loaded === true))
      .catch(() => setApiOnline(false));
  }, []);

  const enterApp = (selectedMode) => {
    setTransState('exit');
    setTimeout(() => {
      setMode(selectedMode);
      setView('app');
      setTransState('enter');
      setTimeout(() => setTransState('idle'), 700);
    }, 450);
  };

  const backToLanding = () => {
    setTransState('exit');
    setTimeout(() => {
      setView('landing');
      setTransState('enter');
      setTimeout(() => setTransState('idle'), 700);
    }, 450);
  };

  const switchMode = (newMode) => {
    if (newMode === mode) return;
    setTransState('exit');
    setTimeout(() => {
      setMode(newMode);
      setTransState('enter');
      setTimeout(() => setTransState('idle'), 500);
    }, 220);
  };

  const transClass = transState === 'exit' ? 'view-exit' : transState === 'enter' ? 'view-enter' : 'view-idle';

  return (
    <>
      {/* Transition scanline overlay */}
      <div className={`trans-overlay ${transState !== 'idle' ? 'trans-overlay--active' : ''}`}>
        <div className="trans-scanline" />
      </div>

      {/* Landing */}
      {view === 'landing' && (
        <div className={`view-wrap ${transClass}`}>
          <LandingPage onEnter={enterApp} />
        </div>
      )}

      {/* App */}
      {view === 'app' && (
        <div className={`view-wrap app-shell ${transClass}`}>

          {/* ── Aurora background inside app ── */}
          <div className="app-aurora">
            <Aurora
              colorStops={['#0066aa', '#3d1080', '#0066aa']}
              amplitude={1.1}
              blend={0.55}
              speed={0.4}
            />
          </div>
          <div className="app-grid" />

          {/* Header */}
          <header className="header">
            <div className="logo">
              <button className="back-btn" onClick={backToLanding} title="Back to home">
                <ArrowLeft size={15} />
              </button>
              <div className="logo-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 1L16.5 5v8L9 17 1.5 13V5L9 1z" stroke="#00e5ff" strokeWidth="1.2" fill="none" />
                  <path d="M9 5l4.5 2.5v5L9 15 4.5 12.5v-5L9 5z" fill="rgba(0,229,255,0.12)" stroke="#00e5ff" strokeWidth="0.8" />
                </svg>
              </div>
              <div>
                <div className="logo-text"><span>FACE</span>GUARD</div>
                <div className="logo-version">FORENSIC ENGINE v3.0 — NEURAL DEEPFAKE DETECTION</div>
              </div>
            </div>
            <div className="header-status">
              <div className="status-dot" style={{
                background: apiOnline === null ? '#ffab00' : apiOnline ? 'var(--green)' : 'var(--magenta)',
                boxShadow: `0 0 8px ${apiOnline === null ? '#ffab00' : apiOnline ? 'var(--green)' : 'var(--magenta)'}`,
              }} />
              {apiOnline === null ? 'CONNECTING...' : apiOnline ? 'NEURAL ENGINE ONLINE' : 'API OFFLINE'}
            </div>
          </header>

          {/* Main */}
          <main className="main">
            {/* Sidebar */}
            <aside className="sidebar">
              <div className="sidebar-label">Mode Select</div>
              {MODES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`nav-btn ${mode === id ? 'active' : ''}`}
                  onClick={() => switchMode(id)}
                >
                  <Icon className="icon" size={15} />
                  {label}
                </button>
              ))}

              <div className="sidebar-label">Settings</div>
              <div className="threshold-control">
                <div className="threshold-label">
                  Confidence Threshold
                  <span>{(threshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  className="threshold-slider"
                  type="range" min={0.1} max={0.9} step={0.05}
                  value={threshold}
                  onChange={e => setThreshold(parseFloat(e.target.value))}
                />
              </div>

              {apiOnline === false && (
                <div className="alert error" style={{ marginTop: 16, fontSize: '0.6rem' }}>
                  BACKEND OFFLINE
                </div>
              )}

              <div style={{ marginTop: 'auto', paddingTop: 32 }}>
                {[
                  ['MODEL',     'MobileNetV2'],
                  ['DATASET',   'FF++'],
                  ['ACCURACY',  '92.8%', true],
                  ['INFERENCE', '0.04s/frame'],
                ].map(([k, v, hi]) => (
                  <div className="stat-row" key={k}>
                    <span className="stat-key">{k}</span>
                    <span className="stat-val" style={hi ? { color: 'var(--cyan)', fontSize: '0.6rem' } : { fontSize: '0.6rem' }}>{v}</span>
                  </div>
                ))}
              </div>
            </aside>

            {/* Content */}
            <section className="content">
              <div className={`mode-wrap ${transState === 'exit' ? 'mode-exit' : transState === 'enter' ? 'mode-enter' : ''}`}>
                {mode === 'image'  && <ImageAnalysis threshold={threshold} />}
                {mode === 'video'  && <VideoForensics threshold={threshold} />}
                {mode === 'webcam' && <WebcamScan threshold={threshold} />}
                {mode === 'generator' && <DeepfakeGenerator />}
                {mode === 'unified' && <UnifiedCheckpoint />}
              </div>
            </section>
          </main>

          {/* Mobile bottom nav */}
          <nav className="mobile-nav">
            {MODES.map(({ id, label, Icon }) => (
              <button
                key={id}
                className={`mobile-nav-btn ${mode === id ? 'active' : ''}`}
                onClick={() => switchMode(id)}
              >
                <Icon size={20} />
                <span>{label.split(' ')[0]}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
