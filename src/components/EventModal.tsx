import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Send,
  Trash2,
  MessageSquare,
  Check,
  Loader2,
  Pencil,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import { EventPlan, EventComment, Group, User } from '../types';
import {
  openInCalendar,
  getPreferredCalendar,
} from '../utils/calendarExport';
import {
  fetchLocationSuggestions,
  fetchWeatherForLocation,
  LocationSuggestion,
  WeatherInfo,
} from '../services/locationAndWeather';
import { subscribePlanComments } from '../services/firebase';
import { CategoryIcon } from './CategoryIcon';
import { openNativeMaps } from '../utils/maps';
import { formatTime, to24HourTime, formatTimeRange } from '../utils/timeFormat';
import { getEventThemeArtwork } from '../utils/calendarArtwork';

interface EventModalProps {
  mode: 'view' | 'create' | 'edit';
  event: EventPlan | null;
  groups: Group[];
  currentUser: User;
  onClose: () => void;
  onSaveEvent: (eventData: Partial<EventPlan>) => void;
  onDeleteEvent: (eventId: string) => void;
  onRsvp: (eventId: string, status: string) => void;
  onAddComment: (eventId: string, text: string) => void;
  prefilledGroupId?: string;
  prefilledTitle?: string;
  isPhoneFrame?: boolean;
}

