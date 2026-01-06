---
description: Preparar y enviar mensaje a un lead específico
---

## Pasos

1. **Buscar el lead**
   - En sesión actual (`.agent/sessions/`)
   - O en backend (API `/api/pipeline/leads`)

2. **Verificar datos de contacto**
   ```
   - Teléfono (WhatsApp) → Prioridad 1
   - Instagram → Prioridad 2
   - Email → Prioridad 3
   ```

3. **Identificar hook/gap**
   - Sin sitio web
   - SSL/web caída
   - Pocas reviews
   - Instagram abandonado
   - Link web apunta a Instagram

4. **Generar mensaje**
   - Ver `SALES_PLAYBOOK.md` sección "La Propuesta"
   - Personalizar con datos específicos del lead

5. **Presentar al usuario**
   - Mostrar mensaje para aprobación
   - Esperar confirmación

6. **Después de enviar** (IMPORTANTE: Sync con Backend)
   - Actualizar status a `CONTACTED` en sesión .md
   - **Sincronizar con backend:**
     ```
     POST http://localhost:3001/api/pipeline/leads/{leadId}/contact
     Body: {
       "channel": "whatsapp" | "instagram" | "email",
       "contactedAt": "2026-01-06T12:00:00Z",
       "notes": "Hook: [descripción del hook usado]"
     }
     ```
   - Esto mueve automáticamente el lead a stage `CONTACTED`

## Si no tenés acceso al backend

Anotar en la sesión para sync manual posterior:
```
- **Lead X** - CONTACTED (pendiente sync backend)
  - Canal: WhatsApp
  - Fecha: 2026-01-06 12:00
  - Hook: SSL caído
```
