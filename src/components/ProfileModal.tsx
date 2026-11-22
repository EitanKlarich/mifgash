import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Check,
  Upload,
  Link,
  Camera,
  LogOut,
} from 'lucide-react';
import { User as UserType } from '../types';
import { createInitialsAvatarDataUrl, compressImageFileToDataUrl } from '../utils/avatar';

interface ProfileModalProps {
  currentUser: UserType;
  onClose: () => void;
  onUpdateProfile: (updated: Partial<UserType>) => void;
  onSignOut?: () => void;
  isPhoneFrame?: boolean;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  currentUser,
  onClose,
  onUpdateProfile,
  onSignOut,
  isPhoneFrame = false,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const compressed = await compressImageFileToDataUrl(file, 256, 40000);
      setAvatar(compressed);
    } catch {
      setUploadError('Could not process that image. Please choose a different photo.');
    }
  };

  const handleApplyUrl = () => {
    if (customUrl.trim()) {
      setAvatar(customUrl.trim());
      setCustomUrl('');
      setShowUrlInput(false);
    }
  };

  const handleRemovePhoto = () => {
    setAvatar(createInitialsAvatarDataUrl(name.trim() || 'Member'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onUpdateProfile({
      name: name.trim(),
      avatar,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div
      className={`${
        isPhoneFrame ? 'absolute' : 'fixed'
      } inset-0 bg-[#0A0E17]/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden`}
    >
      <div
        className={`bg-[#121724] text-[#F1F3F7] rounded-2xl max-w-md w-full border border-[#1F283C] shadow-2xl flex flex-col overflow-hidden min-h-0 ${
          isPhoneFrame ? 'max-h-[96%]' : 'max-h-[90vh]'
        }`}
      >
        <div className="p-4 border-b border-[#1F283C] flex items-center justify-between bg-[#121724]">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-[#182033] border border-[#1F283C] text-[#8E84E4] rounded-lg flex items-center justify-center">
              <User className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-semibold text-[#F1F3F7] text-sm">Profile</h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 text-[#5E6980] hover:text-[#F1F2F6] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[85vh] overflow-y-auto text-xs no-scrollbar">
          {/* Avatar selector */}
          <div className="space-y-2">
            <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px]">
              Profile Photo
            </label>
            <div className="flex items-center space-x-3">
              <div className="relative group shrink-0">
                <img
                  src={avatar}
                  alt={name}
                  className="w-14 h-14 rounded-2xl object-cover border border-[#1F283C]"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-[#0A0E17]/70 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#F1F3F7] cursor-pointer"
                  title="Upload photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-[#182033] hover:bg-[#1F283C] text-[#8D98AF] hover:text-[#F1F3F7] border border-[#1F283C] text-xs font-medium rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-[#8E84E4]" />
                    <span>Upload</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="px-2.5 py-1 bg-[#182033] hover:bg-[#1F283C] text-[#8D98AF] hover:text-[#F1F2F6] border border-[#1F283C] text-xs font-medium rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Link className="w-3 h-3 text-[#8E84E4]" />
                    <span>Image URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-2.5 py-1 bg-[#182033] hover:bg-[#1F283C] text-[#8D98AF] hover:text-[#E06C75] border border-[#1F283C] text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>

                {showUrlInput && (
                  <div className="flex items-center space-x-1.5 pt-1">
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="Paste image URL..."
                      className="flex-1 bg-[#182033] border border-[#1F283C] px-2 py-1 rounded-lg text-[11px] text-[#F1F3F7] focus:outline-none focus:border-[#8E84E4]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="px-2 py-1 bg-[#8E84E4] text-[#F1F3F7] rounded-lg text-[11px] font-medium cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {uploadError && (
                  <p className="text-[11px] text-[#E06C75] pt-1">{uploadError}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
              Name *
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-[#5E6980] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#182033] border border-[#1F283C] pl-8 pr-3 py-2 rounded-xl text-xs font-medium text-[#F1F3F7] focus:outline-none focus:border-[#8E84E4]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[#5E6980] absolute left-3 top-1/2 -translate-y-1/2" />
              <div className="w-full bg-[#182033]/60 border border-[#1F283C] pl-8 pr-3 py-2 rounded-xl text-xs text-[#8D98AF] truncate">
                {currentUser.email || 'No email attached'}
              </div>
            </div>
          </div>

          {/* Action buttons (Save & Sign Out) */}
          <div className="pt-3 flex items-center justify-between border-t border-[#1F283C]">
            {onSignOut ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className="px-3 py-1.5 bg-[#D45D6D]/15 hover:bg-[#D45D6D]/25 text-[#D45D6D] border border-[#D45D6D]/30 font-medium text-xs rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-[#121724] text-[#8D98AF] hover:text-[#F1F3F7] font-medium text-xs rounded-xl border border-[#1F283C] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] font-medium text-xs rounded-xl transition-colors flex items-center space-x-1 cursor-pointer shadow-xs"
              >
                {saved && <Check className="w-3.5 h-3.5 stroke-[2]" />}
                <span>{saved ? 'Saved!' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
