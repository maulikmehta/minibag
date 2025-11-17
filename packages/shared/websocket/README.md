# WebSocket Event Documentation

This document describes the WebSocket events used for real-time communication in the Minibag application.

## Event Flow

```
Client A (Host)                    Server                    Client B (Participant)
     |                                |                                |
     |------ join-session ----------->|                                |
     |<----- user-joined -------------|                                |
     |                                |<------ join-session -----------|
     |<----- user-joined --------------                                |
     |                                |------> user-joined ----------->|
     |                                |                                |
     |------ participant-joined ----->|                                |
     |<----- participant-joined ------|                                |
     |                                |------> participant-joined ---->|
```

## Events

### Client → Server

#### `join-session`
Client joins a session room for real-time updates.

**Payload:**
```javascript
{
  sessionId: string  // Session ID to join
}
```

**Response:** Broadcasts `user-joined` to all clients in the room

---

#### `leave-session`
Client leaves a session room.

**Payload:**
```javascript
{
  sessionId: string  // Session ID to leave
}
```

**Response:** Broadcasts `user-left` to all clients in the room

---

#### `participant-joined`
Notify that a new participant has joined the session.

**Payload:**
```javascript
{
  sessionId: string,
  participant: {
    id: uuid,
    nickname: string,
    avatar_emoji: string,
    real_name: string | null,
    is_creator: boolean
  }
}
```

**Response:** Broadcasts `participant-joined` to all clients in the room

---

#### `participant-left`
Notify that a participant has left the session.

**Payload:**
```javascript
{
  sessionId: string,
  participantId: uuid
}
```

**Response:** Broadcasts `participant-left` to all clients in the room

---

#### `session-update`
Broadcast general session updates.

**Payload:**
```javascript
{
  sessionId: string,
  update: {
    // Any session fields to update
  }
}
```

**Response:** Broadcasts `session-updated` to all clients in the room

---

#### `payment-recorded`
Notify that a payment has been recorded.

**Payload:**
```javascript
{
  sessionId: string,
  payment: {
    id: uuid,
    item_id: uuid,
    method: string,
    amount: number
  }
}
```

**Response:** Broadcasts `payment-updated` to all clients in the room

---

#### `payment-edited`
Notify that a payment has been edited.

**Payload:**
```javascript
{
  sessionId: string,
  payment: {
    id: uuid,
    item_id: uuid,
    method: string,
    amount: number
  }
}
```

**Response:** Broadcasts `payment-updated` to all clients in the room

---

### Server → Client

#### `user-joined`
A socket has joined the session room.

**Payload:**
```javascript
{
  socketId: string
}
```

---

#### `user-left`
A socket has left the session room.

**Payload:**
```javascript
{
  socketId: string
}
```

---

#### `participant-joined`
A new participant has joined the session.

**Payload:**
```javascript
{
  id: uuid,
  nickname: string,
  avatar_emoji: string,
  real_name: string | null,
  is_creator: boolean
}
```

**Frontend should:** Add participant to local state and update UI

---

#### `participant-left`
A participant has left the session.

**Payload:**
```javascript
participantId: uuid
```

**Frontend should:** Remove participant from local state and update UI

---

#### `session-updated`
Session data has been updated.

**Payload:**
```javascript
{
  // Updated session fields
}
```

**Frontend should:** Merge updates into local session state

---

#### `payment-updated`
A payment has been recorded or updated.

**Payload:**
```javascript
{
  id: uuid,
  item_id: uuid,
  method: string,
  amount: number
}
```

**Frontend should:** Update payment information in local state

---

## Usage Example

### Frontend (React)

```javascript
import socketService from './services/socket.js';

// Connect and join session
socketService.connect();
socketService.joinSessionRoom(sessionId);

// Listen for participant joins
socketService.onParticipantJoined((participant) => {
  console.log('New participant:', participant);
  // Update UI with new participant
});

// Emit when local user joins
socketService.emitParticipantJoined(participantData);

// Cleanup
socketService.leaveSessionRoom();
```

### Backend

```javascript
// Event handlers are automatically set up in websocket/handlers.js
// Just ensure io.on('connection') calls setupSocketHandlers(socket, io)
```

## Best Practices

1. **Always join session room first** before emitting session-specific events
2. **Clean up listeners** when component unmounts or session ends
3. **Handle reconnection** - rejoin session room on reconnect
4. **Validate data** on both client and server
5. **Use TypeScript** for type safety in production

## Error Handling

WebSocket errors are logged to console. Common issues:

- **Socket not connected**: Ensure `socketService.connect()` is called
- **No session room**: Call `joinSessionRoom(sessionId)` before emitting events
- **Session ID mismatch**: Verify sessionId is correct in all events
