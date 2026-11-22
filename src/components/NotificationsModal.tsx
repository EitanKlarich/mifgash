import React from 'react';
import { Bell, CheckCircle2, MessageSquare, Vote, Clock, Check, X } from 'lucide-react';
import { NotificationItem, EventPlan } from '../types';

interface NotificationsModalProps {
  notifications: NotificationItem[];
  events: EventPlan[];
  onClose: () => void;
  onRsvp: (eventId: string, status: string) => void;
  onMarkAllRead: () => void;
  onSelectEvent: (event: EventPlan) => void;
  isPhoneFrame?: boolean;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  events,
  onClose,
  onRsvp,
  onMarkAllRead,
  onSelectEvent,
  isPhoneFrame = false,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className={`${
        isPhoneFrame ? 'absolute' : 'fixed'
      } inset-0 bg-[#0A0E17]/80 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-150`}
      onClick={onClose}
    >
      <div
        className={`bg-[#121724] text-[#F1F3F7] rounded-t-2xl sm:rounded-2xl max-w-md w-full border-t sm:border border-[#1F283C] shadow-2xl flex flex-col overflow-hidden min-h-0 ${
          isPhoneFrame ? 'max-h-[85%]' : 'max-h-[85vh]'
        } animate-in slide-in-from-bottom duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 bg-[#1F283C] rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="p-4 border-b border-[#1F283C] flex items-center justify-between bg-[#121724] shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-[#182033] border border-[#1F283C] text-[#8E84E4] rounded-lg flex items-center justify-center">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F1F3F7] text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-[11px] text-[#8D98AF]">{unreadCount} unread</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {notifications.length > 0 && unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs text-[#8E84E4] hover:underline cursor-pointer px-1"
              >
                Mark read
              </button>
            )}
            <button
              onClick={onClose}
              type="button"
              className="p-1 text-[#5E6980] hover:text-[#F1F2F6] rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1F283C]/60 text-xs">
          {notifications.length === 0 ? (
            <div className="p-10 text-center">
              <Bell className="w-7 h-7 text-[#5E6980] mx-auto mb-2 opacity-50" />
              <p className="text-[#F1F3F7] text-sm font-semibold">No notifications</p>
              <p className="text-xs text-[#8D98AF] mt-0.5">Plan changes and invitations will appear here.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const relatedEvent = events.find((e) => e.id === notif.relatedEventId);

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 sm:p-4 transition-colors flex flex-col gap-2.5 ${
                    !notif.read ? 'bg-[#182033]/60' : 'bg-[#121724]'
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
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

                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center space-x-1.5 min-w-0 flex-wrap">
                        <h4 className="font-semibold text-[#F1F3F7] text-xs leading-snug">
                          {notif.title}
                        </h4>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8E84E4] shrink-0" />
                        )}
                        <span className="text-[10px] text-[#5E6980] ml-auto shrink-0">
                          {notif.timestamp}
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

                  {/* Actions row */}
                  <div className="flex items-center justify-end space-x-2 pt-1 border-t border-[#1F283C]/40">
                    {notif.actionRequired && notif.relatedEventId ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onRsvp(notif.relatedEventId!, 'Going');
                          }}
                          className="px-3 py-1 bg-[#132B24] text-[#3EB88F] border border-[#3EB88F]/30 hover:bg-[#132B24]/80 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>Going</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onRsvp(notif.relatedEventId!, "Can't Go");
                          }}
                          className="px-3 py-1 bg-[#2D1920] text-[#D45D6D] border border-[#D45D6D]/30 hover:bg-[#2D1920]/80 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3 stroke-[2.5]" />
                          <span>Decline</span>
                        </button>
                      </>
                    ) : (
                      relatedEvent && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectEvent(relatedEvent);
                          }}
                          className="px-3 py-1 bg-[#182033] hover:bg-[#1F283C] text-[#CBD2E1] hover:text-[#F1F3F7] rounded-lg text-xs font-medium transition-colors border border-[#1F283C] cursor-pointer"
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

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#1F283C] bg-[#121724] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-[#182033] hover:bg-[#1E273D] text-[#CBD2E1] hover:text-[#F1F3F7] font-medium text-xs rounded-xl border border-[#1F283C] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
