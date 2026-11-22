import React, { useState } from 'react';
import { Plus, Search, Bell, X } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  currentUser: User;
  upcomingCount: number;
  onOpenCreateEvent: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isPhoneFrame?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  upcomingCount,
  onOpenCreateEvent,
  onOpenProfile,
  onOpenNotifications,
  unreadCount,
  searchQuery,
  setSearchQuery,
  isPhoneFrame = false,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));
  const firstName = currentUser.name.trim().split(' ')[0] || 'there';

  const handleCloseSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  if (isPhoneFrame) {
    return (
      <header className="space-y-2 pb-2.5 border-b border-[#1F283C] shrink-0">
        {/* Top Header Row: Profile Avatar, Greeting, Search Toggle, Notification Bell */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <button
              onClick={onOpenProfile}
              className="w-8 h-8 rounded-full overflow-hidden border border-[#1F283C] shrink-0 hover:border-[#8E84E4]/60 transition-colors"
              title="Open Profile"
            >
              <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-semibold text-[#8E84E4] tracking-wide">Mifgash</span>
                <span className="text-[#5E6980] text-xs">·</span>
                <h1 className="text-xs font-medium text-[#F1F3F7] truncate">
                  {firstName}
                </h1>
              </div>
              <p className="text-[#8D98AF] text-[11px] font-normal truncate">
                {upcomingCount} upcoming {upcomingCount === 1 ? 'plan' : 'plans'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {/* Search Toggle Button */}
            <button
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className={`p-1.5 rounded-xl transition-colors ${
                isSearchOpen || searchQuery
                  ? 'text-[#8E84E4] bg-[#182033]'
                  : 'text-[#8D98AF] hover:text-[#F1F3F7] hover:bg-[#121724]'
              }`}
              title="Search plans"
            >
              <Search className="w-4 h-4 stroke-[1.75]" />
            </button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-1.5 rounded-xl text-[#8D98AF] hover:text-[#F1F3F7] hover:bg-[#121724] transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4 stroke-[1.75]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#D45D6D] w-1.5 h-1.5 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Search Input */}
        {(isSearchOpen || searchQuery) && (
          <div className="relative w-full animate-in fade-in duration-150">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#5E6980]" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plans, groups, places..."
              className="w-full bg-[#121724] border border-[#1F283C] pl-8.5 pr-8 py-1.5 rounded-xl text-xs text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]/60 transition-colors"
            />
            <button
              onClick={handleCloseSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5E6980] hover:text-[#F1F3F7] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </header>
    );
  }

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F283C] min-w-0">
      {/* App Branding & User Context */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#8E84E4] tracking-wide uppercase">Mifgash</span>
          <span className="text-[#5E6980] text-xs">·</span>
          <h1 className="text-lg font-semibold tracking-tight text-[#F1F3F7] truncate">
            Hi, {firstName}
          </h1>
        </div>
        <p className="text-[#8D98AF] text-xs mt-0.5 font-normal truncate">
          {upcomingCount} upcoming {upcomingCount === 1 ? 'plan' : 'plans'}
        </p>
      </div>

      {/* Right Tools: Clean Secondary Controls & New Plan CTA */}
      <div className="flex items-center space-x-2 min-w-0">
        {/* Expandable Search Control */}
        {isSearchOpen || searchQuery ? (
          <div className="relative w-56 sm:w-64 min-w-0 animate-in fade-in duration-150">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#5E6980]" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plans, groups, places..."
              className="w-full bg-[#121724] border border-[#1F283C] pl-8.5 pr-7 py-1.5 rounded-xl text-xs text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]/60 transition-colors"
            />
            <button
              onClick={handleCloseSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5E6980] hover:text-[#F1F3F7] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-xl text-[#8D98AF] hover:text-[#F1F3F7] hover:bg-[#121724] border border-[#1F283C] transition-colors shrink-0"
            title="Search plans"
          >
            <Search className="w-4 h-4 stroke-[1.75]" />
          </button>
        )}

        {/* Notifications Icon */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-[#8D98AF] hover:text-[#F1F3F7] hover:bg-[#121724] border border-[#1F283C] transition-colors shrink-0"
          title="Notifications"
        >
          <Bell className="w-4 h-4 stroke-[1.75]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-[#D45D6D] text-[#F1F3F7] text-[9px] font-semibold w-3.5 h-3.5 flex items-center justify-center rounded-full">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Primary CTA Button */}
        <button
          onClick={onOpenCreateEvent}
          className="bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] font-medium py-1.5 px-3.5 rounded-xl flex items-center space-x-1.5 transition-colors text-xs shrink-0 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2]" />
          <span>New Plan</span>
        </button>
      </div>
    </header>
  );
};

