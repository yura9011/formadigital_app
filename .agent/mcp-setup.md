# MCP Prospecting Server Setup

> Servidor MCP para automatizar prospección con herramientas de pipeline, scoring y outreach.

## Requisitos

- Backend corriendo en puerto 3001
- Node.js 18+

## Instalación

```powershell
cd tools/prospecting-mcp
npm install
npm run build
```

## Uso Manual

```powershell
# Iniciar servidor MCP (corre en stdio)
node dist/index.js
```

## Configuración en Cliente MCP

Agregar al config del cliente (ej: Claude Desktop, VSCode + Cline):

```json
{
  "mcpServers": {
    "prospecting": {
      "command": "node",
      "args": ["d:/tareas/exp003 - postix/forma-digital-app/tools/prospecting-mcp/dist/index.js"],
      "env": {
        "PROSPECT_API_URL": "http://localhost:3001/api/prospect",
        "PIPELINE_API_URL": "http://localhost:3001/api/pipeline",
        "SCORING_API_URL": "http://localhost:3001/api/scoring",
        "ENRICH_API_URL": "http://localhost:3001/api/enrich"
      }
    }
  }
}
```

## Tools Disponibles (25+)

### Pipeline
| Tool | Descripción |
|------|-------------|
| `get_pipeline_summary` | Conteo de leads por stage |
| `get_leads_by_stage` | Filtrar leads por etapa |
| `move_lead_to_stage` | Mover lead entre stages |
| `convert_lead` | Convertir lead a cliente |
| `revive_lead` | Revivir lead descartado |

### Contacto
| Tool | Descripción |
|------|-------------|
| `create_contact_record` | Registrar intento de contacto |
| `update_contact_status` | Actualizar estado (sent/responded) |
| `get_contact_history` | Ver historial de contactos |

### Búsqueda
| Tool | Descripción |
|------|-------------|
| `search_businesses` | Buscar negocios en Google Maps via Harv3st |
| `enrich_instagram` | Enriquecer lead con datos de IG |

### Scoring
| Tool | Descripción |
|------|-------------|
| `get_scoring_rules` | Ver reglas de puntuación |
| `get_score_breakdown` | Desglose de score de un lead |
| `recalculate_scores` | Recalcular todos los scores |

## Ejemplo de Uso

```javascript
// Con MCP conectado, el agente puede:
await move_lead_to_stage({ leadId: "abc123", toStage: "CONTACTED" });
await create_contact_record({ leadId: "abc123", channel: "whatsapp", message: "..." });
```
