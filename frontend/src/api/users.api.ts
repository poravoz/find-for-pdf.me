import api from './axios';

export interface UpdateProfileData {
  name: string;
}

interface AvatarResponse {
  avatarUrl: string;
}

export const updateProfile = async (data: UpdateProfileData) => {
  const response = await api.patch('/users/profile', data);
  return response.data;
};

export const uploadAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await api.post<AvatarResponse>(
    '/users/profile/avatar',
    formData,
  );

  return response.data;
};

export const removeAvatar = async () => {
  const response = await api.delete('/users/profile/avatar');
  return response.data;
};
