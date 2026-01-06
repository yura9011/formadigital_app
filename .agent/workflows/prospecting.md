# Prospecting Workflow Guide

Este archivo guía a los agentes de IA (Kiro, Claude, Cline) en el flujo de prospección automatizada.

## Pipeline de Prospección

El pipeline tiene 6 etapas:
- **DISCOVERED** 🔍 - Leads recién encontrados/importados
- **ANALYZED** 📊 - Leads analizados con score y gaps
- **CONTACTED** 📨 - Se envió al menos un mensaje
- **RESPONDED** 💬 - El lead respondió
- **CONVERTED** 🎉 - Se convirtió en cliente
- **DISCARDED** 🗑️ - Descartado (puede revivirse)

### Transiciones Válidas
```
DISCOVERED → ANALYZED → CONTACTED → RESPONDED → CONVERTED
     ↓           ↓           ↓           ↓
  DISCARDED  DISCARDED  DISCARDED  DISCARDED
     ↓
  DISCOVERED (revival)
```

## Flujo de Prospección UNIFICADO

### 0. Buscar NUEVOS Negocios (Harv3st)
**IMPORTANTE**: Cuando el usuario pide "buscar negocios" o "encontrar restaurantes en X", usa `search_businesses` para buscar en Google Maps:

```
# Buscar nuevos negocios en una zona
search_businesses(query="restaurantes en Haedo")
search_businesses(query="peluquerías en Morón")
search_businesses(query="gimnasios en Ramos Mejía")
```

Esto:
1. Llama a Harv3st para scrapear Google Maps
2. Importa los resultados a la base de datos (stage: DISCOVERED)
3. Calcula el score de oportunidad automáticamente
4. Retorna los leads importados listos para prospectar

Antes de buscar, verifica que Harv3st esté conectado:
```
check_harv3st_status()
```

### 1. Ver Estado del Pipeline
Usa `get_pipeline_summary` para ver cuántos leads hay en cada etapa:

```
get_pipeline_summary()
# Retorna: { total: 150, byStage: { DISCOVERED: 80, ANALYZED: 30, ... } }
```

### 2. Buscar Leads por Etapa
Usa `get_leads_by_stage` para filtrar por etapa del pipeline:

```
# Ver leads descubiertos ordenados por score
get_leads_by_stage(stage="DISCOVERED", sortBy="score", sortOrder="desc")

# Ver leads contactados
get_leads_by_stage(stage="CONTACTED", limit=20)

# Buscar por nombre
get_leads_by_stage(stage="ANALYZED", search="restaurante")
```

### 3. Analizar Lead y Mover a ANALYZED
Usa `get_lead_detail` para obtener información completa:

```
get_lead_detail(leadId="...")
```

Esto retorna:
- Datos del negocio (nombre, dirección, contacto)
- Score breakdown (qué reglas aplicaron)
- Historial de transiciones
- Datos de Instagram si están enriquecidos

Luego mueve el lead a ANALYZED:
```
move_lead_to_stage(leadId="...", toStage="ANALYZED")
```

### 4. Enriquecer con Instagram
Si el lead tiene Instagram, enriquece los datos:

```
# Si ya tiene el handle guardado
enrich_instagram(leadId="...")

# Si necesitas especificar el handle
enrich_instagram(leadId="...", handle="@negocio")
```

Esto obtiene: followers, posts, última publicación, bio.

### 5. Ver Score Breakdown
Para entender por qué un lead tiene cierto score:

```
get_score_breakdown(leadId="...")
# Retorna: { total: 65, components: [{ ruleName: "Sin sitio web", points: 25, applied: true }, ...] }
```

### 6. Contactar Lead
Después de preparar y enviar el mensaje:

```
# Mover a CONTACTED
move_lead_to_stage(leadId="...", toStage="CONTACTED")
```

### 7. Registrar Respuesta
Cuando el lead responde:

```
move_lead_to_stage(leadId="...", toStage="RESPONDED")
```

### 8. Convertir a Cliente
Cuando se cierra el trato:

```
convert_lead(leadId="...", projectName="Desarrollo Web", projectDetails="Landing page + SEO")
```

Esto:
- Cambia el tipo a CLIENT
- Mueve a stage CONVERTED
- Crea un Project vinculado

### 9. Descartar Lead
Si el lead no es viable:

```
move_lead_to_stage(leadId="...", toStage="DISCARDED", reason="No interesado")
```

### 10. Revivir Lead Descartado
Si un lead descartado vuelve a ser relevante:

```
revive_lead(leadId="...", reason="Volvió a contactar")
```

### 11. Ver Historial de un Lead
Para ver todas las transiciones de un lead:

```
get_lead_history(leadId="...")
```

### 12. Ver Métricas del Pipeline
Para ver estadísticas generales:

```
get_pipeline_metrics()
# Retorna: { conversionRate: 15.5, averageDaysPerStage: {...}, topCategories: [...] }
```

### 13. Ver Reglas de Scoring
Para entender cómo se calculan los scores:

```
get_scoring_rules()
```

### 14. Recalcular Scores
Si cambian las reglas de scoring:

```
recalculate_scores()
```

## Ejemplos de Prompts del Usuario

### "Buscar restaurantes en Haedo" / "Encontrar negocios en X"
1. Verifica conexión con `check_harv3st_status()`
2. Usa `search_businesses(query="restaurantes en Haedo")`
3. Presenta los leads importados con sus scores
4. Sugiere próximos pasos (analizar los de mayor score)

### "¿Cómo está el pipeline?" / "Estado de prospección"
1. Usa `get_pipeline_summary()`
2. Presenta conteo por etapa
3. Usa `get_pipeline_metrics()` para métricas adicionales

### "Ver leads para analizar"
1. Usa `get_leads_by_stage(stage="DISCOVERED", sortBy="score", sortOrder="desc")`
2. Presenta los top leads con sus scores

### "Analizar este negocio: [nombre]"
1. Busca el lead por nombre
2. Usa `get_lead_detail(leadId="...")`
3. Presenta score breakdown y oportunidades
4. Sugiere mover a ANALYZED si corresponde

### "Enriquecer Instagram de [negocio]"
1. Usa `enrich_instagram(leadId="...", handle="@negocio")`
2. Presenta los datos obtenidos

### "Convertir [negocio] a cliente"
1. Verifica que esté en RESPONDED
2. Usa `convert_lead(leadId="...", projectName="...")`
3. Confirma la conversión

### "Descartar [negocio]"
1. Usa `move_lead_to_stage(leadId="...", toStage="DISCARDED", reason="...")`
2. Confirma el descarte

### "Revivir [negocio]"
1. Usa `revive_lead(leadId="...", reason="...")`
2. Confirma que volvió a DISCOVERED

## Configuración Inicial

Antes de empezar, configura tus datos:

```
set_user_config(
  userName="Tu Nombre",
  companyName="Forma Digital",
  defaultChannel="instagram",
  instagramHandle="formadigital",
  signature="Saludos, [Tu Nombre] - Forma Digital"
)
```

## Validación de Datos

Antes de contactar, valida los datos:

```
validate_contact_data(channel="whatsapp", value="+5491155551234")
validate_contact_data(channel="email", value="contacto@negocio.com")
validate_contact_data(channel="instagram", value="@negocio_ok")
```
