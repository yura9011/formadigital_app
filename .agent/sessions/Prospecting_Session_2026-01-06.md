# Sesión de Prospección - 06/01/2026

## 🎯 Objetivo
Generar y contactar leads gastronómicos en Zona Oeste (Ramos Mejía, Haedo, Castelar).

## ✅ Estado Actual
- **Leads Generados:** 6 nuevos leads importados (Pizzerías/Restaurantes).
- **Leads Contactados (WhatsApp):**
  1. **La Lineal Pizzería** (Haedo) - Status: `CONTACTED` (Msg enviado)
  2. **Fatay Gourmet** (Ramos) - Status: `CONTACTED` (Msg enviado)
  3. **Go Bar** (Castelar) - Status: `CONTACTED` (Msg enviado 11:58 via WSP)
     - *Hook usado:* Certificado SSL falla → HTTPS no carga, solo HTTP. Pierden visitas.

## ❌ Descartados (Falsos Positivos del Scraper)
1. **Parrilla Santa Rosa** (Castelar) - DESCARTADO
   - *Razón:* Verificación manual mostró que están OK. Bug del scraper (reviews/web).
2. **Erminda Napoletana** (Haedo) - DESCARTADO
   - *Razón:* Verificación manual mostró que están OK.

## ⏳ Pendientes (Priority Queue)
*Lista vacía - necesita nueva generación de leads.*

## 🐛 Bugs Detectados & Insights Técnicos
### 1. Scraper de Google Maps (`scripts/prospecting_local.py`)
- ~~**Reviews incorrectas:** Reporta 0 reviews cuando hay cientos.~~ **✅ FIX REALIZADO (multi-idioma + regex fallback)**
- **Websites:** A veces no detecta la URL si está en un botón secundario, o confunde URL de reservas con Web.

### 2. Backend Import (`prospect.service.ts`)
- **FIX REALIZADO:** Se corrigió el bug donde los leads existentes no actualizaban sus `gaps`. Ahora `importManualLeads` fuerza la actualización.
- **FIX REALIZADO:** Se corrigió el error de `Unique Constraint` agregando búsqueda por `name + address`.
- **Riesgo:** La función de importación no tiene tests unitarios (`spec.ts`).

## 🔄 Reorganización del Repo (2026-01-06)
- Archivos temporales movidos a `.archive/`
- `.kiro/` migrado a `.agent/` (estructura unificada)
- Nuevo: `.agent/mcp-setup.md` con docs de 25+ tools MCP
- Nuevo: `.github/agents/prospecting-agent.md`

## 📝 Recomendaciones para el Próximo Agente
1. **El Scraper ya fue arreglado** - Debería extraer reviews correctamente ahora
2. **Para sincronizar contactos con backend:** Ver `.agent/workflows/contact-lead.md`
3. **Para conectar MCP:** Ver `.agent/mcp-setup.md`

---
*Log actualizado - 06/01/2026 12:50*
