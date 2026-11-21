
import api from './axios';

export const requestPasswordChange = async () => {
  const response = await api.post(
    '/users/password/request-change',
  );

  return response.data;
};

export const verifyPasswordChange = async (
  code: string,
  newPassword: string,
) => {
  const response = await api.post(
    '/users/password/verify-change',
    { code, newPassword },
  );

  return response.data;
};

export const requestEmailChange = async (newEmail: string) => {
  const response = await api.post(
    '/users/email/change',
    { newEmail },
  );

  return response.data;
};

export const verifyEmailChange = async (code: string) => {
  const response = await api.post(
    '/users/email/verify-change',
    { code },
  );

  return response.data;
};
