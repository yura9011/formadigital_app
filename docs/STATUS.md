# Estado actual

Actualizado: 2026-06-08

## Producción

- Último cambio funcional validado: `f3afae5`. Consultar `.runtime/deploy/deployed.sha` para el SHA desplegado actual.
- Frontend público: `http://2.24.89.243:3001`.
- Backend público: `http://2.24.89.243:3000`.
- Harv3st privado: `http://127.0.0.1:5050`.
- PostgreSQL 16 privado: `127.0.0.1:5433`.
- Backend, frontend y Harv3st están administrados por el PM2 aislado en `.runtime/pm2`.
- Deploy automático activo: CI publica la rama `deploy`; el VPS consulta cada minuto.
- Prisma: 9 migraciones baselinadas y sin migraciones pendientes al último deploy.

## Último cambio (2026-06-08)

Scoring v2.0 y detección de oportunidades por servicio. Ver `CHANGELOG.md` [1.1.0] para detalles completos.

**Pendiente de deploy**: Crear migración Prisma para los nuevos campos (`businessDescription`, `ownerName`, `serviceOpportunities`) antes de hacer push a main.

```bash
cd apps/backend && npx prisma migrate dev --name add-service-opportunities
```

## Login

- Usuarios visibles: `admin`, `lucas`, `marcos`.
- Los emails son identificadores internos y no se usan para ingresar.
- Las contraseñas no se documentan ni se guardan en Git.
- Login por nombre validado en producción; emails y usuarios desconocidos responden `401`.

## Validación reciente

- Backend build correcto.
- Frontend build correcto.
- Backend tests: `40/40` aprobados.
- Harv3st compila correctamente.
- Frontend, backend y proxy Harv3st responden `200`.

## Riesgos conocidos

1. **Autorización incompleta:** el login guarda identidad en `localStorage`; la API no exige JWT ni sesión real. Prioridad alta antes de manejar datos sensibles o abrir acceso más amplio.
2. **HTTP público:** frontend y backend están expuestos por IP y sin HTTPS ni reverse proxy.
3. **Reinicio del VPS:** PM2 guarda su lista, pero no existe una unidad systemd instalada para asegurar arranque automático después de reinicio. Debe validarse y resolverse sin tocar servicios ajenos.
4. **URLs legacy:** todavía existen algunos defaults `localhost:3001` en páginas antiguas; revisar cuando se trabaje en esas rutas.
5. **Dependencias:** `npm audit` reporta vulnerabilidades; deben revisarse de forma controlada, sin actualizaciones mayores automáticas.

## Próximo trabajo recomendado

1. **Deploy del scoring v2.0**: Crear migración Prisma y hacer push a main.
2. **Autenticación y autorización real** de extremo a extremo:
   - Sesión o JWT firmado por backend.
   - Middleware/guards en endpoints privados.
   - Cookies seguras en lugar de confiar en `localStorage`.
   - Logout e invalidación de sesión.
   - Pruebas de acceso permitido y denegado.
3. Configurar dominio + HTTPS y verificar persistencia tras reinicio del VPS.

## Regla de actualización

El agente que cambie producción, arquitectura, deploy, login, riesgos o prioridades debe actualizar este archivo en el mismo commit.
