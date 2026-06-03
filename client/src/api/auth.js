import api from './axios';

export const login = (email, password, deviceFingerprint) =>
  api.post('/auth/login', { email, password, deviceFingerprint });

export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', { currentPassword, newPassword });

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email });

export const resetPassword = (token, newPassword) =>
  api.post('/auth/reset-password', { token, newPassword });
