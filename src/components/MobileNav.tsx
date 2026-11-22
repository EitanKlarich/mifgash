import React from 'react';
import { Home, Calendar, Users, User } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isPhoneFrame?: boolean;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  isPhoneFrame = false,
}) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav
      className={`${
        isPhoneFrame
          ? 'w-full bg-[#0A0E17] border-t border-[#1F283C]/70 px-2 py-1.5 flex items-center justify-around shrink-0 z-30'
          : 'fixed bottom-0 left-0 right-0 bg-[#0A0E17]/95 backdrop-blur-md border-t border-[#1F283C]/70 z-30 md:hidden px-2 py-1.5 flex items-center justify-around'
      }`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3.5 transition-colors relative cursor-pointer ${
              isActive
                ? 'text-[#8E84E4]'
                : 'text-[#5E6980] hover:text-[#8D98AF]'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon className="w-4.5 h-4.5 stroke-[1.6]" />
            </div>
            <span className={`text-[10px] mt-0.5 tracking-tight font-medium ${isActive ? 'text-[#8E84E4] font-semibold' : 'text-[#5E6980]'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
