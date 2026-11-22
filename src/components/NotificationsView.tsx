import React from 'react';
import { Bell, CheckCircle2, MessageSquare, Vote, Clock, Check, X } from 'lucide-react';
import { NotificationItem, EventPlan } from '../types';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  events: EventPlan[];
  onRsvp: (eventId: string, status: string) => void;
  onMarkAllRead: () => void;
  onSelectEvent: (event: EventPlan) => void;
  isPhoneFrame?: boolean;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  events,
  onRsvp,
  onMarkAllRead,
  onSelectEvent,
  isPhoneFrame = false,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className={`w-full max-w-full min-w-0 space-y-3 mt-1 ${isPhoneFrame ? 'pb-20' : 'pb-24'} text-[#F1F3F7]`}>
      {/* Activity Header */}
      <div className="flex items-center justify-between px-0.5 min-w-0">
        <div className="flex items-center space-x-2 min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8D98AF]">Activity</h2>
          {unreadCount > 0 && (
            <span className="bg-[#1E1B38] text-[#8E84E4] border border-[#1F283C] text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0">
              {unreadCount} new
            </span>
          )}
        </div>

        {notifications.length > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs font-medium text-[#8E84E4] hover:underline transition-colors shrink-0 cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Chronological Activity Feed */}
      <div className="w-full min-w-0 bg-[#121724] rounded-2xl border border-[#1F283C] divide-y divide-[#1F283C] overflow-hidden shadow-xs">
        {notifications.length === 0 ? (
          <div className="p-10 text-center">
            <Bell className="w-6 h-6 text-[#5E6980] mx-auto mb-2 opacity-50" />
            <p className="text-[#F1F3F7] text-sm font-semibold">No new activity</p>
            <p className="text-xs text-[#8D98AF] mt-0.5">Meaningful plan changes and invitations will appear here.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const relatedEvent = events.find((e) => e.id === notif.relatedEventId);

            return (
              <div
                key={notif.id}
                className={`p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 ${
                  !notif.read ? 'bg-[#182033]/60' : 'bg-[#121724]'
                }`}
              >
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  {/* Category icon */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                      notif.type === 'event_invite'
                        ? 'bg-[#132B24] text-[#3EB88F] border-[#3EB88F]/30'
                        : notif.type === 'event_update'
                        ? 'bg-[#2B2316] text-[#D99E4A] border-[#D99E4A]/30'
                        : notif.type === 'poll_created'
                        ? 'bg-[#1E1B38] text-[#8E84E4] border-[#1F283C]'
                        : 'bg-[#182033] text-[#8D98AF] border-[#1F283C]'
                    }`}
                  >
                    {notif.type === 'event_update' && <Clock className="w-3.5 h-3.5" />}
                    {notif.type === 'event_invite' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {notif.type === 'poll_created' && <Vote className="w-3.5 h-3.5" />}
                    {notif.type === 'comment_added' && <MessageSquare className="w-3.5 h-3.5" />}
                  </div>

                  {/* Notification Content */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center space-x-1.5 min-w-0 flex-wrap">
                      <h4 className="font-semibold text-[#F1F3F7] text-xs sm:text-sm leading-snug">
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8E84E4] shrink-0" />
                      )}
                      <span className="text-[11px] text-[#5E6980] ml-auto sm:ml-0 shrink-0">
                        · {notif.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-[#8D98AF] font-normal leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Change Details */}
                    {notif.oldDetails && notif.newDetails && (
                      <div className="mt-1 text-xs text-[#D99E4A] flex flex-wrap items-center gap-1.5">
                        <span className="line-through opacity-60">{notif.oldDetails}</span>
                        <span className="text-[#8D98AF]">→</span>
                        <span className="text-[#F1F3F7] font-medium">{notif.newDetails}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Actions */}
                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center pl-10 sm:pl-0">
                  {notif.actionRequired && notif.relatedEventId ? (
                    <>
                      <button
                        onClick={() => onRsvp(notif.relatedEventId!, 'Going')}
                        className="px-3 py-1.5 bg-[#132B24] text-[#3EB88F] border border-[#3EB88F]/30 hover:bg-[#132B24]/80 rounded-xl text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Going</span>
                      </button>
                      <button
                        onClick={() => onRsvp(notif.relatedEventId!, "Can't Go")}
                        className="px-3 py-1.5 bg-[#2D1920] text-[#D45D6D] border border-[#D45D6D]/30 hover:bg-[#2D1920]/80 rounded-xl text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Decline</span>
                      </button>
                    </>
                  ) : (
                    relatedEvent && (
                      <button
                        onClick={() => onSelectEvent(relatedEvent)}
                        className="px-3 py-1.5 bg-[#182033] hover:bg-[#1F283C] text-[#8D98AF] hover:text-[#F1F3F7] rounded-xl text-xs font-medium transition-colors border border-[#1F283C] cursor-pointer"
                      >
                        View Plan
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
