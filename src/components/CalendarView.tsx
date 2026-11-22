import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Filter,
  Users,
  Plus,
  Calendar as CalendarIcon,
  Check,
  HelpCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { EventPlan, Group, User } from '../types';
import { openNativeMaps } from '../utils/maps';
import { formatTimeRange } from '../utils/timeFormat';
import {
  expandEventOccurrences,
  parseDateOnly,
  formatDateToIso,
  DayOccurrence,
  getEventThemeArtwork,
  getMonthBanner,
} from '../utils/calendarArtwork';

interface CalendarViewProps {
  events: EventPlan[];
  groups: Group[];
  currentUser: User;
  onSelectEvent: (event: EventPlan) => void;
  onOpenCreateEvent: () => void;
  isPhoneFrame?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  groups,
  currentUser,
  onSelectEvent,
  onOpenCreateEvent,
  isPhoneFrame = false,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  // Default to Google Calendar style rolling Schedule view
  const [calendarViewMode, setCalendarViewMode] = useState<'schedule' | 'week' | 'month'>('schedule');

  // Week offset (0 = current week)
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => (new Date().getDay() + 6) % 7);

  // Month date state for Month Grid View
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Filter events by group
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedGroupId === 'all') return true;
      return e.groupId === selectedGroupId;
    });
  }, [events, selectedGroupId]);

  // Expanded multi-day occurrences map: dateStr (YYYY-MM-DD) -> DayOccurrence[]
  const dateToOccurrences = useMemo(() => {
    return expandEventOccurrences(filteredEvents);
  }, [filteredEvents]);

  // Helper to calculate the 7 days of the currently selected week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const base = new Date();
    const currentDayOfWeek = base.getDay();
    const distanceToMon = (currentDayOfWeek + 6) % 7;
    const monday = new Date(base);
    monday.setDate(base.getDate() - distanceToMon + currentWeekOffset * 7);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentWeekOffset]);

  const startOfWeek = weekDays[0];
  const endOfWeek = weekDays[6];
  const weekHeaderLabel = `${startOfWeek.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} – ${endOfWeek.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;

  const todayIso = formatDateToIso(new Date());
  const activeSelectedDay = weekDays[selectedDayIndex] || weekDays[0];
  const activeSelectedDayIso = formatDateToIso(activeSelectedDay);
  const activeSelectedDayOccurrences = dateToOccurrences[activeSelectedDayIso] || [];

  // Helper to check user RSVP status for an event
  const getEventRsvpStatus = (event: EventPlan) => {
    const userRsvp = event.rsvps?.find((r) => r.userId === currentUser.id);
    const isPending =
      event.isPendingInvite ||
      event.isProposal ||
      !userRsvp ||
      userRsvp.status === 'Invited' ||
      userRsvp.status === 'Needs Response';

    return {
      status: userRsvp?.status || (isPending ? 'Needs Response' : 'Going'),
      isPending,
    };
  };

  // Month Grid Data Calculation
  const monthGridData = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const daysInMonth = lastDayOfMonth.getDate();

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevDays = [];
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      prevDays.push({
        date: d,
        iso: formatDateToIso(d),
        dayNum: d.getDate(),
        isCurrentMonth: false,
      });
    }

    const currentDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      currentDays.push({
        date: d,
        iso: formatDateToIso(d),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    const totalFilled = prevDays.length + currentDays.length;
    const remaining = (7 - (totalFilled % 7)) % 7;
    const nextDays = [];
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      nextDays.push({
        date: d,
        iso: formatDateToIso(d),
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return [...prevDays, ...currentDays, ...nextDays];
  }, [currentMonthDate]);

  // Sorted unique date keys for schedule view
  const sortedScheduleDates = useMemo(() => {
    const dates = Object.keys(dateToOccurrences);
    return dates.sort();
  }, [dateToOccurrences]);

  // Group sorted schedule dates by month for Google Calendar style month banners
  const scheduleMonthGroups = useMemo(() => {
    const groups: { monthKey: string; monthDate: Date; dates: string[] }[] = [];
    let currentGroup: { monthKey: string; monthDate: Date; dates: string[] } | null = null;

    sortedScheduleDates.forEach((dateStr) => {
      const d = parseDateOnly(dateStr);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      if (!currentGroup || currentGroup.monthKey !== monthKey) {
        currentGroup = {
          monthKey,
          monthDate: new Date(d.getFullYear(), d.getMonth(), 1),
          dates: [],
        };
        groups.push(currentGroup);
      }
      currentGroup.dates.push(dateStr);
    });

    return groups;
  }, [sortedScheduleDates]);

  return (
    <div className={`space-y-4 mt-1 relative ${isPhoneFrame ? 'pb-20' : 'pb-24'} text-[#F1F3F7]`}>
      {/* Top Header / View Controls */}
      <div className="bg-[#121724] p-2.5 sm:p-3 rounded-2xl border border-[#1F283C] flex items-center justify-between gap-2 shadow-xs">
        {/* View Mode Switcher */}
        <div className="flex items-center bg-[#0A0E17] p-0.5 rounded-xl border border-[#1F283C]">
          <button
            type="button"
            onClick={() => setCalendarViewMode('schedule')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              calendarViewMode === 'schedule'
                ? 'bg-[#182033] text-[#F1F3F7]'
                : 'text-[#8D98AF] hover:text-[#F1F3F7]'
            }`}
          >
            Schedule
          </button>
          <button
            type="button"
            onClick={() => setCalendarViewMode('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              calendarViewMode === 'week'
                ? 'bg-[#182033] text-[#F1F3F7]'
                : 'text-[#8D98AF] hover:text-[#F1F3F7]'
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setCalendarViewMode('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              calendarViewMode === 'month'
                ? 'bg-[#182033] text-[#F1F3F7]'
                : 'text-[#8D98AF] hover:text-[#F1F3F7]'
            }`}
          >
            Month
          </button>
        </div>

        {/* Right Navigation & Filter */}
        <div className="flex items-center space-x-2">
          {/* Week Mode Nav */}
          {calendarViewMode === 'week' && (
            <div className="flex items-center space-x-1 bg-[#0A0E17] p-0.5 rounded-xl border border-[#1F283C]">
              <button
                type="button"
                onClick={() => setCurrentWeekOffset((p) => p - 1)}
                className="p-1.5 hover:bg-[#182033] rounded-lg text-[#8D98AF] hover:text-[#F1F3F7] transition-colors"
                title="Previous Week"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentWeekOffset(0);
                  setSelectedDayIndex(0);
                }}
                className="px-2 py-1 text-xs font-medium text-[#CBD2E1] hover:text-[#FFFFFF]"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setCurrentWeekOffset((p) => p + 1)}
                className="p-1.5 hover:bg-[#182033] rounded-lg text-[#8D98AF] hover:text-[#F1F3F7] transition-colors"
                title="Next Week"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Month Mode Nav */}
          {calendarViewMode === 'month' && (
            <div className="flex items-center space-x-1 bg-[#0A0E17] p-0.5 rounded-xl border border-[#1F283C]">
              <button
                type="button"
                onClick={() =>
                  setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                className="p-1.5 hover:bg-[#182033] rounded-lg text-[#8D98AF] hover:text-[#F1F3F7] transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
                className="px-2 py-1 text-xs font-medium text-[#CBD2E1]"
              >
                {currentMonthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                className="p-1.5 hover:bg-[#182033] rounded-lg text-[#8D98AF] hover:text-[#F1F3F7] transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Group Filter */}
          <div
            className="relative flex items-center justify-center bg-[#0A0E17] hover:bg-[#182033] p-2 rounded-xl border border-[#1F283C] shrink-0 transition-colors cursor-pointer"
            title={`Filter: ${selectedGroupId === 'all' ? 'All Groups' : groups.find((g) => g.id === selectedGroupId)?.name || 'Selected'}`}
          >
            <Filter className="w-3.5 h-3.5 text-[#8D98AF]" />
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              aria-label="Filter groups"
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              <option value="all" className="bg-[#121724] text-[#F1F3F7]">
                All Groups
              </option>
              {groups.map((g) => (
                <option key={g.id} value={g.id} className="bg-[#121724] text-[#F1F3F7]">
                  {g.name}
                </option>
              ))}
            </select>
            {selectedGroupId !== 'all' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#8E84E4] ring-2 ring-[#121724]" />
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. GOOGLE CALENDAR STYLE ROLLING SCHEDULE VIEW (With Month Banners & Artwork) */}
      {/* ========================================================================= */}
      {calendarViewMode === 'schedule' && (
        <div className="space-y-6">
          {scheduleMonthGroups.length === 0 ? (
            <div className="bg-[#121724] rounded-2xl p-10 border border-[#1F283C] text-center">
              <CalendarIcon className="w-8 h-8 text-[#8E84E4] mx-auto mb-2 opacity-60" />
              <p className="text-sm text-[#F1F3F7] font-semibold">No scheduled events found.</p>
              <p className="text-xs text-[#8D98AF] mt-1">Create a plan or change your group filter.</p>
              <button
                type="button"
                onClick={onOpenCreateEvent}
                className="mt-3 px-4 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] text-xs font-medium rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule a Plan</span>
              </button>
            </div>
          ) : (
            scheduleMonthGroups.map((monthGroup) => {
              const monthBanner = getMonthBanner(monthGroup.monthDate);

              return (
                <div key={monthGroup.monthKey} className="space-y-3">
                  {/* Google Calendar Style Illustrated Month Banner */}
                  <div className="relative h-28 sm:h-36 rounded-2xl overflow-hidden border border-[#1F283C] shadow-md group">
                    <img
                      src={monthBanner.bannerImage}
                      alt={monthBanner.monthName}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E17] via-[#0A0E17]/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E17]/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-[#8E84E4] uppercase tracking-wider block">
                          {monthBanner.year}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold text-[#F1F3F7] leading-tight tracking-tight">
                          {monthBanner.monthName}
                        </h3>
                        <p className="text-xs text-[#CBD2E1] font-normal hidden sm:block mt-0.5">
                          {monthBanner.tagline}
                        </p>
                      </div>
                      <button
                        onClick={onOpenCreateEvent}
                        className="px-3 py-1.5 bg-[#8E84E4]/90 hover:bg-[#8E84E4] text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1 shadow-sm backdrop-blur-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Event</span>
                      </button>
                    </div>
                  </div>

                  {/* Day-by-Day Agenda List within this Month */}
                  <div className="space-y-3 pt-1">
                    {monthGroup.dates.map((dateStr) => {
                      const dateObj = parseDateOnly(dateStr);
                      const isToday = dateStr === todayIso;
                      const weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayNum = dateObj.getDate();
                      const dayItems = dateToOccurrences[dateStr] || [];

                      return (
                        <div key={dateStr} className="flex items-start gap-3 sm:gap-4">
                          {/* Left Date Column */}
                          <div className="w-11 sm:w-14 shrink-0 text-center pt-2">
                            <span
                              className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider block ${
                                isToday ? 'text-[#8E84E4]' : 'text-[#8D98AF]'
                              }`}
                            >
                              {weekdayName}
                            </span>
                            <div
                              className={`w-8 h-8 sm:w-9 sm:h-9 mx-auto flex items-center justify-center rounded-full text-sm sm:text-base font-bold mt-0.5 ${
                                isToday
                                  ? 'bg-[#8E84E4] text-[#F1F3F7] shadow-sm'
                                  : 'text-[#F1F3F7] bg-[#121724] border border-[#1F283C]'
                              }`}
                            >
                              {dayNum}
                            </div>
                          </div>

                          {/* Right Event Cards Stack */}
                          <div className="flex-1 space-y-2.5 min-w-0">
                            {dayItems.map((occ, occIdx) => {
                              const ev = occ.event;
                              const { status, isPending } = getEventRsvpStatus(ev);
                              const goingAttendees = (ev.rsvps || []).filter((r: { status: string }) => r.status === 'Going');
                              const goingCount = goingAttendees.length;
                              const artwork = getEventThemeArtwork(ev.title, ev.description, ev.coverImage);
                              const isMultiDay = occ.totalDays > 1;

                              return (
                                <div
                                  key={occIdx}
                                  onClick={() => onSelectEvent(ev)}
                                  className={`rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 group hover:shadow-lg ${
                                    isPending
                                      ? 'bg-[#121724] border-dashed border-[#8E84E4]/50 hover:border-[#8E84E4]'
                                      : 'bg-[#121724] border-[#1F283C] hover:border-[#8E84E4]/40 hover:bg-[#141A29]'
                                  }`}
                                >
                                  {/* Event Image Banner / Artwork Preview */}
                                  <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-[#182033]">
                                    <img
                                      src={artwork.imageUrl}
                                      alt={ev.title}
                                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#121724] via-[#121724]/40 to-transparent" />

                                    {/* Multi-day badge or Invited badge (Top-Right/Top-Left) */}
                                    <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between">
                                      {isMultiDay ? (
                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-black/60 backdrop-blur-md text-[#CBD2E1] border border-white/10 shadow-xs">
                                          Day {occ.dayNumber} of {occ.totalDays}
                                        </span>
                                      ) : <div />}

                                      {isPending && (
                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#8E84E4]/90 text-white shadow-xs backdrop-blur-xs">
                                          Invited
                                        </span>
                                      )}
                                    </div>

                                    {/* Group & Time overlaid on image bottom */}
                                    <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between text-xs text-[#F1F3F7]">
                                      <span className="font-semibold text-xs text-white drop-shadow-sm truncate max-w-[60%]">
                                        {ev.groupName}
                                      </span>
                                      <span className="text-[11px] text-[#CBD2E1] drop-shadow-sm font-medium">
                                        {formatTimeRange(ev.startTime, ev.endTime)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Card Body Content */}
                                  <div className="p-3.5 space-y-2">
                                    <h4 className="font-semibold text-sm sm:text-base text-[#F1F3F7] leading-snug group-hover:text-[#8E84E4] transition-colors">
                                      {ev.title}
                                    </h4>

                                    {ev.description && (
                                      <p className="text-xs text-[#8D98AF] line-clamp-1 font-normal">
                                        {ev.description}
                                      </p>
                                    )}

                                    {ev.location && ev.location !== 'TBD' && (
                                      <p
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openNativeMaps(ev.location, e);
                                        }}
                                        className="text-xs text-[#8D98AF] hover:text-[#8E84E4] flex items-center gap-1.5 truncate cursor-pointer"
                                        title="Open in Maps"
                                      >
                                        <MapPin className="w-3.5 h-3.5 text-[#5E6980] shrink-0" />
                                        <span className="truncate">{ev.location}</span>
                                      </p>
                                    )}

                                    {/* Footer RSVP status + Right-Aligned Attendees */}
                                    <div className="pt-2 border-t border-[#1F283C] flex items-center justify-between gap-2 text-xs">
                                      <div>
                                        {isPending ? (
                                          <span className="text-[#8E84E4] font-medium flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            <span>Respond</span>
                                          </span>
                                        ) : status === 'Going' ? (
                                          <span className="text-[#3EB88F] font-medium flex items-center gap-1">
                                            <Check className="w-3 h-3 stroke-[2.5]" />
                                            <span>Going</span>
                                          </span>
                                        ) : status === 'Maybe' ? (
                                          <span className="text-[#D99E4A] font-medium flex items-center gap-1">
                                            <HelpCircle className="w-3 h-3 stroke-[2]" />
                                            <span>Maybe</span>
                                          </span>
                                        ) : (
                                          <span className="text-[#D45D6D] font-medium flex items-center gap-1">
                                            <XCircle className="w-3 h-3" />
                                            <span>Can't go</span>
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center space-x-2 shrink-0">
                                        {goingAttendees.length > 0 && (
                                          <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                            {goingAttendees.slice(0, 3).map((a: { userAvatar: string; userName: string }, i: number) => (
                                              <img
                                                key={i}
                                                src={a.userAvatar}
                                                alt={a.userName}
                                                className="w-5 h-5 rounded-full ring-1.5 ring-[#121724] object-cover"
                                                title={a.userName}
                                              />
                                            ))}
                                          </div>
                                        )}
                                        <span className="text-xs text-[#8D98AF] font-normal">
                                          {goingCount} going
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. WEEKLY VIEW (7-Day Grid with Event Artwork & Thumbnails) */}
      {/* ========================================================================= */}
      {calendarViewMode === 'week' && (
        <div className="space-y-4">
          {/* Week Range Label */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-[#8D98AF] tracking-wide uppercase">
              {weekHeaderLabel}
            </span>
            <button
              onClick={onOpenCreateEvent}
              className="text-xs text-[#8E84E4] hover:underline font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Plan</span>
            </button>
          </div>

          {/* Desktop/Tablet 7-Day Weekly Grid View */}
          <div className="hidden md:grid grid-cols-7 gap-2.5">
            {weekDays.map((dayDate, dayIdx) => {
              const iso = formatDateToIso(dayDate);
              const occurrences = dateToOccurrences[iso] || [];
              const isToday = iso === todayIso;
              const weekdayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = dayDate.getDate();

              return (
                <div
                  key={dayIdx}
                  className={`rounded-2xl border p-2 flex flex-col min-h-[400px] transition-all ${
                    isToday
                      ? 'bg-[#121724] border-[#8E84E4]/50'
                      : 'bg-[#121724]/90 border-[#1F283C]'
                  }`}
                >
                  {/* Day Column Header */}
                  <div className="pb-2 mb-2 border-b border-[#1F283C] text-center">
                    <span
                      className={`text-[11px] font-medium uppercase tracking-wider block ${
                        isToday ? 'text-[#8E84E4] font-semibold' : 'text-[#5E6980]'
                      }`}
                    >
                      {weekdayName}
                    </span>
                    <div
                      className={`w-7 h-7 mx-auto flex items-center justify-center rounded-full text-sm font-semibold mt-0.5 ${
                        isToday ? 'bg-[#8E84E4] text-[#F1F3F7]' : 'text-[#F1F3F7]'
                      }`}
                    >
                      {dayNum}
                    </div>
                  </div>

                  {/* Events for this day */}
                  <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                    {occurrences.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center py-6">
                        <span className="text-[11px] text-[#5E6980]">No plans</span>
                      </div>
                    ) : (
                      occurrences.map((occ, occIdx) => {
                        const ev = occ.event;
                        const { status, isPending } = getEventRsvpStatus(ev);
                        const goingAttendees = (ev.rsvps || []).filter((r: { status: string }) => r.status === 'Going');
                        const goingCount = goingAttendees.length;
                        const artwork = getEventThemeArtwork(ev.title, ev.description, ev.coverImage);

                        return (
                          <div
                            key={occIdx}
                            onClick={() => onSelectEvent(ev)}
                            className={`rounded-xl border overflow-hidden text-left cursor-pointer transition-all ${
                              isPending
                                ? 'bg-[#182033]/40 border-dashed border-[#8E84E4]/50 hover:border-[#8E84E4]'
                                : 'bg-[#182033] border-[#1F283C] hover:border-[#8E84E4]/40'
                            }`}
                          >
                            {/* Artwork Image Strip */}
                            <div className="relative h-14 w-full overflow-hidden bg-[#101522]">
                              <img
                                src={artwork.imageUrl}
                                alt={ev.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#182033] via-transparent to-transparent" />
                            </div>

                            <div className="p-2 space-y-1">
                              {/* Time & Group */}
                              <div className="flex items-center justify-between text-[10px] text-[#8D98AF]">
                                <span className="truncate">{formatTimeRange(ev.startTime, ev.endTime)}</span>
                              </div>

                              {/* Title */}
                              <h4 className="font-semibold text-xs text-[#F1F3F7] leading-snug line-clamp-2">
                                {ev.title}
                              </h4>

                              {/* Group Tag */}
                              <p className="text-[10px] text-[#8D98AF] truncate">{ev.groupName}</p>

                              {/* Location */}
                              {ev.location && ev.location !== 'TBD' && (
                                <p className="text-[10px] text-[#5E6980] truncate flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5 text-[#5E6980] shrink-0" />
                                  <span className="truncate">{ev.location}</span>
                                </p>
                              )}

                              {/* RSVP & Attendee Avatars Stack on the right */}
                              <div className="pt-1.5 border-t border-[#1F283C]/70 flex items-center justify-between text-[10px]">
                                {isPending ? (
                                  <span className="text-[#8E84E4] flex items-center gap-0.5 font-medium">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    <span>Respond</span>
                                  </span>
                                ) : status === 'Going' ? (
                                  <span className="text-[#3EB88F] flex items-center gap-0.5 font-medium">
                                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                                    <span>Going</span>
                                  </span>
                                ) : status === 'Maybe' ? (
                                  <span className="text-[#D99E4A] flex items-center gap-0.5 font-medium">
                                    <HelpCircle className="w-2.5 h-2.5" />
                                    <span>Maybe</span>
                                  </span>
                                ) : (
                                  <span className="text-[#D45D6D] flex items-center gap-0.5 font-medium">
                                    <XCircle className="w-2.5 h-2.5" />
                                    <span>Can't go</span>
                                  </span>
                                )}

                                <div className="flex items-center space-x-1 shrink-0">
                                  {goingAttendees.length > 0 && (
                                    <div className="flex -space-x-1 overflow-hidden shrink-0">
                                      {goingAttendees.slice(0, 3).map((a: { userAvatar: string; userName: string }, i: number) => (
                                        <img
                                          key={i}
                                          src={a.userAvatar}
                                          alt={a.userName}
                                          className="w-3.5 h-3.5 rounded-full ring-1 ring-[#182033] object-cover"
                                          title={a.userName}
                                        />
                                      ))}
                                    </div>
                                  )}
                                  <span className="text-[#8D98AF] text-[10px]">{goingCount} going</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile / Phone Frame Weekly View: 7-Day Day Selector + Focused Day Schedule */}
          <div className="md:hidden space-y-3">
            {/* 7-Day Strip */}
            <div className="grid grid-cols-7 gap-1 bg-[#121724] p-1.5 rounded-2xl border border-[#1F283C]">
              {weekDays.map((dayDate, idx) => {
                const isSelected = selectedDayIndex === idx;
                const iso = formatDateToIso(dayDate);
                const isToday = iso === todayIso;
                const dayLetter = dayDate.toLocaleDateString('en-US', { weekday: 'narrow' });
                const dayNum = dayDate.getDate();
                const hasEvents = (dateToOccurrences[iso] || []).length > 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all relative ${
                      isSelected
                        ? 'bg-[#8E84E4] text-[#F1F3F7]'
                        : isToday
                        ? 'bg-[#182033] text-[#8E84E4] border border-[#8E84E4]/40'
                        : 'text-[#8D98AF] hover:bg-[#182033]'
                    }`}
                  >
                    <span className="text-[10px] font-medium uppercase">{dayLetter}</span>
                    <span className="text-xs font-semibold mt-0.5">{dayNum}</span>
                    {hasEvents && (
                      <span
                        className={`w-1 h-1 rounded-full mt-1 ${
                          isSelected ? 'bg-white' : 'bg-[#8E84E4]'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Day Event List */}
            <div className="bg-[#121724] rounded-2xl border border-[#1F283C] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1F283C] pb-2">
                <span className="text-xs font-semibold text-[#F1F3F7]">
                  {activeSelectedDay.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="text-xs text-[#8D98AF]">
                  {activeSelectedDayOccurrences.length}{' '}
                  {activeSelectedDayOccurrences.length === 1 ? 'plan' : 'plans'}
                </span>
              </div>

              {activeSelectedDayOccurrences.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-[#8D98AF]">No plans scheduled for this day.</p>
                  <button
                    type="button"
                    onClick={onOpenCreateEvent}
                    className="mt-2 text-xs text-[#8E84E4] hover:underline font-medium"
                  >
                    + Schedule a plan
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeSelectedDayOccurrences.map((occ, occIdx) => {
                    const ev = occ.event;
                    const { status, isPending } = getEventRsvpStatus(ev);
                    const goingAttendees = (ev.rsvps || []).filter((r: { status: string }) => r.status === 'Going');
                    const goingCount = goingAttendees.length;
                    const artwork = getEventThemeArtwork(ev.title, ev.description, ev.coverImage);

                    return (
                      <div
                        key={occIdx}
                        onClick={() => onSelectEvent(ev)}
                        className={`rounded-xl border overflow-hidden text-left cursor-pointer transition-all space-y-2 ${
                          isPending
                            ? 'bg-[#182033]/50 border-dashed border-[#8E84E4]/50 hover:border-[#8E84E4]'
                            : 'bg-[#182033] border-[#1F283C] hover:border-[#8E84E4]/40'
                        }`}
                      >
                        <div className="relative h-20 w-full overflow-hidden bg-[#101522]">
                          <img
                            src={artwork.imageUrl}
                            alt={ev.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#182033] via-transparent to-transparent" />
                        </div>

                        <div className="p-3 pt-0 space-y-2">
                          <div className="flex items-center justify-between text-xs text-[#8D98AF]">
                            <span className="font-medium text-[#CBD2E1]">{ev.groupName}</span>
                            <span>{formatTimeRange(ev.startTime, ev.endTime)}</span>
                          </div>

                          <h4 className="font-semibold text-[#F1F3F7] text-sm leading-snug">
                            {ev.title}
                          </h4>

                          {ev.location && (
                            <p
                              onClick={(e) => {
                                e.stopPropagation();
                                openNativeMaps(ev.location, e);
                              }}
                              className="text-xs text-[#8D98AF] hover:text-[#8E84E4] flex items-center gap-1.5 truncate cursor-pointer"
                            >
                              <MapPin className="w-3.5 h-3.5 text-[#5E6980] shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </p>
                          )}

                          <div className="pt-2 border-t border-[#1F283C] flex items-center justify-between text-xs">
                            {isPending ? (
                              <span className="text-[#8E84E4] flex items-center gap-1 font-medium text-xs">
                                <AlertCircle className="w-3 h-3" />
                                <span>Awaiting response</span>
                              </span>
                            ) : status === 'Going' ? (
                              <span className="text-[#3EB88F] flex items-center gap-1 font-medium">
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                <span>Going</span>
                              </span>
                            ) : status === 'Maybe' ? (
                              <span className="text-[#D99E4A] flex items-center gap-1 font-medium">
                                <HelpCircle className="w-3 h-3" />
                                <span>Maybe</span>
                              </span>
                            ) : (
                              <span className="text-[#D45D6D] flex items-center gap-1 font-medium">
                                <XCircle className="w-3 h-3" />
                                <span>Can't go</span>
                              </span>
                            )}

                            <div className="flex items-center space-x-1.5 shrink-0">
                              {goingAttendees.length > 0 && (
                                <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                  {goingAttendees.slice(0, 3).map((a: { userAvatar: string; userName: string }, i: number) => (
                                    <img
                                      key={i}
                                      src={a.userAvatar}
                                      alt={a.userName}
                                      className="w-5 h-5 rounded-full ring-1.5 ring-[#182033] object-cover"
                                      title={a.userName}
                                    />
                                  ))}
                                </div>
                              )}
                              <span className="text-xs text-[#8D98AF] font-normal">
                                {goingCount} going
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MONTH VIEW (7-Column Monthly Grid with Google Calendar Month Banner) */}
      {/* ========================================================================= */}
      {calendarViewMode === 'month' && (
        <div className="space-y-3">
          {/* Illustrated Month Banner */}
          {(() => {
            const banner = getMonthBanner(currentMonthDate);
            return (
              <div className="relative h-24 sm:h-32 rounded-2xl overflow-hidden border border-[#1F283C] shadow-md">
                <img
                  src={banner.bannerImage}
                  alt={banner.monthName}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121724] via-[#121724]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#121724]/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-[#8E84E4] uppercase tracking-wider block">
                      {banner.year}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-[#F1F3F7]">
                      {banner.monthName}
                    </h3>
                  </div>
                  <p className="text-xs text-[#CBD2E1] hidden sm:block">
                    {banner.tagline}
                  </p>
                </div>
              </div>
            );
          })()}

          <div className="bg-[#121724] rounded-2xl border border-[#1F283C] p-3 sm:p-4 space-y-3 shadow-xs">
            <div className="grid grid-cols-7 gap-1 text-center font-medium text-xs text-[#8D98AF] uppercase tracking-wider py-1.5 border-b border-[#1F283C]">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {monthGridData.map((cell, idx) => {
                const occurrences = dateToOccurrences[cell.iso] || [];
                const isToday = cell.iso === todayIso;

                return (
                  <div
                    key={idx}
                    className={`min-h-[85px] sm:min-h-[100px] rounded-xl border p-1.5 sm:p-2 flex flex-col justify-between transition-all relative ${
                      cell.isCurrentMonth
                        ? isToday
                          ? 'bg-[#182033] border-[#8E84E4]'
                          : 'bg-[#121724] border-[#1F283C] hover:border-[#8E84E4]/40'
                        : 'bg-[#0A0E17]/40 border-[#192133] opacity-35'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          isToday
                            ? 'bg-[#8E84E4] text-[#F1F3F7] w-5 h-5 rounded-full flex items-center justify-center'
                            : cell.isCurrentMonth
                            ? 'text-[#F1F3F7]'
                            : 'text-[#5E6980]'
                        }`}
                      >
                        {cell.dayNum}
                      </span>
                      {occurrences.length > 0 && (
                        <span className="text-[9px] font-medium text-[#8E84E4]">
                          {occurrences.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mt-1 overflow-y-auto max-h-[55px] sm:max-h-[65px]">
                      {occurrences.map((occ, occIdx) => {
                        const ev = occ.event;
                        const { isPending } = getEventRsvpStatus(ev);
                        const artwork = getEventThemeArtwork(ev.title, ev.description, ev.coverImage);

                        return (
                          <div
                            key={occIdx}
                            onClick={() => onSelectEvent(ev)}
                            title={`${ev.title} (${formatTimeRange(ev.startTime, ev.endTime)})`}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate cursor-pointer transition-all hover:opacity-90 flex items-center gap-1 ${
                              isPending
                                ? 'bg-[#8E84E4]/20 text-[#8E84E4] border border-[#8E84E4]/40'
                                : 'bg-[#182033] text-[#F1F3F7] border border-[#1F283C]'
                            }`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: artwork.accentColor }}
                            />
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