export const EventModal: React.FC<EventModalProps> = ({
  mode,
  event,
  groups,
  currentUser,
  onClose,
  onSaveEvent,
  onDeleteEvent,
  onRsvp,
  onAddComment,
  prefilledGroupId,
  prefilledTitle,
  isPhoneFrame = false,
}) => {
  const [activeMode, setActiveMode] = useState<'view' | 'create' | 'edit'>(mode);
  const isCreator = !event || event.createdBy === currentUser.id;

  const [title, setTitle] = useState(event?.title || prefilledTitle || '');
  const [description, setDescription] = useState(event?.description || '');
  const [groupId, setGroupId] = useState(event?.groupId || prefilledGroupId || groups[0]?.id || '');
  const initialDate = event?.date || new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(event?.endDate || initialDate);
  const [startTime, setStartTime] = useState(event?.startTime || '18:00');
  const [endTime, setEndTime] = useState(event?.endTime || '20:00');
  const [location, setLocation] = useState(event?.location || '');
  const [isProposal, setIsProposal] = useState(event?.isProposal ?? false);
  const [customRsvpOptions] = useState<string[]>(
    event?.customRsvpOptions || ['Bringing Food', 'Need a Ride']
  );

  useEffect(() => {
    if (mode === 'edit' && event && event.createdBy !== currentUser.id) {
      setActiveMode('view');
    } else {
      setActiveMode(mode);
    }
  }, [mode, event, currentUser.id]);

  useEffect(() => {
    if (event) {
      setTitle(event.title || prefilledTitle || '');
      setDescription(event.description || '');
      setGroupId(event.groupId || prefilledGroupId || groups[0]?.id || '');
      const evDate = event.date || new Date().toISOString().split('T')[0];
      setDate(evDate);
      setEndDate(event.endDate || evDate);
      setStartTime(event.startTime || '18:00');
      setEndTime(event.endTime || '20:00');
      setLocation(event.location || '');
      setIsProposal(event.isProposal ?? false);
    }
  }, [event, prefilledTitle, prefilledGroupId, groups]);

  // Location suggestions
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | undefined>();
  const searchTimeoutRef = useRef<any>(null);

  // Weather state
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);

  // Comment input & live comments subscription
  const [commentText, setCommentText] = useState('');
  const [liveComments, setLiveComments] = useState<EventComment[]>(event?.comments || []);

  // Calendar sync
  const [preferredCalendar] = useState(() => getPreferredCalendar());

  const handleOpenCalendar = () => {
    if (!event) return;
    openInCalendar(event, preferredCalendar);
  };

  // Weather fetcher
  const loadWeather = async (locName: string, dateStr: string, coords?: { lat: number; lon: number }) => {
    if (!locName || locName === 'TBD') return;
    try {
      const info = await fetchWeatherForLocation(locName, dateStr, coords);
      setWeatherInfo(info);
    } catch {
      // Graceful fallback
    }
  };

  // On open in view mode, load weather & subscribe to live Firestore comments
  useEffect(() => {
    if (activeMode === 'view' && event && event.location && event.location !== 'TBD') {
      loadWeather(event.location, event.date);
    }
  }, [activeMode, event]);

  useEffect(() => {
    if (activeMode !== 'view' || !event?.id) {
      setLiveComments(event?.comments || []);
      return;
    }
    const unsubscribe = subscribePlanComments(event.id, currentUser.id, (comments) => {
      setLiveComments(comments);
    });
    return () => unsubscribe();
  }, [activeMode, event?.id, currentUser.id, event?.comments]);

  const handleLocationInputChange = (val: string) => {
    setLocation(val);
    setSelectedCoords(undefined);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingLocation(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await fetchLocationSuggestions(val);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSelectSuggestion = (sug: LocationSuggestion) => {
    setLocation(sug.displayName);
    setSelectedCoords({ lat: sug.lat, lon: sug.lon });
    setSuggestions([]);
    setShowSuggestions(false);
    loadWeather(sug.displayName, date, { lat: sug.lat, lon: sug.lon });
  };

  const handleLocationBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      if (location && location.trim().length >= 2 && location !== 'TBD') {
        loadWeather(location, date, selectedCoords);
      }
    }, 200);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !groupId) return;

    const selectedGroup = groups.find((g) => g.id === groupId);
    const hasValidEndDate = endDate && endDate > date;

    onSaveEvent({
      id: event?.id,
      groupId,
      groupName: selectedGroup?.name || 'Group',
      groupColor: selectedGroup?.color || 'blue',
      title: title.trim(),
      description: description.trim(),
      date,
      endDate: hasValidEndDate ? endDate : undefined,
      startTime: formatTime(startTime) || '6:00 PM',
      endTime: formatTime(endTime) || '8:00 PM',
      location: location.trim() || 'TBD',
      distanceKm: event?.distanceKm || 2.4,
      weatherCondition: weatherInfo?.condition || event?.weatherCondition || '',
      createdBy: event?.createdBy || currentUser.id,
      createdByName: event?.createdByName || currentUser.name,
      isProposal,
      isPendingInvite: isProposal || (event?.isPendingInvite ?? false),
      customRsvpOptions,
    });

    if (activeMode === 'edit') {
      setActiveMode('view');
    } else {
      onClose();
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !event) return;
    onAddComment(event.id, commentText.trim());
    setCommentText('');
  };

  const myRsvp = event?.rsvps?.find((r) => r.userId === currentUser.id)?.status;
  const themeArtwork = getEventThemeArtwork(event?.title || '', event?.description || '');

  const handleRsvpClick = (status: string) => {
    if (!event) return;
    onRsvp(event.id, status);
  };

  return (
    <div
      className={`${
        isPhoneFrame ? 'absolute p-2 sm:p-4' : 'fixed safe-modal-container sm:p-4'
      } inset-0 bg-[#0A0E17]/80 backdrop-blur-xs z-50 flex items-center justify-center overflow-hidden`}
    >
      <div
        className={`bg-[#121724] text-[#F1F3F7] rounded-2xl max-w-lg w-full border border-[#1F283C] shadow-2xl flex flex-col overflow-hidden min-h-0 ${
          isPhoneFrame ? 'max-h-[96%] h-full' : 'max-h-[90vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#1F283C] flex items-center justify-between bg-[#121724] shrink-0">
          <div className="flex items-center space-x-2 min-w-0 pr-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8D98AF]">
              {activeMode === 'view' ? 'Plan Details' : activeMode === 'create' ? 'Create Plan' : 'Edit Plan'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {activeMode === 'view' && event && isCreator && (
              <button
                type="button"
                onClick={() => setActiveMode('edit')}
                className="px-2.5 py-1 bg-[#182033] hover:bg-[#1F283C] text-[#8D98AF] hover:text-[#F1F3F7] border border-[#1F283C] rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors"
              >
                <Pencil className="w-3 h-3 text-[#8E84E4]" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              type="button"
              className="p-1 text-[#5E6980] hover:text-[#F1F3F7] hover:bg-[#182033] rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CREATE / EDIT FORM */}
        {activeMode !== 'view' ? (
          <form onSubmit={handleFormSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Title */}
            <div>
              <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
                Plan Title *
              </label>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[#182033] border border-[#1F283C] flex items-center justify-center shrink-0 text-[#8E84E4]">
                  <CategoryIcon title={title} className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dinner with Friends, Basketball, Coffee"
                  className="flex-1 bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs font-medium text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
                />
              </div>
            </div>

            {/* Group Selection */}
            <div>
              <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
                Group *
              </label>
              {groups.length === 0 ? (
                <div className="px-3 py-2 rounded-xl bg-[#182033] border border-[#1F283C] text-xs text-[#8D98AF]">
                  Create or join a group first before creating a plan.
                </div>
              ) : (
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs font-medium text-[#F1F3F7] focus:outline-none focus:border-[#8E84E4]"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id} className="bg-[#121724] text-[#F1F3F7]">
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (!endDate || endDate === date || endDate < newDate) {
                      setEndDate(newDate);
                    }
                    setDate(newDate);
                  }}
                  className="w-full bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs font-medium text-[#F1F3F7] focus:outline-none focus:border-[#8E84E4]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  min={date}
                  value={endDate || date}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs font-medium text-[#F1F3F7] focus:outline-none focus:border-[#8E84E4]"
                />
              </div>
            </div>

            {/* Time range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={to24HourTime(startTime)}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs font-medium text-[#F1F3F7] focus:outline-none focus:border-[#8E84E4]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={to24HourTime(endTime)}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs font-medium text-[#F1F3F7] focus:outline-none focus:border-[#8E84E4]"
                />
              </div>
            </div>

            {/* Location Input */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px]">
                  Location
                </label>
                {isSearchingLocation && (
                  <span className="text-[10px] text-[#8E84E4] flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Searching...
                  </span>
                )}
              </div>

              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-[#5E6980] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => handleLocationInputChange(e.target.value)}
                  onBlur={handleLocationBlur}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="e.g. Blue Bottle Coffee, Central Park"
                  className="w-full bg-[#182033] border border-[#1F283C] pl-8 pr-3 py-2 rounded-xl text-xs font-medium text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
                />
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#182033] border border-[#1F283C] rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-[#1F283C]">
                  {suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(sug)}
                      className="w-full px-3 py-2 text-left hover:bg-[#1F283C] transition-colors flex items-start space-x-2 cursor-pointer"
                    >
                      <MapPin className="w-3 h-3 text-[#8E84E4] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[#F1F3F7] truncate">{sug.name}</p>
                        <p className="text-[10px] text-[#8D98AF] truncate">{sug.displayName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
                Description / Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details, what to bring, table reservation name, etc."
                className="w-full bg-[#182033] border border-[#1F283C] p-2.5 rounded-xl text-xs text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#182033] hover:bg-[#1F283C] text-[#8D98AF] rounded-xl text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !groupId}
                className="px-4 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] disabled:opacity-45 disabled:cursor-not-allowed text-[#F1F3F7] rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                {activeMode === 'create' ? 'Create Plan' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : event ? (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Visual Theme Banner Header */}
            <div className="relative rounded-xl overflow-hidden border border-[#1F283C] p-3 sm:p-4 min-h-[90px] flex flex-col justify-end">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: `url(${themeArtwork.imageUrl})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121724] via-[#121724]/80 to-transparent" />
              
              <div className="relative z-10 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold tracking-wide uppercase text-[10px] text-[#8E84E4] bg-[#0A0E17]/80 px-2 py-0.5 rounded-md border border-[#1F283C]">
                    {event.groupName}
                  </span>
                  {event.weatherCondition && (
                    <span className="text-[11px] text-[#CBD2E1] bg-[#0A0E17]/80 px-2 py-0.5 rounded-md border border-[#1F283C]">
                      {event.weatherCondition}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white leading-snug tracking-tight">
                  {event.title}
                </h2>
              </div>
            </div>

                {/* Proposal Banner (if applicable) */}
                {event.isProposal && (
                  <div className="p-2.5 bg-[#8E84E4]/10 border border-[#8E84E4]/30 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-[#8E84E4] font-medium">Proposed Plan</span>
                    {isCreator && (
                      <button
                        type="button"
                        onClick={() => {
                          onSaveEvent({
                            ...event,
                            isProposal: false,
                            isPendingInvite: false,
                          });
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] text-xs font-medium rounded-lg"
                      >
                        Confirm Plan
                      </button>
                    )}
                  </div>
                )}

              {/* 2. DATE, TIME, LOCATION (Clean line-based info, no nested heavy boxes) */}
              <div className="space-y-2 py-2 border-y border-[#1F283C] text-xs">
                <div className="flex items-center space-x-2.5 text-[#F1F3F7]">
                  <Calendar className="w-3.5 h-3.5 text-[#8E84E4] shrink-0" />
                  <span className="font-medium">
                    {event.date}
                    {event.endDate && event.endDate > event.date && ` → ${event.endDate}`}
                  </span>
                  <span className="text-[#5E6980]">·</span>
                  <div className="flex items-center space-x-1.5 text-[#CBD2E1]">
                    <Clock className="w-3 h-3 text-[#5E6980] shrink-0" />
                    <span>{formatTimeRange(event.startTime, event.endTime)}</span>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-center space-x-2.5 text-[#8D98AF]">
                    <MapPin className="w-3.5 h-3.5 text-[#5E6980] shrink-0" />
                    <span
                      onClick={(e) => openNativeMaps(event.location, e)}
                      className="hover:text-[#8E84E4] cursor-pointer transition-colors truncate"
                      title="Open in Maps"
                    >
                      {event.location}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. PROMINENT RSVP ACTION */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-[#8D98AF] uppercase tracking-wider block">
                  Your RSVP
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRsvpClick('Going')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
                      myRsvp === 'Going'
                        ? 'bg-[#132B24] text-[#3EB88F] border-[#3EB88F]/50 font-semibold'
                        : 'bg-[#121724] text-[#8D98AF] border-[#1F283C] hover:text-[#F1F3F7] hover:bg-[#182033]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Going</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRsvpClick('Maybe')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
                      myRsvp === 'Maybe'
                        ? 'bg-[#2B2316] text-[#D99E4A] border-[#D99E4A]/50 font-semibold'
                        : 'bg-[#121724] text-[#8D98AF] border-[#1F283C] hover:text-[#F1F3F7] hover:bg-[#182033]'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 stroke-[2]" />
                    <span>Maybe</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRsvpClick("Can't Go")}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
                      myRsvp === "Can't Go"
                        ? 'bg-[#2D1920] text-[#D45D6D] border-[#D45D6D]/50 font-semibold'
                        : 'bg-[#121724] text-[#8D98AF] border-[#1F283C] hover:text-[#F1F3F7] hover:bg-[#182033]'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5 stroke-[2]" />
                    <span>Can't Go</span>
                  </button>
                </div>
              </div>

              {/* 4. ATTENDEES LIST (Streamlined, calm layout without box-in-box noise) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] text-[#8D98AF]">
                  <span className="font-semibold uppercase tracking-wider">
                    Attendees ({(event.rsvps || []).length})
                  </span>
                  <span className="text-[#5E6980]">
                    {(event.rsvps || []).filter((r) => r.status === 'Going').length} Going ·{' '}
                    {(event.rsvps || []).filter((r) => r.status === 'Maybe').length} Maybe
                  </span>
                </div>

                <div className="divide-y divide-[#1F283C]/60 bg-[#0A0E17]/40 rounded-xl border border-[#1F283C]/70 px-3 py-1">
                  {(event.rsvps || []).map((r, i) => (
                    <div
                      key={i}
                      className="py-2 flex items-center justify-between space-x-2 min-w-0"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img
                          src={r.userAvatar}
                          alt={r.userName}
                          className="w-6 h-6 rounded-full object-cover shrink-0 border border-[#1F283C]"
                        />
                        <span className="text-xs font-medium text-[#F1F3F7] truncate">{r.userName}</span>
                      </div>
                      <span
                        className={`text-[11px] font-medium shrink-0 ${
                          r.status === 'Going'
                            ? 'text-[#3EB88F]'
                            : r.status === 'Maybe'
                            ? 'text-[#D99E4A]'
                            : 'text-[#D45D6D]'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. DESCRIPTION */}
              {event.description && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-semibold text-[#8D98AF] uppercase tracking-wider block">
                    Notes
                  </span>
                  <p className="text-xs text-[#CBD2E1] leading-relaxed whitespace-pre-wrap font-normal">
                    {event.description}
                  </p>
                </div>
              )}

              {/* 6. COMMENTS (Live Firestore Feed) */}
              <div className="pt-2 border-t border-[#1F283C] space-y-2.5">
                <span className="text-[11px] font-semibold text-[#8D98AF] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-[#8E84E4]" />
                  <span>Comments ({liveComments.length})</span>
                </span>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {liveComments.length === 0 ? (
                    <p className="text-xs text-[#5E6980] py-1">No comments yet.</p>
                  ) : (
                    liveComments.map((c) => (
                      <div key={c.id} className="text-xs space-y-0.5 py-1 border-b border-[#1F283C]/40 last:border-0">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-[#F1F3F7]">{c.userName}</span>
                          <span className="text-[10px] text-[#5E6980]">{c.createdAt}</span>
                        </div>
                        <p className="text-[#8D98AF] font-normal leading-relaxed">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handleCommentSubmit} className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] rounded-xl transition-colors shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* 7. CALENDAR EXPORT & DELETE */}
              <div className="pt-2 border-t border-[#1F283C] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleOpenCalendar()}
                  className="text-xs text-[#8D98AF] hover:text-[#F1F3F7] flex items-center gap-1.5 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#8E84E4]" />
                  <span>Add to Calendar</span>
                  <ExternalLink className="w-3 h-3 text-[#5E6980]" />
                </button>

                {isCreator && (
                  <button
                    type="button"
                    onClick={() => onDeleteEvent(event.id)}
                    className="text-[#D45D6D] hover:underline text-xs flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };
