"""
FAQ Response Manager
====================
Manages predefined responses for common questions and objections.
Helps operators respond quickly and consistently to leads.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum
import json
import os
import re
import uuid


class FAQCategory(str, Enum):
    """Categories for FAQ responses."""
    PRICING = "pricing"
    SERVICES = "services"
    PROCESS = "process"
    OBJECTIONS = "objections"
    AVAILABILITY = "availability"
    GENERAL = "general"


@dataclass
class FAQResponse:
    """A predefined FAQ response."""
    id: str
    category: FAQCategory
    question_patterns: list[str]  # Regex patterns to match questions
    keywords: list[str]  # Keywords for matching
    response_template: str  # Response with {{variables}}
    variables: list[str] = field(default_factory=list)  # Required variables
    priority: int = 0  # Higher = more specific match
    active: bool = True
    created_at: datetime = field(default_factory=datetime.now)
    
    def matches(self, text: str) -> tuple[bool, float]:
        """Check if text matches this FAQ.
        
        Returns:
            Tuple of (matches, confidence_score)
        """
        text_lower = text.lower().strip()
        
        # Check regex patterns first (highest confidence)
        for pattern in self.question_patterns:
            try:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    return True, 1.0
            except re.error:
                continue
        
        # Check keywords (lower confidence based on match count)
        if self.keywords:
            matched_keywords = sum(1 for kw in self.keywords if kw.lower() in text_lower)
            if matched_keywords > 0:
                confidence = min(0.9, matched_keywords / len(self.keywords) + 0.3)
                return True, confidence
        
        return False, 0.0
    
    def render(self, variables: dict) -> str:
        """Render response with variables."""
        result = self.response_template
        for var_name, var_value in variables.items():
            result = result.replace(f"{{{{{var_name}}}}}", str(var_value))
        return result
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "category": self.category.value,
            "question_patterns": self.question_patterns,
            "keywords": self.keywords,
            "response_template": self.response_template,
            "variables": self.variables,
            "priority": self.priority,
            "active": self.active,
            "created_at": self.created_at.isoformat(),
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "FAQResponse":
        """Create from dictionary."""
        return cls(
            id=data["id"],
            category=FAQCategory(data.get("category", "general")),
            question_patterns=data.get("question_patterns", []),
            keywords=data.get("keywords", []),
            response_template=data.get("response_template", ""),
            variables=data.get("variables", []),
            priority=data.get("priority", 0),
            active=data.get("active", True),
            created_at=datetime.fromisoformat(data["created_at"]) if "created_at" in data else datetime.now(),
        )


@dataclass
class FAQSuggestion:
    """A suggested FAQ response for a question."""
    faq: FAQResponse
    confidence: float
    rendered_response: str
    missing_variables: list[str]



class FAQManager:
    """Manages FAQ responses and suggestions."""
    
    def __init__(self, data_dir: str = "data/faq"):
        """Initialize FAQ manager.
        
        Args:
            data_dir: Directory for FAQ data storage
        """
        self.data_dir = data_dir
        self._faqs: dict[str, FAQResponse] = {}
        self._ensure_data_dir()
        self._load_faqs()
        self._ensure_default_faqs()
    
    def _ensure_data_dir(self) -> None:
        """Ensure data directory exists."""
        os.makedirs(self.data_dir, exist_ok=True)
    
    def _faqs_file(self) -> str:
        """Get FAQs file path."""
        return os.path.join(self.data_dir, "faqs.json")
    
    def _load_faqs(self) -> None:
        """Load FAQs from disk."""
        faqs_file = self._faqs_file()
        if os.path.exists(faqs_file):
            with open(faqs_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for faq_data in data.get("faqs", []):
                    faq = FAQResponse.from_dict(faq_data)
                    self._faqs[faq.id] = faq
    
    def _save_faqs(self) -> None:
        """Save FAQs to disk."""
        faqs_file = self._faqs_file()
        data = {
            "faqs": [f.to_dict() for f in self._faqs.values()],
            "updated_at": datetime.now().isoformat(),
        }
        with open(faqs_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def _ensure_default_faqs(self) -> None:
        """Ensure default FAQs exist."""
        if self._faqs:
            return  # Already have FAQs
        
        default_faqs = self._get_default_faqs()
        for faq in default_faqs:
            self._faqs[faq.id] = faq
        self._save_faqs()
    
    def _get_default_faqs(self) -> list[FAQResponse]:
        """Get default FAQ responses."""
        return [
            # Pricing FAQs
            FAQResponse(
                id="faq_pricing_general",
                category=FAQCategory.PRICING,
                question_patterns=[
                    r"cu[aá]nto\s+(cuesta|sale|cobran|vale)",
                    r"precio",
                    r"tarifa",
                    r"presupuesto",
                ],
                keywords=["precio", "costo", "cuanto", "cobran", "tarifa", "presupuesto"],
                response_template="""¡Hola! Gracias por preguntar 😊

