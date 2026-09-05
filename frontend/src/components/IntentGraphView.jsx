import React, { useState, useEffect } from 'react';
import { Network, ArrowRight, ShieldCheck, Zap, CheckCircle2, Lock } from 'lucide-react';

export default function IntentGraphView() {
  const [graphData, setGraphData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/intent-graph')
      .then(res => res.json())
      .then(data => setGraphData(data))
      .catch(console.error);
  }, []);

  if (!graphData) return null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
            <Network size={24} color="#7c3aed" /> Intent-to-Revenue Visual Reasoning Graph
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Complete deterministic reasoning trail connecting customer intent, AI what-if simulations, gated permissions, and Razorpay payment settlement.
          </p>
        </div>
        <span className="badge badge-indigo" style={{ padding: '6px 14px' }}>
          <ShieldCheck size={14} /> Agentic Reasoning Pipeline
        </span>
      </div>

      {/* Visual Pipeline Nodes Row */}
      <div className="glass-panel" style={{ padding: '28px', background: '#ffffff', borderRadius: '20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          alignItems: 'stretch'
        }}>
          {graphData.nodes.map((node, idx) => (
            <React.Fragment key={node.id}>
              <div className="glass-panel glass-panel-hover" style={{
                padding: '16px',
                borderRadius: '14px',
                border: '1px solid #cbd5e1',
                background: node.type === 'audit' ? '#ecfdf5' : node.type === 'simulation' ? '#f3e8ff' : '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{node.icon}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Step {idx + 1}: {node.type}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    {node.label}
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.3, paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                  {node.detail}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
