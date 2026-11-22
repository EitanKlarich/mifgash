export type RsvpStatus = 'Going' | 'Maybe' | "Can't Go" | 'Unanswered' | string;

export interface User {
  id: string;
  name: string;
  nickname: string;
  email: string;
  avatar: string;
  groups: string[]; // group IDs
}

export interface Member {
  id: string;
  name: string;
  nickname: string;
  avatar: string;
  role?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name or emoji
  image?: string; // custom group photo URL or data
  avatar?: string;
  color: string;
  inviteCode: string;
  members: Member[];
  createdAt: string;
  memberIds?: string[];
  planIds?: string[];
  pollIds?: string[];
  createdBy?: string;
}

export interface EventComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface EventRsvp {
  userId: string;
  userName: string;
  userAvatar: string;
  status: RsvpStatus;
  note?: string;
}

export interface EventPlan {
  id: string;
  groupId: string;
  groupName: string;
  groupColor: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD for multi-day events
  startTime: string; // HH:MM (24h or string format like "18:00")
  endTime: string;
  location: string;
  coverImage?: string; // Optional custom background image/artwork
  distanceKm?: number;
  weatherCondition?: string; // e.g. "Sunny 74°F" or "Partly Cloudy 68°F"
  createdBy: string;
  createdByName: string;
  isProposal?: boolean; // if true, marked as "Just a proposal" pending creator finalization / responses
  isPendingInvite?: boolean; // if current user hasn't RSVP'd or is invited pending
  customRsvpOptions?: string[]; // e.g., ["Bringing food", "Need a ride", "Playing"]
  rsvps: EventRsvp[];
  comments: EventComment[];
  isRecurring?: boolean;
  recurrencePattern?: string; // e.g. "Weekly on Tuesdays"
  categoryIcon?: string; // emoji or icon identifier e.g. 🏀, ⛺, 🎬, 🍕, 🎯, 🎉
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // array of userIds
  suggestedDate?: string;
  suggestedTime?: string;
  suggestedLocation?: string;
}

export interface Poll {
  id: string;
  groupId: string;
  groupName: string;
  question: string;
  category: 'Date' | 'Time' | 'Location' | 'Activity' | 'General' | 'Restaurant' | string;
  options: PollOption[];
  createdBy: string;
  createdByName: string;
  createdAvatar: string;
  createdAt: string;
  isClosed?: boolean;
  winningOptionId?: string;
}

export interface NotificationItem {
  id: string;
  type: 'event_invite' | 'event_update' | 'rsvp_reminder' | 'poll_created' | 'comment_added';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  relatedEventId?: string;
  relatedPollId?: string;
  relatedGroupId?: string;
  actionRequired?: boolean;
  oldDetails?: string;
  newDetails?: string;
}

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  attachedEventId?: string;
  attachedPollId?: string;
}
