# Guía para agentes

Este archivo es la entrada obligatoria para cualquier agente que trabaje en Forma Digital.

## Fuentes de verdad

Leer en este orden antes de modificar código:

1. `AGENTS.md`: reglas de trabajo.
2. `docs/STATUS.md`: estado actual, riesgos y siguiente trabajo recomendado.
3. `docs/ARCHITECTURE.md`: componentes y contratos principales.
4. `docs/RUNBOOK.md`: desarrollo, deploy y operación.

Los archivos bajo `.agent/` y `.github/agents/` contienen contexto histórico o flujos especializados. No reemplazan estos cuatro documentos ni el código actual.

## Reglas obligatorias

- GitHub `main` es la fuente de verdad del código.
- Trabajar localmente y desplegar mediante el workflow existente. No editar código directamente en producción.
- No usar Docker en el VPS. Docker Compose se usa solo para PostgreSQL y Redis locales.
- En el VPS, trabajar únicamente dentro de `/opt/data/formadigital_app`; no tocar servicios ajenos.
- No mostrar, registrar ni versionar secretos, contraseñas, tokens o contenido de `.env`.
- No ejecutar `prisma db push` en producción. Usar migraciones versionadas y `prisma migrate deploy`.
- No ejecutar seeds automáticamente en producción.
- No borrar datos ni usuarios sin verificar relaciones y obtener confirmación cuando corresponda.
- Mantener los cambios acotados. No mezclar refactors ajenos con la tarea actual.

## Trabajo paralelo entre agentes

- Crear o tomar una GitHub Issue con objetivo y criterio de aceptación claros.
- Cada agente usa su propia rama `agent/<issue>-<descripcion>` y su propio worktree o clon.
- No asignar dos agentes a los mismos archivos o responsabilidad sin coordinación explícita.
- Cada agente entrega commits pequeños, validaciones ejecutadas y notas de riesgos.
- Integrar ramas a `main` de a una; después de cada integración esperar CI verde antes de integrar la siguiente.
- El agente integrador resuelve conflictos y actualiza `docs/STATUS.md`.
- Push directo a `main` solo cuando hay un único agente trabajando y el cambio ya fue validado.

## Inicio de una tarea

```bash
git status --short --branch
git pull --ff-only origin main
```

Después, leer `docs/STATUS.md`, revisar los archivos afectados y confirmar el comportamiento actual antes de editar.

## Validación mínima

Para cambios de backend:

```bash
cd apps/backend
npm run build
npm test -- --runInBand
```

Para cambios de frontend:

```bash
cd apps/frontend
npm run build
```

Para cambios de Harv3st:

```bash
cd services/harv3st
python3 -m compileall -q app core config.py manager.py
```

Ejecutar además pruebas específicas del flujo modificado. No afirmar que algo funciona sin validarlo.

## Cierre y relevo

Antes de terminar una tarea:

1. Actualizar `docs/STATUS.md` si cambió producción, arquitectura, riesgos o siguiente trabajo.
2. Actualizar `docs/RUNBOOK.md` si cambió algún comando operativo.
3. Ejecutar las validaciones correspondientes.
4. Crear commits pequeños y descriptivos.
5. Subir a `main` solo con CI verde.
6. Confirmar que el commit desplegado coincide con la referencia `deploy` y que los health checks responden.

Nunca dejar cambios importantes únicamente en el VPS o sin commit.
