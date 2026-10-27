'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function OptimaStudio() {
  const [messages, setMessages] = useState<{ sender: 'ai' | 'user'; text: string }[]>([
    { sender: 'ai', text: 'Welcome to **Optima AI Studio (Next.js)**! Upload media to begin editing.' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [activeTab, setActiveTab] = useState<'ai' | 'adjust' | 'filters'>('ai');
  const [bright, setBright] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [sat, setSat] = useState(100);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        drawCanvas();
      };
      img.src = evt.target?.result as string;
      addMessage('user', `Uploaded: ${file.name}`);
      addMessage('ai', 'Photo loaded! Use the sliders or AI chat to apply changes.');
    };
    reader.readAsDataURL(file);
  };

  const drawCanvas = (presetFilter?: string) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    const bMult = bright / 100;
    const cMult = contrast / 100;
    const sMult = sat / 100;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];

      r = (r - 128) * cMult + 128 * bMult;
      g = (g - 128) * cMult + 128 * bMult;
      b = (b - 128) * cMult + 128 * bMult;

      let gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
      r = gray + sMult * (r - gray);
      g = gray + sMult * (g - gray);
      b = gray + sMult * (b - gray);

      if (presetFilter === 'cinematic') { r *= 1.2; g *= 0.95; b *= 1.15; }
      else if (presetFilter === 'warm') { r *= 1.25; g *= 1.05; b *= 0.85; }
      else if (presetFilter === 'cool') { r *= 0.85; g *= 1.05; b *= 1.25; }

      d[i] = Math.min(255, Math.max(0, r));
      d[i + 1] = Math.min(255, Math.max(0, g));
      d[i + 2] = Math.min(255, Math.max(0, b));
    }

    ctx.putImageData(imgData, 0, 0);

    const wmSize = Math.max(14, Math.floor(canvas.width * 0.035));
    ctx.font = `700 ${wmSize}px sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.textAlign = 'right';
    ctx.fillText('✨ Optima AI Studio', canvas.width - wmSize, canvas.height - wmSize);
  };

  useEffect(() => {
    drawCanvas();
  }, [bright, contrast, sat]);

  const addMessage = (sender: 'ai' | 'user', text: string) => {
    setMessages((prev) => [...prev, { sender, text }]);
  };

  const handleSend = async () => {
    if (!inputVal.trim()) return;
    const text = inputVal;
    setInputVal('');
    addMessage('user', text);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      if (data.reply) addMessage('ai', data.reply);
      else if (data.error) addMessage('ai', `Error: ${data.error}`);
    } catch {
      addMessage('ai', 'Failed to reach AI server route.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0a0a0c' }}>
      <header style={{ padding: '12px 16px', background: '#13131a', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', color: '#a855f7' }}>✨ Optima AI Studio</span>
        <button onClick={() => {
          if (!canvasRef.current) return;
          const link = document.createElement('a');
          link.download = 'optima-edit.png';
          link.href = canvasRef.current.toDataURL();
          link.click();
        }} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '12px', fontSize: '0.8rem', cursor: 'pointer' }}>💾 Save</button>
      </header>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px' }}>
        <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} />
      </div>

      <div style={{ height: '340px', background: '#13131a', borderTop: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', background: '#0a0a0c', borderBottom: '1px solid #222' }}>
          <button onClick={() => setActiveTab('ai')} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', color: activeTab === 'ai' ? '#a855f7' : '#888', fontWeight: 'bold' }}>AI Chat</button>
          <button onClick={() => setActiveTab('adjust')} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', color: activeTab === 'adjust' ? '#a855f7' : '#888', fontWeight: 'bold' }}>Sliders</button>
          <button onClick={() => setActiveTab('filters')} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', color: activeTab === 'filters' ? '#a855f7' : '#888', fontWeight: 'bold' }}>Presets</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {messages.map((m, idx) => (
                <div key={idx} style={{ padding: '8px 12px', borderRadius: '12px', fontSize: '0.85rem', maxWidth: '85%', alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', background: m.sender === 'user' ? '#6366f1' : '#1c1c28' }}>
                  {m.text}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'adjust' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '0.8rem' }}>Brightness ({bright}%)
                <input type="range" min="50" max="150" value={bright} onChange={(e) => setBright(Number(e.target.value))} style={{ width: '100%' }} />
              </label>
              <label style={{ fontSize: '0.8rem' }}>Contrast ({contrast}%)
                <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} style={{ width: '100%' }} />
              </label>
              <label style={{ fontSize: '0.8rem' }}>Saturation ({sat}%)
                <input type="range" min="0" max="200" value={sat} onChange={(e) => setSat(Number(e.target.value))} style={{ width: '100%' }} />
              </label>
            </div>
          )}

          {activeTab === 'filters' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => drawCanvas('cinematic')} style={{ background: '#1c1c28', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: '16px', fontSize: '0.8rem' }}>🎬 Cinematic</button>
              <button onClick={() => drawCanvas('warm')} style={{ background: '#1c1c28', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: '16px', fontSize: '0.8rem' }}>☀️ Warm</button>
              <button onClick={() => drawCanvas('cool')} style={{ background: '#1c1c28', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: '16px', fontSize: '0.8rem' }}>❄️ Cool</button>
            </div>
          )}
        </div>

        <div style={{ padding: '8px 12px', display: 'flex', gap: '8px', background: '#13131a', borderTop: '1px solid #222' }}>
          <label style={{ background: '#1c1c28', border: '1px solid #333', color: '#a855f7', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold' }}>
            +
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          <input type="text" value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask AI..." style={{ flex: 1, background: '#1c1c28', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: '18px', outline: 'none' }} />
          <button onClick={handleSend} style={{ background: '#6366f1', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer' }}>➔</button>
        </div>
      </div>
    </div>
  );
    }
        
