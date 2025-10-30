# Future Features for Minibag

This document tracks feature ideas and enhancements for future development.

## @ Mentions Feature (Nicknames as Mentions)

**Concept**: Use the existing nickname system (Mango, Banana, etc.) as @ mentions for notifications and communication.

### Potential Use Cases:

1. **Activity Notifications**
   - "@Mango added 2 items"
   - "@Banana updated their payment"
   - Real-time updates that show which participant took action

2. **Direct Mentions**
   - "@Banana, please review the order"
   - Host or participants can directly notify specific members
   - Creates sense of engagement and accountability

3. **Push Notifications (Future)**
   - When backend supports push notifications, mentions could trigger alerts
   - "@Cherry, the vendor is asking about your tomatoes"
   - Selective notifications based on relevance

4. **Chat/Comments (Future)**
   - If in-app messaging is added, @ mentions work naturally
   - "@Mango can you pick up an extra kg of onions?"

### Implementation Notes:

- **Current nickname system is already in place** - nicknames are stored in database
- Would need:
  - Mention detection in text inputs (look for "@" followed by nickname)
  - UI highlighting for mentions
  - Notification system integration
  - Backend support for targeted notifications

### Priority: Medium-Low
- Core shopping flow is more important
- Requires notification infrastructure first
- Good enhancement once basic functionality is solid

### Related Files:
- `database/002_seed_data.sql` - Contains nicknames pool
- `packages/minibag/minibag-ui-prototype.tsx` - Nickname selection UI
- Future: notification service implementation

---

**Documented**: 2025-10-30
**Status**: Idea stage - pending notification infrastructure
