# Agent V2 - Sistema de Prospección Automatizado

Sistema CLI para prospección de leads con validación, scoring y outreach automatizado.

## Instalación

```bash
cd forma-digital-app/scripts/agent_v2
pip install -r requirements.txt
```

## Componentes Principales

### 1. Validación de Leads (`skills/validation.py`)
- `PhoneValidatorSkill`: Valida teléfonos argentinos, genera links de WhatsApp
- Soporta móviles (11, 15, códigos de área) y fijos

### 2. Scoring (`skills/scoring.py`)
- `ContactabilityScorer`: Calcula score 0-100 de contactabilidad
- Factores: móvil válido (+30), Instagram (+25), email (+15), website (+10)
- Status: `ready` (≥60) o `needs_review` (<60)

### 3. Outreach (`skills/outreach/`)
- `OutreachQueueManager`: Cola diaria de leads a contactar
- `TemplateManager`: Templates de mensajes con variables `{{business_name}}`
- `SequenceManager`: Secuencias de follow-up multi-canal
- `CampaignManager`: Gestión de campañas con criterios de segmentación
- `ContactHistoryTracker`: Historial de contactos
- `FAQManager`: Respuestas predefinidas para preguntas comunes

## CLI de Outreach

```bash
# Ver cola del día
python cli_outreach.py queue

# Obtener siguiente lead
python cli_outreach.py next

# Preparar mensaje
python cli_outreach.py send <lead_id>

# Templates
python cli_outreach.py templates list
python cli_outreach.py templates render whatsapp_initial --business-name "Mi Negocio"

# Secuencias
python cli_outreach.py sequences list
python cli_outreach.py sequences start <lead_id>

# Campañas
python cli_outreach.py campaigns list
python cli_outreach.py campaigns create "Mi Campaña" --locations "Castelar,Morón"

# Métricas
python cli_outreach.py metrics daily
```

## Tests

```bash
# Todos los tests
python -m pytest tests/ -v

# Solo outreach
python -m pytest tests/test_outreach/ -v

# Test de flujo completo
python test_outreach_flow.py
```

## Estructura de Datos

```
data/
├── config/
│   └── rate_limits.json
├── templates/
│   ├── whatsapp_templates.json
│   ├── instagram_templates.json
│   └── email_templates.json
├── sequences/
│   └── default_sequences.json
├── campaigns/
├── queue/
└── history/
```

## Rate Limits

| Canal | Límite Diario | Límite Horario |
|-------|---------------|----------------|
| WhatsApp | 50 | 10 |
| Instagram | 30 | 5 |
| Email | 100 | 20 |

## Documentación Adicional

- [Workflow de Validación](/.kiro/steering/lead-validation-workflow.md)
- [Workflow de Outreach](/.kiro/steering/outreach-workflow.md)
