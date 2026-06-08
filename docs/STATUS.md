# Estado actual

Actualizado: 2026-06-08

## Producción

- Último cambio validado y desplegado: `a82282e`. Consultar `.runtime/deploy/deployed.sha` para el SHA desplegado actual.
- Frontend público: `http://2.24.89.243:3001`.
- Backend público: `http://2.24.89.243:3000`.
- Harv3st privado: `http://127.0.0.1:5050`.
- PostgreSQL 16 privado: `127.0.0.1:5433`.
- Backend, frontend y Harv3st están administrados por el PM2 aislado en `.runtime/pm2`.
- Deploy automático activo: CI publica la rama `deploy`; el VPS consulta cada minuto.
- Prisma: 10 migraciones y ninguna pendiente al deploy `a82282e`.

## Último cambio (2026-06-08)

Refactor checkpoint desplegado: fases 1.1 y 1.2 del plan completadas. Los tipos de leads/clientes ahora tienen una única fuente compartida y la URL del backend quedó centralizada en `apps/frontend/src/config/api.ts`. Las fases 1.3-5 siguen pendientes.

Cambio funcional anterior: scoring v2.0 y detección de oportunidades por servicio. Ver `CHANGELOG.md` [1.1.0] para detalles completos.

La migración de los campos `businessDescription`, `ownerName` y `serviceOpportunities` ya existe en `apps/backend/prisma/migrations/20260608000000_add_service_opportunities`.

## Login

- Usuarios visibles: `admin`, `lucas`, `marcos`.
- Los emails son identificadores internos y no se usan para ingresar.
- Las contraseñas no se documentan ni se guardan en Git.
- Login por nombre validado en producción; emails y usuarios desconocidos responden `401`.

## Validación reciente

- Backend build correcto después del checkpoint de refactor.
- Frontend build correcto después del checkpoint de refactor.
- Backend tests: `40/40` aprobados.
- Harv3st compila correctamente.
- Frontend público, backend público y proxy Harv3st responden `200` después del deploy `a82282e`.

## Riesgos conocidos

1. **Autorización incompleta:** el login guarda identidad en `localStorage`; la API no exige JWT ni sesión real. Prioridad alta antes de manejar datos sensibles o abrir acceso más amplio.
2. **HTTP público:** frontend y backend están expuestos por IP y sin HTTPS ni reverse proxy.
3. **Reinicio del VPS:** PM2 guarda su lista, pero no existe una unidad systemd instalada para asegurar arranque automático después de reinicio. Debe validarse y resolverse sin tocar servicios ajenos.
4. **Navegación legacy:** todavía existen redirecciones internas con `window.location.href`; resolver en la fase 1.4 del plan.
5. **Dependencias:** `npm audit` reporta vulnerabilidades; deben revisarse de forma controlada, sin actualizaciones mayores automáticas.
6. **Respaldos root aislados:** el deploy heredó artefactos creados como root. Se apartaron de la ejecución en `.git.root-owned`, `apps/backend/dist.root-owned` y `apps/frontend/.next.root-owned`; requieren acceso administrativo para eliminarlos, pero no afectan deploys futuros.

## Próximo trabajo recomendado

1. Completar y validar las fases 1.3 PageLayout y 1.4 navegación del plan de refactor.
2. **Autenticación y autorización real** de extremo a extremo:
   - Sesión o JWT firmado por backend.
   - Middleware/guards en endpoints privados.
   - Cookies seguras en lugar de confiar en `localStorage`.
   - Logout e invalidación de sesión.
   - Pruebas de acceso permitido y denegado.
3. Configurar dominio + HTTPS y verificar persistencia tras reinicio del VPS.

## Regla de actualización

El agente que cambie producción, arquitectura, deploy, login, riesgos o prioridades debe actualizar este archivo en el mismo commit.
