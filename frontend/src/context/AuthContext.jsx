import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userInfo = localStorage.getItem('govpay_user');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      setUser(parsed);
      axios.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/auth/login', { email, password });
      setUser(res.data);
      localStorage.setItem('govpay_user', JSON.stringify(res.data));
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Login failed');
    }
  };

  const register = async (userData) => {
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/auth/register', userData);
      setUser(res.data);
      localStorage.setItem('govpay_user', JSON.stringify(res.data));
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('govpay_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
        {children}
    </AuthContext.Provider>
  );
};
