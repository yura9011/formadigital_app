---
description: Ejecutar una sesión de prospección completa
---

## Pre-requisitos
- Backend corriendo (`apps/backend`)
- Acceso a WhatsApp/Instagram para contactar

## Pasos

1. **Verificar estado actual**
   - Leer `.agent/context.md`
   - Revisar última sesión en `.agent/sessions/`

2. **Evaluar leads pendientes**
   - Si hay leads con status `DISCOVERED` → continuar contactando
   - Si no hay leads → preguntar zona/rubro al usuario

3. **Buscar nuevos leads** (si necesario)
   
   Editar `SEARCH_TASKS` en el script (líneas 69-73):
   ```python
   # En scripts/prospecting_local.py:
   SEARCH_TASKS = [
       {"keyword": "restaurante", "location": "Haedo, Buenos Aires"},
   ]
   ```
   Luego ejecutar:
   ```bash
   cd scripts
   python prospecting_local.py
   ```

4. **Importar al backend**
   ```bash
   cd scripts
   python import_leads_to_api.py
   ```

5. **Contactar leads**
   - Ver `/contact-lead` workflow
   - Usar SALES_PLAYBOOK.md para mensajes

6. **Actualizar sesión**
   - Crear/actualizar `.agent/sessions/Prospecting_Session_[FECHA].md`
   - Marcar leads contactados
