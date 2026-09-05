// frontend/src/components/SignupLinks.jsx
import React from 'react';

// Component displaying a signup prompt underneath the login form.
export default function SignupLinks({ onToggleSignUp }) {
  return (
    <div className="signup-text" style={{ textAlign: 'center', marginTop: '20px' }}>
      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
        Don't have an account?{' '}
        <a
          href="#signup"
          onClick={(e) => { e.preventDefault(); onToggleSignUp(true); }}
          style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}
        >
          Sign up
        </a>
      </span>
    </div>
  );
}
