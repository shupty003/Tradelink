/**
 * context/AuthContext.jsx — Authentication Context
 *
 * Provides auth state and user info to the entire app.
 */

import { createContext, useState } from 'react';
import api from '../services/api';

/** @type {React.Context<AuthContextValue>} */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('tl_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const register = async data => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      const { user: newUser, accessToken } = res.data.data;
      localStorage.setItem('tl_user', JSON.stringify(newUser));
      localStorage.setItem('tl_token', accessToken);
      setUser(newUser);
      return { success: true, user: newUser };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user: loggedInUser, accessToken } = res.data.data;
      localStorage.setItem('tl_user', JSON.stringify(loggedInUser));
      localStorage.setItem('tl_token', accessToken);
      setUser(loggedInUser);
      return { success: true, user: loggedInUser };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('tl_user');
      localStorage.removeItem('tl_token');
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  };

  const updateProfile = async profileData => {
    setIsLoading(true);
    try {
      const res = await api.patch('/users/profile', profileData);
      const updatedUser = res.data.data;
      localStorage.setItem('tl_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    isLoggedIn: !!user,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
