# AI Knowledge Base - Frontend

A modern React-based frontend for the AI Knowledge Base Management Platform, providing an intuitive interface for managing knowledge bases, documents, and AI-powered search capabilities.

## Features

- **Authentication**: Integrated with User Center (subproject 0) for unified login
- **Knowledge Base Management**: Create, view, update, and delete knowledge bases
- **Document Management**: Upload and manage documents with support for multiple formats
- **Semantic Search**: AI-powered semantic search across knowledge bases
- **AI Assistant**: Chat interface with streaming responses using Server-Sent Events (SSE)
- **PC Web Interface**: Professional desktop interface optimized for productivity
- **Type Safety**: Full TypeScript support for better developer experience

## Tech Stack

- **React 18.2** - UI library
- **TypeScript 5.3** - Type-safe development
- **Vite 5.0** - Fast build tool and dev server
- **Ant Design 5.12** - Enterprise-grade UI component library
- **React Router 6** - Client-side routing
- **Zustand 4.4** - Lightweight state management
- **TanStack Query** - Data fetching and caching
- **Axios** - HTTP client for API calls

## Project Structure

```
src/
├── components/        # Reusable components
│   └── ProtectedRoute.tsx
├── layouts/          # Layout components
│   └── MainLayout.tsx
├── pages/            # Page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── KnowledgeBases.tsx
│   ├── Documents.tsx
│   ├── Search.tsx
│   └── Assistant.tsx
├── services/         # API service layer
│   ├── api.ts
│   ├── authService.ts
│   ├── knowledgeBaseService.ts
│   ├── documentService.ts
│   └── searchService.ts
├── store/            # State management
│   └── authStore.ts
├── types/            # TypeScript type definitions
│   └── index.ts
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
└── assets/           # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend services running:
  - User Center API (port 8000)
  - Knowledge Base API (port 8080)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_USER_CENTER_API=http://localhost:8000/api/v1
```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## API Integration

The frontend communicates with two backend services:

### 1. User Center API (Subproject 0)
- **Base URL**: `http://localhost:8000/api/v1`
- **Purpose**: Authentication and user management
- **Endpoints**:
  - `POST /auth/login` - User login
  - `GET /auth/me` - Get current user info

### 2. Knowledge Base API (Subproject 1)
- **Base URL**: `http://localhost:8080/api/v1`
- **Purpose**: Knowledge base operations
- **Proxied through Vite**: Requests to `/api` are forwarded to port 8080
- **Endpoints**:
- Knowledge Bases: `/knowledge-bases`
- Documents: `/documents`
- Search: `/search`
- RAG Q&A: `/ask`, `/ask-stream`
- Embedding Proxy: `/embedding` (由后端代理 BGE 服务，前端不再直连)
- Query History: `/query-history`, `/query-stats`

## Authentication Flow

1. User enters credentials on the Login page
2. Frontend sends request to User Center `/auth/login`
3. User Center returns JWT token and user info
4. Token is stored in localStorage and Zustand store
5. All subsequent API calls include the token in `Authorization` header
6. Protected routes check authentication status before rendering

## State Management

### Auth Store (Zustand)
- Manages authentication state
- Persists token and user info to localStorage
- Provides login/logout actions
- Auto-initializes on app load

### React Query
- Handles data fetching and caching
- Manages loading and error states
- Provides automatic refetching and background updates

## Routing

```
/login           - Public: Login page
/                - Protected: Dashboard
/knowledge-bases - Protected: Knowledge base management
/documents       - Protected: Document management
/search          - Protected: Semantic search
/assistant       - Protected: AI Assistant chat
```

## Development Guidelines

### Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation item in `src/layouts/MainLayout.tsx`

### Adding a New API Endpoint

1. Define types in `src/types/index.ts`
2. Add service method in appropriate service file
3. Use TanStack Query hooks for data fetching

### Styling

- Use Ant Design components for consistency
- Theme colors are configured in `App.tsx` under `ConfigProvider`
- Custom styles can be added using CSS modules or inline styles

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Browser Support

**Desktop browsers only** - optimized for 1920x1080 and higher resolutions:
- Chrome (latest) - Recommended
- Firefox (latest)
- Safari (latest) - macOS
- Edge (latest)

**Note**: Mobile browsers are not supported in the current version.

## Current Status

### Completed
- Project setup and configuration
- TypeScript types for all API models
- Complete API service layer
- Authentication with User Center integration
- Protected routing
- Main layout with navigation
- Login page
- Dashboard (placeholder)
- Placeholder pages for all main features

### To Do
- Implement Knowledge Base management page (CRUD operations)
- Implement Document management page (upload, list, delete)
- Implement Semantic Search page with results display
- Implement AI Assistant chat interface with SSE streaming
- Add analytics dashboard with charts
- Add settings page
- Implement error boundaries
- Add loading skeletons
- Add unit and integration tests

## Contributing

This is an internal project. Please follow the established code style and architectural patterns.

## License

Proprietary - SalesChampionHub
