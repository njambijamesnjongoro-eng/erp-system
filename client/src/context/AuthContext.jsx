import { createContext, useState, useEffect, useCallback } from 'react';
import api, { clearAuthSession } from '../api/axios';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleExpiredSession = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setLoading(false);
  }, []);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
    } catch {
      handleExpiredSession();
    } finally {
      setLoading(false);
    }
  }, [handleExpiredSession]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    window.addEventListener('auth:expired', handleExpiredSession);
    return () => window.removeEventListener('auth:expired', handleExpiredSession);
  }, [handleExpiredSession]);

  const login = async (email, password, deviceFingerprint) => {
    const { data } = await api.post('/auth/login', { email, password, deviceFingerprint });
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    setUser(data.data.user);
    return data.data;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // ignore
    } finally {
      clearAuthSession();
    }
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role_name);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchUser, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}
