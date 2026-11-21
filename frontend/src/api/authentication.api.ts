import api from './axios';
import type {
  RegisterData,
  LoginData,
  VerifyEmailData,
  User,
} from '../types/authentication.types';

export const registerUser = async (data: RegisterData) => {
  const response = await api.post(
    '/authentication/register',
    data,
  );

  return response.data;
};

export const verifyEmail = async (data: VerifyEmailData) => {
  const response = await api.post(
    '/authentication/verify-email',
    data,
  );

  return response.data;
};

export const loginUser = async (data: LoginData) => {
  const response = await api.post<User>(
    '/authentication/log-in',
    data,
  );

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get<User>('/authentication');

  return response.data;
};

export const refreshToken = async () => {
  const response = await api.get<User>(
    '/authentication/refresh',
  );

  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post(
    '/authentication/log-out',
  );

  return response.data;
};

export const requestPasswordReset = async (email: string) => {
  const response = await api.post(
    '/authentication/forgot-password',
    { email },
  );

  return response.data;
};

export const resetPassword = async (data: {
  email: string;
  code: string;
  newPassword: string;
}) => {
  const response = await api.post(
    '/authentication/reset-password',
    data,
  );

  return response.data;
};
