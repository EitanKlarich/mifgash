import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { CalendarView } from './components/CalendarView';
import { GroupsView } from './components/GroupsView';
import { PollsView } from './components/PollsView';
import { EventModal } from './components/EventModal';
import { CreatePollModal } from './components/CreatePollModal';
import { GroupModals } from './components/CreateGroupModal';
import { ProfileModal } from './components/ProfileModal';
import { ProfileView } from './components/ProfileView';
import { NotificationsModal } from './components/NotificationsModal';
import { AuthScreen } from './components/AuthScreen';
import {
  subscribeAuthState,
  syncFirebaseUserToApp,
  signOutReal,
  deleteCurrentUserAccountReal,
  subscribeUserProfile,
  updateUserProfileInFirestore,
  subscribeUserGroups,
  createGroupInFirestore,
  updateGroupInFirestore,
  joinGroupByInviteCode,
  subscribeUserPlans,
  savePlanInFirestore,
  deletePlanInFirestore,
  rsvpPlanInFirestore,
  addPlanCommentInFirestore,
  subscribeUserPolls,
  createPollInFirestore,
  votePollInFirestore,
  subscribeNotifications,
  markAllNotificationsReadInFirestore,
  sendGroupMessageInFirestore,
} from './services/firebase';
import {
  User,
  Group,
  EventPlan,
  Poll,
  NotificationItem,
  ChatMessage,
} from './types';
import { Check, AlertCircle, Plus, Vote, Loader2 } from 'lucide-react';