Nuestros servicios se adaptan a cada negocio. Para darte un presupuesto preciso, necesito conocer un poco más sobre tu situación actual.

¿Te parece si agendamos una llamada de 15 minutos para entender mejor tus necesidades? Es sin compromiso.

¿Qué día te viene mejor?""",
                priority=10,
            ),
            FAQResponse(
                id="faq_pricing_specific",
                category=FAQCategory.PRICING,
                question_patterns=[
                    r"cu[aá]nto.*web",
                    r"precio.*p[aá]gina",
                    r"cu[aá]nto.*sitio",
                ],
                keywords=["precio", "web", "pagina", "sitio"],
                response_template="""¡Hola! Los sitios web arrancan desde ${{precio_base}} dependiendo de las funcionalidades.

Incluye:
✅ Diseño personalizado
✅ Optimización para Google
✅ Versión móvil
✅ Formulario de contacto

¿Querés que te cuente más detalles?""",
                variables=["precio_base"],
                priority=15,
            ),
            
            # Services FAQs
            FAQResponse(
                id="faq_services_what",
                category=FAQCategory.SERVICES,
                question_patterns=[
                    r"qu[eé]\s+(hacen|ofrecen|servicios)",
                    r"a\s+qu[eé]\s+se\s+dedican",
                ],
                keywords=["servicios", "hacen", "ofrecen", "dedican"],
                response_template="""¡Hola! Somos {{nombre_empresa}}, ayudamos a negocios locales a conseguir más clientes por internet.

Nuestros servicios principales:
📱 Presencia en Google Maps
🌐 Páginas web profesionales
📸 Gestión de redes sociales
📈 Publicidad digital

¿Hay algo específico que te interese?""",
                variables=["nombre_empresa"],
                priority=10,
            ),
            
            # Process FAQs
            FAQResponse(
                id="faq_process_how",
                category=FAQCategory.PROCESS,
                question_patterns=[
                    r"c[oó]mo\s+(funciona|trabajan|es\s+el\s+proceso)",
                    r"cu[aá]les\s+son\s+los\s+pasos",
                ],
                keywords=["como", "funciona", "proceso", "pasos", "trabajan"],
                response_template="""¡Buena pregunta! El proceso es simple:

1️⃣ Llamada inicial (15 min) - Entendemos tu negocio
2️⃣ Propuesta personalizada - Te enviamos opciones
3️⃣ Aprobación y arranque - Empezamos a trabajar
4️⃣ Resultados - Ves el progreso semana a semana

¿Te gustaría agendar la llamada inicial?""",
                priority=10,
            ),
            FAQResponse(
                id="faq_process_time",
                category=FAQCategory.PROCESS,
                question_patterns=[
                    r"cu[aá]nto\s+(tiempo|tarda|demora)",
                    r"en\s+cu[aá]nto\s+tiempo",
                ],
                keywords=["tiempo", "tarda", "demora", "cuando", "listo"],
                response_template="""Los tiempos dependen del servicio:

⚡ Google Maps: 1-2 semanas
🌐 Página web: 2-3 semanas
📱 Redes sociales: Resultados desde el primer mes

¿Qué servicio te interesa?""",
                priority=10,
            ),
            
            # Objections FAQs
            FAQResponse(
                id="faq_objection_expensive",
                category=FAQCategory.OBJECTIONS,
                question_patterns=[
                    r"(muy\s+)?caro",
                    r"no\s+tengo\s+(plata|dinero|presupuesto)",
                    r"es\s+mucho",
                ],
                keywords=["caro", "costoso", "plata", "dinero", "presupuesto", "mucho"],
                response_template="""Entiendo perfectamente, la inversión es importante.

Te cuento que muchos de nuestros clientes recuperan la inversión en el primer mes con los nuevos clientes que consiguen.

¿Te parece si vemos opciones que se ajusten a tu presupuesto? Tenemos planes flexibles.

¿Cuál sería un monto mensual cómodo para vos?""",
                priority=20,
            ),
            FAQResponse(
                id="faq_objection_think",
                category=FAQCategory.OBJECTIONS,
                question_patterns=[
                    r"lo\s+(pienso|voy\s+a\s+pensar)",
                    r"tengo\s+que\s+pensarlo",
                    r"d[eé]jame\s+pensar",
                ],
                keywords=["pensar", "pensarlo", "pienso", "decidir"],
                response_template="""¡Por supuesto! Es una decisión importante.

Para ayudarte a decidir, ¿hay algo específico que te genere dudas? Así puedo darte más información.

También te puedo enviar casos de éxito de negocios similares al tuyo si te sirve.

¿Qué te parece?""",
                priority=20,
            ),
            FAQResponse(
                id="faq_objection_not_now",
                category=FAQCategory.OBJECTIONS,
                question_patterns=[
                    r"ahora\s+no",
                    r"m[aá]s\s+adelante",
                    r"no\s+es\s+(el\s+)?momento",
                    r"despu[eé]s",
                ],
                keywords=["ahora", "adelante", "momento", "despues", "luego"],
                response_template="""Entiendo, cada negocio tiene sus tiempos.

¿Te parece si te contacto en {{tiempo_seguimiento}} para ver cómo va todo?

Mientras tanto, te dejo mi contacto por si surge algo: {{contacto}}

¡Éxitos! 🙌""",
                variables=["tiempo_seguimiento", "contacto"],
                priority=15,
            ),
            
            # Availability FAQs
            FAQResponse(
                id="faq_availability_meeting",
                category=FAQCategory.AVAILABILITY,
                question_patterns=[
                    r"(pod[eé]mos|podemos)\s+(hablar|reunirnos|llamar)",
                    r"agenda(r|mos)\s+(una\s+)?(llamada|reuni[oó]n)",
                ],
                keywords=["hablar", "llamar", "reunion", "agendar", "disponibilidad"],
                response_template="""¡Claro que sí! 📞

Tengo disponibilidad:
📅 {{dias_disponibles}}
🕐 {{horarios_disponibles}}

¿Qué día y horario te viene mejor?""",
                variables=["dias_disponibles", "horarios_disponibles"],
                priority=10,
            ),
            
            # General FAQs
            FAQResponse(
                id="faq_general_greeting",
                category=FAQCategory.GENERAL,
                question_patterns=[
                    r"^hola$",
                    r"^buenas$",
                    r"^buen\s+d[ií]a$",
                ],
                keywords=["hola", "buenas", "buen dia"],
                response_template="""¡Hola! 👋 ¿Cómo estás?

Soy de {{nombre_empresa}}. Vi que tenés un negocio en {{ubicacion}} y quería contarte cómo podemos ayudarte a conseguir más clientes.

¿Tenés unos minutos para charlar?""",
                variables=["nombre_empresa", "ubicacion"],
                priority=5,
            ),
            FAQResponse(
                id="faq_general_thanks",
                category=FAQCategory.GENERAL,
                question_patterns=[
                    r"gracias",
                    r"muchas\s+gracias",
                ],
                keywords=["gracias", "agradezco"],
                response_template="""¡De nada! 😊

Cualquier duda que tengas, acá estoy para ayudarte.

