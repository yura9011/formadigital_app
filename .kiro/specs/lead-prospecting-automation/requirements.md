# Requirements Document

## Introduction

This feature automates the lead prospecting workflow for digital marketing services. The system uses MCP (Model Context Protocol) servers and agent skills to sequentially discover businesses in a geographic area, analyze their digital presence (Google Business Profile, social media activity), evaluate marketing improvement opportunities, and generate personalized outreach proposals for qualified leads.

## Glossary

- **MCP_Server**: Model Context Protocol server that provides tools for agents to interact with external services
- **Agent_Skill**: A discrete, reusable capability that an agent can execute as part of a workflow
- **Lead_Prospector**: The orchestration system that coordinates the multi-step prospecting workflow
- **GBP_Analyzer**: Component that evaluates Google Business Profile data quality and completeness
- **Social_Scanner**: Component that analyzes social media presence and activity levels
- **Lead_Scorer**: Component that calculates a prospect's marketing need score based on analysis results
- **Proposal_Generator**: Component that creates personalized email outreach content
- **Prospect**: A business entity discovered during geographic search
- **Qualified_Lead**: A prospect that meets minimum scoring thresholds for outreach
- **Digital_Presence_Report**: Aggregated analysis of a business's online footprint

## Requirements

### Requirement 1: Geographic Business Discovery

**User Story:** As a marketing agency user, I want to search for businesses in a specific geographic area, so that I can identify potential clients in my target market.

#### Acceptance Criteria

1. WHEN a user specifies a location (address, city, or coordinates) and radius, THE Lead_Prospector SHALL discover businesses within that geographic boundary
2. WHEN a user specifies business categories (e.g., "restaurants", "dental clinics"), THE Lead_Prospector SHALL filter results to matching categories
3. WHEN businesses are discovered, THE Lead_Prospector SHALL extract basic information including name, address, phone, website, and Google Maps URI
4. WHEN the discovery process completes, THE Lead_Prospector SHALL store discovered prospects in the database with status "DISCOVERED"
5. IF the geographic search returns no results, THEN THE Lead_Prospector SHALL notify the user and suggest expanding the search radius

### Requirement 2: Google Business Profile Analysis

**User Story:** As a marketing agency user, I want to analyze each prospect's Google Business Profile, so that I can identify optimization opportunities.

#### Acceptance Criteria

1. WHEN a prospect has a Google Business Profile, THE GBP_Analyzer SHALL retrieve profile completeness data (photos, hours, description, categories, attributes)
2. WHEN analyzing a GBP, THE GBP_Analyzer SHALL check for data consistency (address matches website, phone is valid, hours are current)
3. WHEN analyzing a GBP, THE GBP_Analyzer SHALL retrieve review metrics (count, average rating, recent review activity)
4. WHEN analyzing a GBP, THE GBP_Analyzer SHALL identify missing or outdated information fields
5. WHEN GBP analysis completes, THE GBP_Analyzer SHALL generate a GBP_Score (0-100) based on profile quality
6. IF a prospect has no Google Business Profile, THEN THE GBP_Analyzer SHALL flag this as a critical marketing opportunity

### Requirement 3: Social Media Presence Scanning

**User Story:** As a marketing agency user, I want to analyze each prospect's social media presence, so that I can evaluate their digital marketing maturity.

#### Acceptance Criteria

1. WHEN scanning a prospect, THE Social_Scanner SHALL search for official social media accounts (Facebook, Instagram, LinkedIn, Twitter/X)
2. WHEN social accounts are found, THE Social_Scanner SHALL analyze posting frequency over the last 90 days
3. WHEN social accounts are found, THE Social_Scanner SHALL evaluate engagement metrics (likes, comments, shares relative to follower count)
4. WHEN social accounts are found, THE Social_Scanner SHALL check for content consistency across platforms
5. WHEN social scanning completes, THE Social_Scanner SHALL generate a Social_Score (0-100) based on presence and activity
6. IF no social media accounts are found, THEN THE Social_Scanner SHALL flag this as a marketing opportunity

### Requirement 4: Data Coherence Verification

**User Story:** As a marketing agency user, I want to verify that a prospect's online data is consistent across platforms, so that I can identify NAP (Name, Address, Phone) inconsistencies.

#### Acceptance Criteria

1. WHEN verifying data coherence, THE Lead_Prospector SHALL compare business name across GBP, website, and social profiles
2. WHEN verifying data coherence, THE Lead_Prospector SHALL compare address information across all discovered sources
3. WHEN verifying data coherence, THE Lead_Prospector SHALL compare phone numbers across all discovered sources
4. WHEN inconsistencies are found, THE Lead_Prospector SHALL document each discrepancy with source references
5. WHEN coherence verification completes, THE Lead_Prospector SHALL generate a Coherence_Score (0-100) where lower scores indicate more inconsistencies

