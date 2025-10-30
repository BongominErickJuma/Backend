# Good Samaritan Hospital Backend AI Development Guide

This document provides essential context for AI agents working with this Express.js backend codebase.

## Project Architecture

### Core Components

- Express.js backend server with MySQL database
- REST API endpoints under `/gsgh/api/` prefix
- Two main resource domains:
  - Partner Organizations (`/organizations`)
  - Patients (`/patients`)

### Key Files & Directories

- `src/app.js` - Main application setup and middleware configuration
- `src/server.js` - Server initialization
- `src/controllers/` - Business logic for each resource
- `src/routes/` - API route definitions
- `src/config/` - Configuration including database setup
- `src/utils/` - Shared utilities and helpers

## Development Workflow

### Environment Setup

1. Requires Node.js and MySQL
2. Create `.env` file at root with required variables:
   ```
   PORT=5000
   DB_HOST=
   DB_USER=
   DB_PASSWORD=
   DB_NAME=
   ```

### Common Commands

```bash
npm install          # Install dependencies
npm run dev         # Run development server
npm run lint        # Check code style
npm run lint:fix    # Auto-fix code style issues
npm run format      # Format code with Prettier
```

## Project Patterns

### Error Handling

- Use `AppError` class from `utils/appError.js` for consistent error creation
- Wrap async route handlers with `catchAsync` utility
- Global error handler in `controllers/error.controller.js`

### Authentication Flow

- JWT-based authentication implemented in `auth.controller.js`
- Protected routes use `authController.protect` middleware
- Password hashing handled by `utils/hashPassword.js`

### Database Operations

- Use `mysql2` with promise interface
- Database queries are wrapped in the `mySQLAPIFeatures` utility class
- Connection pool configuration in `config/db.config.js`

### API Response Format

Standard response structure:

```javascript
{
  status: 'success' | 'error',
  data: { ... } | null,
}
```

## Key Integration Points

1. Partner Organization API (`/organizations`)
   - Authentication endpoints (login/logout)
   - CRUD operations for organization management
   - Password change functionality

2. Patient Records API (`/patients`)
   - Protected endpoints requiring authentication
   - Manages patient data and records

## Best Practices

1. Always use `catchAsync` wrapper for async route handlers
2. Include proper error status codes and messages
3. Follow existing folder structure for new features
4. Use environment variables for configuration

## Questions?

Contact the Good Samaritan Hospital development team for clarification.
