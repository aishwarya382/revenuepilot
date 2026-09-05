import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, Check, LogIn, User, Store, AlertCircle, UserPlus, Sparkles } from 'lucide-react';
import RevenueLogo from './RevenueLogo';
import SignupLinks from './SignupLinks';
import { useAuth } from '../context/AuthContext';
import './AuthScreen.css';

export default function AuthScreen({ onLogin }) {
  const { login, signup } = useAuth();

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

  // Auth Error State & Loading
  const [authError, setAuthError] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

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
      const userObj = await login(email.trim(), password, role);
      setIsSubmittingAuth(false);
      if (onLogin) {
        onLogin(userObj);
      }
    } catch (err) {
      setIsSubmittingAuth(false);
      setAuthError(err.message || 'Incorrect email or password.');
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
      const userObj = await signup(fullName.trim(), signUpEmail.trim(), signUpPassword, confirmPassword, role);
      setIsSubmittingAuth(false);
      setSignUpSuccessMsg('Account created successfully! Logging you in...');
      setTimeout(() => {
        if (onLogin) {
          onLogin(userObj);
        }
      }, 800);
    } catch (err) {
      setIsSubmittingAuth(false);
      setAuthError(err.message || 'Sign up error. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      
      {/* Subtle Background Ambient Elements */}
      <div className="auth-bg-graphics" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.07) 0%, rgba(168, 85, 247, 0.03) 50%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.06) 0%, rgba(99, 102, 241, 0.03) 50%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }} />
      </div>

      {/* Centered Logo & Branding */}
      <div className="logo-section">
        <div style={{ margin: '0 auto 12px auto', display: 'inline-flex', justifyContent: 'center' }}>
          <RevenueLogo size={56} />
        </div>

        <h1 className="brand-name" style={{ margin: '4px 0', fontSize: '1.75rem' }}>
          Revenue Pilot <span style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span>
        </h1>

        <p className="brand-tagline" style={{ margin: 0, fontSize: '0.8rem' }}>
          AI Growth • Agentic Commerce
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="login-card">
        
        {/* Card Header */}
        <div className="card-header">
          <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
        </div>

        {/* Success Notification Alert */}
        {signUpSuccessMsg && (
          <div className="alert-success" style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '0.825rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <Sparkles size={18} />
            <span>{signUpSuccessMsg}</span>
          </div>
        )}

        {/* Auth Error Alert */}
        {authError && (
          <div className="alert-error" style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '0.825rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={18} />
            <span>{authError}</span>
          </div>
        )}

        {/* ================= LOGIN VIEW ================= */}
        {!isSignUp ? (
          <div className="login-wrapper">
            <form onSubmit={handleLoginSubmit}>
              
              {/* Email Field */}
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="icon-left" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="input-field"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="icon-left" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="input-field password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="toggle-password"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Role Selector Tabs */}
              <div className="input-group">
                <label className="input-label">Login as</label>
                <div className="role-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  
                  {/* Customer Tab */}
                  <div
                    onClick={() => handleRoleChange('customer')}
                    className={`role-tab ${role === 'customer' ? 'active' : ''}`}
                    style={{
                      border: role === 'customer' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      background: role === 'customer' ? 'rgba(99, 102, 241, 0.06)' : '#fff',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      position: 'relative'
                    }}
                  >
                    {role === 'customer' && (
                      <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#6366f1', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                    <div style={{ color: role === 'customer' ? '#6366f1' : '#64748b' }}>
                      <User size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>Customer</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Shop & Discover</div>
                    </div>
                  </div>

                  {/* Merchant Tab */}
                  <div
                    onClick={() => handleRoleChange('merchant')}
                    className={`role-tab ${role === 'merchant' ? 'active' : ''}`}
                    style={{
                      border: role === 'merchant' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      background: role === 'merchant' ? 'rgba(99, 102, 241, 0.06)' : '#fff',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      position: 'relative'
                    }}
                  >
                    {role === 'merchant' && (
                      <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#6366f1', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                    <div style={{ color: role === 'merchant' ? '#6366f1' : '#64748b' }}>
                      <Store size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>Merchant</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Manage & Grow</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="secondary-options" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 20px 0', fontSize: '0.825rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: '#6366f1' }}
                  />
                  Remember me
                </label>
                <a href="#forgot" onClick={(e) => e.preventDefault()} style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="btn-primary"
              >
                {isSubmittingAuth ? 'Signing in...' : (
                  <>
                    Sign In <LogIn size={18} />
                  </>
                )}
              </button>

            </form>

            {/* Signup prompt */}
            <SignupLinks onToggleSignUp={handleToggleSignUp} />
          </div>
        ) : (
          /* ================= SIGN UP VIEW ================= */
          <div className="signup-wrapper">
            <form onSubmit={handleSignUpSubmit}>
              
              {/* Full Name Field */}
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <div className="input-wrapper">
                  <User size={18} className="icon-left" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="input-field"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="icon-left" />
                  <input
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="input-field"
                  />
                </div>
              </div>

              {/* Password & Confirm Password Row */}
              <div className="input-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="icon-left" />
                    <input
                      type="password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      required
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="input-label">Confirm Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="icon-left" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm"
                      required
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Account Type Selector Tabs */}
              <div className="input-group">
                <label className="input-label">Register as</label>
                <div className="role-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  
                  {/* Customer Register Tab */}
                  <div
                    onClick={() => handleRoleChange('customer')}
                    className={`role-tab ${role === 'customer' ? 'active' : ''}`}
                    style={{
                      border: role === 'customer' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      background: role === 'customer' ? 'rgba(99, 102, 241, 0.06)' : '#fff',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      position: 'relative'
                    }}
                  >
                    {role === 'customer' && (
                      <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#6366f1', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                    <div style={{ color: role === 'customer' ? '#6366f1' : '#64748b' }}>
                      <User size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>Customer</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Shop & Discover</div>
                    </div>
                  </div>

                  {/* Merchant Register Tab */}
                  <div
                    onClick={() => handleRoleChange('merchant')}
                    className={`role-tab ${role === 'merchant' ? 'active' : ''}`}
                    style={{
                      border: role === 'merchant' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      background: role === 'merchant' ? 'rgba(99, 102, 241, 0.06)' : '#fff',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      position: 'relative'
                    }}
                  >
                    {role === 'merchant' && (
                      <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#6366f1', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                    <div style={{ color: role === 'merchant' ? '#6366f1' : '#64748b' }}>
                      <Store size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>Merchant</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Manage & Grow</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div style={{ margin: '14px 0 20px 0', fontSize: '0.8rem', color: '#64748b' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    style={{ accentColor: '#6366f1', marginTop: '2px' }}
                  />
                  <span>
                    I agree to the <span style={{ color: '#6366f1', fontWeight: 600 }}>Terms of Service & Privacy Policy</span>
                  </span>
                </label>
              </div>

              {/* Primary Sign Up Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="btn-primary"
              >
                {isSubmittingAuth ? 'Creating Account...' : (
                  <>
                    Create Account <UserPlus size={18} />
                  </>
                )}
              </button>

            </form>

            {/* Sign In Redirect Link */}
            <div className="signup-text" style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: '#64748b' }}>
              Already have an account?{' '}
              <a
                href="#login"
                onClick={(e) => { e.preventDefault(); handleToggleSignUp(false); }}
                style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}
              >
                Sign in
              </a>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