### Requirement 5: Lead Scoring and Qualification

**User Story:** As a marketing agency user, I want prospects automatically scored and qualified, so that I can focus outreach on businesses most likely to need marketing services.

#### Acceptance Criteria

1. WHEN all analyses complete for a prospect, THE Lead_Scorer SHALL calculate a composite Marketing_Need_Score from GBP_Score, Social_Score, and Coherence_Score
2. WHEN calculating Marketing_Need_Score, THE Lead_Scorer SHALL weight factors: GBP issues (40%), Social gaps (35%), Data inconsistencies (25%)
3. WHEN Marketing_Need_Score exceeds the qualification threshold (configurable, default 60), THE Lead_Scorer SHALL mark the prospect as a Qualified_Lead
4. WHEN a prospect is qualified, THE Lead_Scorer SHALL update the prospect status to "QUALIFIED" in the database
5. WHEN a prospect does not meet the threshold, THE Lead_Scorer SHALL update status to "NOT_QUALIFIED" with reason

### Requirement 6: Personalized Proposal Generation

**User Story:** As a marketing agency user, I want personalized email proposals generated for qualified leads, so that I can efficiently conduct outreach.

#### Acceptance Criteria

1. WHEN a prospect is marked as Qualified_Lead, THE Proposal_Generator SHALL create a personalized email draft
2. WHEN generating a proposal, THE Proposal_Generator SHALL reference specific issues found (e.g., "We noticed your Google reviews haven't been responded to in 3 months")
3. WHEN generating a proposal, THE Proposal_Generator SHALL suggest 2-3 specific improvements relevant to the prospect's gaps
4. WHEN generating a proposal, THE Proposal_Generator SHALL maintain a professional but friendly tone appropriate for cold outreach
5. WHEN proposal generation completes, THE Proposal_Generator SHALL store the email draft linked to the prospect record
6. THE Proposal_Generator SHALL format proposals using configurable email templates

### Requirement 7: MCP Server Integration

**User Story:** As a developer, I want the prospecting workflow to use MCP servers, so that agents can access external tools and APIs in a standardized way.

#### Acceptance Criteria

1. THE Lead_Prospector SHALL expose geographic search as an MCP tool with parameters for location, radius, and categories
2. THE Lead_Prospector SHALL expose GBP analysis as an MCP tool that accepts a business identifier
3. THE Lead_Prospector SHALL expose social scanning as an MCP tool that accepts business name and website
4. THE Lead_Prospector SHALL expose proposal generation as an MCP tool that accepts prospect ID and analysis results
5. WHEN an MCP tool encounters an error, THE Lead_Prospector SHALL return structured error responses with actionable messages
6. THE Lead_Prospector SHALL implement rate limiting to respect external API quotas

### Requirement 8: Workflow Orchestration

**User Story:** As a marketing agency user, I want the prospecting steps to execute sequentially and reliably, so that I can process multiple prospects in a geographic area.

#### Acceptance Criteria

1. WHEN a prospecting job is initiated, THE Lead_Prospector SHALL create a workflow with steps: Discovery → GBP Analysis → Social Scan → Coherence Check → Scoring → Proposal Generation
2. WHEN a workflow step fails, THE Lead_Prospector SHALL retry up to 3 times with exponential backoff
3. WHEN a workflow step fails after retries, THE Lead_Prospector SHALL mark the prospect with error status and continue to next prospect
4. WHEN processing multiple prospects, THE Lead_Prospector SHALL process them in parallel with configurable concurrency (default: 3)
5. WHEN a workflow completes, THE Lead_Prospector SHALL generate a summary report with counts of discovered, qualified, and failed prospects
6. THE Lead_Prospector SHALL persist workflow state to allow resumption after interruption

### Requirement 9: Results Storage and Reporting

**User Story:** As a marketing agency user, I want prospecting results stored and accessible, so that I can review and act on qualified leads.

#### Acceptance Criteria

1. WHEN prospects are processed, THE Lead_Prospector SHALL store all analysis data in the Digital_Presence_Report format
2. WHEN a workflow completes, THE Lead_Prospector SHALL update the Client table with qualified leads (type: LEAD)
3. THE Lead_Prospector SHALL provide an API endpoint to retrieve all qualified leads from a prospecting job
4. THE Lead_Prospector SHALL provide an API endpoint to retrieve the full analysis report for any prospect
5. WHEN storing results, THE Lead_Prospector SHALL include timestamps for each analysis step
