import React, { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  Lock,
  Bell,
  Calendar as CalendarIcon,
  Palette,
  Info,
  HelpCircle,
  LogOut,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Camera,
  Upload,
  Link as LinkIcon,
  Check,
  X,
  Download,
  AlertCircle,
  ShieldCheck,
  Send,
  FileText,
  Smartphone,
  Moon,
  Loader2,
} from 'lucide-react';
import { User as UserType, EventPlan } from '../types';
import {
  getPreferredCalendar,
  setPreferredCalendar,
  CALENDAR_PROVIDERS,
  CalendarProvider,
  generateIcsContent,
} from '../utils/calendarExport';
import { createInitialsAvatarDataUrl, compressImageFileToDataUrl } from '../utils/avatar';
import {
  auth,
  getAuthProviderType,
  updateUserPasswordReal,
  submitFeedbackInFirestore,
} from '../services/firebase';

interface ProfileViewProps {
  currentUser: UserType;
  onUpdateProfile: (updated: Partial<UserType>) => void;
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
  events?: EventPlan[];
  isPhoneFrame?: boolean;
}

type SubScreenType =
  | null
  | 'personal_info'
  | 'security'
  | 'notifications'
  | 'calendar_sync'
  | 'appearance'
  | 'about'
  | 'help_feedback';

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateProfile,
  onSignOut,
  onDeleteAccount,
  events = [],
  isPhoneFrame = false,
}) => {
  // Navigation state
  const [activeSubScreen, setActiveSubScreen] = useState<SubScreenType>(null);

  // Edit Profile Form State
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals & Confirmations
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [activePolicyModal, setActivePolicyModal] = useState<'privacy' | 'terms' | null>(null);

  // Security Sub-screen State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notifications Preferences State (Persisted in localStorage)
  const [notifPrefs, setNotifPrefs] = useState<{
    eventChanges: boolean;
    rsvpReminders: boolean;
    pollReminders: boolean;
    groupInvites: boolean;
    comments: boolean;
    dailyDigest: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('mifgash_notif_prefs');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      eventChanges: true,
      rsvpReminders: true,
      pollReminders: true,
      groupInvites: true,
      comments: true,
      dailyDigest: false,
    };
  });

  // Calendar Sync State
  const [calendarProvider, setCalendarProviderState] = useState<CalendarProvider>(getPreferredCalendar());
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Help & Feedback State
  const [feedbackCategory, setFeedbackCategory] = useState<'suggestion' | 'issue' | 'question'>('suggestion');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const authProviderType = getAuthProviderType(auth.currentUser);

  // Keep local profile form state in sync with currentUser
  useEffect(() => {
    setName(currentUser.name);
    setAvatar(currentUser.avatar);
  }, [currentUser]);

  // Handle Photo Upload with client-side JPEG compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const compressed = await compressImageFileToDataUrl(file, 256, 40000);
      setAvatar(compressed);
    } catch {
      setUploadError('Could not process that image. Please try another photo.');
    }
  };

  // Handle Apply Photo URL
  const handleApplyUrl = () => {
    if (customUrl.trim()) {
      setAvatar(customUrl.trim());
      setCustomUrl('');
      setShowUrlInput(false);
    }
  };

  // Remove Photo -> Fallback to crisp inline SVG initials avatar
  const handleRemovePhoto = () => {
    setAvatar(createInitialsAvatarDataUrl(name.trim() || 'Member'));
    setShowUrlInput(false);
  };

  // Save Personal Info
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onUpdateProfile({
      name: name.trim(),
      avatar: avatar || currentUser.avatar,
    });

    setSavedFeedback('Profile updated');
    setTimeout(() => {
      setSavedFeedback(null);
      setActiveSubScreen(null);
    }, 900);
  };

  // Toggle Notification Preference
  const toggleNotifPref = (key: keyof typeof notifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    try {
      localStorage.setItem('mifgash_notif_prefs', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Select Calendar Provider
  const handleSelectCalendarProvider = (providerId: CalendarProvider) => {
    setCalendarProviderState(providerId);
    setPreferredCalendar(providerId);
  };

  // Export All Events as .ICS Master File
  const handleExportAllIcs = () => {
    if (events.length === 0) {
      setExportMessage('No plans currently scheduled to export.');
      setTimeout(() => setExportMessage(null), 3500);
      return;
    }
    setExportMessage(null);
    const icsEvents = events
      .map((ev) => {
        const rawContent = generateIcsContent(ev);
        const match = rawContent.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/);
        return match ? match[0] : '';
      })
      .filter(Boolean)
      .join('\n');

    const fullIcs = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Mifgash Group Plans//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${icsEvents}
END:VCALENDAR`;

    try {
      const blob = new Blob([fullIcs], { type: 'text/calendar;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mifgash_plans_${new Date().toISOString().slice(0, 10)}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportMessage('Calendar file downloaded.');
      setTimeout(() => setExportMessage(null), 3000);
    } catch {
      setExportMessage('Could not export calendar file.');
    }
  };

  // Handle Security Password Update via Firebase Auth
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setSecurityMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 6) {
      setSecurityMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setUpdatingPassword(true);
    setSecurityMessage(null);
    const result = await updateUserPasswordReal(currentPassword, newPassword);
    setUpdatingPassword(false);

    if (result.success) {
      setSecurityMessage({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSecurityMessage(null);
      }, 3500);
    } else {
      setSecurityMessage({ type: 'error', text: result.error || 'Could not update password.' });
    }
  };

  // Handle Send Feedback to Firestore
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim() || isSubmittingFeedback) return;
    setIsSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      await submitFeedbackInFirestore(currentUser.id, feedbackCategory, feedbackMessage);
      setFeedbackSent(true);
      setTimeout(() => {
        setFeedbackMessage('');
        setFeedbackSent(false);
        setActiveSubScreen(null);
      }, 1500);
    } catch {
      setFeedbackError('Could not submit feedback right now. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Get Initials for fallback
  const getInitials = (nameStr: string) => {
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Render Sub-screen Back Header
  const renderSubHeader = (title: string) => (
    <div className="flex items-center space-x-2.5 pb-3 border-b border-[#1F283C] mb-4">
      <button
        type="button"
        onClick={() => setActiveSubScreen(null)}
        className="p-1.5 -ml-1 text-[#8D98AF] hover:text-[#F1F3F7] hover:bg-[#182033] rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
        aria-label="Back to Profile"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="text-xs font-medium">Profile</span>
      </button>
      <span className="text-[#5E6980] text-xs">/</span>
      <h2 className="text-sm font-semibold text-[#F1F3F7] truncate">{title}</h2>
    </div>
  );

  return (
    <div className={`w-full max-w-full min-w-0 ${isPhoneFrame ? 'pb-20' : 'pb-24'} text-[#F1F3F7] animate-in fade-in duration-150`}>
      {/* ─────────────────────────────────────────────────────────────
          MAIN PROFILE OVERVIEW (QUIET, SIMPLE, ZERO-SLOP)
      ───────────────────────────────────────────────────────────── */}
      {activeSubScreen === null && (
        <div className="space-y-6">
          {/* Top Quiet Screen Title */}
          <div className="px-0.5 min-w-0">
            <h1 className="text-xs font-semibold uppercase tracking-wider text-[#8D98AF]">Profile</h1>
          </div>

          {/* 1. CLEAN CENTERED PROFILE HEADER */}
          <div className="flex flex-col items-center justify-center text-center pt-1 pb-3">
            {/* Profile Photo: 84px with subtle border */}
            <div className="relative mb-3">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-22 h-22 rounded-full object-cover border-2 border-[#1F283C] bg-[#182033] shadow-sm"
                  onError={(e) => {
                    // Fallback to initials if image fails
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-22 h-22 rounded-full bg-[#182033] border-2 border-[#1F283C] flex items-center justify-center text-[#8E84E4] font-semibold text-xl">
                  {getInitials(currentUser.name)}
                </div>
              )}
            </div>

            {/* User Name (Primary) */}
            <h2 className="text-base sm:text-lg font-semibold text-[#F1F3F7] tracking-tight">
              {currentUser.name}
            </h2>

            {/* Edit Profile Action Button */}
            <button
              type="button"
              onClick={() => setActiveSubScreen('personal_info')}
              className="mt-3 px-4 py-1.5 bg-[#121724] hover:bg-[#182033] text-[#F1F3F7] hover:text-[#8E84E4] text-xs font-medium border border-[#1F283C] rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              Edit Profile
            </button>
          </div>

          {/* 2. SETTINGS SECTIONS: CLEAN LIST ROWS */}
          <div className="space-y-6 pt-1">
            {/* SECTION: ACCOUNT */}
            <div className="space-y-1">
              <div className="px-1 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5E6980]">
                  Account
                </span>
              </div>
              <div className="bg-[#121724] border border-[#1F283C] rounded-2xl overflow-hidden divide-y divide-[#1F283C]/60">
                {/* Personal Information Row */}
                <button
                  type="button"
                  onClick={() => setActiveSubScreen('personal_info')}
                  className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-[#182033] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <UserIcon className="w-4 h-4 text-[#8D98AF] group-hover:text-[#8E84E4] transition-colors shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-[#F1F3F7] truncate">
                        Personal Information
                      </div>
                      <div className="text-[11px] text-[#8D98AF] truncate mt-0.5">
                        Manage your name and profile
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5E6980] group-hover:text-[#8D98AF] transition-colors shrink-0 ml-2" />
                </button>

                {/* Login & Security Row */}
                <button
                  type="button"
                  onClick={() => setActiveSubScreen('security')}
                  className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-[#182033] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <Lock className="w-4 h-4 text-[#8D98AF] group-hover:text-[#8E84E4] transition-colors shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-[#F1F3F7] truncate">
                        Login & Security
                      </div>
                      <div className="text-[11px] text-[#8D98AF] truncate mt-0.5">
                        Password, authentication, and account security
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5E6980] group-hover:text-[#8D98AF] transition-colors shrink-0 ml-2" />
                </button>
              </div>
            </div>

            {/* SECTION: PREFERENCES */}
            <div className="space-y-1">
              <div className="px-1 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5E6980]">
                  Preferences
                </span>
              </div>
              <div className="bg-[#121724] border border-[#1F283C] rounded-2xl overflow-hidden divide-y divide-[#1F283C]/60">
                {/* Notifications Row */}
                <button
                  type="button"
                  onClick={() => setActiveSubScreen('notifications')}
                  className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-[#182033] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <Bell className="w-4 h-4 text-[#8D98AF] group-hover:text-[#8E84E4] transition-colors shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-[#F1F3F7] truncate">
                        Notifications
                      </div>
                      <div className="text-[11px] text-[#8D98AF] truncate mt-0.5">
                        Manage reminders and event updates
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5E6980] group-hover:text-[#8D98AF] transition-colors shrink-0 ml-2" />
                </button>

                {/* Calendar & Sync Row */}
                <button
                  type="button"
                  onClick={() => setActiveSubScreen('calendar_sync')}
                  className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-[#182033] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <CalendarIcon className="w-4 h-4 text-[#8D98AF] group-hover:text-[#8E84E4] transition-colors shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-[#F1F3F7] truncate">
                        Calendar & Sync
                      </div>
                      <div className="text-[11px] text-[#8D98AF] truncate mt-0.5">
                        Manage Google Calendar / Apple Calendar integration
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5E6980] group-hover:text-[#8D98AF] transition-colors shrink-0 ml-2" />
                </button>

                {/* Appearance Row */}
                <button
                  type="button"
                  onClick={() => setActiveSubScreen('appearance')}
                  className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-[#182033] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <Palette className="w-4 h-4 text-[#8D98AF] group-hover:text-[#8E84E4] transition-colors shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-[#F1F3F7] truncate">
                        Appearance
                      </div>
                      <div className="text-[11px] text-[#8D98AF] truncate mt-0.5">
                        Manage the Mifgash appearance
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5E6980] group-hover:text-[#8D98AF] transition-colors shrink-0 ml-2" />
                </button>
              </div>
            </div>

            {/* SECTION: APP */}
            <div className="space-y-1">
              <div className="px-1 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5E6980]">
                  App
                </span>
              </div>
              <div className="bg-[#121724] border border-[#1F283C] rounded-2xl overflow-hidden divide-y divide-[#1F283C]/60">
                {/* About Mifgash Row */}
                <button
                  type="button"
                  onClick={() => setActiveSubScreen('about')}
                  className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-[#182033] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <Info className="w-4 h-4 text-[#8D98AF] group-hover:text-[#8E84E4] transition-colors shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-[#F1F3F7] truncate">
                        About Mifgash
                      </div>
                      <div className="text-[11px] text-[#8D98AF] truncate mt-0.5">
                        Version, information, and credits
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5E6980] group-hover:text-[#8D98AF] transition-colors shrink-0 ml-2" />
                </button>

                {/* Help & Feedback Row */}
                <button
                  type="button"
                  onClick={() => setActiveSubScreen('help_feedback')}
                  className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-[#182033] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <HelpCircle className="w-4 h-4 text-[#8D98AF] group-hover:text-[#8E84E4] transition-colors shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-[#F1F3F7] truncate">
                        Help & Feedback
                      </div>
                      <div className="text-[11px] text-[#8D98AF] truncate mt-0.5">
                        Get help or send feedback
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5E6980] group-hover:text-[#8D98AF] transition-colors shrink-0 ml-2" />
                </button>
              </div>
            </div>

            {/* SECTION: ACCOUNT ACTIONS */}
            <div className="pt-2 space-y-3">
              {/* Log Out Button with Confirmation */}
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full p-3.5 bg-[#121724] hover:bg-[#E06C75]/10 border border-[#1F283C] hover:border-[#E06C75]/30 rounded-2xl flex items-center justify-center space-x-2 text-xs font-medium text-[#E06C75] transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              )}

              {/* Delete Account (Visually separated near bottom) */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmText('');
                    setShowDeleteModal(true);
                  }}
                  className="text-[11px] text-[#5E6980] hover:text-[#E06C75] transition-colors cursor-pointer py-1"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-SCREEN 1: PERSONAL INFORMATION (EDIT PROFILE)
      ───────────────────────────────────────────────────────────── */}
      {activeSubScreen === 'personal_info' && (
        <div className="space-y-4">
          {renderSubHeader('Personal Information')}

          <div className="bg-[#121724] border border-[#1F283C] rounded-2xl p-4 sm:p-5">
            <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
              {/* Profile Photo Editing */}
              <div className="flex flex-col items-center justify-center space-y-3 pb-3 border-b border-[#1F283C]/60">
                <div className="relative group">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="w-22 h-22 rounded-full object-cover border-2 border-[#1F283C] bg-[#182033]"
                    />
                  ) : (
                    <div className="w-22 h-22 rounded-full bg-[#182033] border-2 border-[#1F283C] flex items-center justify-center text-[#8E84E4] font-semibold text-xl">
                      {getInitials(name)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-[#0A0E17]/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#F1F3F7] cursor-pointer"
                    title="Change Photo"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>

                {/* Photo Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-[#182033] hover:bg-[#1F283C] text-[#F1F3F7] border border-[#1F283C] text-xs font-medium rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#8E84E4]" />
                    <span>Upload Photo</span>
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
                    className="px-3 py-1.5 bg-[#182033] hover:bg-[#1F283C] text-[#8D98AF] hover:text-[#F1F3F7] border border-[#1F283C] text-xs font-medium rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-[#8E84E4]" />
                    <span>Image URL</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-1.5 bg-[#182033] hover:bg-[#1F283C] text-[#8D98AF] hover:text-[#E06C75] border border-[#1F283C] text-xs font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    Remove Photo
                  </button>
                </div>

                {uploadError && (
                  <p className="text-[11px] text-[#E06C75] text-center">{uploadError}</p>
                )}

                {/* Custom URL Input Accordion */}
                {showUrlInput && (
                  <div className="w-full max-w-sm flex items-center space-x-1.5 pt-1 animate-in fade-in duration-150">
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="flex-1 bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="px-3.5 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] rounded-xl text-xs font-medium cursor-pointer transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Name Field */}
              <div>
                <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[10px] mb-1.5">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-[#182033] border border-[#1F283C] px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4] transition-colors"
                />
              </div>

              {/* Email Address (Read-only identifier) */}
              <div>
                <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[10px] mb-1.5">
                  Email Address
                </label>
                <div className="px-3.5 py-2.5 bg-[#182033]/60 border border-[#1F283C] rounded-xl text-xs text-[#8D98AF] font-mono select-all">
                  {currentUser.email || 'No email attached'}
                </div>
                <p className="text-[10px] text-[#5E6980] mt-1">
                  Email changes are managed securely through your authentication provider.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#1F283C]/60">
                <button
                  type="button"
                  onClick={() => setActiveSubScreen(null)}
                  className="px-4 py-2 bg-[#182033] hover:bg-[#1F283C] text-[#8D98AF] hover:text-[#F1F3F7] rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] rounded-xl text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {savedFeedback ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{savedFeedback}</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-SCREEN 2: LOGIN & SECURITY
      ───────────────────────────────────────────────────────────── */}
      {activeSubScreen === 'security' && (
        <div className="space-y-4">
          {renderSubHeader('Login & Security')}

          {/* Account Security Overview */}
          <div className="bg-[#121724] border border-[#1F283C] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F283C]/60">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-[#8E84E4]/15 text-[#8E84E4] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-[#F1F3F7]">Account Protection</h3>
                  <p className="text-[11px] text-[#8D98AF]">Session authenticated & secure</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#3EB88F]/15 text-[#3EB88F] font-medium border border-[#3EB88F]/30">
                Active
              </span>
            </div>

            {/* Change Password or Provider Notice */}
            {authProviderType !== 'password' ? (
              <div className="p-3.5 rounded-xl bg-[#182033] border border-[#1F283C] text-xs text-[#8D98AF] leading-relaxed">
                You signed in with{' '}
                <span className="text-[#F1F3F7] font-semibold capitalize">
                  {authProviderType === 'google' ? 'Google' : authProviderType === 'apple' ? 'Apple' : 'your external provider'}
                </span>
                . Password and two-factor security are managed directly through your provider account settings.
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-3 pt-1">
                <h4 className="text-xs font-semibold text-[#F1F3F7]">Change Password</h4>

                {securityMessage && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
                      securityMessage.type === 'success'
                        ? 'bg-[#3EB88F]/15 text-[#3EB88F] border border-[#3EB88F]/30'
                        : 'bg-[#E06C75]/15 text-[#E06C75] border border-[#E06C75]/30'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{securityMessage.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-semibold text-[#8D98AF] mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs text-[#F1F3F7] focus:outline-none focus:border-[#8E84E4]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-semibold text-[#8D98AF] mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs text-[#F1F3F7] focus:outline-none focus:border-[#8E84E4]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-semibold text-[#8D98AF] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs text-[#F1F3F7] focus:outline-none focus:border-[#8E84E4]"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="px-4 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] disabled:opacity-60 text-[#F1F3F7] rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center space-x-1.5"
                  >
                    {updatingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            )}

            {/* Active Sessions Info */}
            <div className="pt-3 border-t border-[#1F283C]/60 space-y-2">
              <h4 className="text-xs font-semibold text-[#F1F3F7]">Active Sessions</h4>
              <div className="p-3 bg-[#182033] border border-[#1F283C] rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Smartphone className="w-4 h-4 text-[#8E84E4]" />
                  <div>
                    <div className="text-xs font-medium text-[#F1F3F7]">This Device (Web / Mobile)</div>
                    <div className="text-[10px] text-[#5E6980]">Current session · Active now</div>
                  </div>
                </div>
                <span className="text-[10px] text-[#3EB88F] font-semibold">Online</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-SCREEN 3: NOTIFICATIONS PREFERENCES
      ───────────────────────────────────────────────────────────── */}
      {activeSubScreen === 'notifications' && (
        <div className="space-y-4">
          {renderSubHeader('Notifications')}

          <div className="bg-[#121724] border border-[#1F283C] rounded-2xl overflow-hidden divide-y divide-[#1F283C]/60">
            {/* Event Changes */}
            <div className="p-4 flex items-center justify-between">
              <div className="pr-4 min-w-0">
                <div className="text-xs sm:text-sm font-medium text-[#F1F3F7]">Event Updates & Changes</div>
                <div className="text-[11px] text-[#8D98AF] mt-0.5">
                  Get notified when dates, locations, or descriptions change
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleNotifPref('eventChanges')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  notifPrefs.eventChanges ? 'bg-[#8E84E4]' : 'bg-[#182033] border border-[#1F283C]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    notifPrefs.eventChanges ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* RSVP Reminders */}
            <div className="p-4 flex items-center justify-between">
              <div className="pr-4 min-w-0">
                <div className="text-xs sm:text-sm font-medium text-[#F1F3F7]">RSVP Reminders</div>
                <div className="text-[11px] text-[#8D98AF] mt-0.5">
                  Reminders before response deadlines and upcoming plans
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleNotifPref('rsvpReminders')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  notifPrefs.rsvpReminders ? 'bg-[#8E84E4]' : 'bg-[#182033] border border-[#1F283C]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    notifPrefs.rsvpReminders ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Poll Reminders */}
            <div className="p-4 flex items-center justify-between">
              <div className="pr-4 min-w-0">
                <div className="text-xs sm:text-sm font-medium text-[#F1F3F7]">Poll Reminders</div>
                <div className="text-[11px] text-[#8D98AF] mt-0.5">
                  Alerts when new group polls are created or need votes
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleNotifPref('pollReminders')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  notifPrefs.pollReminders ? 'bg-[#8E84E4]' : 'bg-[#182033] border border-[#1F283C]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    notifPrefs.pollReminders ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Group Invitations */}
            <div className="p-4 flex items-center justify-between">
              <div className="pr-4 min-w-0">
                <div className="text-xs sm:text-sm font-medium text-[#F1F3F7]">Group Invitations</div>
                <div className="text-[11px] text-[#8D98AF] mt-0.5">
                  Notices when friends invite you to join a Mifgash group
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleNotifPref('groupInvites')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  notifPrefs.groupInvites ? 'bg-[#8E84E4]' : 'bg-[#182033] border border-[#1F283C]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    notifPrefs.groupInvites ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Comments & Discussion */}
            <div className="p-4 flex items-center justify-between">
              <div className="pr-4 min-w-0">
                <div className="text-xs sm:text-sm font-medium text-[#F1F3F7]">Comments & Notes</div>
                <div className="text-[11px] text-[#8D98AF] mt-0.5">
                  Updates when group members leave comments on planned events
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleNotifPref('comments')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  notifPrefs.comments ? 'bg-[#8E84E4]' : 'bg-[#182033] border border-[#1F283C]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    notifPrefs.comments ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-SCREEN 4: CALENDAR & SYNC
      ───────────────────────────────────────────────────────────── */}
      {activeSubScreen === 'calendar_sync' && (
        <div className="space-y-4">
          {renderSubHeader('Calendar & Sync')}

          {/* Preferred Provider Selection */}
          <div className="bg-[#121724] border border-[#1F283C] rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-[#F1F3F7]">Preferred Calendar App</h3>
              <p className="text-[11px] text-[#8D98AF] mt-0.5">
                Choose your default calendar for one-tap event export
              </p>
            </div>

            <div className="space-y-2">
              {CALENDAR_PROVIDERS.map((provider) => {
                const isSelected = calendarProvider === provider.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleSelectCalendarProvider(provider.id)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#182033] border-[#8E84E4] text-[#F1F3F7]'
                        : 'bg-[#0A0E17]/60 border-[#1F283C] text-[#8D98AF] hover:bg-[#182033] hover:text-[#F1F3F7]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <CalendarIcon className={`w-4 h-4 ${isSelected ? 'text-[#8E84E4]' : 'text-[#5E6980]'}`} />
                      <span className="text-xs font-medium">{provider.name}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#8E84E4] text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Master .ICS Export Option */}
            <div className="pt-3 border-t border-[#1F283C]/60 space-y-2">
              <h4 className="text-xs font-semibold text-[#F1F3F7]">Backup & Master Export</h4>
              <p className="text-[11px] text-[#8D98AF]">
                Export all confirmed Mifgash events across all groups into a single universal calendar (.ics) file.
              </p>
              <button
                type="button"
                onClick={handleExportAllIcs}
                className="px-4 py-2 bg-[#182033] hover:bg-[#1F283C] text-[#F1F3F7] hover:text-[#8E84E4] border border-[#1F283C] rounded-xl text-xs font-medium transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#8E84E4]" />
                <span>Export All Events (.ICS)</span>
              </button>
              {exportMessage && (
                <p className="text-[11px] text-[#8D98AF] pt-1">{exportMessage}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-SCREEN 5: APPEARANCE
      ───────────────────────────────────────────────────────────── */}
      {activeSubScreen === 'appearance' && (
        <div className="space-y-4">
          {renderSubHeader('Appearance')}

          <div className="bg-[#121724] border border-[#1F283C] rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-[#F1F3F7]">Theme</h3>
              <p className="text-[11px] text-[#8D98AF] mt-0.5">
                Mifgash uses a calibrated dark palette designed for comfortable evening planning.
              </p>
            </div>

            <div className="w-full p-3.5 rounded-xl border bg-[#182033] border-[#8E84E4] text-[#F1F3F7] flex items-center justify-between text-left">
              <div className="flex items-center space-x-3">
                <Moon className="w-4 h-4 text-[#8E84E4]" />
                <div>
                  <div className="text-xs font-medium">Nightfall Dark (Active)</div>
                  <div className="text-[10px] text-[#8D98AF]">Deep navy surfaces with high-contrast slate ink</div>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full bg-[#8E84E4] text-white flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 stroke-[2.5]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-SCREEN 6: ABOUT MIFGASH
      ───────────────────────────────────────────────────────────── */}
      {activeSubScreen === 'about' && (
        <div className="space-y-4">
          {renderSubHeader('About Mifgash')}

          <div className="bg-[#121724] border border-[#1F283C] rounded-2xl p-5 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-[#8E84E4]/15 border border-[#8E84E4]/30 flex items-center justify-center text-[#8E84E4]">
                <CalendarIcon className="w-7 h-7" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-[#F1F3F7]">Mifgash</h3>
              <p className="text-xs text-[#8E84E4] font-medium mt-0.5">Version 1.2.0</p>
              <p className="text-xs text-[#8D98AF] max-w-sm mx-auto mt-2 leading-relaxed">
                Mifgash makes group planning effortless, calm, and collaborative. No endless group chats — just clear dates, polls, and RSVPs.
              </p>
            </div>

            <div className="pt-2 border-t border-[#1F283C]/60 text-left space-y-1">
              <button
                type="button"
                onClick={() => setActivePolicyModal('privacy')}
                className="w-full p-3 rounded-xl hover:bg-[#182033] flex items-center justify-between text-xs text-[#F1F3F7] transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-[#8D98AF]" />
                  <span>Privacy Policy</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#5E6980]" />
              </button>

              <button
                type="button"
                onClick={() => setActivePolicyModal('terms')}
                className="w-full p-3 rounded-xl hover:bg-[#182033] flex items-center justify-between text-xs text-[#F1F3F7] transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-[#8D98AF]" />
                  <span>Terms of Service</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#5E6980]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-SCREEN 7: HELP & FEEDBACK
      ───────────────────────────────────────────────────────────── */}
      {activeSubScreen === 'help_feedback' && (
        <div className="space-y-4">
          {renderSubHeader('Help & Feedback')}

          {/* Quick FAQ Accordion */}
          <div className="bg-[#121724] border border-[#1F283C] rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-[#F1F3F7]">Frequently Asked Questions</h3>

            <div className="space-y-2 text-xs">
              {[
                {
                  q: 'How do I create a new group plan?',
                  a: 'Tap the "+ New Plan" button in the header or floating button, select your group, pick a date, time, and location.',
                },
                {
                  q: 'How do group polls work?',
                  a: 'Create a poll to vote on dates or locations. When consensus is reached, you can convert the winning option directly into an active event.',
                },
                {
                  q: 'Can I export events to Google Calendar?',
                  a: 'Yes! Tap on any event and choose "Open in Calendar" or export all events to an .ics file from Calendar & Sync settings.',
                },
              ].map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div key={idx} className="border border-[#1F283C] rounded-xl overflow-hidden bg-[#182033]/50">
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full p-3 text-left font-medium text-[#F1F3F7] flex items-center justify-between cursor-pointer hover:bg-[#182033]"
                    >
                      <span>{faq.q}</span>
                      <ChevronRight className={`w-4 h-4 text-[#5E6980] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 text-[11px] text-[#8D98AF] leading-relaxed border-t border-[#1F283C]/40 pt-2">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Send Feedback / Report Problem Form */}
          <div className="bg-[#121724] border border-[#1F283C] rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-[#F1F3F7]">Send Us Feedback</h3>
            <p className="text-[11px] text-[#8D98AF]">
              Have an idea to improve Mifgash or ran into an issue? Let us know.
            </p>

            <form onSubmit={handleSubmitFeedback} className="space-y-3 pt-1">
              <div className="flex items-center space-x-2">
                {(['suggestion', 'issue', 'question'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFeedbackCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize border transition-colors cursor-pointer ${
                      feedbackCategory === cat
                        ? 'bg-[#8E84E4]/15 text-[#8E84E4] border-[#8E84E4]/40'
                        : 'bg-[#182033] text-[#8D98AF] border-[#1F283C] hover:text-[#F1F3F7]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                required
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Describe your feedback or suggestion..."
                className="w-full bg-[#182033] border border-[#1F283C] p-3 rounded-xl text-xs text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4] resize-none"
              />

              <div className="flex items-center justify-between gap-2">
                {feedbackSent ? (
                  <span className="text-xs text-[#3EB88F] font-medium flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Feedback received. Thank you!</span>
                  </span>
                ) : feedbackError ? (
                  <span className="text-xs text-[#E06C75] font-medium">{feedbackError}</span>
                ) : (
                  <div />
                )}
                <button
                  type="submit"
                  disabled={isSubmittingFeedback || !feedbackMessage.trim()}
                  className="px-4 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] disabled:opacity-50 text-[#F1F3F7] rounded-xl text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmittingFeedback ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{isSubmittingFeedback ? 'Sending...' : 'Submit Feedback'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CONFIRMATION MODAL: LOG OUT
      ───────────────────────────────────────────────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-[#0A0E17]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-[#121724] border border-[#1F283C] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#E06C75]/15 text-[#E06C75] flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#F1F3F7]">Log out of Mifgash?</h3>
                <p className="text-xs text-[#8D98AF] mt-0.5">
                  Are you sure you want to sign out?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 bg-[#182033] hover:bg-[#1F283C] text-[#8D98AF] hover:text-[#F1F3F7] rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  onSignOut?.();
                }}
                className="px-4 py-2 bg-[#E06C75] hover:bg-[#D45D6D] text-white rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CONFIRMATION MODAL: DELETE ACCOUNT
      ───────────────────────────────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-[#0A0E17]/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-[#121724] border border-[#E06C75]/40 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#E06C75]/15 text-[#E06C75] flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#F1F3F7]">Delete Account</h3>
                <p className="text-xs text-[#E06C75] mt-0.5 font-medium">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-[#8D98AF] leading-relaxed">
              This will permanently delete your profile, group memberships, and associated personal activity on Mifgash.
            </p>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-[#8D98AF] mb-1">
                Type <span className="font-mono text-[#F1F3F7] font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs text-[#F1F3F7] focus:outline-none focus:border-[#E06C75]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-[#182033] hover:bg-[#1F283C] text-[#8D98AF] hover:text-[#F1F3F7] rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={() => {
                  setShowDeleteModal(false);
                  onDeleteAccount?.();
                }}
                className="px-4 py-2 bg-[#E06C75] hover:bg-[#D45D6D] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          POLICY & TERMS MODAL
      ───────────────────────────────────────────────────────────── */}
      {activePolicyModal && (
        <div className="fixed inset-0 bg-[#0A0E17]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-[#121724] border border-[#1F283C] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F283C]">
              <h3 className="text-sm font-semibold text-[#F1F3F7]">
                {activePolicyModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </h3>
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="text-[#8D98AF] hover:text-[#F1F3F7] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto text-xs text-[#8D98AF] space-y-3 leading-relaxed pr-1">
              {activePolicyModal === 'privacy' ? (
                <>
                  <p>
                    <strong className="text-[#F1F3F7]">Mifgash Privacy First:</strong> We do not sell your personal information or track you across the web. Your account details and group plans are kept private to your groups.
                  </p>
                  <p>
                    <strong className="text-[#F1F3F7]">Data Storage:</strong> Data entered into Mifgash is stored securely in encrypted cloud storage or your local session for instant offline access.
                  </p>
                  <p>
                    <strong className="text-[#F1F3F7]">Calendar Integration:</strong> When exporting events to your calendar, only the event title, date, time, description, and location are included.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong className="text-[#F1F3F7]">Terms of Use:</strong> Mifgash provides group scheduling, polling, and coordination tools for personal, community, and team plans.
                  </p>
                  <p>
                    <strong className="text-[#F1F3F7]">Acceptable Conduct:</strong> Users agree to respect group members and refrain from posting malicious, abusive, or unauthorized content.
                  </p>
                  <p>
                    <strong className="text-[#F1F3F7]">Service Availability:</strong> We continually improve Mifgash to ensure high reliability, speed, and clean coordination.
                  </p>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-[#1F283C] flex justify-end">
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="px-4 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
