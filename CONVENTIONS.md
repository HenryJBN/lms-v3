# Project Conventions & Structure

This document outlines the folder structure and coding conventions for the `lms-v3` project. Following these rules ensures consistency across the codebase.

## 🏗️ Folder Structure

### Frontend (Next.js 14 App Router)
- `app/`: Contains the main routing logic, layouts, and pages.
  - `admin/`: Admin-specific pages and management.
  - `system-admin/`: Super admin / Onboarding management.
  - `(auth)/`: Authentication flows (login, signup, etc.).
- `components/`: Reusable React components.
  - `ui/`: Atomic UI primitives (shadcn/ui).
  - `admin/`: Specialized admin dashboard components.
  - `course/`: Course-related components (players, cards, forms).
- `lib/`: Core utilities and shared logic.
  - `schemas/`: **[CRITICAL]** All Zod validation schemas for forms and API interfaces.
  - `services/`: API interaction logic and abstraction layers.
  - `utils/`: Helper functions and formatting utilities.
  - `hooks/`: Custom React hooks.
  - `contexts/`: React Context providers.
- `types/`: Global TypeScript definitions.
- `styles/`: Global CSS and Tailwind configurations.

### Backend (FastAPI)
- `backend/`: Core backend directory.
  - `routers/`: API endpoint definitions (organized by feature).
  - `models/`: SQLAlchemy ORM database models.
  - `schemas/`: Pydantic models for request/response validation (DTOs).
  - `middleware/`: Custom FastAPI middleware.
  - `utils/`: Common Python utilities.
  - `tasks/`: Celery background tasks.
  - `database/`: Session management and connection logic.

## 🛠️ Coding Conventions

- **Form Validation**: Always use Zod for frontend validation and place the schemas in `lib/schemas/`.
- **API Interaction**: Use the standard `api-client` and service pattern in `lib/services/`.
- **Aesthetics**: Maintain a premium feel (glassmorphism, smooth transitions, dark mode support).
- **Multi-tenancy**: Ensure any new routes or logic are site-aware and handle tenant headers correctly.
- **Backend Style**: Follow PEP8 for backend code and use Pydantic for data validation.
