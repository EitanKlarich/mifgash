import React, { useState } from 'react';
import { X, Users, Link2, Upload, Check, Copy, Share2, QrCode } from 'lucide-react';
import { Group, User } from '../types';

import { compressImageFileToDataUrl } from '../utils/avatar';
import { generateInviteCode, buildGroupInviteUrl } from '../services/firebase';

interface GroupModalsProps {
  mode: 'create' | 'join';
  currentUser: User;
  onClose: () => void;
  onCreateGroup: (
    groupData: Partial<Group>,
    options?: { keepModalOpen?: boolean }
  ) => Promise<Group | null> | void;
  onJoinGroup: (inviteCode: string) => void;
  isPhoneFrame?: boolean;
}

export const GroupModals: React.FC<GroupModalsProps> = ({
  mode,
  currentUser,
  onClose,
  onCreateGroup,
  onJoinGroup,
  isPhoneFrame = false,
}) => {
  // Create flow steps: 'form' -> 'invite'
  const [step, setStep] = useState<'form' | 'invite'>('form');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupImage, setGroupImage] = useState<string>('');
  const [createdGroupData, setCreatedGroupData] = useState<Partial<Group> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Invite & Join states
  const [inviteInput, setInviteInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // File upload handler with compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFileToDataUrl(file, 256, 40000);
        setGroupImage(compressed);
      } catch (err) {
        console.warn('Could not process uploaded image:', err);
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isCreating) return;

    setIsCreating(true);
    const inviteCode = generateInviteCode(name.trim());
    const newGroupData: Partial<Group> = {
      name: name.trim(),
      description: description.trim() || 'Hangouts & planning group',
      image: groupImage || undefined,
      inviteCode,
      color: 'indigo',
      icon: 'users',
      createdAt: 'Just now',
      members: [
        {
          id: currentUser.id,
          name: currentUser.name,
          nickname: currentUser.nickname,
          avatar: currentUser.avatar,
        },
      ],
    };

    try {
      const created = await onCreateGroup(newGroupData, { keepModalOpen: true });
      if (created === null) {
        setIsCreating(false);
        return;
      }
      setCreatedGroupData(created || newGroupData);
      setStep('invite');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFinishCreation = () => {
    onClose();
  };

  const getInviteUrl = () => {
    const code = createdGroupData?.inviteCode || 'invite';
    return buildGroupInviteUrl(code);
  };

  const handleCopyLink = () => {
    const url = getInviteUrl();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          () => {
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
          },
          () => fallbackCopy(url)
        );
      } else {
        fallbackCopy(url);
      }
    } catch {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.warn('Could not copy:', e);
    }
  };

  const handleNativeShare = async () => {
    const url = getInviteUrl();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${createdGroupData?.name || 'Group'} on Mifgash`,
          text: `You're invited to plan events with us in ${createdGroupData?.name || 'our group'} on Mifgash!`,
          url: url,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput.trim()) return;
    onJoinGroup(inviteInput.trim());
  };

  // Fallback monogram for group preview
  const getInitials = (str: string) => {
    const clean = str.trim();
    if (!clean) return 'G';
    const words = clean.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={`${
        isPhoneFrame ? 'absolute p-3 sm:p-4' : 'fixed safe-modal-container sm:p-4'
      } inset-0 bg-[#0A0E17]/85 backdrop-blur-xs z-50 flex items-center justify-center overflow-hidden`}
    >
      <div
        className={`bg-[#121724] text-[#F1F3F7] rounded-2xl max-w-md w-full border border-[#1F283C] shadow-2xl flex flex-col overflow-hidden min-h-0 ${
          isPhoneFrame ? 'max-h-[96%]' : 'max-h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#1F283C] flex items-center justify-between bg-[#121724]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#182033] text-[#8E84E4] border border-[#1F283C] rounded-xl flex items-center justify-center">
              {mode === 'create' ? <Users className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-semibold text-[#F1F3F7] text-sm leading-tight">
                {mode === 'create'
                  ? step === 'form'
                    ? 'Create Group'
                    : 'Invite Friends'
                  : 'Join Group'}
              </h3>
              <p className="text-[11px] text-[#8D98AF]">
                {mode === 'create'
                  ? step === 'form'
                    ? 'Set up a group to plan hangouts & events'
                    : `Group "${createdGroupData?.name}" is ready`
                  : 'Enter a group invite code or link'}
              </p>
            </div>
          </div>
          <button
            onClick={step === 'invite' ? handleFinishCreation : onClose}
            className="p-1.5 text-[#5E6980] hover:text-[#F1F3F7] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CREATE MODE: Step 1 - Form */}
        {mode === 'create' && step === 'form' && (
          <form onSubmit={handleCreateSubmit} className="p-4 space-y-4 text-xs overflow-y-auto">
            {/* Group Photo Section */}
            <div>
              <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-2">
                Group Photo
              </label>
              <div className="flex items-center space-x-3.5">
                {/* Photo Preview (48–56px circular) */}
                <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 border border-[#1F283C] bg-[#182033] flex items-center justify-center shadow-xs">
                  {groupImage ? (
                    <img
                      src={groupImage}
                      alt="Group Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#182033] flex items-center justify-center text-sm font-bold text-[#8E84E4]">
                      {name ? getInitials(name) : <Users className="w-5 h-5 text-[#8D98AF]" />}
                    </div>
                  )}
                </div>

                {/* Upload or Choose Action */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <label className="px-3 py-1.5 bg-[#182033] hover:bg-[#1E273D] border border-[#1F283C] hover:border-[#8E84E4]/40 text-[#F1F3F7] rounded-xl text-xs font-medium cursor-pointer transition-colors inline-flex items-center space-x-1.5">
                      <Upload className="w-3.5 h-3.5 text-[#8E84E4]" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {groupImage && (
                      <button
                        type="button"
                        onClick={() => setGroupImage('')}
                        className="px-2.5 py-1.5 text-xs text-[#8D98AF] hover:text-[#F1F3F7] hover:bg-[#182033] rounded-lg transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-[#5E6980]">
                    Optional · Upload a photo from your device
                  </p>
                </div>
              </div>
            </div>

            {/* Group Name */}
            <div>
              <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
                Group Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. College Friends, Family, Camping Crew"
                className="w-full bg-[#182033] border border-[#1F283C] px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
              />
            </div>

            {/* Optional Description */}
            <div>
              <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Weekly plans, trips & dinner hangouts"
                className="w-full bg-[#182033] border border-[#1F283C] px-3.5 py-2.5 rounded-xl text-xs text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2.5 flex items-center justify-end space-x-2 border-t border-[#1F283C]">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-[#121724] text-[#8D98AF] hover:text-[#F1F3F7] font-medium text-xs rounded-xl border border-[#1F283C] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isCreating}
                className="px-4 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] disabled:opacity-50 text-[#F1F3F7] font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                {isCreating ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        )}

        {/* CREATE MODE: Step 2 - Invite Friends */}
        {mode === 'create' && step === 'invite' && (
          <div className="p-4 space-y-4 text-xs">
            {/* Success message banner */}
            <div className="p-3 bg-[#132B24] border border-[#3EB88F]/40 rounded-xl flex items-center space-x-2.5 text-[#3EB88F]">
              <Check className="w-4 h-4 shrink-0 stroke-[2.5]" />
              <div className="text-xs">
                <span className="font-semibold">{createdGroupData?.name}</span> created!
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[#F1F3F7]">Invite Friends</h4>
              <p className="text-xs text-[#8D98AF]">
                Mifgash groups are invite-only. Share your group invite link or QR code with your friends.
              </p>
            </div>

            <div className="px-3 py-2 bg-[#0A0E17] border border-[#1F283C] rounded-xl flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#CBD2E1] truncate">
                {getInviteUrl().replace(/^https?:\/\//, '')}
              </span>
              <span className="text-[10px] text-[#5E6980] shrink-0">Invite link</span>
            </div>

            {/* Invite Action Buttons */}
            <div className="space-y-2 pt-1">
              {/* Native Share Sheet */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2.5 px-3.5 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Invite</span>
              </button>

              {/* Copy Invite Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 px-3.5 bg-[#182033] hover:bg-[#1E273D] border border-[#1F283C] text-[#F1F3F7] font-medium rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-[#3EB88F]" />
                    <span className="text-[#3EB88F]">Invite Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#8E84E4]" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              {/* QR Code toggle */}
              <button
                type="button"
                onClick={() => setShowQrModal((prev) => !prev)}
                className="w-full py-2 px-3.5 bg-[#121724] hover:bg-[#182033] border border-[#1F283C] text-[#8D98AF] hover:text-[#F1F3F7] font-medium rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showQrModal ? 'Hide QR Code' : 'Show QR Code'}</span>
              </button>
            </div>

            {/* QR Code Graphic Display */}
            {showQrModal && (
              <div className="p-4 bg-[#0A0E17] border border-[#1F283C] rounded-2xl flex flex-col items-center justify-center space-y-2 text-center">
                {/* SVG Stylized QR Code */}
                <div className="w-36 h-36 bg-white p-2.5 rounded-xl shadow-inner flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {/* QR Code Corner Finders */}
                    <rect x="5" y="5" width="28" height="28" fill="#0A0E17" rx="3" />
                    <rect x="10" y="10" width="18" height="18" fill="white" rx="2" />
                    <rect x="14" y="14" width="10" height="10" fill="#0A0E17" rx="1.5" />

                    <rect x="67" y="5" width="28" height="28" fill="#0A0E17" rx="3" />
                    <rect x="72" y="10" width="18" height="18" fill="white" rx="2" />
                    <rect x="76" y="14" width="10" height="10" fill="#0A0E17" rx="1.5" />

                    <rect x="5" y="67" width="28" height="28" fill="#0A0E17" rx="3" />
                    <rect x="10" y="72" width="18" height="18" fill="white" rx="2" />
                    <rect x="14" y="76" width="10" height="10" fill="#0A0E17" rx="1.5" />

                    {/* QR Data Matrix Patterns */}
                    <rect x="40" y="8" width="6" height="6" fill="#0A0E17" />
                    <rect x="52" y="8" width="6" height="6" fill="#0A0E17" />
                    <rect x="40" y="20" width="18" height="6" fill="#0A0E17" />
                    <rect x="46" y="32" width="12" height="6" fill="#0A0E17" />
                    <rect x="8" y="40" width="12" height="6" fill="#0A0E17" />
                    <rect x="26" y="40" width="6" height="18" fill="#0A0E17" />
                    <rect x="40" y="46" width="20" height="8" fill="#0A0E17" />
                    <rect x="68" y="40" width="8" height="8" fill="#0A0E17" />
                    <rect x="82" y="40" width="10" height="6" fill="#0A0E17" />
                    <rect x="68" y="54" width="24" height="6" fill="#0A0E17" />
                    <rect x="40" y="68" width="8" height="16" fill="#0A0E17" />
                    <rect x="54" y="68" width="14" height="6" fill="#0A0E17" />
                    <rect x="74" y="68" width="18" height="8" fill="#0A0E17" />
                    <rect x="54" y="80" width="8" height="12" fill="#0A0E17" />
                    <rect x="68" y="82" width="24" height="10" fill="#0A0E17" />
                  </svg>
                </div>
                <p className="text-[11px] text-[#8D98AF]">
                  Scan with camera to join <span className="text-[#F1F3F7] font-medium">{createdGroupData?.name}</span>
                </p>
              </div>
            )}

            {/* Done / Enter Group */}
            <div className="pt-2 border-t border-[#1F283C]">
              <button
                type="button"
                onClick={handleFinishCreation}
                className="w-full py-2 bg-[#182033] hover:bg-[#1E273D] text-[#CBD2E1] hover:text-[#F1F3F7] font-medium text-xs rounded-xl border border-[#1F283C] transition-colors cursor-pointer"
              >
                Done · Go to Group
              </button>
            </div>
          </div>
        )}

        {/* JOIN MODE */}
        {mode === 'join' && (
          <form onSubmit={handleJoinSubmit} className="p-4 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
                Invite Code or Link *
              </label>
              <input
                type="text"
                required
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="e.g. mifgash.app/7k9m2p or 7k9m2p"
                className="w-full bg-[#182033] border border-[#1F283C] px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
              />
              <p className="text-[10px] text-[#5E6980] mt-1">
                Paste the invite code or link sent to you by a group member.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#1F283C]">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-[#121724] text-[#8D98AF] hover:text-[#F1F3F7] font-medium text-xs rounded-xl border border-[#1F283C] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!inviteInput.trim()}
                className="px-4 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] disabled:opacity-50 text-[#F1F3F7] font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Join Group
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
