# Changelog

All notable changes to this project will be documented in this file.

## [0.7.0] - 2025-12-10
### Added
- **GMB Audit v0.3.1**: Enhanced audit capabilities with Gemini 2.5 Flash.
- **Deep Analysis**: Added SWOT Analysis, SEO Keyword Intent (Transactional/Informational), Gap Analysis, and Phased Action Plans.
- **Context Awareness**: New inputs for "Zone Context" and "Target Products" to tailor AI advice.
- **PDF Reporting**: Client-side PDF generation for professional audit reports.
- **Map Enhancements**: Visual support for "Synthetic Locations" (competitors without precise coordinates).

## [0.6.0] - 2025-12-09
### Changed
- **Neo-Brutalist Theme**: Complete style normalization across Projects and GMB sections.
- **UI Components**: Standardized "Neo" components (Buttons, Cards, Inputs).
- **Navigation**: Consistent "Back" buttons and header layouts.

## [0.5.0] - 2025-12-08
### Added
- **Client CRM**: New database system to persist "Client" business details (Name, Phone, Address, Rating).
- **Smart Caching**: Implemented PostgreSQL caching layer for GMB Search and Audits (7-day validity) to drastically reduce API usage.
- **AI Upgrade**: Upgraded to `gemini-2.5-flash` model for faster and more accurate extraction.
- **Audit Linking**: Generated audits are now automatically linked to the permanent Client record.

## [0.4.0] - 2025-12-08
### Added
- **GMB Integration**: Full migration of Google My Business Competitor Intel features.
- **Competitor Search**: AI-powered search for local competitors with "Client" detection logic.
- **Audit System**: Deep analysis of business performance, SWOT, and SEO keywords.
- **Unified Backend**: GMB logic migrated to NestJS (`GmbModule`, `GmbService`).
- **Interactive Map**: Leaflet-based map component with radius and keyword search.
- **PDF Reports**: Automated report generation for competitive analysis.

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
