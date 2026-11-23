import React, { useState } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Vote,
  Share2,
  Check,
  HelpCircle,
  X,
  MapPin,
  Clock,
  ArrowRight,
  Copy,
  QrCode,
  Users,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { Group, EventPlan, Poll, User, RsvpStatus } from '../types';
import { openNativeMaps } from '../utils/maps';
import { formatTimeRange } from '../utils/timeFormat';
import { getEventThemeArtwork } from '../utils/calendarArtwork';
import { PRESET_GROUP_PHOTOS } from '../utils/groupPresets';
import { compressImageFileToDataUrl } from '../utils/avatar';
import { buildGroupInviteUrl } from '../services/firebase';

interface GroupsViewProps {
  groups: Group[];
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  events: EventPlan[];
  polls: Poll[];
  chatMessages?: Record<string, any>;
  currentUser: User;
  onSendMessage?: (groupId: string, text: string) => void;
  onUpdateGroup?: (groupId: string, updated: Partial<Group>) => void;
  onOpenCreateGroup: () => void;
  onOpenJoinGroup: () => void;
  onOpenCreateEventForGroup: (groupId: string) => void;
  onOpenCreatePollForGroup: (groupId: string) => void;
  onSelectEvent: (event: EventPlan) => void;
  onRsvp?: (eventId: string, status: RsvpStatus) => void;
  onVotePoll?: (pollId: string, optionId: string) => void;
  onConvertPollToEvent?: (poll: Poll) => void;
  isPhoneFrame?: boolean;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  groups,
  selectedGroupId,
  setSelectedGroupId,
  events,
  polls,
  currentUser,
  onUpdateGroup,
  onOpenCreateGroup,
  onOpenJoinGroup,
  onOpenCreateEventForGroup,
  onOpenCreatePollForGroup,
  onSelectEvent,
  onRsvp,
  onVotePoll,
  onConvertPollToEvent,
  isPhoneFrame = false,
}) => {
  // Navigation inside the individual group view: 'plans' (default) or 'polls'
  const [activeGroupTab, setActiveGroupTab] = useState<'plans' | 'polls'>('plans');

  // Invite Modal state inside group
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  // Group Photo Modal state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>('');
  const [customPhotoInput, setCustomPhotoInput] = useState<string>('');

  // Group Members Modal / Bottom Sheet state
  const [showMembersModal, setShowMembersModal] = useState(false);

  // Selected group object
  const currentGroup = selectedGroupId ? groups.find((g) => g.id === selectedGroupId) || null : null;

  // Filter events and polls belonging strictly to the selected group
  const groupEvents = currentGroup
    ? events.filter((e) => e.groupId === currentGroup.id)
    : [];

  const groupPolls = currentGroup
    ? polls.filter((p) => p.groupId === currentGroup.id)
    : [];

  // Helper to format event dates concisely (e.g., "Monday", "Aug 24")
  const formatEventDate = (dateStr: string, endDateStr?: string) => {
    try {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d.getTime())) {
          const weekday = d.toLocaleString('en-US', { weekday: 'short' });
          const month = d.toLocaleString('en-US', { month: 'short' });
          const day = d.getDate();
          let base = `${weekday}, ${month} ${day}`;
          if (endDateStr && endDateStr > dateStr) {
            const endParts = endDateStr.split('-');
            if (endParts.length === 3) {
              const endD = new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10));
              if (!isNaN(endD.getTime())) {
                const endMonth = endD.toLocaleString('en-US', { month: 'short' });
                const endDay = endD.getDate();
                base += ` – ${endMonth !== month ? endMonth + ' ' : ''}${endDay}`;
              }
            }
          }
          return base;
        }
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Helper to get relative day label for group list secondary text
  const getEventDayLabel = (dateStr: string) => {
    try {
      if (!dateStr) return '';
      const parts = dateStr.split('-').map(Number);
      if (parts.length === 3) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const eventDate = new Date(parts[0], parts[1] - 1, parts[2]);
        eventDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays > 1 && diffDays < 7) {
          return eventDate.toLocaleDateString('en-US', { weekday: 'short' });
        }
        return eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Calculate secondary planning info for each group row
  const getGroupSecondaryInfo = (group: Group) => {
    const memberCount = group.members?.length || 1;
    const gEvents = events.filter((e) => e.groupId === group.id);
    
    // Sort upcoming events chronologically
    const sorted = [...gEvents].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    if (sorted.length === 0) {
      return `${memberCount} members · Nothing planned`;
    }

    const nextEvent = sorted[0];
    const dayLabel = getEventDayLabel(nextEvent.date);

    if (sorted.length === 1) {
      return `${memberCount} members · ${nextEvent.title} ${dayLabel}`;
    }

    return `${memberCount} members · ${sorted.length} upcoming plans`;
  };

  // Calculate subtle meaningful activity indicator per group (e.g. unvoted polls or unanswered RSVPs)
  const getGroupMeaningfulActivity = (groupId: string) => {
    const gEvents = events.filter((e) => e.groupId === groupId);
    const gPolls = polls.filter((p) => p.groupId === groupId && !p.isClosed);

    const pendingEvs = gEvents.filter((ev) => {
      const userRsvp = ev.rsvps?.find((r) => r.userId === currentUser.id);
      return !userRsvp || userRsvp.status === 'Unanswered' || ev.isPendingInvite;
    }).length;

    const pendingPls = gPolls.filter((poll) => {
      return !poll.options.some((opt) => opt.votes.includes(currentUser.id));
    }).length;

    return pendingEvs + pendingPls;
  };

  // Fallback monogram for group avatars
  const getGroupInitials = (name: string) => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Copy invite link handler
  const handleCopyInviteLink = (group: Group) => {
    const inviteUrl = buildGroupInviteUrl(group.inviteCode);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(inviteUrl).then(
          () => {
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
          },
          () => fallbackCopy(inviteUrl)
        );
      } else {
        fallbackCopy(inviteUrl);
      }
    } catch {
      fallbackCopy(inviteUrl);
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

  // Native share sheet handler
  const handleNativeShare = async (group: Group) => {
    const url = buildGroupInviteUrl(group.inviteCode);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on Mifgash`,
          text: `You're invited to plan events with us in ${group.name} on Mifgash!`,
          url: url,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopyInviteLink(group);
        }
      }
    } else {
      handleCopyInviteLink(group);
    }
  };

  // Open photo modal for current group
  const handleOpenPhotoModal = () => {
    if (currentGroup) {
      setSelectedPhotoUrl(currentGroup.image || currentGroup.avatar || '');
      setCustomPhotoInput('');
      setShowPhotoModal(true);
    }
  };

  // Save new photo
  const handleSavePhoto = (photoUrl: string) => {
    if (currentGroup && onUpdateGroup) {
      onUpdateGroup(currentGroup.id, {
        image: photoUrl.trim() || undefined,
        avatar: photoUrl.trim() || undefined,
      });
    }
    setShowPhotoModal(false);
  };

  // File upload reader for photo modal
  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFileToDataUrl(file, 256, 40000);
        setSelectedPhotoUrl(compressed);
      } catch (err) {
        console.warn('Could not process uploaded image:', err);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: GROUPS DIRECTORY LIST (Default when no individual group is selected)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!currentGroup) {
    return (
      <div className={`w-full max-w-full min-w-0 ${isPhoneFrame ? 'pt-2 pb-24 space-y-4' : 'pt-3 pb-24 space-y-5'} text-[#F1F3F7]`}>
        {/* Top Header: "Groups" with + button */}
        <div className="flex items-center justify-between px-2 pt-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F3F7]">
            Groups
          </h1>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={onOpenJoinGroup}
              className="px-2.5 py-1.5 text-xs font-medium text-[#8D98AF] hover:text-[#F1F3F7] bg-[#121724] hover:bg-[#182033] border border-[#1F283C] rounded-xl transition-colors cursor-pointer"
            >
              Join
            </button>
            <button
              onClick={onOpenCreateGroup}
              className="w-8 h-8 rounded-full bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              title="Create new group"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Clean Vertical List of Groups */}
        {groups.length === 0 ? (
          <div className="w-full bg-[#121724] py-12 px-6 rounded-2xl border border-[#1F283C] text-center space-y-2">
            <Users className="w-8 h-8 text-[#5E6980] mx-auto opacity-70" />
            <p className="text-sm font-semibold text-[#F1F3F7]">No groups yet</p>
            <p className="text-xs text-[#8D98AF]">
              Create a group or join one with an invite code to start planning.
            </p>
            <button
              onClick={onOpenCreateGroup}
              className="mt-2 inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Group</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#1F283C]/60 bg-[#121724] rounded-2xl border border-[#1F283C]/80 overflow-hidden shadow-xs">
            {groups.map((group) => {
              const secondaryInfo = getGroupSecondaryInfo(group);
              const activityCount = getGroupMeaningfulActivity(group.id);
              const groupPhoto = group.image || group.avatar;

              return (
                <div
                  key={group.id}
                  onClick={() => {
                    setSelectedGroupId(group.id);
                    setActiveGroupTab('plans');
                  }}
                  className="group w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[#182033]/70 active:bg-[#182033] transition-colors cursor-pointer min-h-[64px]"
                >
                  {/* Left: Group Circular Image + Name & Secondary Info */}
                  <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                    {/* 48–56px Circular Group Image */}
                    <div className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-full overflow-hidden shrink-0 bg-[#182033] border border-[#1F283C] flex items-center justify-center shadow-xs">
                      {groupPhoto ? (
                        <img
                          src={groupPhoto}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#182033] flex items-center justify-center text-xs sm:text-sm font-bold text-[#8E84E4]">
                          {getGroupInitials(group.name)}
                        </div>
                      )}
                    </div>

                    {/* Group Name & Secondary Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] sm:text-base font-semibold text-[#F1F3F7] group-hover:text-white transition-colors truncate leading-tight">
                        {group.name}
                      </h3>
                      <p className="text-xs text-[#8D98AF] truncate mt-0.5 font-normal">
                        {secondaryInfo}
                      </p>
                    </div>
                  </div>

                  {/* Right: Optional Subtle Activity Indicator */}
                  {activityCount > 0 && (
                    <div className="shrink-0 flex items-center pl-2">
                      <span
                        className="w-2 h-2 rounded-full bg-[#8E84E4] ring-2 ring-[#8E84E4]/30"
                        title={`${activityCount} updates need response`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: INDIVIDUAL GROUP PLANNING SPACE (When a group is tapped)
  // ─────────────────────────────────────────────────────────────────────────────
  const memberCount = currentGroup.members?.length || 1;
  const groupPhoto = currentGroup.image || currentGroup.avatar;

  return (
    <div className={`w-full max-w-full min-w-0 ${isPhoneFrame ? 'pt-1 pb-24 space-y-4' : 'pt-2 pb-24 space-y-5'} text-[#F1F3F7]`}>
      {/* 1. TOP BACK NAVIGATION */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={() => setSelectedGroupId(null)}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#8E84E4] hover:text-[#A49BE8] transition-colors py-1 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Groups</span>
        </button>
      </div>

      {/* 2. GROUP HEADER (Clean Vertical Hierarchy) */}
      <div className="flex flex-col items-center text-center space-y-3 w-full max-w-full px-2">
        {/* Large Prominent Group Photo (64–80px, Tappable) */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={handleOpenPhotoModal}
            className="relative group w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden shrink-0 bg-[#182033] border-2 border-[#1F283C] hover:border-[#8E84E4] flex items-center justify-center shadow-md transition-all cursor-pointer"
            title="Change group photo"
          >
            {groupPhoto ? (
              <img
                src={groupPhoto}
                alt={currentGroup.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#182033] flex items-center justify-center text-xl sm:text-2xl font-bold text-[#8E84E4]">
                {getGroupInitials(currentGroup.name)}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>

          {/* Secondary Action Link under photo */}
          <button
            type="button"
            onClick={handleOpenPhotoModal}
            className="mt-1.5 text-[11px] text-[#8E84E4] hover:text-[#A49BE8] font-medium transition-colors cursor-pointer"
          >
            {groupPhoto ? 'Change photo' : 'Add photo'}
          </button>
        </div>

        {/* Group Name & Member Count */}
        <div className="w-full max-w-md mx-auto space-y-1">
          <h1
            className="text-xl sm:text-2xl font-bold text-[#F1F3F7] leading-tight tracking-tight text-center break-normal"
            style={{
              overflowWrap: 'normal',
              wordBreak: 'normal',
              whiteSpace: 'normal',
            }}
          >
            {currentGroup.name}
          </h1>
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setShowMembersModal(true)}
              className="inline-flex items-center space-x-1 text-xs text-[#8D98AF] hover:text-[#F1F3F7] transition-colors cursor-pointer group/members py-0.5 px-2 rounded-lg hover:bg-[#182033]/60"
              title="View group members"
            >
              <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#5E6980] group-hover/members:text-[#8E84E4] group-hover/members:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Action Buttons: [ Invite ]   [ + Add Plan ] */}
        <div className="flex items-center justify-center gap-2.5 pt-1 w-full max-w-xs mx-auto">
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex-1 py-2 px-4 bg-[#182033] hover:bg-[#1E273D] text-[#CBD2E1] hover:text-[#F1F3F7] border border-[#1F283C] rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5 text-[#8E84E4]" />
            <span>Invite</span>
          </button>

          <button
            onClick={() => {
              if (activeGroupTab === 'plans') {
                onOpenCreateEventForGroup(currentGroup.id);
              } else {
                onOpenCreatePollForGroup(currentGroup.id);
              }
            }}
            className="flex-1 py-2 px-4 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{activeGroupTab === 'plans' ? 'Add Plan' : 'New Poll'}</span>
          </button>
        </div>
      </div>

      {/* 3. SEGMENTED TABS: Plans / Polls */}
      <div className="flex items-center p-1 rounded-xl bg-[#121724] border border-[#1F283C]/70 text-xs font-medium w-full">
        <button
          onClick={() => setActiveGroupTab('plans')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeGroupTab === 'plans'
              ? 'bg-[#182033] text-[#F1F3F7] font-semibold border border-[#8E84E4]/40 shadow-xs'
              : 'text-[#8D98AF] hover:text-[#CBD2E1]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-[#8E84E4]" />
          <span>Plans ({groupEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveGroupTab('polls')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeGroupTab === 'polls'
              ? 'bg-[#182033] text-[#F1F3F7] font-semibold border border-[#8E84E4]/40 shadow-xs'
              : 'text-[#8D98AF] hover:text-[#CBD2E1]'
          }`}
        >
          <Vote className="w-3.5 h-3.5 text-[#8E84E4]" />
          <span>Polls ({groupPolls.length})</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. TAB 1: GROUP PLANS (Default)
      ───────────────────────────────────────────────────────────── */}
      {activeGroupTab === 'plans' && (
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold text-[#8D98AF] tracking-wider uppercase">
              Upcoming Plans
            </h3>
            <span className="text-[11px] text-[#5E6980]">
              {groupEvents.length} {groupEvents.length === 1 ? 'plan' : 'plans'}
            </span>
          </div>

          {groupEvents.length === 0 ? (
            <div className="w-full bg-[#121724] py-12 px-6 rounded-2xl border border-[#1F283C]/70 text-center space-y-2">
              <Calendar className="w-8 h-8 text-[#5E6980] mx-auto opacity-70" />
              <p className="text-sm font-semibold text-[#F1F3F7]">No plans scheduled</p>
              <p className="text-xs text-[#8D98AF]">
                Organize a hangout, trip, or dinner with {currentGroup.name}.
              </p>
              <button
                onClick={() => onOpenCreateEventForGroup(currentGroup.id)}
                className="mt-2 inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add First Plan</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 w-full min-w-0">
              {groupEvents.map((event) => {
                const rsvps = event.rsvps || [];
                const goingAttendees = rsvps.filter((r) => r.status === 'Going');
                const goingCount = goingAttendees.length;
                const myRsvp = rsvps.find((r) => r.userId === currentUser.id)?.status;
                const hasAnswered = myRsvp && myRsvp !== 'Unanswered';
                const timeLabel = formatTimeRange(event.startTime, event.endTime);
                const isProposal = Boolean(event.isProposal);
                const artwork = getEventThemeArtwork(event.title, event.description);

                return (
                  <div
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    className={`group relative w-full min-w-0 rounded-2xl bg-[#121724] hover:bg-[#182033]/70 active:scale-[0.99] transition-all cursor-pointer overflow-hidden p-3.5 sm:p-4 space-y-2.5 shadow-xs ${
                      isProposal
                        ? 'border-2 border-dotted border-[#8E84E4]/70 hover:border-[#8E84E4]'
                        : 'border border-[#1F283C]/80 hover:border-[#8E84E4]/40'
                    }`}
                  >
                    {/* Background subtle theme artwork with dark readability overlay */}
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-[0.08] pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.14]"
                      style={{ backgroundImage: `url(${artwork.imageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#121724] via-[#121724]/95 to-[#121724]/85 pointer-events-none" />

                    {/* Content */}
                    <div className="relative z-10 space-y-1.5 min-w-0">
                      {/* Event Title */}
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <h4 className="text-[15px] sm:text-base font-semibold text-[#F1F3F7] leading-snug tracking-tight group-hover:text-white transition-colors break-words">
                          {event.title}
                        </h4>
                        {isProposal && (
                          <span className="shrink-0 text-[10px] font-semibold text-[#8E84E4] bg-[#8E84E4]/15 border border-[#8E84E4]/40 px-1.5 py-0.5 rounded-md tracking-wide uppercase">
                            Proposed
                          </span>
                        )}
                      </div>

                      {/* Date & Time */}
                      <div className="text-xs text-[#8D98AF] flex items-center gap-1.5 flex-wrap min-w-0">
                        <Clock className="w-3.5 h-3.5 text-[#5E6980] shrink-0" />
                        <span className="text-[#CBD2E1] font-medium">
                          {formatEventDate(event.date, event.endDate)} · {timeLabel}
                        </span>
                      </div>

                      {/* Location */}
                      {event.location && (
                        <div className="text-xs text-[#8D98AF] flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-[#5E6980] shrink-0" />
                          <span
                            onClick={(e) => {
                              if (event.location !== 'TBD') {
                                e.stopPropagation();
                                openNativeMaps(event.location, e);
                              }
                            }}
                            className={`truncate ${
                              event.location !== 'TBD' ? 'hover:text-[#8E84E4] cursor-pointer' : 'text-[#5E6980]'
                            }`}
                          >
                            {event.location}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Bar: RSVP Status / Direct Response & Attendees */}
                    <div className="relative z-10 pt-2 border-t border-[#1F283C]/60 flex flex-wrap items-center justify-between gap-2 min-w-0">
                      {/* RSVP Buttons or Active Status */}
                      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!hasAnswered ? (
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRsvp && onRsvp(event.id, 'Going');
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center space-x-1 bg-[#182033]/70 border border-[#1F283C] text-[#8D98AF] hover:text-[#3EB88F] hover:border-[#3EB88F]/40 hover:bg-[#132B24]/50 transition-all cursor-pointer"
                            >
                              <Check className="w-3 h-3 stroke-2" />
                              <span>Going</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRsvp && onRsvp(event.id, 'Maybe');
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center space-x-1 bg-[#182033]/70 border border-[#1F283C] text-[#8D98AF] hover:text-[#D99E4A] hover:border-[#D99E4A]/40 hover:bg-[#2B2316]/50 transition-all cursor-pointer"
                            >
                              <HelpCircle className="w-3 h-3 stroke-2" />
                              <span>Maybe</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRsvp && onRsvp(event.id, "Can't Go");
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center space-x-1 bg-[#182033]/70 border border-[#1F283C] text-[#8D98AF] hover:text-[#D45D6D] hover:border-[#D45D6D]/40 hover:bg-[#2D1920]/50 transition-all cursor-pointer"
                            >
                              <X className="w-3 h-3 stroke-2" />
                              <span className="hidden sm:inline">Can't Go</span>
                              <span className="sm:hidden">No</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center space-x-1.5 border ${
                                myRsvp === 'Going'
                                  ? 'bg-[#132B24] border-[#3EB88F]/40 text-[#3EB88F]'
                                  : myRsvp === 'Maybe'
                                  ? 'bg-[#2B2316] border-[#D99E4A]/40 text-[#D99E4A]'
                                  : 'bg-[#2D1920] border-[#D45D6D]/40 text-[#D45D6D]'
                              }`}
                            >
                              {myRsvp === 'Going' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                              {myRsvp === 'Maybe' && <HelpCircle className="w-3.5 h-3.5 stroke-[2]" />}
                              {myRsvp === "Can't Go" && <X className="w-3.5 h-3.5 stroke-[2.5]" />}
                              <span>{myRsvp}</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Attendees Count & Small Avatars */}
                      <div className="flex items-center space-x-1.5 shrink-0 ml-auto">
                        {goingAttendees.length > 0 && (
                          <div className="flex -space-x-1 overflow-hidden shrink-0">
                            {goingAttendees.slice(0, 3).map((attendee, idx) => (
                              <img
                                key={idx}
                                src={attendee.userAvatar}
                                alt={attendee.userName}
                                className="inline-block w-4.5 h-4.5 rounded-full ring-1 ring-[#121724] object-cover"
                                title={attendee.userName}
                              />
                            ))}
                          </div>
                        )}
                        <span className="text-xs text-[#8D98AF] font-normal whitespace-nowrap">
                          {goingCount} going
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. TAB 2: GROUP POLLS
      ───────────────────────────────────────────────────────────── */}
      {activeGroupTab === 'polls' && (
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold text-[#8D98AF] tracking-wider uppercase">
              Group Polls
            </h3>
            <span className="text-[11px] text-[#5E6980]">
              {groupPolls.length} {groupPolls.length === 1 ? 'poll' : 'polls'}
            </span>
          </div>

          {groupPolls.length === 0 ? (
            <div className="w-full bg-[#121724] py-12 px-6 rounded-2xl border border-[#1F283C]/70 text-center space-y-2">
              <Vote className="w-8 h-8 text-[#5E6980] mx-auto opacity-70" />
              <p className="text-sm font-semibold text-[#F1F3F7]">No active polls</p>
              <p className="text-xs text-[#8D98AF]">
                Create a poll to decide on dates, dinner spots, or activities with {currentGroup.name}.
              </p>
              <button
                onClick={() => onOpenCreatePollForGroup(currentGroup.id)}
                className="mt-2 inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Create First Poll</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5 w-full min-w-0">
              {groupPolls.map((poll) => {
                const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
                const userHasVoted = poll.options.some((opt) => opt.votes.includes(currentUser.id));

                return (
                  <div
                    key={poll.id}
                    className="bg-[#121724] border border-[#1F283C] rounded-2xl p-4 space-y-3 shadow-xs"
                  >
                    {/* Poll Question */}
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-[#8D98AF]">
                        <span className="text-[#8E84E4] font-medium">{poll.category} Poll</span>
                        <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
                      </div>
                      <h4 className="font-semibold text-sm sm:text-base text-[#F1F3F7] leading-snug">
                        {poll.question}
                      </h4>
                    </div>

                    {/* Interactive Option Bars */}
                    <div className="space-y-2">
                      {poll.options.map((opt) => {
                        const isMyVote = opt.votes.includes(currentUser.id);
                        const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onVotePoll && onVotePoll(poll.id, opt.id)}
                            className={`w-full relative h-10 rounded-xl overflow-hidden text-left border transition-all cursor-pointer ${
                              isMyVote
                                ? 'border-[#8E84E4] bg-[#0A0E17]'
                                : 'border-[#1F283C] bg-[#0A0E17] hover:border-[#8E84E4]/40'
                            }`}
                          >
                            {/* Progress bar background */}
                            <div
                              className={`absolute top-0 bottom-0 left-0 transition-all duration-300 ${
                                isMyVote ? 'bg-[#8E84E4]/30' : 'bg-[#8E84E4]/12'
                              }`}
                              style={{ width: `${pct}%` }}
                            />

                            {/* Option label & vote count */}
                            <div className="absolute inset-0 px-3 flex justify-between items-center text-xs z-10">
                              <span className="flex items-center space-x-2 font-medium text-[#F1F3F7] truncate pr-2">
                                {isMyVote && (
                                  <span className="w-4 h-4 rounded-full bg-[#8E84E4] text-[#F1F3F7] flex items-center justify-center shrink-0">
                                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                                  </span>
                                )}
                                <span className="truncate">{opt.text}</span>
                              </span>

                              <span className="text-xs font-semibold text-[#CBD2E1] shrink-0">
                                {opt.votes.length} ({pct}%)
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Poll Footer & Convert to Plan */}
                    <div className="pt-2 border-t border-[#1F283C]/70 flex items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] text-[#8D98AF]">
                        {userHasVoted ? '✓ You voted' : 'Tap an option to vote'}
                      </span>

                      {onConvertPollToEvent && (
                        <button
                          onClick={() => onConvertPollToEvent(poll)}
                          className="text-[#8E84E4] hover:text-[#A49BE8] font-medium flex items-center gap-1 transition-colors cursor-pointer text-xs"
                        >
                          <span>Convert to Plan</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. IN-GROUP INVITE FRIENDS MODAL
      ───────────────────────────────────────────────────────────── */}
      {showInviteModal && (
        <div
          className={`${
            isPhoneFrame ? 'absolute p-3 sm:p-4' : 'fixed safe-modal-container sm:p-4'
          } inset-0 bg-[#0A0E17]/80 backdrop-blur-xs z-50 flex items-center justify-center overflow-hidden`}
        >
          <div className="bg-[#121724] text-[#F1F3F7] rounded-2xl max-w-sm w-full border border-[#1F283C] shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F283C] pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-[#182033] border border-[#1F283C] flex items-center justify-center text-[#8E84E4]">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#F1F3F7]">Invite to {currentGroup.name}</h3>
                  <p className="text-[11px] text-[#8D98AF]">Share invite link or scan QR code</p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 text-[#5E6980] hover:text-[#F1F3F7] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 py-2 bg-[#0A0E17] border border-[#1F283C] rounded-xl flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#CBD2E1] truncate">
                {buildGroupInviteUrl(currentGroup.inviteCode).replace(/^https?:\/\//, '')}
              </span>
              <span className="text-[10px] text-[#5E6980] shrink-0">Invite link</span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleNativeShare(currentGroup)}
                className="w-full py-2.5 px-3.5 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Invite Sheet</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyInviteLink(currentGroup)}
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

              <button
                type="button"
                onClick={() => setShowQrCode((prev) => !prev)}
                className="w-full py-2 px-3.5 bg-[#121724] hover:bg-[#182033] border border-[#1F283C] text-[#8D98AF] hover:text-[#F1F3F7] font-medium rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showQrCode ? 'Hide QR Code' : 'Show QR Code'}</span>
              </button>
            </div>

            {/* QR Code display */}
            {showQrCode && (
              <div className="p-3 bg-[#0A0E17] border border-[#1F283C] rounded-xl flex flex-col items-center justify-center space-y-1.5 text-center">
                <div className="w-32 h-32 bg-white p-2 rounded-lg flex items-center justify-center shadow-inner">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <rect x="5" y="5" width="28" height="28" fill="#0A0E17" rx="3" />
                    <rect x="10" y="10" width="18" height="18" fill="white" rx="2" />
                    <rect x="14" y="14" width="10" height="10" fill="#0A0E17" rx="1.5" />

                    <rect x="67" y="5" width="28" height="28" fill="#0A0E17" rx="3" />
                    <rect x="72" y="10" width="18" height="18" fill="white" rx="2" />
                    <rect x="76" y="14" width="10" height="10" fill="#0A0E17" rx="1.5" />

                    <rect x="5" y="67" width="28" height="28" fill="#0A0E17" rx="3" />
                    <rect x="10" y="72" width="18" height="18" fill="white" rx="2" />
                    <rect x="14" y="76" width="10" height="10" fill="#0A0E17" rx="1.5" />

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
                <p className="text-[10px] text-[#8D98AF]">
                  Scan to join <span className="text-[#F1F3F7]">{currentGroup.name}</span>
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-[#1F283C]">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="w-full py-2 bg-[#182033] hover:bg-[#1E273D] text-[#CBD2E1] font-medium text-xs rounded-xl border border-[#1F283C] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SET GROUP PICTURE MODAL
      ───────────────────────────────────────────────────────────── */}
      {showPhotoModal && currentGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center safe-modal-container sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#121724] border border-[#1F283C] w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#1F283C]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#8E84E4]/15 border border-[#8E84E4]/30 flex items-center justify-center text-[#8E84E4]">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#F1F3F7]">Set Group Picture</h3>
                  <p className="text-[11px] text-[#8D98AF] truncate max-w-[240px]">For {currentGroup.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="p-1.5 text-[#5E6980] hover:text-[#F1F3F7] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar Live Preview */}
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-[#182033] border-2 border-[#8E84E4] shadow-md flex items-center justify-center">
                {selectedPhotoUrl ? (
                  <img
                    src={selectedPhotoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#182033] flex items-center justify-center text-xl font-bold text-[#8E84E4]">
                    {getGroupInitials(currentGroup.name)}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-[#8D98AF]">
                {selectedPhotoUrl ? 'Selected group preview' : 'Default initials monogram'}
              </p>
            </div>

            {/* Curated Presets Grid */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-[#8D98AF] uppercase tracking-wider block">
                Choose from Presets
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_GROUP_PHOTOS.map((preset) => {
                  const isSelected = selectedPhotoUrl === preset.url;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSelectedPhotoUrl(preset.url);
                        setCustomPhotoInput('');
                      }}
                      className={`group relative flex flex-col items-center p-1 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#8E84E4] bg-[#8E84E4]/10 ring-1 ring-[#8E84E4]'
                          : 'border-[#1F283C] bg-[#182033] hover:border-[#8E84E4]/50'
                      }`}
                    >
                      <div className="w-full h-11 rounded-lg overflow-hidden relative">
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#8E84E4]/50 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-[#CBD2E1] mt-1 truncate w-full text-center">
                        {preset.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Upload & URL */}
            <div className="space-y-3 pt-2 border-t border-[#1F283C]/70">
              <label className="text-[11px] font-semibold text-[#8D98AF] uppercase tracking-wider block">
                Or Upload / Custom URL
              </label>

              <div className="flex items-center space-x-2">
                <label className="flex-1 py-2 px-3 bg-[#182033] hover:bg-[#1E273D] border border-[#1F283C] rounded-xl text-xs font-medium text-[#CBD2E1] hover:text-[#F1F3F7] flex items-center justify-center space-x-2 transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[#8E84E4]" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileUpload}
                    className="hidden"
                  />
                </label>

                {selectedPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPhotoUrl('');
                      setCustomPhotoInput('');
                    }}
                    className="py-2 px-3 bg-[#182033] hover:bg-[#251818] border border-[#1F283C] hover:border-red-500/40 text-[#8D98AF] hover:text-red-400 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                    title="Remove custom picture and use monogram"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-1.5">
                <input
                  type="url"
                  placeholder="Paste direct image URL (https://...)"
                  value={customPhotoInput}
                  onChange={(e) => setCustomPhotoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customPhotoInput.trim()) {
                      e.preventDefault();
                      setSelectedPhotoUrl(customPhotoInput.trim());
                    }
                  }}
                  className="flex-1 bg-[#0A0E17] border border-[#1F283C] rounded-xl px-3 py-1.5 text-xs text-[#F1F3F7] placeholder-[#5E6980] focus:outline-hidden focus:border-[#8E84E4]"
                />
                {customPhotoInput.trim() && (
                  <button
                    type="button"
                    onClick={() => setSelectedPhotoUrl(customPhotoInput.trim())}
                    className="px-2.5 py-1.5 bg-[#182033] text-[#8E84E4] border border-[#1F283C] rounded-xl text-xs font-medium hover:bg-[#1E273D] transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 pt-3 border-t border-[#1F283C]">
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="flex-1 py-2 bg-[#182033] hover:bg-[#1E273D] text-[#CBD2E1] font-medium text-xs rounded-xl border border-[#1F283C] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSavePhoto(selectedPhotoUrl)}
                className="flex-1 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] font-semibold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Save Picture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          GROUP MEMBERS BOTTOM SHEET MODAL
      ───────────────────────────────────────────────────────────── */}
      {showMembersModal && currentGroup && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center safe-top p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowMembersModal(false)}
        >
          <div
            className="bg-[#121724] border-t sm:border border-[#1F283C] w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 safe-sheet-bottom sm:pb-5 shadow-2xl space-y-3.5 max-h-[85vh] sm:max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile swipe handle bar */}
            <div className="w-10 h-1 bg-[#1F283C] rounded-full mx-auto -mt-2 mb-1 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1F283C] shrink-0">
              <div>
                <h3 className="font-bold text-base text-[#F1F3F7]">Members</h3>
                <p className="text-xs text-[#8D98AF] mt-0.5">
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="p-1.5 text-[#5E6980] hover:text-[#F1F3F7] rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Members List */}
            <div className="overflow-y-auto space-y-1 divide-y divide-[#1F283C]/40 pr-1 flex-1 min-h-[160px]">
              {currentGroup.members && currentGroup.members.length > 0 ? (
                currentGroup.members.map((member) => {
                  const isMe = member.id === currentUser?.id;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center space-x-3.5 py-3 first:pt-1 last:pb-1"
                    >
                      {/* 40–44px Member Profile Avatar */}
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shrink-0 bg-[#182033] border border-[#1F283C] flex items-center justify-center">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs sm:text-sm font-bold text-[#8E84E4]">
                            {member.name ? member.name.charAt(0) : '?'}
                          </span>
                        )}
                      </div>

                      {/* Member Names */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-semibold text-[#F1F3F7] truncate">
                            {member.name}
                          </p>
                          {isMe && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#8E84E4]/15 text-[#8E84E4] border border-[#8E84E4]/30">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-[#8D98AF]">
                  No members found
                </div>
              )}
            </div>

            {/* Done / Close footer */}
            <div className="pt-2 border-t border-[#1F283C] shrink-0">
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="w-full py-2.5 bg-[#182033] hover:bg-[#1E273D] text-[#CBD2E1] hover:text-[#F1F3F7] font-medium text-xs rounded-xl border border-[#1F283C] transition-colors cursor-pointer"
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
