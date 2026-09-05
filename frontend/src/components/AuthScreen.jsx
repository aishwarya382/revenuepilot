import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, Check, LogIn, TrendingUp, User, Store, ShieldCheck, ArrowRight, RefreshCw, X, AlertCircle, UserPlus, Sparkles } from 'lucide-react';
import RevenueLogo from './RevenueLogo';

export default function AuthScreen({ onLogin }) {
  // Toggle between Login & Sign Up view mode
  const [isSignUp, setIsSignUp] = useState(() => window.location.hash === '#signup');
  const [role, setRole] = useState('customer'); // 'customer' | 'merchant'
  
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up Form States
  const [fullName, setFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [signUpSuccessMsg, setSignUpSuccessMsg] = useState('');

  // Social OAuth & OTP Modal States
  const [activeProvider, setActiveProvider] = useState(null); // 'google' | 'microsoft' | 'apple' | null
  const [socialStep, setSocialStep] = useState('email'); // 'email' | 'otp'
  const [socialEmail, setSocialEmail] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(30);

  // Listen to hash changes in browser URL
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#signup') {
        setIsSignUp(true);
      } else if (window.location.hash === '#login' || !window.location.hash) {
        setIsSignUp(false);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (socialStep === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [socialStep, timer]);

  // Auth Error State
  const [authError, setAuthError] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Email format regex validator
  const isValidEmail = (emailStr) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(String(emailStr).toLowerCase().trim());
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setAuthError('');
  };

  const handleToggleSignUp = (toSignUp = true) => {
    setIsSignUp(toSignUp);
    window.location.hash = toSignUp ? '#signup' : '#login';
    setSignUpSuccessMsg('');
    setAuthError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!email || !isValidEmail(email)) {
      setAuthError('Invalid email format. Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    if (!password || password.trim().length === 0) {
      setAuthError('Please enter your password.');
      return;
    }

    setIsSubmittingAuth(true);

    try {
      let res;
      try {
        res = await fetch('http://localhost:8000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role })
        });
      } catch (err) {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role })
        });
      }

      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: "Email doesn't exist. Please check your email or click Sign up to create an account." };
      }

      setIsSubmittingAuth(false);

      if (!res.ok || (data && data.error)) {
        setAuthError((data && data.error) ? data.error : "Email doesn't exist. Please check your email or click Sign up to create an account.");
        return;
      }

      onLogin({
        id: data.user.id,
        merchant_id: data.user.merchant_id || data.user.id,
        role: data.user.role || role,
        name: data.user.name,
        email: data.user.email,
        store_name: data.user.store_name,
        avatar: (data.user.role || role) === 'customer' ? '🎓' : '💼',
        badge: `${(data.user.role || role) === 'customer' ? 'Customer' : 'Merchant'} Workspace`,
        token: data.access_token
      });
    } catch (err) {
      console.error(err);
      setIsSubmittingAuth(false);
      setAuthError("Email doesn't exist. Please check your email or click Sign up to create an account.");
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!fullName || fullName.trim().length < 2) {
      setAuthError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!signUpEmail || !isValidEmail(signUpEmail)) {
      setAuthError('Invalid email format. Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    if (!signUpPassword || signUpPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    if (signUpPassword !== confirmPassword) {
      setAuthError('Passwords do not match. Please enter matching passwords.');
      return;
    }

    if (!agreeTerms) {
      setAuthError('Please agree to the Terms of Service to create an account.');
      return;
    }

    setIsSubmittingAuth(true);

    try {
      let res;
      try {
        res = await fetch('http://localhost:8000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fullName,
            email: signUpEmail,
            password: signUpPassword,
            role: role
          })
        });
      } catch (err) {
        res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fullName,
            email: signUpEmail,
            password: signUpPassword,
            role: role
          })
        });
      }

      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: 'Sign up failed. Please check your details.' };
      }

      setIsSubmittingAuth(false);

      if (!res.ok || (data && data.error)) {
        setAuthError((data && data.error) ? data.error : 'Sign up failed. Please check your details.');
        return;
      }

      setSignUpSuccessMsg('Account created successfully! Logging you in...');
      setTimeout(() => {
        onLogin({
          id: data.user.id,
          merchant_id: data.user.merchant_id || data.user.id,
          role: data.user.role || role,
          name: data.user.name,
          email: data.user.email,
          store_name: data.user.store_name,
          avatar: (data.user.role || role) === 'customer' ? '🎓' : '💼',
          badge: `Registered ${(data.user.role || role) === 'customer' ? 'Customer' : 'Merchant'}`
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsSubmittingAuth(false);
      setAuthError('Sign up error. Please try again.');
    }
  };

  // Open Social Login Modal
  const openSocialModal = (provider) => {
    setActiveProvider(provider);
    setSocialStep('email');
    setOtpError('');
    setEnteredOtp('');
    setSocialEmail('');
    setTimer(30);
  };

  // Close Social Login Modal
  const closeSocialModal = () => {
    setActiveProvider(null);
    setSocialStep('email');
    setEnteredOtp('');
    setOtpError('');
  };

  // Send OTP
  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!socialEmail || !socialEmail.includes('@')) {
      setOtpError('Please enter a valid email address.');
      return;
    }
    // Generate a random 6-digit OTP code for demo verification
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setSocialStep('otp');
    setOtpError('');
    setTimer(30);
  };

  // Verify OTP & Complete Social Sign In
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (enteredOtp.trim() !== generatedOtp.trim() && enteredOtp.trim() !== '123456') {
      setOtpError(`Invalid OTP. Enter the 6-digit code (${generatedOtp}) sent to your email.`);
      return;
    }

    setIsVerifying(true);
    setOtpError('');

    setTimeout(() => {
      setIsVerifying(false);
      const providerName = activeProvider === 'google' ? 'Google' : activeProvider === 'microsoft' ? 'Microsoft' : 'Apple ID';
      
      onLogin({
        role: role,
        name: role === 'customer' ? `Aarav (${providerName})` : `TechStore (${providerName})`,
        email: socialEmail,
        avatar: activeProvider === 'google' ? '🌐' : activeProvider === 'microsoft' ? '🪟' : '🍎',
        badge: `${providerName} Verified (${role === 'customer' ? 'Customer' : 'Merchant'})`
      });
    }, 1000);
  };

  const handleResendOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setTimer(30);
    setOtpError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #eef2ff 0%, #e2e8f0 40%, #f1f5f9 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif"
    }}>
      
      {/* AMBIENT BACKGROUND GRAPHICS */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 0
      }}>
        {/* Soft Cosmic Glows */}
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(99, 102, 241, 0.06) 50%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(50px)'
        }} />

        {/* Geometric Crystal Outline */}
        <svg style={{ position: 'absolute', top: '30px', right: '50px', opacity: 0.15, width: '280px', height: '280px' }} viewBox="0 0 100 100" fill="none" stroke="#6366f1" strokeWidth="0.5">
          <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" />
          <line x1="50" y1="5" x2="50" y2="95" />
          <line x1="90" y1="25" x2="10" y2="75" />
          <line x1="10" y1="25" x2="90" y2="75" />
        </svg>

        {/* Rising Bar Graph Graphic Bottom Left */}
        <div style={{
          position: 'absolute',
          bottom: '60px',
          left: '60px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '14px',
          opacity: 0.2
        }}>
          <div style={{ width: '18px', height: '36px', background: 'linear-gradient(180deg, #a855f7, #6366f1)', borderRadius: '4px' }} />
          <div style={{ width: '18px', height: '70px', background: 'linear-gradient(180deg, #a855f7, #6366f1)', borderRadius: '4px' }} />
          <div style={{ width: '18px', height: '110px', background: 'linear-gradient(180deg, #a855f7, #6366f1)', borderRadius: '4px' }} />
          <div style={{ width: '18px', height: '160px', background: 'linear-gradient(180deg, #a855f7, #6366f1)', borderRadius: '4px' }} />
        </div>
      </div>

      {/* CENTERED LOGO & BRANDING */}
      <div style={{ textAlign: 'center', marginBottom: '24px', zIndex: 10 }}>
        <div style={{ margin: '0 auto 16px auto', display: 'inline-flex', justifyContent: 'center' }}>
          <RevenueLogo size={66} />
        </div>

        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '6px' }}>
          Revenue Pilot <span style={{ background: 'linear-gradient(135deg, #9333ea, #4f46e5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span>
        </h1>

        <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
          AI-Powered Commerce. Revenue. Growth. Intelligence.
        </p>
      </div>

      {/* CENTERED GLASSMORPHIC CARD (LOGIN / SIGN UP) */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.95)',
        borderRadius: '28px',
        padding: '36px',
        boxShadow: '0 25px 60px rgba(15, 23, 42, 0.06), 0 2px 10px rgba(255, 255, 255, 0.8) inset',
        zIndex: 10
      }} className="animate-fade-in">
        
        {/* Card Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            {isSignUp ? 'Create Account 🚀' : 'Welcome Back 👋'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>
            {isSignUp ? (
              <>Join Revenue Pilot AI to power your<br />e-commerce intelligence journey.</>
            ) : (
              <>Sign in to your Revenue Pilot AI account<br />to continue your journey.</>
            )}
          </p>
        </div>

        {/* SUCCESS NOTIFICATION ALERT FOR SIGNUP */}
        {signUpSuccessMsg && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '0.825rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <Sparkles size={18} />
            <span>{signUpSuccessMsg}</span>
          </div>
        )}

        {/* AUTH ERROR ALERT */}
        {authError && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }} className="animate-shake">
            <AlertCircle size={18} />
            <span>{authError}</span>
          </div>
        )}

        {/* ================= LOGIN FORM ================= */}
        {!isSignUp ? ( <div className="login-wrapper">
          <form onSubmit={handleLoginSubmit}>
            
            {/* Email Field */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 42px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: 'rgba(248, 250, 252, 0.8)',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 44px 11px 42px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: 'rgba(248, 250, 252, 0.8)',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Role Selector Tabs: "Login as" */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Login as
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                
                {/* Customer Tab */}
                <div
                  onClick={() => handleRoleChange('customer')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: role === 'customer' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                    background: role === 'customer' ? '#f3e8ff' : 'rgba(248, 250, 252, 0.6)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    position: 'relative',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {role === 'customer' && (
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: '#7c3aed',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: role === 'customer' ? '#7c3aed' : '#e2e8f0',
                    color: role === 'customer' ? '#fff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <User size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: role === 'customer' ? '#6b21a8' : '#0f172a' }}>
                      Customer
                    </div>
                    <div style={{ fontSize: '0.675rem', color: role === 'customer' ? '#7e22ce' : '#64748b' }}>
                      Shop & Discover
                    </div>
                  </div>
                </div>

                {/* Merchant Tab */}
                <div
                  onClick={() => handleRoleChange('merchant')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: role === 'merchant' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                    background: role === 'merchant' ? '#f3e8ff' : 'rgba(248, 250, 252, 0.6)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    position: 'relative',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {role === 'merchant' && (
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: '#7c3aed',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: role === 'merchant' ? '#7c3aed' : '#e2e8f0',
                    color: role === 'merchant' ? '#fff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Store size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: role === 'merchant' ? '#6b21a8' : '#0f172a' }}>
                      Merchant
                    </div>
                    <div style={{ fontSize: '0.675rem', color: role === 'merchant' ? '#7e22ce' : '#64748b' }}>
                      Manage & Grow
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', fontSize: '0.8rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
                />
                Remember me
              </label>
              <a href="#forgot" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }} onClick={(e) => e.preventDefault()}>
                Forgot Password?
              </a>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 50%, #4f46e5 100%)',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              Sign In <LogIn size={18} />
            </button>

          </form>
              {/* Sign Up Redirect Link */}
              <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.85rem', color: '#64748b' }}>
                Don't have an account? <a href="#signup" onClick={(e) => { e.preventDefault(); handleToggleSignUp(true); }} style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>Sign up</a>
              </div>
        </div> ) : (
          <div>
            <form onSubmit={handleSignUpSubmit}>
            
            {/* Full Name Field */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 42px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: 'rgba(248, 250, 252, 0.8)',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Email Field */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 42px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: 'rgba(248, 250, 252, 0.8)',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Password & Confirm Password Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="Create password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: 'rgba(248, 250, 252, 0.8)',
                      fontSize: '0.85rem',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: 'rgba(248, 250, 252, 0.8)',
                      fontSize: '0.85rem',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Account Type Selector Tabs: "Register as" */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Register Account As
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                
                {/* Customer Tab */}
                <div
                  onClick={() => handleRoleChange('customer')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: role === 'customer' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                    background: role === 'customer' ? '#f3e8ff' : 'rgba(248, 250, 252, 0.6)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <User size={16} color={role === 'customer' ? '#7c3aed' : '#64748b'} />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: role === 'customer' ? '#6b21a8' : '#0f172a' }}>
                      Customer
                    </div>
                  </div>
                </div>

                {/* Merchant Tab */}
                <div
                  onClick={() => handleRoleChange('merchant')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: role === 'merchant' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                    background: role === 'merchant' ? '#f3e8ff' : 'rgba(248, 250, 252, 0.6)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Store size={16} color={role === 'merchant' ? '#7c3aed' : '#64748b'} />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: role === 'merchant' ? '#6b21a8' : '#0f172a' }}>
                      Merchant
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Terms Checkbox */}
            <div style={{ marginBottom: '20px', fontSize: '0.78rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
                />
                I agree to the <span style={{ color: '#7c3aed', fontWeight: 600 }}>Terms of Service & Privacy Policy</span>
              </label>
            </div>

            {/* Primary Sign Up Submit Button */}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 50%, #4f46e5 100%)',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              Create Account <UserPlus size={18} />
            </button>

          </form>
          {/* Sign In Redirect Link */}
          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.85rem', color: '#64748b' }}>
            Already have an account? <a href="#login" onClick={(e) => { e.preventDefault(); handleToggleSignUp(false); }} style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>Sign in</a>
          </div>
        </div>
        )}

        {/* Social Logins Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '22px 0 18px 0',
          color: '#94a3b8',
          fontSize: '0.75rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: '#cbd5e1' }} />
          <span>or continue with</span>
          <div style={{ flex: 1, height: '1px', background: '#cbd5e1' }} />
        </div>

        {/* Social Login 3-Card Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '22px' }}>
          {/* Google */}
          <button
            type="button"
            onClick={() => openSocialModal('google')}
            title="Sign in with Google Account"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            className="hover:border-indigo-400 hover:shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          </button>

          {/* Microsoft */}
          <button
            type="button"
            onClick={() => openSocialModal('microsoft')}
            title="Sign in with Microsoft Account"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            className="hover:border-indigo-400 hover:shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z"/>
              <path fill="#81bc06" d="M12 1h10v10H1z"/>
              <path fill="#05a6f0" d="M1 12h10v10H1z"/>
              <path fill="#ffba08" d="M12 12h10v10H12z"/>
            </svg>
          </button>

          {/* Apple */}
          <button
            type="button"
            onClick={() => openSocialModal('apple')}
            title="Sign in with Apple ID"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            className="hover:border-indigo-400 hover:shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 170 170" fill="#000">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.72.13-9.56-1.92-14.53-6.16-3.23-2.73-7.14-7.44-11.75-14.14-6.42-9.27-11.47-19.78-15.15-31.52-3.68-11.74-5.52-22.95-5.52-33.64 0-14.58 3.66-26.68 10.98-36.3 7.32-9.62 16.73-14.54 28.24-14.77 4.72 0 10.15 1.25 16.29 3.75 6.14 2.5 10.27 3.79 12.39 3.86 1.83 0 6.12-1.34 12.87-4.03 6.75-2.69 12.16-3.92 16.23-3.7 13.12.67 23.41 5.66 30.87 14.97-11.66 7.08-17.39 16.94-17.18 29.58.21 9.87 4.07 18.06 11.58 24.57 4.54 3.86 9.77 6.64 15.69 8.35-2.58 7.55-6.07 15.34-10.47 23.37zm-26.8-106.9c0 7.37-2.69 14.51-8.07 21.42-6.52 8.21-14.47 12.82-23.85 11.96-.13-1.04-.2-2.02-.2-2.94 0-7.16 2.82-14.44 8.46-21.84 2.82-3.71 6.38-6.73 10.68-9.06 4.3-2.33 8.36-3.62 12.18-3.87.52.92.8 2.37.8 4.33z"/>
            </svg>
          </button>
        </div>

      </div>

      {/* PAGE FOOTER COPYRIGHT */}
      <div style={{
        textAlign: 'center',
        marginTop: '24px',
        fontSize: '0.75rem',
        color: '#64748b',
        zIndex: 10
      }}>
        © 2026 Revenue Pilot AI. All rights reserved.
      </div>

      {/* SOCIAL OAUTH & OTP VERIFICATION MODAL OVERLAY */}
      {activeProvider && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            background: '#ffffff',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            fontFamily: "'Inter', sans-serif"
          }} className="animate-scale-up">
            
            {/* Close Button */}
            <button
              onClick={closeSocialModal}
              style={{
                position: 'absolute',
                right: '20px',
                top: '20px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            {/* Provider Logo Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: activeProvider === 'google' ? '#f8fafc' : activeProvider === 'microsoft' ? '#0f172a' : '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                {activeProvider === 'google' && (
                  <svg width="28" height="28" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}

                {activeProvider === 'microsoft' && (
                  <svg width="26" height="26" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H1z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                  </svg>
                )}

                {activeProvider === 'apple' && (
                  <svg width="26" height="26" viewBox="0 0 170 170" fill="#ffffff">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.72.13-9.56-1.92-14.53-6.16-3.23-2.73-7.14-7.44-11.75-14.14-6.42-9.27-11.47-19.78-15.15-31.52-3.68-11.74-5.52-22.95-5.52-33.64 0-14.58 3.66-26.68 10.98-36.3 7.32-9.62 16.73-14.54 28.24-14.77 4.72 0 10.15 1.25 16.29 3.75 6.14 2.5 10.27 3.79 12.39 3.86 1.83 0 6.12-1.34 12.87-4.03 6.75-2.69 12.16-3.92 16.23-3.7 13.12.67 23.41 5.66 30.87 14.97-11.66 7.08-17.39 16.94-17.18 29.58.21 9.87 4.07 18.06 11.58 24.57 4.54 3.86 9.77 6.64 15.69 8.35-2.58 7.55-6.07 15.34-10.47 23.37zm-26.8-106.9c0 7.37-2.69 14.51-8.07 21.42-6.52 8.21-14.47 12.82-23.85 11.96-.13-1.04-.2-2.02-.2-2.94 0-7.16 2.82-14.44 8.46-21.84 2.82-3.71 6.38-6.73 10.68-9.06 4.3-2.33 8.36-3.62 12.18-3.87.52.92.8 2.37.8 4.33z"/>
                  </svg>
                )}
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Sign in with {activeProvider === 'google' ? 'Google' : activeProvider === 'microsoft' ? 'Microsoft' : 'Apple ID'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {socialStep === 'email' ? 'Enter your account email to receive a secure OTP code.' : `OTP Code sent to ${socialEmail}`}
              </p>
            </div>

            {/* ERROR ALERT */}
            {otpError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{otpError}</span>
              </div>
            )}

            {/* STEP 1: EMAIL ENTRY */}
            {socialStep === 'email' && (
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Account Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      value={socialEmail}
                      onChange={(e) => setSocialEmail(e.target.value)}
                      placeholder="e.g. user@gmail.com"
                      required
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 42px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        fontSize: '0.875rem',
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: activeProvider === 'google' ? '#4285f4' : activeProvider === 'microsoft' ? '#0078d4' : '#000000',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                  }}
                >
                  Send OTP Code <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* STEP 2: OTP VERIFICATION */}
            {socialStep === 'otp' && (
              <form onSubmit={handleVerifyOtp}>
                
                {/* OTP CODE DEMO BADGE */}
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, marginBottom: '4px' }}>
                    🔑 Verification Code Sent to Email:
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d', letterSpacing: '4px' }}>
                    {generatedOtp}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnteredOtp(generatedOtp)}
                    style={{
                      marginTop: '6px',
                      background: 'none',
                      border: 'none',
                      color: '#16a34a',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Click to Auto-fill Demo OTP
                  </button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px', textAlign: 'center' }}>
                    Enter 6-Digit OTP Code
                  </label>
                  <div style={{ position: 'relative' }}>
                    <ShieldCheck size={20} color="#7c3aed" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      maxLength={6}
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 849201"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 44px',
                        borderRadius: '12px',
                        border: '2px solid #7c3aed',
                        background: '#faf5ff',
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        letterSpacing: '6px',
                        color: '#4c1d95',
                        textAlign: 'center',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    fontSize: '0.925rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)'
                  }}
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" /> Verifying OTP...
                    </>
                  ) : (
                    <>
                      Verify OTP & Login <Check size={18} />
                    </>
                  )}
                </button>

                {/* Resend Timer & Change Email */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', fontSize: '0.75rem', color: '#64748b' }}>
                  <button
                    type="button"
                    onClick={() => setSocialStep('email')}
                    style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ← Change Email
                  </button>

                  {timer > 0 ? (
                    <span>Resend OTP in <strong>{timer}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Resend New OTP
                    </button>
                  )}
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
