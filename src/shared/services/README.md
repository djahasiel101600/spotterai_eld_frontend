# API Service Documentation

## Overview

Centralized API communication utility for all HTTP requests across the application. Built on top of axios with interceptors for request/response handling, error management, and consistent configuration.

## Location

`src/shared/services/api.ts`

## Features

- ✅ Centralized axios instance with base configuration
- ✅ Request/response interceptors for global handling
- ✅ Typed API methods for all endpoints
- ✅ Consistent error handling with `handleApiError` utility
- ✅ Environment-based API URL configuration
- ✅ 30-second request timeout
- ✅ Automatic JSON content-type headers

## Configuration

### Environment Variables

Create a `.env` file in the frontend root:

```env
VITE_API_URL=http://localhost:8000
```

If not set, defaults to `http://localhost:8000`

## Usage

### Basic Import

```typescript
import { api, handleApiError } from "@/shared/services";
```

### Available Methods

#### 1. Calculate Trip

Calculate route and HOS compliance for a trip:

```typescript
const data = await api.calculateTrip({
  origin: "New York, NY",
  pickup: "Philadelphia, PA",
  dropoff: "Washington, DC",
  hos_config: hosProfileConfig,
});

// Returns: { route, logs, events }
```

#### 2. Get Route (Future)

```typescript
const route = await api.getRoute(routeId);
```

#### 3. Get HOS Profiles (Future)

```typescript
const profiles = await api.getHosProfiles();
```

#### 4. Save Trip (Future)

```typescript
const { id } = await api.saveTrip(tripData);
```

#### 5. Get Trips (Future)

```typescript
const trips = await api.getTrips();
```

#### 6. Delete Trip (Future)

```typescript
await api.deleteTrip(tripId);
```

### Error Handling

Use the `handleApiError` utility for consistent error messages:

```typescript
try {
  const data = await api.calculateTrip(requestData);
  // Handle success
} catch (error) {
  const errorMessage = handleApiError(error);
  setError(errorMessage);
}
```

## Example: Component Integration

```typescript
import React, { useState } from "react";
import { api, handleApiError } from "@/shared/services";

const MyComponent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.calculateTrip(formData);
      // Handle success
      console.log("Success:", result);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && <Alert severity="error">{error}</Alert>}
      {/* Your component JSX */}
    </div>
  );
};
```

## Interceptors

### Request Interceptor

Currently logs requests. Can be extended to add:

- Authentication tokens
- Custom headers
- Request transformation

```typescript
apiClient.interceptors.request.use((config) => {
  // Add auth token
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Response Interceptor

Handles global error logging. Can be extended to:

- Refresh expired tokens
- Redirect on 401/403
- Show global error notifications

## Adding New Endpoints

1. Define request/response types:

```typescript
interface MyNewRequest {
  param1: string;
  param2: number;
}

interface MyNewResponse {
  data: any;
}
```

2. Add method to api object:

```typescript
export const api = {
  // ...existing methods

  myNewEndpoint: async (data: MyNewRequest): Promise<MyNewResponse> => {
    const response = await apiClient.post<MyNewResponse>(
      "/api/my-endpoint/",
      data,
    );
    return response.data;
  },
};
```

3. Use in components:

```typescript
const result = await api.myNewEndpoint({ param1: "value", param2: 42 });
```

## Benefits

- **DRY Principle**: Single source of truth for all API calls
- **Type Safety**: Full TypeScript support with typed requests/responses
- **Maintainability**: Easy to update base URL, headers, or add new endpoints
- **Error Handling**: Consistent error messages across the app
- **Testability**: Easy to mock for unit tests
- **Flexibility**: Can easily add authentication, logging, retry logic, etc.

## Best Practices

1. Always use `handleApiError` for error messages
2. Add new endpoints to the `api` object rather than using `apiClient` directly
3. Define TypeScript types for all request/response data
4. Use try-catch blocks with proper error handling
5. Set loading states before API calls
6. Clear errors when appropriate (e.g., on form input change)
