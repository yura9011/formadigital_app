# TODO: Unificación del Flujo de Prospección

## Visión

Unificar el flujo completo de prospección en una experiencia integrada que conecte:
1. **Búsqueda GMB** → Encontrar negocios en Google Maps
2. **Análisis** → Evaluar oportunidades y gaps
3. **Prospección** → Contactar y hacer seguimiento
4. **CRM** → Gestionar relación con clientes

## Estado Actual

### Módulos Existentes

| Módulo | Ruta | Función | Estado |
|--------|------|---------|--------|
| GMB Analysis | `/gmb` | Buscar y analizar negocios | ✅ Funcional |
| Negocios | `/negocios` | Lista de leads | ✅ Funcional |
| CRM | `/crm` | Gestión de clientes | ✅ Funcional |
| Prospección | `/prospect` | Contacto automatizado | ✅ Nuevo |

### Flujo Actual (Fragmentado)

```
[GMB] → Buscar negocios → Guardar como Client
         ↓
[Negocios] → Ver lista de leads
         ↓
[CRM] → Gestionar manualmente
         ↓
[Prospección] → Contactar (nuevo módulo)
```

## Flujo Propuesto (Unificado)

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO UNIFICADO                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. DESCUBRIR                                               │
│     └─ Buscar en GMB por zona/categoría                     │
│     └─ Importar desde CSV/Excel                             │
│     └─ Scraping de directorios                              │
│                    ↓                                        │
│  2. ANALIZAR                                                │
│     └─ Score automático (0-100)                             │
│     └─ Detectar gaps (sin web, sin redes, rating bajo)      │
│     └─ Enriquecer datos (email, instagram desde web)        │
│                    ↓                                        │
│  3. PROSPECTAR                                              │
│     └─ Seleccionar leads por score/filtros                  │
│     └─ Preparar mensaje con template                        │
│     └─ Aprobar → Enviar → Seguimiento                       │
│                    ↓                                        │
│  4. CONVERTIR                                               │
│     └─ Lead responde → Agendar reunión                      │
│     └─ Crear proyecto                                       │
│     └─ Pasar a CRM como cliente activo                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Componentes a Refactorizar

### 1. Modelo de Datos

**Actual:**
- `Client` tiene campos de GMB + prospección mezclados
- `type` diferencia LEAD/CLIENT/COMPETITOR

**Propuesto:**
- Mantener `Client` como entidad central
- Agregar `stage` para el pipeline: DISCOVERED → ANALYZED → CONTACTED → RESPONDED → CONVERTED
- Agregar `source` para tracking: GMB, IMPORT, MANUAL

### 2. UI Unificada

**Propuesta: Dashboard de Pipeline**

```
┌──────────────────────────────────────────────────────────────┐
│  🎯 Pipeline de Prospección                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Descubiertos]  [Analizados]  [Contactados]  [Convertidos]  │
│      (45)           (32)          (12)           (3)         │
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │ Lead 1  │ →  │ Lead 2  │ →  │ Lead 3  │ →  │ Lead 4  │   │
│  │ Lead 5  │    │ Lead 6  │    │ Lead 7  │    │         │   │
│  │ ...     │    │ ...     │    │         │    │         │   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3. Acciones Contextuales

Cada etapa tiene acciones específicas:

| Etapa | Acciones |
|-------|----------|
| Descubiertos | Analizar, Descartar |
| Analizados | Enriquecer, Preparar contacto |
| Contactados | Ver historial, Cambiar estado, Agendar |
| Convertidos | Crear proyecto, Ver en CRM |

## Próximos Pasos

### Fase 1: Integración Backend (1-2 días)
- [ ] Agregar campo `stage` a modelo Client
- [ ] Crear endpoint `/api/pipeline` con vista unificada
- [ ] Migrar datos existentes

### Fase 2: UI Unificada (2-3 días)
- [ ] Crear página `/pipeline` con vista Kanban
- [ ] Drag & drop entre etapas
- [ ] Acciones contextuales por etapa

### Fase 3: Automatización (1-2 días)
- [ ] Triggers automáticos (ej: respuesta → notificación)
- [ ] Recordatorios de seguimiento
- [ ] Reportes de conversión

### Fase 4: MCP Unificado (1 día)
- [ ] Unificar tools de GMB + Prospección
- [ ] Steering file actualizado con flujo completo

## Métricas de Éxito

- **Tasa de conversión**: % de leads que pasan a clientes
- **Tiempo de ciclo**: Días promedio desde descubrimiento hasta conversión
- **Eficiencia de contacto**: % de respuestas sobre contactos enviados
- **Cobertura**: % de leads analizados sobre descubiertos

## Notas

- El módulo de Prospección actual es el primer paso hacia esta unificación
- Los templates y el sistema de contacto ya están listos
- El MCP Server permite automatización via agentes de IA
- La UI de `/prospect` puede evolucionar hacia el pipeline unificado
