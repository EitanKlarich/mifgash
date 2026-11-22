import React, { useState } from 'react';
import { Check, HelpCircle, X, ArrowRight, Vote, ChevronDown, ChevronUp, Calendar, AlertCircle } from 'lucide-react';
import { EventPlan, Poll, NotificationItem, User, Group } from '../types';
import { openNativeMaps } from '../utils/maps';
import { formatTimeRange } from '../utils/timeFormat';
import { getEventThemeArtwork } from '../utils/calendarArtwork';

interface HomeViewProps {
  events: EventPlan[];
  polls: Poll[];
  notifications: NotificationItem[];
  currentUser: User;
  groups: Group[];
  searchQuery: string;
  onSelectEvent: (event: EventPlan) => void;
  onRsvp: (eventId: string, status: string) => void;
  onVotePoll: (pollId: string, optionId: string) => void;
  onOpenCreatePoll: () => void;
  onSelectGroup: (groupId: string) => void;
  onConvertPollToEvent: (poll: Poll) => void;
  onOpenCreateGroup?: () => void;
  onOpenJoinGroup?: () => void;
  onOpenCreateEvent?: () => void;
  isPhoneFrame?: boolean;
}

interface DayGroup {
  dayHeading: string;
  dateSubtitle: string;
  isToday: boolean;
  events: EventPlan[];
}

