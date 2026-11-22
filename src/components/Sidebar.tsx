import React from 'react';
import { Home, Calendar, Users, Bell, Vote, User, Plus } from 'lucide-react';
import { User as UserType } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserType;
  onOpenCreateEvent: () => void;
  onOpenProfile: () => void;
  isPhoneFrame?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenCreateEvent,
  onOpenProfile,
  isPhoneFrame = false,
}) => {
  if (isPhoneFrame) return null;

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <aside className="w-56 bg-[#0A0E17] border-r border-[#1F283C] flex flex-col h-full shrink-0 hidden md:flex select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#1F283C] flex items-center justify-between">
        <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="w-7 h-7 bg-[#8E84E4] rounded-lg flex items-center justify-center text-[#F1F3F7] font-semibold text-sm">
            M
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#F1F3F7]">Mifgash</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-medium ${
                isActive
                  ? 'bg-[#182033] text-[#F1F3F7]'
                  : 'text-[#8D98AF] hover:bg-[#121724] hover:text-[#F1F3F7]'
              }`}
            >
              <Icon className={`w-4 h-4 stroke-[1.75] ${isActive ? 'text-[#8E84E4]' : 'text-[#5E6980]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-3">
          <button
            onClick={onOpenCreateEvent}
            className="w-full bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] font-medium py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-colors text-xs shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2]" />
            <span>New Plan</span>
          </button>
        </div>
      </nav>

      {/* Profile Footer */}
      <div className="p-2.5 border-t border-[#1F283C] bg-[#0A0E17]">
        <div
          onClick={onOpenProfile}
          className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-[#121724] transition-colors cursor-pointer"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-7 h-7 rounded-full object-cover border border-[#1F283C]"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#F1F3F7] truncate">{currentUser.name}</p>
            <p className="text-[11px] text-[#5E6980] truncate">{currentUser.email || 'View Profile'}</p>
          </div>
          <User className="w-3.5 h-3.5 text-[#5E6980]" />
        </div>
      </div>
    </aside>
  );
};
