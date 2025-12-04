# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2025-12-03
### Added
- **Neo-Brutalist UI**: Complete redesign of the Analytics page and core components.
- **Analytics Dashboard**: Real-time fetching of Instagram Reach and Profile Views.
- **Design System**: `NeoButton`, `NeoCard`, `NeoInput` components with Tailwind v4 configuration.
- **Changelog Page**: New UI section to track version history.

### Fixed
- **API Permissions**: Resolved `(#10) Application does not have permission` by updating Access Token.
- **Data Normalization**: Fixed issue where Instagram API returned `total_value` instead of `values` array.
- **Crash**: Fixed `TypeError` in Analytics page when data was missing.

## [0.2.0] - 2025-12-02
### Added
- **Media System**: Backend support for image uploads via Multer.
- **Post Composer**: Basic UI for creating and scheduling posts.
- **Instagram Integration**: Initial connection and data seeding.

## [0.1.0] - 2025-12-01
### Added
- **Project Setup**: Initial Monorepo structure (NestJS + Next.js).
- **Database**: PostgreSQL + Prisma configuration.
- **Authentication**: Basic NextAuth setup.