export const HomeView: React.FC<HomeViewProps> = ({
  events,
  polls,
  currentUser,
  groups,
  searchQuery,
  onSelectEvent,
  onRsvp,
  onVotePoll,
  onConvertPollToEvent,
  onOpenCreateGroup,
  onOpenJoinGroup,
  onOpenCreateEvent,
  isPhoneFrame = false,
}) => {
  // Track which event has its RSVP selector dropdown/popup open
  const [activeRsvpPickerId, setActiveRsvpPickerId] = useState<string | null>(null);

  // Track expanded state for response items if there are more than 3
  const [showAllResponses, setShowAllResponses] = useState(false);

  // Search filtering
  const filteredEvents = events.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q) ||
      e.groupName.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q)
    );
  });

  const activePolls = polls.filter((p) => {
    if (p.isClosed) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.question.toLowerCase().includes(q) ||
      p.groupName.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  // Calculate pending items needing response from current user only
  const pendingEvents = filteredEvents.filter((e) => {
    const userRsvp = e.rsvps?.find((r) => r.userId === currentUser.id);
    const isUnanswered = !userRsvp || !userRsvp.status || userRsvp.status === 'Unanswered';
    return isUnanswered || e.isPendingInvite;
  });

  const unvotedPolls = activePolls.filter((p) => {
    return !p.options.some((opt) => opt.votes.includes(currentUser.id));
  });

  const totalPendingCount = pendingEvents.length + unvotedPolls.length;
  const hasItemsNeedingResponse = totalPendingCount > 0;

  // Limit display to top 3 items unless "View all" is expanded
  const maxInitialResponses = 3;
  const displayedPendingEvents = showAllResponses
    ? pendingEvents
    : pendingEvents.slice(0, maxInitialResponses);
  const remainingSlotsForPolls = Math.max(0, maxInitialResponses - displayedPendingEvents.length);
  const displayedUnvotedPolls = showAllResponses
    ? unvotedPolls
    : unvotedPolls.slice(0, remainingSlotsForPolls);

  // Format date helper
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

  // Group events chronologically by day
  const groupEventsByDay = (eventList: EventPlan[]): DayGroup[] => {
    const sorted = [...eventList].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    const groupsMap = new Map<string, { dayHeading: string; dateSubtitle: string; isToday: boolean; events: EventPlan[] }>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sorted.forEach((event) => {
      const dateKey = event.date || 'unknown';
      if (!groupsMap.has(dateKey)) {
        let dayHeading = dateKey;
        let dateSubtitle = '';
        let isToday = false;

        try {
          const parts = dateKey.split('-').map(Number);
          if (parts.length === 3) {
            const eventDate = new Date(parts[0], parts[1] - 1, parts[2]);
            eventDate.setHours(0, 0, 0, 0);
            const diffDays = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            const weekday = eventDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
            const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const dayNum = eventDate.getDate();
            dateSubtitle = `${month} ${dayNum}`;

            if (diffDays === 0) {
              dayHeading = 'TODAY';
              isToday = true;
            } else if (diffDays === 1) {
              dayHeading = 'TOMORROW';
            } else if (diffDays > 1 && diffDays < 7) {
              dayHeading = weekday;
            } else if (diffDays >= 7 && diffDays < 14) {
              dayHeading = `NEXT ${weekday}`;
            } else {
              dayHeading = weekday;
            }
          }
        } catch {
          dayHeading = dateKey;
        }

        groupsMap.set(dateKey, {
          dayHeading,
          dateSubtitle,
          isToday,
          events: [],
        });
      }

      groupsMap.get(dateKey)!.events.push(event);
    });

    return Array.from(groupsMap.values());
  };

  const dayGroups = groupEventsByDay(filteredEvents);

  const handleSelectRsvp = (eventId: string, status: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onRsvp(eventId, status);
    setActiveRsvpPickerId(null);
  };

  return (
    <div
      className={`w-full max-w-full min-w-0 ${isPhoneFrame ? 'pt-2 pb-24 space-y-6' : 'pt-3 pb-24 space-y-7'} text-[#F1F3F7]`}
      onClick={() => setActiveRsvpPickerId(null)}
    >
      {/* Search active indicator */}
      {searchQuery && (
        <div className="flex items-center justify-between text-xs text-[#8D98AF] bg-[#121724] px-3.5 py-2 rounded-xl border border-[#1F283C]">
          <span>
            Search results for <span className="text-[#F1F3F7] font-medium">"{searchQuery}"</span> ({filteredEvents.length} {filteredEvents.length === 1 ? 'plan' : 'plans'})
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. NEEDS YOUR RESPONSE — AT THE TOP (HIDDEN ENTIRELY WHEN EMPTY)         */}
      {/* ========================================================================= */}
      {hasItemsNeedingResponse && (
        <section className="w-full min-w-0 space-y-3 animate-in fade-in duration-200">
          {/* Section Heading */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold text-[#8E84E4] tracking-wider uppercase">
              Needs Your Response
            </h2>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-medium text-[#8D98AF]">
                {totalPendingCount} pending
              </span>
              {totalPendingCount > maxInitialResponses && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllResponses(!showAllResponses);
                  }}
                  className="text-[11px] text-[#8E84E4] hover:underline font-medium flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  <span>{showAllResponses ? 'Show less' : 'View all'}</span>
                  {showAllResponses ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Compact Response Cards List */}
          <div className="space-y-2.5 w-full min-w-0">
            {/* A. Pending Events Needing RSVP */}
            {displayedPendingEvents.map((event) => {
              const timeLabel = formatTimeRange(event.startTime, event.endTime);
              const dateLabel = formatEventDate(event.date, event.endDate);
              const isProposal = Boolean(event.isProposal);

              return (
                <div
                  key={`pending-event-${event.id}`}
                  onClick={() => onSelectEvent(event)}
                  className={`w-full min-w-0 bg-[#121724] hover:bg-[#182033]/60 p-3 sm:p-3.5 rounded-xl transition-all cursor-pointer shadow-xs space-y-2.5 active:scale-[0.99] ${
                    isProposal
                      ? 'border-2 border-dotted border-[#8E84E4]/70 hover:border-[#8E84E4]'
                      : 'border border-[#8E84E4]/35 hover:border-[#8E84E4]/60'
                  }`}
                >
                  {/* Top info row: Title, Group · Date/Time */}
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8E84E4] font-semibold uppercase tracking-wider">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span className="truncate">{event.groupName}</span>
                        <span className="text-[#5E6980]">·</span>
                        <span className="text-[#CBD2E1] font-normal truncate">{dateLabel}</span>
                        {isProposal && (
                          <span className="ml-auto text-[9px] font-semibold text-[#8E84E4] bg-[#8E84E4]/15 border border-[#8E84E4]/40 px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                            Proposed
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm sm:text-[15px] font-semibold text-[#F1F3F7] leading-snug tracking-tight mt-0.5 truncate">
                        {event.title}
                      </h4>
                      {timeLabel && (
                        <p className="text-[11px] text-[#8D98AF] mt-0.5 truncate">
                          {timeLabel} {event.location && event.location !== 'TBD' ? `· ${event.location}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Immediate RSVP Action Controls (Going / Maybe / Can't Go) */}
                  <div
                    className="pt-2 border-t border-[#1F283C]/70 flex items-center justify-between gap-2 min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[11px] text-[#8D98AF] font-medium shrink-0">
                      Respond:
                    </span>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleSelectRsvp(event.id, 'Going', e)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center space-x-1 bg-[#182033] border border-[#1F283C] text-[#8D98AF] hover:text-[#3EB88F] hover:border-[#3EB88F]/50 hover:bg-[#132B24]/60 transition-all cursor-pointer"
                        title="RSVP Going"
                      >
                        <Check className="w-3 h-3 stroke-2" />
                        <span>Going</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleSelectRsvp(event.id, 'Maybe', e)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center space-x-1 bg-[#182033] border border-[#1F283C] text-[#8D98AF] hover:text-[#D99E4A] hover:border-[#D99E4A]/50 hover:bg-[#2B2316]/60 transition-all cursor-pointer"
                        title="RSVP Maybe"
                      >
                        <HelpCircle className="w-3 h-3 stroke-2" />
                        <span>Maybe</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleSelectRsvp(event.id, "Can't Go", e)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center space-x-1 bg-[#182033] border border-[#1F283C] text-[#8D98AF] hover:text-[#D45D6D] hover:border-[#D45D6D]/50 hover:bg-[#2D1920]/60 transition-all cursor-pointer"
                        title="RSVP Can't Go"
                      >
                        <X className="w-3 h-3 stroke-2" />
                        <span className="hidden sm:inline">Can't Go</span>
                        <span className="sm:hidden">No</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* B. Unvoted Polls Needing Vote */}
            {displayedUnvotedPolls.map((poll) => {
              const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);

              return (
                <div
                  key={`pending-poll-${poll.id}`}
                  className="w-full min-w-0 bg-[#121724] p-3 sm:p-3.5 rounded-xl border border-[#8E84E4]/35 hover:border-[#8E84E4]/60 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8E84E4] font-semibold uppercase tracking-wider">
                        <Vote className="w-3 h-3 shrink-0" />
                        <span className="truncate">{poll.groupName}</span>
                        <span className="text-[#5E6980]">·</span>
                        <span className="text-[#CBD2E1] font-normal">Poll</span>
                      </div>
                      <h4 className="text-sm sm:text-[15px] font-semibold text-[#F1F3F7] leading-snug tracking-tight mt-0.5 truncate">
                        {poll.question}
                      </h4>
                    </div>
                  </div>

                  {/* Immediate 1-tap voting options */}
                  <div className="space-y-1.5 w-full min-w-0" onClick={(e) => e.stopPropagation()}>
                    {poll.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onVotePoll(poll.id, opt.id)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs bg-[#0A0E17] border border-[#1F283C] hover:border-[#8E84E4]/50 hover:bg-[#182033] text-[#F1F3F7] transition-all flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate">{opt.text}</span>
                        <span className="text-[10px] text-[#8E84E4] ml-2 shrink-0 font-medium bg-[#8E84E4]/10 px-1.5 py-0.5 rounded">
                          Vote →
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-0.5 flex items-center justify-between text-[11px] text-[#5E6980]">
                    <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} so far</span>
                    <button
                      type="button"
                      onClick={() => onConvertPollToEvent(poll)}
                      className="text-[#8E84E4] hover:underline flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    >
                      <span>Convert to Plan</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 2. UPCOMING PLANS / CHRONOLOGICAL SCHEDULE                                */}
      {/* ========================================================================= */}
      <section className="w-full min-w-0 space-y-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-bold text-[#8D98AF] tracking-wider uppercase">
            Upcoming
          </h2>
          <span className="text-[11px] text-[#5E6980]">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'plan' : 'plans'}
          </span>
        </div>

        {dayGroups.length === 0 ? (
          <div className="w-full bg-[#121724] py-10 px-6 rounded-2xl border border-[#1F283C]/70 text-center space-y-3">
            {groups.length === 0 ? (
              <>
                <p className="text-[#F1F3F7] text-sm font-semibold">Welcome to Mifgash</p>
                <p className="text-[#8D98AF] text-xs max-w-xs mx-auto leading-relaxed">
                  Create your first group or join one with an invite link to start planning together.
                </p>
                {(onOpenCreateGroup || onOpenJoinGroup) && (
                  <div className="flex items-center justify-center gap-2.5 pt-1">
                    {onOpenCreateGroup && (
                      <button
                        type="button"
                        onClick={onOpenCreateGroup}
                        className="px-4 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Create Group
                      </button>
                    )}
                    {onOpenJoinGroup && (
                      <button
                        type="button"
                        onClick={onOpenJoinGroup}
                        className="px-4 py-2 bg-[#182033] hover:bg-[#1E273D] text-[#CBD2E1] border border-[#1F283C] rounded-xl text-xs font-medium transition-colors cursor-pointer"
                      >
                        Join with Code
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-[#F1F3F7] text-sm font-semibold">Nothing planned yet</p>
                <p className="text-[#8D98AF] text-xs">Create your first plan or poll to get things on the calendar.</p>
                {onOpenCreateEvent && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={onOpenCreateEvent}
                      className="px-4 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Create Plan
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6 w-full min-w-0">
            {dayGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2.5 w-full min-w-0">
                {/* Day Header (e.g. TODAY · AUG 21 / SATURDAY · AUG 22) */}
                <div className="px-1 flex items-baseline space-x-1.5">
                  <h3 className={`text-xs font-bold tracking-wider uppercase ${group.isToday ? 'text-[#8E84E4]' : 'text-[#8D98AF]'}`}>
                    {group.dayHeading}
                  </h3>
                  {group.dateSubtitle && (
                    <span className="text-xs text-[#5E6980] font-medium">
                      · {group.dateSubtitle}
                    </span>
                  )}
                </div>

                {/* Events list for this day */}
                <div className="space-y-3 w-full min-w-0">
                  {group.events.map((event) => {
                    const rsvps = event.rsvps || [];
                    const goingAttendees = rsvps.filter((r) => r.status === 'Going');
                    const goingCount = goingAttendees.length;
                    const myRsvp = rsvps.find((r) => r.userId === currentUser.id)?.status;
                    const hasAnswered = myRsvp && myRsvp !== 'Unanswered';
                    const timeLabel = formatTimeRange(event.startTime, event.endTime);
                    const isMultiDay = event.endDate && event.endDate > event.date;
                    const isProposal = Boolean(event.isProposal);
                    const isPickerOpen = activeRsvpPickerId === event.id;

                    // Subtle background image artwork
                    const artwork = getEventThemeArtwork(event.title, event.description);

                    return (
                      <div
                        key={event.id}
                        onClick={() => onSelectEvent(event)}
                        className={`group relative w-full min-w-0 rounded-2xl bg-[#121724] hover:bg-[#182033]/70 active:scale-[0.99] transition-all cursor-pointer overflow-visible p-3.5 sm:p-4 space-y-2.5 shadow-xs ${
                          isProposal
                            ? 'border-2 border-dotted border-[#8E84E4]/70 hover:border-[#8E84E4]'
                            : 'border border-[#1F283C]/80 hover:border-[#8E84E4]/40'
                        }`}
                      >
                        {/* Subtle theme background imagery with dark overlay */}
                        <div
                          className="absolute inset-0 rounded-2xl bg-cover bg-center opacity-[0.09] pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.16] overflow-hidden"
                          style={{ backgroundImage: `url(${artwork.imageUrl})` }}
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#121724] via-[#121724]/95 to-[#121724]/80 pointer-events-none overflow-hidden" />

                        {/* Foreground Content */}
                        <div className="relative z-10 space-y-1.5 min-w-0">
                          {/* 1. EVENT NAME & PROPOSAL BADGE */}
                          <div className="min-w-0 pr-1 flex items-start justify-between gap-2">
                            <h4 className="text-[15px] sm:text-base font-semibold text-[#F1F3F7] leading-snug tracking-tight group-hover:text-white transition-colors truncate">
                              {event.title}
                            </h4>
                            {isProposal && (
                              <span className="shrink-0 text-[10px] font-semibold text-[#8E84E4] bg-[#8E84E4]/15 border border-[#8E84E4]/40 px-1.5 py-0.5 rounded-md tracking-wide uppercase">
                                Proposed
                              </span>
                            )}
                          </div>

                          {/* 2. TIME · GROUP */}
                          <div className="text-xs text-[#8D98AF] flex items-center gap-1.5 flex-wrap min-w-0 font-normal">
                            <span className="text-[#CBD2E1] font-medium">{timeLabel}</span>
                            {isMultiDay && (
                              <span className="text-[#8E84E4] text-[11px] font-medium">
                                ({formatEventDate(event.date, event.endDate)})
                              </span>
                            )}
                            <span className="text-[#5E6980]">·</span>
                            <span className="truncate">{event.groupName}</span>
                          </div>

                          {/* 3. LOCATION */}
                          <div className="text-xs text-[#8D98AF] flex items-center gap-1.5 min-w-0">
                            <span className="text-[#5E6980] text-xs shrink-0 select-none">⌖</span>
                            <span
                              onClick={(e) => {
                                if (event.location && event.location !== 'TBD') {
                                  e.stopPropagation();
                                  openNativeMaps(event.location, e);
                                }
                              }}
                              className={`truncate font-normal ${
                                event.location && event.location !== 'TBD'
                                  ? 'hover:text-[#8E84E4] transition-colors cursor-pointer'
                                  : 'text-[#5E6980]'
                              }`}
                              title={event.location || 'Location TBD'}
                            >
                              {event.location && event.location !== 'TBD' ? event.location : 'Location TBD'}
                            </span>
                          </div>
                        </div>

                        {/* 4. RSVP CONTROLS & ATTENDEES */}
                        <div className="relative z-10 pt-2 border-t border-[#1F283C]/60 flex items-center justify-between gap-3 min-w-0">
                          {/* Left: RSVP Choices (visible when unanswered) OR Single compact status (once picked) */}
                          <div className="relative flex items-center min-w-0" onClick={(e) => e.stopPropagation()}>
                            {!hasAnswered ? (
                              /* Unanswered: Direct 3 choices: Going / Maybe / No */
                              <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleSelectRsvp(event.id, 'Going', e)}
                                  className="px-2 py-1 rounded-lg text-xs font-medium inline-flex items-center space-x-1 bg-[#182033]/70 border border-[#1F283C] text-[#8D98AF] hover:text-[#3EB88F] hover:border-[#3EB88F]/40 hover:bg-[#132B24]/50 transition-all cursor-pointer"
                                  title="RSVP Going"
                                >
                                  <Check className="w-3 h-3 stroke-2" />
                                  <span>Going</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleSelectRsvp(event.id, 'Maybe', e)}
                                  className="px-2 py-1 rounded-lg text-xs font-medium inline-flex items-center space-x-1 bg-[#182033]/70 border border-[#1F283C] text-[#8D98AF] hover:text-[#D99E4A] hover:border-[#D99E4A]/40 hover:bg-[#2B2316]/50 transition-all cursor-pointer"
                                  title="RSVP Maybe"
                                >
                                  <HelpCircle className="w-3 h-3 stroke-2" />
                                  <span>Maybe</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleSelectRsvp(event.id, "Can't Go", e)}
                                  className="px-2 py-1 rounded-lg text-xs font-medium inline-flex items-center space-x-1 bg-[#182033]/70 border border-[#1F283C] text-[#8D98AF] hover:text-[#D45D6D] hover:border-[#D45D6D]/40 hover:bg-[#2D1920]/50 transition-all cursor-pointer"
                                  title="RSVP Can't Go"
                                >
                                  <X className="w-3 h-3 stroke-2" />
                                  <span className="hidden sm:inline">Can't Go</span>
                                  <span className="sm:hidden">No</span>
                                </button>
                              </div>
                            ) : (
                              /* Answered: Single compact state badge with tap-to-change popover */
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveRsvpPickerId(isPickerOpen ? null : event.id);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center space-x-1.5 transition-all cursor-pointer border ${
                                    myRsvp === 'Going'
                                      ? 'bg-[#132B24] border-[#3EB88F]/40 text-[#3EB88F] hover:bg-[#18362D]'
                                      : myRsvp === 'Maybe'
                                      ? 'bg-[#2B2316] border-[#D99E4A]/40 text-[#D99E4A] hover:bg-[#382E1D]'
                                      : 'bg-[#2D1920] border-[#D45D6D]/40 text-[#D45D6D] hover:bg-[#3B212A]'
                                  }`}
                                  title="Tap to change RSVP"
                                >
                                  {myRsvp === 'Going' ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>Going</span>
                                    </>
                                  ) : myRsvp === 'Maybe' ? (
                                    <>
                                      <HelpCircle className="w-3.5 h-3.5 stroke-[2]" />
                                      <span>Maybe</span>
                                    </>
                                  ) : (
                                    <>
                                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>Can't Go</span>
                                    </>
                                  )}
                                  <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                                </button>

                                {/* Popover selector to change your answer if needed */}
                                {isPickerOpen && (
                                  <div className="absolute left-0 bottom-full mb-1.5 w-36 bg-[#182033] border border-[#1F283C] rounded-xl shadow-2xl p-1 z-40 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                      type="button"
                                      onClick={(e) => handleSelectRsvp(event.id, 'Going', e)}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
                                        myRsvp === 'Going'
                                          ? 'bg-[#132B24] text-[#3EB88F]'
                                          : 'text-[#F1F3F7] hover:bg-[#1E273D] hover:text-[#3EB88F]'
                                      }`}
                                    >
                                      <Check className="w-3 h-3 stroke-[2.5]" />
                                      <span>Going</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleSelectRsvp(event.id, 'Maybe', e)}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
                                        myRsvp === 'Maybe'
                                          ? 'bg-[#2B2316] text-[#D99E4A]'
                                          : 'text-[#F1F3F7] hover:bg-[#1E273D] hover:text-[#D99E4A]'
                                      }`}
                                    >
                                      <HelpCircle className="w-3 h-3 stroke-[2]" />
                                      <span>Maybe</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleSelectRsvp(event.id, "Can't Go", e)}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
                                        myRsvp === "Can't Go"
                                          ? 'bg-[#2D1920] text-[#D45D6D]'
                                          : 'text-[#F1F3F7] hover:bg-[#1E273D] hover:text-[#D45D6D]'
                                      }`}
                                    >
                                      <X className="w-3 h-3 stroke-[2.5]" />
                                      <span>Can't Go</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right: Small Subtle Avatars & Count */}
                          <div className="flex items-center space-x-1.5 shrink-0 ml-auto">
                            {goingAttendees.length > 0 && (
                              <div className="flex -space-x-1 overflow-hidden shrink-0">
                                {goingAttendees.slice(0, 2).map((attendee, idx) => (
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
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
