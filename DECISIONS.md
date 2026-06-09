# Decisiones Tomadas - Simplificación de Forma Digital

**Fecha:** 2026-06-09
**Branch:** `agent/simplification-plan`

---

## Resumen de Decisiones

| # | Decisión | Elección | Justificación |
|---|----------|----------|---------------|
| 1 | Gestión de proyectos | Mantener simplificada | Útil post-conversión, reducir de ~800 a ~400 líneas |
| 2 | Instagram enrichment | Mover a legacy | Guardar por si acaso, no eliminar completamente |
| 3 | Scripts/ legacy | Eliminar todo | 3 sistemas no usados en producción |
| 4 | Documentación duplicada | Consolidar | 6 archivos obsoletos/duplicados |
| 5 | Código muerto | Eliminar completo | No aporta valor, solo agrega confusión |

---

## Detalle de Decisiones

### Decisión 1: Gestión de Proyectos

**Opciones evaluadas:**
1. Eliminar completamente (~800 líneas eliminadas)
2. Mantener simplificada (~400 líneas eliminadas)
3. Mantener completa (0 líneas eliminadas)

**Elección:** Mantener simplificada

**Justificación:**
- Los proyectos son útiles después de que un lead se convierte en cliente
- Se puede reducir la funcionalidad eliminando templates y adjuntos complejos
- Mantener: crear proyecto, fases básicas, assignación
- Eliminar: ProjectTemplate, PhaseAttachment, gestión compleja de fases

**Líneas afectadas:**
- `gmb.service.ts`: eliminar lógica de templates (~100 líneas)
- `gmb.controller.ts`: eliminar endpoints de templates (~50 líneas)
- `projects/page.tsx`: simplificar UI (~300 líneas)
- `schema.prisma`: eliminar ProjectTemplate (~10 líneas)

---

### Decisión 2: Instagram Enrichment

**Opciones evaluadas:**
1. Eliminar completamente (~440 líneas eliminadas)
2. Mantener como está (dependencia ProspectModule → PipelineModule)
3. Mover a legacy (guardar por si acaso)

**Elección:** Mover a legacy

**Justificación:**
- El usuario quiere conservar la funcionalidad por si acaso
- No debe ser parte del código activo (agrega complejidad innecesaria)
- Mover a `legacy/` permite referencia futura sin impacto actual
- ProspectModule deja de depender de PipelineModule

**Acciones concretas:**
- Crear `legacy/pipeline-enrichment.service.ts`
- Actualizar ProspectModule para no importar PipelineModule
- Eliminar `enrichInstagramBatch()` de ProspectService
- Documentar en README de legacy que es código de referencia

---

### Decisión 3: Scripts Legacy

**Opciones evaluadas:**
1. Eliminar todo
2. Mover a `scripts/_archive/`
3. Dejar como está

**Elección:** Eliminar todo

**Justificación:**
- 3 sistemas de scraping paralelos no usados en producción
- Código experimental/de desarrollo que confunde
- El sistema activo es `services/harv3st/`
- Si se necesita en el futuro, está en el historial de git

**Archivos a eliminar:**
- `scripts/prospecting_local.py` (612 líneas)
- `scripts/llm_extractor.py`
- `scripts/main_orchestrator.py`
- `scripts/skills/` (completo)
- `scripts/utils/`
- `scripts/agent_v2/` (completo)
- `scripts/prospecting_results/`
- `scripts/logs/`
- `scripts/run_prospecting.bat`
- `scripts/setup_env.bat`

---

### Decisión 4: Documentación

**Opciones evaluadas:**
1. Mantener todo (12 archivos de docs)
2. Consolidar a docs esenciales
3. Reescribir desde cero

**Elección:** Consolidar a docs esenciales

**Justificación:**
- 6 archivos duplican el mismo contenido (setup/install/development)
- AGENT.MD es obsoleto y contradice la arquitectura actual
- docs/STATUS.md, docs/ARCHITECTURE.md, docs/RUNBOOK.md son la fuente canónica

**Archivos a eliminar:**
- `AGENT.MD` (obsoleto)
- `SETUP.md` (duplica RUNBOOK.md)
- `INSTALACION.md` (duplica SETUP.md)
- `DEVELOPMENT.md` (duplica RUNBOOK.md)
- `TODO-UNIFICACION.md` (features ya implementados)
- `.agent/context.md` (5 meses desactualizado)
- `.agent/sessions/` (logs históricos)

**Archivos a mantener:**
- `AGENTS.md` (reglas para agentes)
- `README.md` (overview del proyecto)
- `CHANGELOG.md` (historial de cambios)
- `CODING_GUIDELINES.md` (estándares de código)
- `SALES_PLAYBOOK.md` (guía de ventas)
- `docs/STATUS.md` (estado actual)
- `docs/ARCHITECTURE.md` (arquitectura)
- `docs/RUNBOOK.md` (operaciones)

---

### Decisión 5: Código Muerto

**Opciones evaluadas:**
1. Mantener por si acaso
2. Eliminar completo

**Elección:** Eliminar completo

**Justificación:**
- El código muerto agrega confusión y dificulta la navegación
- Si se necesita en el futuro, está en el historial de git
- Los componentes sin imports no se están ejecutando
- Los endpoints sin frontend calls no se están usando

**Categorías de eliminación:**
1. **Harv3st duplicados** -archivos idénticos o muertos
2. **Componentes frontend** - sin imports de ninguna página
3. **Servicios backend** - sin inyección ni uso
4. **Paquetes NPM** - sin imports en código
5. **Artefactos de git** - JSONs, logs, resultados de tests

---

## Preguntas Pendientes (para futuras iteraciones)

1. **¿Mover Instagram enrichment a `legacy/` o crear un servicio standalone?**
   - Estado: Pendiente decisión
   - Impacto: ~440 líneas, dependencia entre módulos

2. **¿Mantener `services/harv3st/core/campaign.py` o eliminarlo?**
   - Estado: Pendiente decisión
   - Impacto: ~320 líneas, funcionalidad de campañas batch

3. **¿Qué hacer con `services/harv3st/core/scoring.py`?**
   - Estado: Se usa por `/api/data/scored`
   - Impacto: ~235 líneas, scoring v2.0

4. **¿Consolidar los servicios de prospect en uno solo o mantener separados?**
   - Estado: Fase 4 del plan
   - Impacto: Reorganización de ~1,463 líneas

5. **¿Eliminar endpoints no usados del backend o mantenerlos para futuro?**
   - Estado: Fase 1 del plan
   - Impacto: ~22 endpoints, ~500 líneas

---

## Registro de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-06-09 | Creación del documento | Agente de simplificación |

---

*Documento generado el 2026-06-09. Actualizar conforme se tomen nuevas decisiones.*
