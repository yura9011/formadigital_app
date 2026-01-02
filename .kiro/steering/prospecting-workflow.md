# Prospecting Workflow Guide

Este archivo guía a los agentes de IA (Kiro, Claude, Cline) en el flujo de prospección automatizada.

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
2. Importa los resultados a la base de datos
3. Calcula el score de oportunidad automáticamente
4. Retorna los leads importados listos para prospectar

Antes de buscar, verifica que Harv3st esté conectado:
```
check_harv3st_status()
```

### 1. Buscar Leads EXISTENTES
Usa `get_leads` para filtrar negocios YA en la base de datos:

```
# Buscar negocios sin sitio web (oportunidad de desarrollo)
get_leads(hasWebsite=false, minScore=50, limit=10)

# Buscar negocios con buen rating pero sin presencia digital
get_leads(hasInstagram=false, minScore=60)
```

### 2. Analizar Lead
Usa `get_lead_detail` para obtener información completa:

```
get_lead_detail(leadId="...")
```

Esto retorna:
- Datos del negocio (nombre, dirección, contacto)
- Historial de contactos previos
- Oportunidades detectadas
- Escenario sugerido para el template

### 3. Enriquecer Datos (Opcional)
Si el lead tiene sitio web pero falta email/instagram:

```
enrich_contact(leadId="...", fields=["email", "instagram"])
```

### 4. Preparar Mensaje
Obtén templates y personaliza:

```
# Obtener templates para el escenario
get_templates(channel="instagram", scenario="sin_sitio")

# Obtener config del usuario para personalización
get_user_config()
```

Variables disponibles en templates:
- `{nombre}` - Nombre del negocio
- `{usuario}` - Tu nombre
- `{empresa}` - Tu empresa
- `{firma}` - Tu firma

### 5. Crear Registro de Contacto
Registra el intento de contacto:

```
create_contact_record(
  leadId="...",
  channel="instagram",
  message="Mensaje personalizado...",
  status="pending"
)
```

### 6. Aprobar y Enviar
El usuario revisa y aprueba el mensaje. Luego actualiza el estado:

```
# Cuando el usuario aprueba
update_contact_status(contactId="...", status="approved")

# Cuando se envía el mensaje
update_contact_status(contactId="...", status="sent")

# Si hay respuesta
update_contact_status(contactId="...", status="responded", notes="Interesado en cotización")
```

### 7. Revisar Estadísticas
Monitorea el progreso:

```
get_contact_stats()
```

## Ejemplos de Prompts del Usuario

### "Buscar restaurantes en Haedo" / "Encontrar negocios en X"
1. Verifica conexión con `check_harv3st_status()`
2. Usa `search_businesses(query="restaurantes en Haedo")`
3. Presenta los leads importados con sus scores
4. Sugiere próximos pasos (filtrar, analizar, contactar)

### "Buscar negocios para prospectar" (en base de datos existente)
1. Usa `get_leads` con filtros apropiados
2. Presenta lista resumida con oportunidades

### "Analizar este negocio: [nombre]"
1. Busca el lead por nombre
2. Usa `get_lead_detail`
3. Presenta oportunidades y sugiere acción

### "Preparar mensaje para [negocio]"
1. Obtén detalle del lead
2. Obtén template apropiado
3. Personaliza con datos del negocio
4. Crea registro de contacto en estado "pending"

### "Marcar como enviado el mensaje a [negocio]"
1. Busca el contacto pendiente
2. Actualiza estado a "sent"

### "¿Cómo vamos con la prospección?"
1. Usa `get_contact_stats`
2. Presenta resumen de actividad

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
