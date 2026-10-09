import React, { useState } from 'react';
import './LandingPage.css';
import { FaGithub, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { Image, Film, Camera, Info, X, Shield, Cpu, Database, Zap } from 'lucide-react';

const MODES = [
  {
    id: 'image',
    Icon: Image,
    label: 'Image Analysis',
    tagline: 'FORENSIC SCAN',
    desc: 'Upload any image and let the neural engine detect manipulation artifacts with 92.8% accuracy.',
    color: '#00d4ff',
    rgb: '0,212,255',
  },
  {
    id: 'video',
    Icon: Film,
    label: 'Video Forensics',
    tagline: 'TEMPORAL ANALYSIS',
    desc: 'Frame-by-frame deepfake detection streamed live. Watch the AI scan each moment in real time.',
    color: '#a855f7',
    rgb: '168,85,247',
  },
  {
    id: 'webcam',
    Icon: Camera,
    label: 'Live Surveillance',
    tagline: 'REAL-TIME SCAN',
    desc: 'Live biometric analysis via WebSocket at 5fps. Instantaneous deepfake detection from your camera.',
    color: '#00e676',
    rgb: '0,230,118',
  },
];

const socialLogos = [
  { node: <FaGithub />,    title: 'GitHub',    href: 'https://github.com/hiba-castellan' },
  { node: <FaInstagram />, title: 'Instagram', href: 'https://instagram.com/' },
  { node: <FaLinkedinIn />,title: 'LinkedIn',  href: 'https://linkedin.com/' },
];

const STATS = [
  { Icon: Cpu,      label: 'Model',     value: 'MobileNetV2' },
  { Icon: Database, label: 'Dataset',   value: 'FaceForensics++' },
  { Icon: Shield,   label: 'Accuracy',  value: '92.8%' },
  { Icon: Zap,      label: 'Inference', value: '0.04s/frame' },
];

export default function LandingPage({ onEnter }) {
  const [hovered, setHovered] = useState(null);
  

  return (
    <div className="landing">
      
      <div className="landing-grain" />
      <div className="landing-grid" />

      {/* Header */}
      <header className="landing-header">
        <div className="landing-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L29 9v14L16 30 3 23V9L16 2z" stroke="#00d4ff" strokeWidth="1.5" fill="rgba(0,212,255,0.06)" />
            <path d="M16 8L24 12.5v9L16 26 8 21.5v-9L16 8z" fill="rgba(0,212,255,0.12)" stroke="#00d4ff" strokeWidth="1" />
            <circle cx="16" cy="16" r="3" fill="#00d4ff" opacity="0.8" />
          </svg>
          <div>
            <div className="landing-logo-text"><span>FACE</span>GUARD</div>
            <div className="landing-logo-sub">FORENSIC ENGINE v3.0</div>
          </div>
        </div>
        
      </header>

      {/* Main */}
      <main className="landing-main">
        <div className="landing-hero">
          <div className="landing-badge">
            <span className="landing-badge-dot" />
            NEURAL ENGINE ONLINE
          </div>
          <h1 className="landing-title">
            Detect the<br />
            <span className="landing-title-accent">Undetectable</span>
          </h1>
          <p className="landing-subtitle">
            Real-time deepfake detection powered by MobileNetV2.<br />
            Select your analysis mode to begin.
          </p>
        </div>

        {/* Mode Cards */}
        <div className="landing-cards">
          {MODES.map(({ id, Icon, label, tagline, desc, color, rgb }, i) => (
            <button
              key={id}
              className={`landing-card ${hovered === id ? 'landing-card--hovered' : ''}`}
              style={{ '--card-color': color, '--card-rgb': rgb, animationDelay: `${i * 0.12}s` }}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onEnter(id)}
            >
              {/* Glass layers */}
              <div className="lcard-glass-base" />
              <div className="lcard-glass-shine" />
              <div className="lcard-glass-border" />
              <div className="lcard-glow" />

              <div className="lcard-inner">
                <div className="lcard-top">
                  <span className="lcard-tag">{tagline}</span>
                  <div className="lcard-dot" />
                </div>
                <div className="lcard-icon"><Icon size={30} /></div>
                <h2 className="lcard-title">{label}</h2>
                <p className="lcard-desc">{desc}</p>
                <div className="lcard-cta">
                  <span>ACTIVATE</span>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Corner brackets */}
              <div className="lcard-corner lcard-corner--tl" />
              <div className="lcard-corner lcard-corner--tr" />
              <div className="lcard-corner lcard-corner--bl" />
              <div className="lcard-corner lcard-corner--br" />
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="landing-stats">
          {STATS.map(({ Icon, label, value }) => (
            <div className="landing-stat" key={label}>
              <Icon size={13} />
              <span className="landing-stat-label">{label}</span>
              <span className="landing-stat-value">{value}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
    </div>
  );
}





