# Firebase Database Schema - Bradley's Travel Planner

## 🗄️ Database Overview

The Bradley's Travel Planner uses Firebase Firestore as its primary database with the following collections and indexes.

## 📊 Collections Structure

### 1. **trips** Collection
Stores all travel trip information.

```javascript
{
  id: "trip_123",
  userId: "user_456",
  name: "Summer Europe Adventure",
  destination: "Paris, France",
  type: "leisure", // leisure, business, adventure, family
  startDate: "2024-06-15",
  endDate: "2024-06-25",
  budget: 5000.00,
  notes: "First time visiting Europe...",
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z",
  status: "planned", // planned, active, completed, cancelled
  photos: ["photo1.jpg", "photo2.jpg"],
  tags: ["europe", "summer", "family"]
}
```

### 2. **expenses** Collection
Stores individual expenses for each trip.

```javascript
{
  id: "expense_789",
  tripId: "trip_123",
  userId: "user_456",
  description: "Hotel accommodation",
  amount: 1200.00,
  category: "accommodation", // accommodation, food, transport, activities, other
  date: "2024-06-15T14:30:00Z",
  currency: "USD",
  location: "Paris, France",
  receipt: "receipt_url_or_base64",
  notes: "3 nights at Hotel Plaza"
}
```

### 3. **packingLists** Collection
Stores packing lists for trips.

```javascript
{
  id: "packing_456",
  userId: "user_456",
  tripId: "trip_123",
  name: "Summer Europe Packing List",
  categories: ["Clothes", "Electronics", "Toiletries"],
  items: [
    {
      id: "item_1",
      name: "T-shirts",
      category: "Clothes",
      quantity: 5,
      packed: false,
      notes: "Mix of casual and dressy"
    }
  ],
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z"
}
```

### 4. **documents** Collection
Stores travel documents and important papers.

```javascript
{
  id: "doc_789",
  userId: "user_456",
  tripId: "trip_123", // optional, can be null for general documents
  name: "Passport",
  type: "passport", // passport, visa, insurance, ticket, reservation, other
  expiryDate: "2029-12-31",
  documentNumber: "A1234567",
  issuingCountry: "USA",
  notes: "Renewal needed in 2029",
  fileUrl: "document_url_or_base64",
  isExpired: false,
  isExpiringSoon: false, // calculated field
  createdAt: "2024-01-15T10:30:00Z"
}
```

### 5. **photos** Collection
Stores trip photos and memories.

```javascript
{
  id: "photo_123",
  userId: "user_456",
  tripId: "trip_123",
  fileName: "eiffel_tower.jpg",
  fileUrl: "https://storage.googleapis.com/...",
  caption: "Eiffel Tower at sunset",
  location: "Paris, France",
  coordinates: {
    latitude: 48.8584,
    longitude: 2.2945
  },
  uploadDate: "2024-06-16T18:30:00Z",
  tags: ["landmark", "sunset", "paris"],
  isFavorite: false
}
```

### 6. **users** Collection
Stores user profile information.

```javascript
{
  id: "user_456",
  email: "user@example.com",
  displayName: "John Doe",
  photoURL: "https://...",
  preferences: {
    currency: "USD",
    timezone: "America/New_York",
    language: "en",
    notifications: {
      email: true,
      push: true,
      tripReminders: true,
      documentExpiry: true
    }
  },
  createdAt: "2024-01-01T00:00:00Z",
  lastLogin: "2024-01-15T10:30:00Z"
}
```

### 7. **itinerary** Collection
Stores detailed trip itineraries.

```javascript
{
  id: "itinerary_123",
  tripId: "trip_123",
  userId: "user_456",
  day: 1,
  date: "2024-06-15",
  activities: [
    {
      id: "activity_1",
      title: "Arrive in Paris",
      time: "09:00",
      location: "Charles de Gaulle Airport",
      description: "Flight arrival and airport transfer",
      type: "transport",
      cost: 50.00,
      notes: "Booked Uber in advance"
    }
  ],
  notes: "First day - take it easy, adjust to timezone",
  weather: {
    high: 22,
    low: 15,
    condition: "sunny",
    description: "Partly cloudy"
  }
}
```

## 🔍 Database Indexes

### Composite Indexes

1. **Trips by User and Date**
   - Collection: `trips`
   - Fields: `userId` (ASC), `startDate` (ASC)

2. **Trips by User and Destination**
   - Collection: `trips`
   - Fields: `userId` (ASC), `destination` (ASC)

3. **Trips by User, Type, and Date**
   - Collection: `trips`
   - Fields: `userId` (ASC), `type` (ASC), `startDate` (ASC)

4. **Packing Lists by User and Trip**
   - Collection: `packingLists`
   - Fields: `userId` (ASC), `tripId` (ASC)

5. **Documents by User and Type**
   - Collection: `documents`
   - Fields: `userId` (ASC), `type` (ASC)

6. **Documents by User and Expiry**
   - Collection: `documents`
   - Fields: `userId` (ASC), `expiryDate` (ASC)

7. **Expenses by Trip and Date**
   - Collection: `expenses`
   - Fields: `tripId` (ASC), `date` (DESC)

8. **Photos by Trip and Upload Date**
   - Collection: `photos`
   - Fields: `tripId` (ASC), `uploadDate` (DESC)

## 🔒 Security Rules

### Authentication Required
All collections require user authentication for read/write access.

### User Data Isolation
- Users can only access their own data
- User-specific collections are scoped by `userId`
- Public read access available for shared trips (optional)

### Document Validation
- Required fields are validated
- Data types are enforced
- User ownership is verified

## 📈 Performance Optimizations

### Indexing Strategy
- Composite indexes for common query patterns
- Single-field indexes for filtering
- Descending order for recent data queries

### Data Structure
- Denormalized data for faster reads
- Calculated fields to reduce computation
- Efficient data types (timestamps, numbers)

### Caching
- Client-side caching for frequently accessed data
- Offline support with local storage fallback
- Real-time updates with Firestore listeners

## 🚀 Deployment Status

✅ **Firestore Rules**: Deployed and active
✅ **Database Indexes**: Created and optimized
✅ **Security Rules**: Configured for user isolation
✅ **Collection Structure**: Defined and documented

## 🔧 Database Management

### Backup Strategy
- Automated daily backups
- Point-in-time recovery
- Export to JSON for manual backup

### Monitoring
- Query performance monitoring
- Index usage analytics
- Error rate tracking

### Scaling
- Automatic scaling with Firestore
- Regional replication for global access
- Connection pooling for high traffic

---

**Database Status**: ✅ **ACTIVE AND CONFIGURED**

**Last Updated**: January 2024
**Version**: 1.0.0
**Maintained by**: Bradley Virtual Solutions, LLC
