
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, Trash2, UserRound, Save, X } from 'lucide-react';
import axios from 'axios';

import { useAuth } from '../../../context/AuthContext';
import {
  updateProfile,
  uploadAvatar,
  removeAvatar,
} from '../../../api/users.api';

import { useLanguage } from '../../../context/LanguageContext';
import { TRANSLATIONS } from '../../../constants/translations';
import { useNotification } from '../../../context/NotificationContext';

function ProfileSettings() {
  const { user, checkAuth } = useAuth();
  const { language } = useLanguage();

  const t = TRANSLATIONS[language];
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    if (!isAvatarOpen) return;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAvatarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isAvatarOpen]);

  const initials = user?.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message;

      return Array.isArray(message)
        ? message.join('. ')
        : typeof message === 'string'
          ? message
          : t.generalError;
    }

    return t.generalError;
  };

  const hasNameChanges = name.trim() !== (user?.name ?? '');

  const handleNameSave = async () => {
    setError('');

    const trimmedName = name.trim();

    if (trimmedName.length < 3) {
      setError(t.nameMinLength);
      return;
    }

    if (trimmedName.length > 80) {
      setError(t.nameMaxLength);
      return;
    }

    if (trimmedName === user?.name) {
      setError(t.noChanges);
      return;
    }

    try {
      setLoading(true);

      await updateProfile({ name: trimmedName });
      await checkAuth();

      showNotification('success', t.nameUpdated);
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError('');

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(t.invalidAvatarType);
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t.avatarTooLarge);
      event.target.value = '';
      return;
    }

    const newPreview = URL.createObjectURL(file);
    setPreview(newPreview);

    try {
      setAvatarLoading(true);

      await uploadAvatar(file);
      await checkAuth();

      setAvatarVersion(Date.now());
      setPreview(null);
      showNotification('success', t.avatarUpdated);
    } catch (error: unknown) {
      setPreview(null);
      setError(getErrorMessage(error));
    } finally {
      setAvatarLoading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarRemove = async () => {
    setError('');

    try {
      setAvatarLoading(true);

      await removeAvatar();
      setPreview(null);

      await checkAuth();

      showNotification('success', t.avatarRemoved);
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setAvatarLoading(false);
    }
  };

  const avatarUrl = preview ?? (
    user?.avatarUrl
      ? `${user.avatarUrl}?v=${avatarVersion}`
      : null
  );

  return (
    <div className="profile-settings">
      <div className="profile-avatar-section">
        <div className="profile-settings-avatar">
          {avatarUrl ? (
            <button
              type="button"
              className="profile-avatar-preview"
              onClick={() => setIsAvatarOpen(true)}
              disabled={avatarLoading}
              aria-label={t.viewProfilePicture}
            >
              <img src={avatarUrl} alt={t.profilePicture} />
            </button>
          ) : (
            <span>{initials || <UserRound size={28} />}</span>
          )}
        </div>

        <div className="profile-avatar-actions">
          <strong>{t.profilePicture}</strong>

          <p>{t.avatarDescription}</p>

          <div className="profile-avatar-buttons">
            <button
              type="button"
              className="profile-secondary-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
            >
              <Camera size={16} />
              {avatarLoading ? t.uploading : t.changePicture}
            </button>

            {user?.avatarUrl && (
              <button
                type="button"
                className="profile-delete-button"
                onClick={handleAvatarRemove}
                disabled={avatarLoading}
              >
                <Trash2 size={16} />
                {t.removePicture}
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarSelect}
            hidden
          />
        </div>
      </div>

      <div className="profile-settings-divider" />

      <div className="profile-form">
        <div className="profile-form-field">
          <label htmlFor="profile-name">{t.fullNameLabel}</label>

          <input
            id="profile-name"
            type="text"
            value={name}
            maxLength={80}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            placeholder={t.enterYourName}
          />
        </div>

        <div className="profile-form-field">
          <label htmlFor="profile-email">{t.emailAddress}</label>

          <input
            id="profile-email"
            type="email"
            value={user?.email ?? ''}
            disabled
          />

          <small>{t.emailSecurityHint}</small>
        </div>

        {error && (
          <div className="profile-message error">
            {error}
          </div>
        )}

        <button
          type="button"
          className="profile-save-button"
          onClick={handleNameSave}
          disabled={loading || !hasNameChanges}
        >
          <Save size={17} />
          {loading ? t.saving : t.saveChanges}
        </button>
      </div>

      {isAvatarOpen && avatarUrl && (
        <div
          className="avatar-modal-overlay"
          onClick={() => setIsAvatarOpen(false)}
        >
          <div
            className="avatar-modal-content"
            role="dialog"
            aria-modal="true"
            aria-label={t.profilePicture}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="avatar-modal-close"
              onClick={() => setIsAvatarOpen(false)}
              aria-label={t.closePreview}
            >
              <X size={20} />
            </button>

            <img src={avatarUrl} alt={t.profilePicture} />
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileSettings;
