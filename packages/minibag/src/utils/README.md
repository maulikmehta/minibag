# Utils Documentation

Utility functions for data transformation and common operations.

## sessionTransformers.js

Transforms API response data into frontend-compatible formats.

### Why These Transformers Exist

The API returns data in a database-normalized format with nested relationships:
- Participant items are arrays with nested `catalog_item` objects
- IDs are UUIDs in the database
- Item references use UUID foreign keys

The frontend needs a simpler format:
- Participant items as flat objects `{ [item_id]: quantity }`
- Item IDs as simple strings (matching catalog)
- Direct access to quantities without nested lookups

### Data Flow

```
API Response Format                    Frontend Format
-------------------                    ---------------
participant: {                         participant: {
  items: [                               items: {
    {                                      "tomato": 2.5,
      item_id: "uuid-123",        →        "onion": 1.0
      quantity: 2.5,                     }
      catalog_item: {                  }
        item_id: "tomato",
        name: "Tomato"
      }
    }
  ]
}
```

## Functions

### `transformParticipantItems(apiItems)`

Transforms participant items array to object map.

**Input:**
```javascript
[
  {
    item_id: "uuid-123",
    quantity: 2.5,
    catalog_item: {
      item_id: "tomato",
      name: "Tomato"
    }
  }
]
```

**Output:**
```javascript
{
  "tomato": 2.5
}
```

---

### `transformParticipant(apiParticipant)`

Transforms API participant to frontend format.

**Input:**
```javascript
{
  id: "uuid-456",
  nickname: "Raj",
  real_name: "Rajesh Kumar",
  avatar_emoji: "👨",
  is_creator: false,
  items: [...]  // array format
}
```

**Output:**
```javascript
{
  id: "uuid-456",
  name: "Raj",
  nickname: "Raj",
  real_name: "Rajesh Kumar",
  avatar_emoji: "👨",
  is_creator: false,
  items: {...}  // object map format
}
```

---

### `extractHostItems(apiParticipants)`

Extracts host's items from participants array.

**Input:**
```javascript
[
  {
    is_creator: true,
    items: [
      { item_id: "tomato", quantity: 5 },
      { item_id: "onion", quantity: 3 }
    ]
  },
  { is_creator: false, ... }
]
```

**Output:**
```javascript
{
  "tomato": 5,
  "onion": 3
}
```

---

### `extractNonHostParticipants(apiParticipants)`

Filters and transforms non-host participants.

**Input:**
```javascript
[
  { is_creator: true, ... },   // Host (filtered out)
  { is_creator: false, ... },  // Participant 1
  { is_creator: false, ... }   // Participant 2
]
```

**Output:**
```javascript
[
  { id: "...", name: "...", items: {...} },  // Participant 1
  { id: "...", name: "...", items: {...} }   // Participant 2
]
```

---

### `transformSessionData(session, apiParticipants)`

Transforms complete session data (convenience wrapper).

**Input:**
```javascript
session: { ... },
apiParticipants: [...]
```

**Output:**
```javascript
{
  hostItems: { "tomato": 5, ... },
  participants: [...]
}
```

## Usage

```javascript
import { transformSessionData } from './utils/sessionTransformers.js';

// In component
useEffect(() => {
  if (session && apiParticipants) {
    const { hostItems, participants } = transformSessionData(session, apiParticipants);
    setHostItems(hostItems);
    setParticipants(participants);
  }
}, [session, apiParticipants]);
```

## Testing

When testing, use the same transformer functions to ensure consistency:

```javascript
// Mock API data
const mockApiParticipants = [
  {
    id: 'uuid-1',
    nickname: 'TestUser',
    is_creator: true,
    items: [
      { catalog_item: { item_id: 'tomato' }, quantity: 2 }
    ]
  }
];

// Transform
const { hostItems } = transformSessionData({}, mockApiParticipants);

// Assert
expect(hostItems).toEqual({ tomato: 2 });
```

## Adding New Transformers

When adding new data transformations:

1. Add function to `sessionTransformers.js`
2. Document input/output formats
3. Add JSDoc comments
4. Export function
5. Update this README
6. Write tests (when test suite is set up)

## Maintenance Notes

- Keep transformers pure (no side effects)
- Handle null/undefined gracefully
- Maintain backward compatibility
- Log warnings for unexpected data shapes (in development only)
