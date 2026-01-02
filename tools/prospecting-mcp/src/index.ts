#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Configuration
const API_BASE_URL = process.env.PROSPECT_API_URL || 'http://localhost:3001/api/prospect';

// Helper function to make API calls
async function apiCall(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Create server instance
const server = new Server(
  {
    name: 'prospecting-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Search tool (Harv3st integration)
      {
        name: 'search_businesses',
        description: 'Search for businesses in Google Maps using Harv3st scraper and import results to database. Use this when the user asks to find new businesses in a location.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (e.g., "restaurantes en Haedo", "peluquerías en Morón")' },
            headless: { type: 'boolean', description: 'Run browser in headless mode (default: true)' },
            waitForResults: { type: 'boolean', description: 'Wait for search to complete (default: true)' },
            maxWaitSeconds: { type: 'number', description: 'Max seconds to wait for results (default: 120)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'check_harv3st_status',
        description: 'Check if Harv3st scraper is connected and available.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // Lead tools
      {
        name: 'get_leads',
        description: 'Get leads with filters for prospecting. Returns businesses that match criteria.',
        inputSchema: {
          type: 'object',
          properties: {
            minScore: { type: 'number', description: 'Minimum opportunity score (0-100)' },
            maxScore: { type: 'number', description: 'Maximum opportunity score (0-100)' },
            hasWebsite: { type: 'boolean', description: 'Filter by website presence' },
            hasPhone: { type: 'boolean', description: 'Filter by phone presence' },
            hasInstagram: { type: 'boolean', description: 'Filter by Instagram presence' },
            hasEmail: { type: 'boolean', description: 'Filter by email presence' },
            category: { type: 'string', description: 'Filter by business category' },
            includeContacted: { type: 'boolean', description: 'Include already contacted leads' },
            limit: { type: 'number', description: 'Max results to return (default 20)' },
            offset: { type: 'number', description: 'Offset for pagination' },
          },
        },
      },
      {
        name: 'get_lead_detail',
        description: 'Get detailed information about a specific lead including contact history and opportunities.',
        inputSchema: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'The lead ID' },
          },
          required: ['leadId'],
        },
      },
      {
        name: 'enrich_contact',
        description: 'Extract contact information (email, instagram) from the lead\'s website using web scraping.',
        inputSchema: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'The lead ID' },
            fields: {
              type: 'array',
              items: { type: 'string', enum: ['email', 'instagram'] },
              description: 'Fields to extract from website',
            },
          },
          required: ['leadId', 'fields'],
        },
      },
      // Contact tools
      {
        name: 'create_contact_record',
        description: 'Create a new contact record for a lead. Use this to track outreach attempts.',
        inputSchema: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'The lead ID' },
            channel: { type: 'string', enum: ['instagram', 'whatsapp', 'email'], description: 'Contact channel' },
            message: { type: 'string', description: 'The message content' },
            status: { type: 'string', enum: ['pending', 'approved'], description: 'Initial status' },
            notes: { type: 'string', description: 'Optional notes' },
          },
          required: ['leadId', 'channel', 'message'],
        },
      },
      {
        name: 'update_contact_status',
        description: 'Update the status of a contact record (e.g., mark as sent, responded).',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'The contact record ID' },
            status: { type: 'string', enum: ['pending', 'approved', 'sent', 'rejected', 'responded'], description: 'New status' },
            notes: { type: 'string', description: 'Optional notes' },
          },
          required: ['contactId', 'status'],
        },
      },
      {
        name: 'get_contact_history',
        description: 'Get contact history with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['none', 'pending', 'approved', 'sent', 'rejected', 'responded'] },
            channel: { type: 'string', enum: ['instagram', 'whatsapp', 'email'] },
            leadId: { type: 'string', description: 'Filter by specific lead' },
            dateFrom: { type: 'string', description: 'Start date (ISO format)' },
            dateTo: { type: 'string', description: 'End date (ISO format)' },
            limit: { type: 'number', description: 'Max results' },
            offset: { type: 'number', description: 'Offset for pagination' },
          },
        },
      },
      {
        name: 'get_contact_stats',
        description: 'Get contact statistics including totals by status, channel, and response rate.',
        inputSchema: {
          type: 'object',
          properties: {
            dateFrom: { type: 'string', description: 'Start date (ISO format)' },
            dateTo: { type: 'string', description: 'End date (ISO format)' },
          },
        },
      },
      // Template tools
      {
        name: 'get_templates',
        description: 'Get message templates for outreach.',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', enum: ['instagram', 'whatsapp', 'email'] },
            scenario: { type: 'string', enum: ['sin_sitio', 'rating_bajo', 'sin_fotos', 'sin_redes', 'general'] },
          },
        },
      },
      {
        name: 'save_template',
        description: 'Create or update a message template.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Template ID (for updates)' },
            name: { type: 'string', description: 'Template name' },
            channel: { type: 'string', enum: ['instagram', 'whatsapp', 'email'] },
            scenario: { type: 'string', enum: ['sin_sitio', 'rating_bajo', 'sin_fotos', 'sin_redes', 'general'] },
            content: { type: 'string', description: 'Template content with {variables}' },
            isDefault: { type: 'boolean', description: 'Set as default template' },
          },
          required: ['name', 'channel', 'scenario', 'content'],
        },
      },
      // Config tools
      {
        name: 'get_user_config',
        description: 'Get user prospecting configuration including default channel, signature, and handles.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID (optional)' },
          },
        },
      },
      {
        name: 'set_user_config',
        description: 'Update user prospecting configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            userName: { type: 'string', description: 'User name for personalization' },
            companyName: { type: 'string', description: 'Company name' },
            defaultChannel: { type: 'string', enum: ['instagram', 'whatsapp', 'email'] },
            maxContactsPerSession: { type: 'number', description: 'Max contacts per session' },
            signature: { type: 'string', description: 'Message signature' },
            instagramHandle: { type: 'string', description: 'Instagram handle' },
            whatsappNumber: { type: 'string', description: 'WhatsApp number' },
            emailAddress: { type: 'string', description: 'Email address' },
          },
        },
      },
      // Validation tool
      {
        name: 'validate_contact_data',
        description: 'Validate and normalize contact data (phone, email, instagram handle).',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', enum: ['instagram', 'whatsapp', 'email'], description: 'Channel type' },
            value: { type: 'string', description: 'Value to validate' },
          },
          required: ['channel', 'value'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Search tools (Harv3st integration)
      case 'search_businesses': {
        const result = await apiCall('/search', 'POST', {
          query: args?.query,
          headless: args?.headless ?? true,
          waitForResults: args?.waitForResults ?? true,
          maxWaitSeconds: args?.maxWaitSeconds ?? 120,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'check_harv3st_status': {
        const result = await apiCall('/harv3st/status');
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      // Lead tools
      case 'get_leads': {
        const params = new URLSearchParams();
        if (args?.minScore) params.append('minScore', String(args.minScore));
        if (args?.maxScore) params.append('maxScore', String(args.maxScore));
        if (args?.hasWebsite !== undefined) params.append('hasWebsite', String(args.hasWebsite));
        if (args?.hasPhone !== undefined) params.append('hasPhone', String(args.hasPhone));
        if (args?.hasInstagram !== undefined) params.append('hasInstagram', String(args.hasInstagram));
        if (args?.hasEmail !== undefined) params.append('hasEmail', String(args.hasEmail));
        if (args?.category) params.append('category', args.category as string);
        if (args?.includeContacted !== undefined) params.append('includeContacted', String(args.includeContacted));
        if (args?.limit) params.append('limit', String(args.limit));
        if (args?.offset) params.append('offset', String(args.offset));
        
        const result = await apiCall(`/leads?${params.toString()}`);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'get_lead_detail': {
        const result = await apiCall(`/leads/${args?.leadId}`);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'enrich_contact': {
        const result = await apiCall(`/leads/${args?.leadId}/enrich`, 'POST', { fields: args?.fields });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      // Contact tools
      case 'create_contact_record': {
        const result = await apiCall('/contacts', 'POST', {
          leadId: args?.leadId,
          channel: args?.channel,
          message: args?.message,
          status: args?.status,
          notes: args?.notes,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'update_contact_status': {
        const result = await apiCall(`/contacts/${args?.contactId}/status`, 'PATCH', {
          status: args?.status,
          notes: args?.notes,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'get_contact_history': {
        const params = new URLSearchParams();
        if (args?.status) params.append('status', args.status as string);
        if (args?.channel) params.append('channel', args.channel as string);
        if (args?.leadId) params.append('leadId', args.leadId as string);
        if (args?.dateFrom) params.append('dateFrom', args.dateFrom as string);
        if (args?.dateTo) params.append('dateTo', args.dateTo as string);
        if (args?.limit) params.append('limit', String(args.limit));
        if (args?.offset) params.append('offset', String(args.offset));
        
        const result = await apiCall(`/contacts?${params.toString()}`);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'get_contact_stats': {
        const params = new URLSearchParams();
        if (args?.dateFrom) params.append('dateFrom', args.dateFrom as string);
        if (args?.dateTo) params.append('dateTo', args.dateTo as string);
        
        const result = await apiCall(`/contacts/stats?${params.toString()}`);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      // Template tools
      case 'get_templates': {
        const params = new URLSearchParams();
        if (args?.channel) params.append('channel', args.channel as string);
        if (args?.scenario) params.append('scenario', args.scenario as string);
        
        const result = await apiCall(`/templates?${params.toString()}`);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'save_template': {
        const result = await apiCall('/templates', 'POST', {
          id: args?.id,
          name: args?.name,
          channel: args?.channel,
          scenario: args?.scenario,
          content: args?.content,
          isDefault: args?.isDefault,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      // Config tools
      case 'get_user_config': {
        const params = new URLSearchParams();
        if (args?.userId) params.append('userId', args.userId as string);
        
        const result = await apiCall(`/config?${params.toString()}`);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'set_user_config': {
        const result = await apiCall('/config', 'PATCH', {
          userName: args?.userName,
          companyName: args?.companyName,
          defaultChannel: args?.defaultChannel,
          maxContactsPerSession: args?.maxContactsPerSession,
          signature: args?.signature,
          instagramHandle: args?.instagramHandle,
          whatsappNumber: args?.whatsappNumber,
          emailAddress: args?.emailAddress,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      // Validation tool
      case 'validate_contact_data': {
        const result = await apiCall('/validate', 'POST', {
          channel: args?.channel,
          value: args?.value,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Prospecting MCP Server running on stdio');
}

main().catch(console.error);
