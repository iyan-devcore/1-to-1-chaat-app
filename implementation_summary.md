# Features Implemented

## 1. Read Receipts (WhatsApp-style)
- **Visuals**: 
  - Grey single/double ticks for sent messages.
  - Blue double ticks (`CheckCheck` icon from lucide-react) when the message is read.
  - Ticks are displayed next to the timestamp in the message bubble.
- **Logic**:
  - `status` column added to `messages` table (defaults to 'sent').
  - When a user joins a chat, unread messages from that sender are marked as 'read'.
  - Real-time `status_update` events are emitted to the sender to update the UI instantly.
  - `mark_read` event added for manual triggering if needed (e.g., when a new message arrives while chat is open).

## 2. Active Status & Last Seen
- **Visuals**:
  - **Online**: Green dot on the user avatar and "Online" text in the chat header and sidebar.
  - **Last Seen**: "Last seen today at HH:MM" or "Last seen on Date at HH:MM" displayed in the chat header when the user is offline.
- **Logic**:
  - `is_online` (integer/boolean) and `last_seen` (datetime) columns added to `users` table.
  - Server updates these values on `connection` and `disconnect` socket events.
  - Server broadcasts `user_status_change` events to all connected clients.
  - On server startup, all users are reset to `is_online = 0` to ensure consistency.

## 3. Database & Server Improvements
- **Migrations**: Added automatic schema migration checks for the new columns (`status`, `is_online`, `last_seen`) in `server/db/database.js`.
- **Robustness**: Fixed a race condition where the server would try to reset online status before the migration column was added, causing a crash. Migrations are now properly sequenced.

# How to Test
1. **Restart the Server** (Done): The server has been restarted to apply DB changes.
2. **Open Two Clients**: Open the app in two different browser windows or tabs.
3. **Login**: Log in as User A in one window and User B in the other.
4. **Test Online Status**: Observe the green dot in the sidebar for the other user.
5. **Test Last Seen**: Close one tab. Observe the "Last seen..." message in the other tab's header.
6. **Test Read Receipts**:
   - Send a message from User A to User B. It should show grey ticks.
   - Open the chat as User B.
   - Observe the ticks turn blue on User A's screen.
