import React, { createContext, useContext, useState, useEffect } from 'react';

const SERVER_URL = 'https://phoenix-chess-server.onrender.com';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('phoenix_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`${SERVER_URL}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.username) setUser(data);
          else { setToken(null); localStorage.removeItem('phoenix_token'); }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const register = async (username, password) => {
    const res = await fetch(`${SERVER_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('phoenix_token', data.token);
    return data;
  };

  const login = async (username, password) => {
    const res = await fetch(`${SERVER_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('phoenix_token', data.token);
    return data;
  };

  const logout = async () => {
    await fetch(`${SERVER_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setToken(null);
    setUser(null);
    localStorage.removeItem('phoenix_token');
  };

  const refreshUser = async () => {
    if (!token) return;
    const res = await fetch(`${SERVER_URL}/profile/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.username) setUser(data);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
