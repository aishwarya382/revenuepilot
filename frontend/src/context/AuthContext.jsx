import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('rp_access_token') || null);
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('currentUser');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    return !!localStorage.getItem('rp_access_token');
  });

  // Restore authenticated session on mount / page refresh
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('rp_access_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        let res;
        try {
          res = await fetch('http://localhost:8000/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            }
          });
        } catch {
          res = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            }
          });
        }

        if (res && res.ok) {
          const userData = await res.json();
          const authUser = {
            ...userData,
            token: storedToken,
            avatar: userData.role === 'customer' ? '🎓' : '💼',
            badge: `${userData.role === 'customer' ? 'Customer' : 'Merchant'} Workspace`
          };
          setUser(authUser);
          setToken(storedToken);
          localStorage.setItem('currentUser', JSON.stringify(authUser));
        } else {
          // Token expired or invalid
          localStorage.removeItem('rp_access_token');
          localStorage.removeItem('currentUser');
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error('Session restore failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password, role) => {
    let res;
    try {
      res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
    } catch {
      try {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role })
        });
      } catch {
        throw new Error('Unable to connect to the server. Please try again.');
      }
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.access_token) {
      throw new Error(data.detail || data.error || 'Incorrect email or password.');
    }

    const authenticatedUser = {
      ...data.user,
      token: data.access_token,
      avatar: data.user.role === 'customer' ? '🎓' : '💼',
      badge: `${data.user.role === 'customer' ? 'Customer' : 'Merchant'} Workspace`
    };

    localStorage.setItem('rp_access_token', data.access_token);
    localStorage.setItem('currentUser', JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);
    setToken(data.access_token);

    return authenticatedUser;
  };

  const signup = async (name, email, password, confirmPassword, role) => {
    let res;
    try {
      res = await fetch('http://localhost:8000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          confirm_password: confirmPassword,
          role
        })
      });
    } catch {
      try {
        res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            password,
            confirm_password: confirmPassword,
            role
          })
        });
      } catch {
        throw new Error('Unable to connect to the server. Please try again.');
      }
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.access_token) {
      throw new Error(data.detail || data.error || 'Sign up failed. Please check your details.');
    }

    const authenticatedUser = {
      ...data.user,
      token: data.access_token,
      avatar: data.user.role === 'customer' ? '🎓' : '💼',
      badge: `Registered ${data.user.role === 'customer' ? 'Customer' : 'Merchant'}`
    };

    localStorage.setItem('rp_access_token', data.access_token);
    localStorage.setItem('currentUser', JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);
    setToken(data.access_token);

    return authenticatedUser;
  };

  const logout = async () => {
    if (token) {
      try {
        fetch('http://localhost:8000/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
      } catch {
        // ignore logout network error
      }
    }
    localStorage.removeItem('rp_access_token');
    localStorage.removeItem('currentUser');
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    merchant_id: user?.merchant_id || null,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    signup,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