function readInitialInviteCodeFromUrl(): string | null {
  try {
    const url = new URL(window.location.href);
    const qJoin = url.searchParams.get('join');
    if (qJoin && qJoin.trim()) {
      return qJoin.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    }
    const segments = url.pathname.split('/').filter(Boolean);
    const joinIdx = segments.indexOf('join');
    if (joinIdx >= 0 && segments[joinIdx + 1]) {
      return segments[joinIdx + 1].trim().replace(/[^a-zA-Z0-9_-]/g, '');
    }
  } catch {
    // ignore URL parse failure
  }
  return null;
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string>('');
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(() =>
    readInitialInviteCodeFromUrl()
  );

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [events, setEvents] = useState<EventPlan[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [chatMessages] = useState<Record<string, ChatMessage[]>>({});

  // UI Navigation & Search State
  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Modals & Overlays
  const [selectedEvent, setSelectedEvent] = useState<EventPlan | null>(null);
  const [eventModalMode, setEventModalMode] = useState<'view' | 'create' | 'edit' | null>(null);
  const [prefilledGroupForEvent, setPrefilledGroupForEvent] = useState<string | undefined>();
  const [prefilledTitleForEvent, setPrefilledTitleForEvent] = useState<string | undefined>();

  const [showCreatePollModal, setShowCreatePollModal] = useState<boolean>(false);
  const [prefilledGroupForPoll, setPrefilledGroupForPoll] = useState<string | undefined>();

  const [showGroupModal, setShowGroupModal] = useState<'create' | 'join' | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showFabMenu, setShowFabMenu] = useState<boolean>(false);

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joiningInviteRef = useRef(false);

  const showToast = (message: string, isError = false) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, isError });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Gracefully redirect legacy activity / notifications tab
  useEffect(() => {
    if (activeTab === 'notifications' || activeTab === 'activity') {
      setActiveTab('home');
      setShowNotificationsModal(true);
    }
  }, [activeTab]);

  // Firebase Auth state observer
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeAuthState(async (fbUser) => {
      if (!active) return;

      if (!fbUser) {
        setUser(null);
        setPendingVerificationEmail('');
        setGroups([]);
        setGroupsLoaded(false);
        setEvents([]);
        setPolls([]);
        setNotifications([]);
        setSelectedGroupId(null);
        setAuthReady(true);
        return;
      }

      if (!fbUser.emailVerified) {
        setUser(null);
        setPendingVerificationEmail(fbUser.email || '');
        setGroups([]);
        setGroupsLoaded(false);
        setEvents([]);
        setPolls([]);
        setNotifications([]);
        setAuthReady(true);
        return;
      }

      try {
        const appUser = await syncFirebaseUserToApp(fbUser);
        if (!active) return;
        setPendingVerificationEmail('');
        setUser(appUser);
      } catch (err) {
        console.error('Failed to sync authenticated user:', err);
        if (active) {
          showToast('Unable to load your profile. Please try signing in again.', true);
          setUser(null);
        }
      } finally {
        if (active) setAuthReady(true);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Firestore real-time subscriptions scoped to authenticated user
  useEffect(() => {
    if (!user?.id) return;

    const uid = user.id;
    const unsubProfile = subscribeUserProfile(uid, user, (nextUser) => {
      setUser(nextUser);
    });
    const unsubGroups = subscribeUserGroups(uid, (nextGroups) => {
      setGroups(nextGroups);
      setGroupsLoaded(true);
    });
    const unsubPlans = subscribeUserPlans(uid, (nextPlans) => {
      setEvents(nextPlans);
    });
    const unsubPolls = subscribeUserPolls(uid, (nextPolls) => {
      setPolls(nextPolls);
    });
    const unsubNotifs = subscribeNotifications(uid, (nextNotifs) => {
      setNotifications(nextNotifs);
    });

    return () => {
      unsubProfile();
      unsubGroups();
      unsubPlans();
      unsubPolls();
      unsubNotifs();
    };
    // Re-subscribe only when authenticated user ID changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-join group from URL invite link once authenticated and groups loaded
  useEffect(() => {
    if (!user || !groupsLoaded || !pendingInviteCode || joiningInviteRef.current) return;

    joiningInviteRef.current = true;
    const code = pendingInviteCode;
    setPendingInviteCode(null);

    try {
      if (window.location.search.includes('join=') || window.location.pathname.includes('/join/')) {
        window.history.replaceState({}, '', '/');
      }
    } catch {
      // ignore history errors
    }

    joinGroupByInviteCode(code, user, groups)
      .then((res) => {
        if (res.status === 'joined' && res.groupId) {
          setSelectedGroupId(res.groupId);
          setActiveTab('groups');
          showToast(`Joined "${res.groupName}"!`);
        } else if (res.status === 'already_member' && res.groupId) {
          setSelectedGroupId(res.groupId);
          setActiveTab('groups');
          showToast(`Already in "${res.groupName}"`);
        } else {
          showToast('Invite link is invalid or expired.', true);
        }
      })
      .catch(() => {
        showToast('Could not join group from invite link.', true);
      })
      .finally(() => {
        joiningInviteRef.current = false;
      });
  }, [user, groupsLoaded, pendingInviteCode, groups]);

  const userGroupIds = groups.map((g) => g.id);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Keep open event modal synced with latest Firestore snapshot
  const liveSelectedEvent = selectedEvent
    ? events.find((e) => e.id === selectedEvent.id) || selectedEvent
    : null;

  // AUTH HANDLERS
  const handleAuthenticated = (authedUser: User) => {
    setPendingVerificationEmail('');
    setUser(authedUser);
    showToast(`Signed in as ${authedUser.name}`);
  };

  const handleSignOut = async () => {
    await signOutReal();
    setUser(null);
    setSelectedGroupId(null);
    setActiveTab('home');
    showToast('Signed out');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const result = await deleteCurrentUserAccountReal(userGroupIds);
    if (result.success) {
      setUser(null);
      setSelectedGroupId(null);
      setActiveTab('home');
      showToast('Account deleted');
    } else {
      showToast(result.error || 'Could not delete account.', true);
    }
  };

  const handleUpdateProfile = async (updated: Partial<User>) => {
    if (!user) return;
    try {
      await updateUserProfileInFirestore(user, updated, userGroupIds);
      showToast('Profile updated');
    } catch {
      showToast('Could not save profile changes.', true);
    }
  };

  // APP MUTATION HANDLERS
  const handleRsvp = async (eventId: string, status: string) => {
    if (!user) return;
    try {
      await rsvpPlanInFirestore(eventId, user, status);
      const targetEv = events.find((e) => e.id === eventId);
      showToast(`RSVP updated for "${targetEv?.title || 'Plan'}"`);
    } catch {
      showToast('Could not update RSVP. Please try again.', true);
    }
  };

  const handleSaveEvent = async (eventData: Partial<EventPlan>) => {
    if (!user) return;
    const targetGroupId = eventData.groupId || selectedEvent?.groupId || groups[0]?.id;
    const targetGroup = groups.find((g) => g.id === targetGroupId);
    if (!targetGroup) {
      showToast('Create or join a group before saving a plan.', true);
      return;
    }

    try {
      const result = await savePlanInFirestore(eventData, targetGroup, user);
      showToast(result.isNew ? 'Plan created!' : 'Plan updated!');
    } catch {
      showToast('Could not save plan. Please check your details and try again.', true);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deletePlanInFirestore(eventId);
      setEventModalMode(null);
      setSelectedEvent(null);
      showToast('Plan deleted.');
    } catch {
      showToast('Could not delete plan.', true);
    }
  };

  const handleAddComment = async (eventId: string, text: string) => {
    if (!user) return;
    const plan = events.find((e) => e.id === eventId);
    if (!plan) return;
    const group = groups.find((g) => g.id === plan.groupId);
    try {
      await addPlanCommentInFirestore(plan, group, user, text);
    } catch {
      showToast('Could not post comment.', true);
    }
  };

  const handleSendMessage = async (groupId: string, text: string) => {
    if (!user) return;
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    try {
      await sendGroupMessageInFirestore(group, user, text);
    } catch {
      showToast('Could not send message.', true);
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    if (!user) return;
    const targetPoll = polls.find((p) => p.id === pollId);
    const chosenOption = targetPoll?.options.find((o) => o.id === optionId);
    const currentlyVoted = Boolean(chosenOption?.votes.includes(user.id));

    try {
      await votePollInFirestore(pollId, user.id, optionId, currentlyVoted);
      showToast(currentlyVoted ? 'Vote removed' : 'Vote recorded!');
    } catch {
      showToast('Could not record vote.', true);
    }
  };

  const handleCreatePoll = async (pollData: Partial<Poll>) => {
    if (!user) return;
    const targetGroup = groups.find((g) => g.id === pollData.groupId) || groups[0];
    if (!targetGroup) {
      showToast('Create or join a group first.', true);
      return;
    }

    try {
      await createPollInFirestore(pollData, targetGroup, user);
      setShowCreatePollModal(false);
      showToast('Poll created!');
    } catch {
      showToast('Could not create poll. Check that all options are filled in.', true);
    }
  };

  const handleConvertPollToEvent = (poll: Poll) => {
    if (!user) return;
    const sortedOptions = [...poll.options].sort((a, b) => b.votes.length - a.votes.length);
    const topOption = sortedOptions[0];
    const topText = topOption ? topOption.text : poll.question;

    setPrefilledGroupForEvent(poll.groupId);
    setPrefilledTitleForEvent(topText);
    setSelectedEvent(null);
    setEventModalMode('create');
    showToast(`Drafting plan from "${topText}"`);
  };

  const handleCreateGroup = async (groupData: Partial<Group>) => {
    if (!user) return;
    try {
      const created = await createGroupInFirestore(groupData, user);
      setSelectedGroupId(created.id);
      setActiveTab('groups');
      setShowGroupModal(null);
      showToast(`Created "${created.name}"`);
    } catch {
      showToast('Could not create group.', true);
    }
  };

  const handleUpdateGroup = async (groupId: string, updated: Partial<Group>) => {
    try {
      await updateGroupInFirestore(groupId, updated);
      showToast('Group updated');
    } catch {
      showToast('Could not update group.', true);
    }
  };

  const handleJoinGroup = async (inviteCode: string) => {
    if (!user) return;
    try {
      const res = await joinGroupByInviteCode(inviteCode, user, groups);
      if (res.status === 'joined' && res.groupId) {
        setSelectedGroupId(res.groupId);
        setActiveTab('groups');
        setShowGroupModal(null);
        showToast(`Joined "${res.groupName}"!`);
      } else if (res.status === 'already_member' && res.groupId) {
        setSelectedGroupId(res.groupId);
        setActiveTab('groups');
        setShowGroupModal(null);
        showToast(`You are already in "${res.groupName}"`);
      } else {
        showToast('Group invite code not found', true);
      }
    } catch {
      showToast('Could not join group. Please check the invite code.', true);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    try {
      await markAllNotificationsReadInFirestore(user.id, unreadIds);
      showToast('All notifications marked as read');
    } catch {
      showToast('Could not mark notifications as read.', true);
    }
  };

  // Initial Firebase Auth Hydration Loading State
  if (!authReady) {
    return (
      <div className="min-h-screen w-full bg-[#0A0E17] text-[#F1F3F7] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-[#182033] border border-[#1F283C] flex items-center justify-center text-[#8E84E4] font-bold text-lg shadow-lg mb-4">
          M
        </div>
        <div className="flex items-center space-x-2 text-xs text-[#8D98AF]">
          <Loader2 className="w-4 h-4 animate-spin text-[#8E84E4]" />
          <span>Loading Mifgash...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated / Email Verification Screen
  if (!user) {
    return (
      <div className="min-h-screen w-full bg-[#0A0E17] text-[#F1F3F7] flex flex-col font-sans">
        <AuthScreen
          onAuthenticated={handleAuthenticated}
          initialMode={pendingVerificationEmail ? 'verify_email' : 'welcome'}
          pendingVerificationEmail={pendingVerificationEmail}
          pendingInviteCode={pendingInviteCode}
        />

        {toast && (
          <div className="fixed bottom-6 right-6 bg-[#182033] text-[#F1F3F7] border border-[#1F283C] px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-medium z-50 animate-in fade-in slide-in-from-bottom-5">
            {toast.isError ? (
              <AlertCircle className="w-3.5 h-3.5 text-[#E06C75]" />
            ) : (
              <Check className="w-3.5 h-3.5 text-[#3EB88F]" />
            )}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0A0E17] text-[#F1F3F7] flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Desktop Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={user}
        onOpenCreateEvent={() => {
          setPrefilledGroupForEvent(undefined);
          setPrefilledTitleForEvent(undefined);
          setSelectedEvent(null);
          setEventModalMode('create');
        }}
        onOpenProfile={() => setActiveTab('profile')}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-full min-h-0 min-w-0 bg-[#0A0E17] relative overflow-hidden">
        <div className="p-3 sm:p-4 pb-0 shrink-0">
          <Header
            currentUser={user}
            upcomingCount={events.length}
            onOpenCreateEvent={() => {
              setPrefilledGroupForEvent(undefined);
              setPrefilledTitleForEvent(undefined);
              setSelectedEvent(null);
              setEventModalMode('create');
            }}
            onOpenProfile={() => setActiveTab('profile')}
            onOpenNotifications={() => setShowNotificationsModal(true)}
            unreadCount={unreadCount}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>

        {/* Scrollable View Container */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4">
          {activeTab === 'home' && (
            <HomeView
              events={events}
              polls={polls}
              notifications={notifications}
              currentUser={user}
              groups={groups}
              searchQuery={searchQuery}
              onSelectEvent={(ev) => {
                setSelectedEvent(ev);
                setEventModalMode('view');
              }}
              onRsvp={handleRsvp}
              onVotePoll={handleVotePoll}
              onOpenCreatePoll={() => setShowCreatePollModal(true)}
              onSelectGroup={(gId) => {
                setSelectedGroupId(gId);
                setActiveTab('groups');
              }}
              onConvertPollToEvent={handleConvertPollToEvent}
              onOpenCreateGroup={() => setShowGroupModal('create')}
              onOpenJoinGroup={() => setShowGroupModal('join')}
              onOpenCreateEvent={() => {
                setPrefilledGroupForEvent(undefined);
                setPrefilledTitleForEvent(undefined);
                setSelectedEvent(null);
                setEventModalMode('create');
              }}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              events={events}
              groups={groups}
              currentUser={user}
              onSelectEvent={(ev) => {
                setSelectedEvent(ev);
                setEventModalMode('view');
              }}
              onOpenCreateEvent={() => {
                setPrefilledGroupForEvent(undefined);
                setPrefilledTitleForEvent(undefined);
                setSelectedEvent(null);
                setEventModalMode('create');
              }}
            />
          )}

          {activeTab === 'groups' && (
            <GroupsView
              groups={groups}
              selectedGroupId={selectedGroupId}
              setSelectedGroupId={setSelectedGroupId}
              events={events}
              polls={polls}
              chatMessages={chatMessages}
              currentUser={user}
              onSendMessage={handleSendMessage}
              onUpdateGroup={handleUpdateGroup}
              onOpenCreateGroup={() => setShowGroupModal('create')}
              onOpenJoinGroup={() => setShowGroupModal('join')}
              onOpenCreateEventForGroup={(gId) => {
                setPrefilledGroupForEvent(gId);
                setPrefilledTitleForEvent(undefined);
                setSelectedEvent(null);
                setEventModalMode('create');
              }}
              onOpenCreatePollForGroup={(gId) => {
                setPrefilledGroupForPoll(gId);
                setShowCreatePollModal(true);
              }}
              onSelectEvent={(ev) => {
                setSelectedEvent(ev);
                setEventModalMode('view');
              }}
              onRsvp={handleRsvp}
              onVotePoll={handleVotePoll}
              onConvertPollToEvent={handleConvertPollToEvent}
            />
          )}

          {activeTab === 'polls' && (
            <PollsView
              polls={polls}
              groups={groups}
              currentUser={user}
              onVotePoll={handleVotePoll}
              onOpenCreatePoll={() => setShowCreatePollModal(true)}
              onConvertPollToEvent={handleConvertPollToEvent}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              currentUser={user}
              onUpdateProfile={handleUpdateProfile}
              onSignOut={handleSignOut}
              onDeleteAccount={handleDeleteAccount}
              events={events}
            />
          )}
        </div>

        {/* Floating Action Button */}
        {activeTab !== 'groups' && activeTab !== 'profile' && (
          <div className="fixed bottom-20 right-6 md:bottom-8 md:right-8 z-20">
            {showFabMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowFabMenu(false)} />
                <div className="absolute bottom-12 right-0 w-36 bg-[#182033] border border-[#1F283C] rounded-xl shadow-xl p-1 space-y-0.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setPrefilledGroupForEvent(undefined);
                      setPrefilledTitleForEvent(undefined);
                      setSelectedEvent(null);
                      setEventModalMode('create');
                      setShowFabMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#F1F3F7] hover:bg-[#1E273D] hover:text-[#8E84E4] flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#8E84E4]" />
                    <span>New Plan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrefilledGroupForPoll(undefined);
                      setShowCreatePollModal(true);
                      setShowFabMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#F1F3F7] hover:bg-[#1E273D] hover:text-[#8E84E4] flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Vote className="w-3.5 h-3.5 text-[#8E84E4]" />
                    <span>New Poll</span>
                  </button>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowFabMenu((prev) => !prev)}
              className={`w-11 h-11 bg-[#8E84E4] hover:bg-[#7B71D3] text-white rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 border border-[#8E84E4]/30 cursor-pointer ${
                showFabMenu ? 'rotate-45' : ''
              }`}
              title="Create Plan or Poll"
              aria-label="Create Plan or Poll"
            >
              <Plus className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Modals */}
      {eventModalMode && (
        <EventModal
          mode={eventModalMode}
          event={liveSelectedEvent}
          groups={groups}
          currentUser={user}
          onClose={() => {
            setEventModalMode(null);
            setSelectedEvent(null);
          }}
          onSaveEvent={handleSaveEvent}
          onDeleteEvent={handleDeleteEvent}
          onRsvp={handleRsvp}
          onAddComment={handleAddComment}
          prefilledGroupId={prefilledGroupForEvent}
          prefilledTitle={prefilledTitleForEvent}
        />
      )}

      {showCreatePollModal && (
        <CreatePollModal
          groups={groups}
          prefilledGroupId={prefilledGroupForPoll}
          onClose={() => setShowCreatePollModal(false)}
          onCreatePoll={handleCreatePoll}
        />
      )}

      {showGroupModal && (
        <GroupModals
          mode={showGroupModal}
          currentUser={user}
          onClose={() => setShowGroupModal(null)}
          onCreateGroup={handleCreateGroup}
          onJoinGroup={handleJoinGroup}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          currentUser={user}
          onClose={() => setShowProfileModal(false)}
          onUpdateProfile={handleUpdateProfile}
          onSignOut={handleSignOut}
        />
      )}

      {showNotificationsModal && (
        <NotificationsModal
          notifications={notifications}
          events={events}
          onClose={() => setShowNotificationsModal(false)}
          onRsvp={handleRsvp}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onSelectEvent={(ev) => {
            setShowNotificationsModal(false);
            setSelectedEvent(ev);
            setEventModalMode('view');
          }}
        />
      )}

      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-8 right-6 bg-[#182033] text-[#F1F3F7] border border-[#1F283C] px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-medium z-50 animate-in fade-in slide-in-from-bottom-5">
          {toast.isError ? (
            <AlertCircle className="w-3.5 h-3.5 text-[#E06C75]" />
          ) : (
            <Check className="w-3.5 h-3.5 text-[#3EB88F]" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
