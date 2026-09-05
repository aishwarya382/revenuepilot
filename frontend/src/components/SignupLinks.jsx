// frontend/src/components/SignupLinks.jsx
import React from 'react';
import { SiGoogle, SiMicrosoft, SiApple } from 'react-icons/si';

// Component displaying social login icons and a signup prompt underneath.
// Used on the AuthScreen login view.
export default function SignupLinks({ onToggleSignUp }) {
  return (
    <div style={{ textAlign: 'center', marginTop: '24px' }}>
      {/* Social Icons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '12px' }}>
        <SiGoogle size={28} color="#4285F4" style={{ cursor: 'pointer' }} />
        <SiMicrosoft size={28} color="#00A4EF" style={{ cursor: 'pointer' }} />
        <SiApple size={28} color="#000000" style={{ cursor: 'pointer' }} />
      </div>
      {/* Signup Prompt */}
      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
        Don't have an account?{' '}
        <a
          href="#signup"
          onClick={(e) => { e.preventDefault(); onToggleSignUp(true); }}
          style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}
        >
          Sign up
        </a>
      </div>
    </div>
  );
}