¡Que tengas un excelente día! 🙌""",
                priority=5,
            ),
        ]

    
    # CRUD operations
    
    def create_faq(
        self,
        category: FAQCategory,
        question_patterns: list[str],
        keywords: list[str],
        response_template: str,
        variables: Optional[list[str]] = None,
        priority: int = 0,
    ) -> FAQResponse:
        """Create a new FAQ response.
        
        Args:
            category: FAQ category
            question_patterns: Regex patterns to match
            keywords: Keywords for matching
            response_template: Response template with {{variables}}
            variables: Required variables
            priority: Match priority (higher = more specific)
            
        Returns:
            Created FAQ
        """
        faq_id = f"faq_{uuid.uuid4().hex[:8]}"
        
        faq = FAQResponse(
            id=faq_id,
            category=category,
            question_patterns=question_patterns,
            keywords=keywords,
            response_template=response_template,
            variables=variables or [],
            priority=priority,
        )
        
        self._faqs[faq_id] = faq
        self._save_faqs()
        
        return faq
    
    def get_faq(self, faq_id: str) -> Optional[FAQResponse]:
        """Get a FAQ by ID."""
        return self._faqs.get(faq_id)
    
    def list_faqs(
        self,
        category: Optional[FAQCategory] = None,
        active_only: bool = True,
    ) -> list[FAQResponse]:
        """List FAQs.
        
        Args:
            category: Filter by category
            active_only: Only return active FAQs
            
        Returns:
            List of FAQs
        """
        faqs = list(self._faqs.values())
        
        if category:
            faqs = [f for f in faqs if f.category == category]
        
        if active_only:
            faqs = [f for f in faqs if f.active]
        
        return sorted(faqs, key=lambda f: (-f.priority, f.category.value))
    
    def update_faq(
        self,
        faq_id: str,
        question_patterns: Optional[list[str]] = None,
        keywords: Optional[list[str]] = None,
        response_template: Optional[str] = None,
        variables: Optional[list[str]] = None,
        priority: Optional[int] = None,
        active: Optional[bool] = None,
    ) -> Optional[FAQResponse]:
        """Update a FAQ."""
        faq = self._faqs.get(faq_id)
        if not faq:
            return None
        
        if question_patterns is not None:
            faq.question_patterns = question_patterns
        if keywords is not None:
            faq.keywords = keywords
        if response_template is not None:
            faq.response_template = response_template
        if variables is not None:
            faq.variables = variables
        if priority is not None:
            faq.priority = priority
        if active is not None:
            faq.active = active
        
        self._save_faqs()
        return faq
    
    def delete_faq(self, faq_id: str) -> bool:
        """Delete a FAQ."""
        if faq_id in self._faqs:
            del self._faqs[faq_id]
            self._save_faqs()
            return True
        return False
    
    # Suggestion engine
    
    def suggest_responses(
        self,
        question: str,
        variables: Optional[dict] = None,
        max_suggestions: int = 3,
        min_confidence: float = 0.3,
    ) -> list[FAQSuggestion]:
        """Suggest FAQ responses for a question.
        
        Args:
            question: The question/message to match
            variables: Variables for rendering responses
            max_suggestions: Maximum suggestions to return
            min_confidence: Minimum confidence threshold
            
        Returns:
            List of suggestions sorted by confidence
        """
        variables = variables or {}
        suggestions = []
        
        for faq in self._faqs.values():
            if not faq.active:
                continue
            
            matches, confidence = faq.matches(question)
            if not matches or confidence < min_confidence:
                continue
            
            # Adjust confidence by priority
            adjusted_confidence = min(1.0, confidence + (faq.priority * 0.01))
            
            # Check for missing variables
            missing = [v for v in faq.variables if v not in variables]
            
            # Render response (with placeholders for missing vars)
            render_vars = variables.copy()
            for mv in missing:
                render_vars[mv] = f"[{mv}]"
            rendered = faq.render(render_vars)
            
            suggestions.append(FAQSuggestion(
                faq=faq,
                confidence=adjusted_confidence,
                rendered_response=rendered,
                missing_variables=missing,
            ))
        
        # Sort by confidence (descending)
        suggestions.sort(key=lambda s: -s.confidence)
        
        return suggestions[:max_suggestions]
    
    def get_best_response(
        self,
        question: str,
        variables: Optional[dict] = None,
    ) -> Optional[FAQSuggestion]:
        """Get the best matching response for a question.
        
        Args:
            question: The question/message to match
            variables: Variables for rendering
            
        Returns:
            Best suggestion or None if no match
        """
        suggestions = self.suggest_responses(question, variables, max_suggestions=1)
        return suggestions[0] if suggestions else None
    
    def get_categories(self) -> list[FAQCategory]:
        """Get all FAQ categories."""
        return list(FAQCategory)
    
    def get_faqs_by_category(self) -> dict[FAQCategory, list[FAQResponse]]:
        """Get FAQs grouped by category."""
        result: dict[FAQCategory, list[FAQResponse]] = {cat: [] for cat in FAQCategory}
        
        for faq in self._faqs.values():
            if faq.active:
                result[faq.category].append(faq)
        
        return result
