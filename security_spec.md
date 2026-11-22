# Mifgash Firestore Security Specification

## 1. Data Invariants
1. **Owner-Isolated PII (`/users/{userId}`)**: Only the authenticated owner (`request.auth.uid == userId`) can read or write their `/users/{userId}` document containing `email`. No blanket signed-in reads on `/users`.
2. **Membership Gate (`/groups/{groupId}`)**: Groups are private and invite-only. Users can only list or get groups where `request.auth.uid in resource.data.memberIds`. Creating a group requires `createdBy == request.auth.uid`, `memberIds == [request.auth.uid]`, and atomic creation of `/groups/{groupId}/members/{uid}` and `/invites/{inviteCode}` in the same batch.
3. **Invite Lookup Privacy (`/invites/{inviteCode}`)**: `allow list: if false;` prevents enumerating invite codes. Only `allow get` is permitted for signed-in verified users who already possess the exact code.
4. **Master Gate on Subcollections (`/groups/{groupId}/members`, `/groups/{groupId}/messages`)**: Read and write access requires parent group membership verified via `get(/databases/$(database)/documents/groups/$(groupId)).data.memberIds`.
5. **Plan & Poll Integrity (`/plans/{planId}`, `/polls/{pollId}`)**:
   - `allow list` strictly evaluates `request.auth.uid in resource.data.memberIds` (zero `get()`/`exists()` inside `allow list`).
   - Creating a plan/poll requires `createdBy == request.auth.uid` and verified membership in `groups/{groupId}`.
   - Updates are strictly partitioned into action branches (`affectedKeys().hasOnly(...)`):
     - Creator edit/confirm action
     - Member self-RSVP action (`rsvpMap.diff(...).affectedKeys().hasOnly([request.auth.uid])`)
     - Member self-vote action (`votesMap.diff(...).affectedKeys().hasOnly([request.auth.uid])`)
     - Member self-join sync action (adding only `request.auth.uid` to `memberIds` when already a member of `groups/{groupId}`)
6. **Comment & Notification Integrity**: Comments require `userId == request.auth.uid` and group membership. Notifications under `/users/{userId}/notifications` are readable/updatable only by `userId`, and creatable only by verified co-members of `relatedGroupId`.
7. **Temporal Integrity**: `createdAt` and `updatedAt` are strictly validated against `request.time`, and `createdAt` + `createdBy` + `id` are immutable on update.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated read on `/groups/{id}`** -> Rejected (`request.auth == null`).
2. **Unverified email write on `/users/{uid}`** -> Rejected (`email_verified != true`).
3. **Cross-user PII read (`get /users/{otherUid}`)** -> Rejected (`request.auth.uid != userId`).
4. **Blanket `list /invites`** -> Rejected (`allow list: if false`).
5. **Shadow field injection (`isAdmin: true`) on `/users/{uid}` create** -> Rejected (`keys().hasOnly(...)`).
6. **Identity spoofing (`createdBy: "other_uid"`) on `/groups/{id}` create** -> Rejected (`createdBy == request.auth.uid`).
7. **Orphaned `/plans/{planId}` create referencing non-existent `groupId`** -> Rejected (`exists(...)` / `get(...)` fails).
8. **ID Poisoning (`/groups/{1500-char-id}`)** -> Rejected (`isValidId` length/regex check).
9. **RSVP tampering (User B modifies `rsvpMap[UserA]` on `/plans/{planId}`)** -> Rejected (`rsvpMap.diff().affectedKeys().hasOnly([request.auth.uid])`).
10. **Vote tampering (User B modifies `votesMap[UserA]` on `/polls/{pollId}`)** -> Rejected (`votesMap.diff().affectedKeys().hasOnly([request.auth.uid])`).
11. **Non-creator modifying plan title/date on `/plans/{planId}`** -> Rejected (`existing().createdBy == request.auth.uid` required for edit action).
12. **Client-forged `createdAt` timestamp (non-`request.time`)** -> Rejected (`incoming().createdAt == request.time`).
