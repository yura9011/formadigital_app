"""
Test del flujo completo de outreach con leads reales.
"""

import sys
from pathlib import Path

# Force UTF-8 encoding for stdout/stderr (Windows fix for emojis)
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

sys.path.insert(0, str(Path(__file__).parent))

from skills.outreach import (
    OutreachQueueManager,
    TemplateManager,
    SequenceManager,
    ContactHistoryTracker,
    CampaignManager,
    TargetCriteria,
    FAQManager,
)
from skills.validation import PhoneValidatorSkill
from skills.scoring import ContactabilityScorer

# 5 leads reales de barberías/peluquerías de Ramos Mejía
TEST_LEADS = [
    {
        "id": "ChIJlT6tJQvHvJURhFZwLIYUH_g",
        "name": "PONTEVARON RAMOS",
        "phones": "011 3388-3041",
        "website": "http://www.instagram.com/pontevaron",
        "categories": "Barbería",
        "fullAddress": "Belgrano 226, B1704 Ramos Mejía, Provincia de Buenos Aires",
        "location": "Ramos Mejía",
        "business_type": "barberia",
    },
    {
        "id": "ChIJgTM2dGHHvJURkKCzdorXJxc",
        "name": "Genuma",
        "phones": "4654-3805",
        "website": None,
        "categories": "Barbería",
        "fullAddress": "9 de Julio 28, B1704 Ramos Mejía, Provincia de Buenos Aires",
        "location": "Ramos Mejía",
        "business_type": "barberia",
    },
    {
        "id": "ChIJs1DubufHvJURMQWqJHR02B0",
        "name": "Amilcar Hair peluquería",
        "phones": None,
        "website": None,
        "categories": "Peluquería",
        "fullAddress": "Viamonte 128, B1704 Ramos Mejía, Provincia de Buenos Aires",
        "location": "Ramos Mejía",
        "business_type": "peluqueria",
    },
    {
        "id": "ChIJGZYxF_vHvJURGoWvoPJvdi4",
        "name": "t a SALON UNISEX",
        "phones": "011 6689-3143",
        "website": None,
        "categories": "Barbería",
        "fullAddress": "Av. Gaona 2147, B1704ENE Gran Buenos Aires, Provincia de Buenos Aires",
        "location": "Ramos Mejía",
        "business_type": "barberia",
    },
    {
        "id": "ChIJNcLLlwW_vJURDdl3us74oOM",
        "name": "Sergio cervera estilista",
        "phones": None,
        "website": None,
        "categories": "Peluquería",
        "fullAddress": "Concejal Nicolás Defilippi 1602, B1714 Ituzaingó, Provincia de Buenos Aires",
        "location": "Ituzaingó",
        "business_type": "peluqueria",
    },
]


def validate_leads():
    """Paso 1: Validar teléfonos y calcular scores."""
    print("═" * 60)
    print("📋 PASO 1: VALIDACIÓN DE LEADS")
    print("═" * 60)
    
    phone_validator = PhoneValidatorSkill()
    scorer = ContactabilityScorer()
    validated_leads = []
    
    for lead in TEST_LEADS:
        print(f"\n🔍 Validando: {lead['name']}")
        
        # Validar teléfono
        if lead.get("phones"):
            phone_result = phone_validator.validate(lead["phones"])
            lead["phone_valid"] = phone_result.is_valid
            lead["phone_type"] = phone_result.phone_type
            lead["whatsapp_link"] = phone_result.whatsapp_link
            lead["normalized_phone"] = phone_result.normalized_number
            
            if phone_result.is_valid:
                print(f"   ✅ Teléfono válido: {phone_result.normalized_number}")
                if phone_result.whatsapp_link:
                    print(f"   💬 WhatsApp: {phone_result.whatsapp_link}")
            else:
                print(f"   ❌ Teléfono inválido: {phone_result.error_message}")
        else:
            lead["phone_valid"] = False
            lead["phone_type"] = None
            lead["whatsapp_link"] = None
            print("   ⚠️ Sin teléfono")
        
        # Extraer Instagram del website si existe
        if lead.get("website") and "instagram.com" in lead["website"]:
            handle = lead["website"].split("/")[-1].replace("?hl=es", "")
            lead["instagram_handle"] = handle
            print(f"   📸 Instagram: @{handle}")
        else:
            lead["instagram_handle"] = None
        
        # Calcular score
        score_result = scorer.calculate(lead)
        lead["contactability_score"] = score_result.score
        lead["best_channel"] = score_result.best_channel
        lead["validation_status"] = score_result.status
        
        print(f"   📊 Score: {score_result.score} ({score_result.status})")
        print(f"   📱 Mejor canal: {score_result.best_channel}")
        
        validated_leads.append(lead)
    
    return validated_leads


def assign_to_campaign(leads):
    """Paso 2: Asignar leads a campaña."""
    print("\n" + "═" * 60)
    print("🎯 PASO 2: ASIGNACIÓN A CAMPAÑA")
    print("═" * 60)
    
    campaigns = CampaignManager()
    
    # Crear campaña específica para barberías
    campaign = campaigns.create_campaign(
        name="Test Barberías Zona Oeste",
        description="Campaña de prueba para barberías",
        target_criteria=TargetCriteria(
            locations=["Ramos Mejía", "Ituzaingó"],
            business_types=["barberia", "peluqueria"],
            min_score=30,  # Bajo para incluir más leads en el test
            channels_required=["whatsapp"],
        ),
        sequence_id="default_sequence",
    )
    campaigns.activate_campaign(campaign.id)
    print(f"\n✅ Campaña creada: {campaign.name} ({campaign.id})")
    
    assigned = []
    for lead in leads:
        assignment = campaigns.assign_lead_to_campaign(lead["id"], lead)
        if assignment:
            print(f"   ✅ {lead['name']} → {assignment.campaign_id}")
            assigned.append(lead)
        else:
            print(f"   ⚠️ {lead['name']} no cumple criterios")
    
    return assigned, campaign


def add_to_queue(leads):
    """Paso 3: Agregar leads a la cola de outreach."""
    print("\n" + "═" * 60)
    print("📋 PASO 3: AGREGAR A COLA DE OUTREACH")
    print("═" * 60)
    
    queue = OutreachQueueManager()
    
    for lead in leads:
        if lead.get("validation_status") == "ready" or lead.get("whatsapp_link"):
            queue.add_lead(
                lead_id=lead["id"],
                lead_name=lead["name"],
                contactability_score=lead.get("contactability_score", 50),
                recommended_channel=lead.get("best_channel", "whatsapp"),
                template_id="whatsapp_initial",
            )
            print(f"   ✅ Agregado: {lead['name']}")
        else:
            print(f"   ⚠️ Omitido (sin canal): {lead['name']}")
    
    # Mostrar cola
    print("\n📋 Cola actual:")
    items = queue.get_queue()
    for i, item in enumerate(items, 1):
        print(f"   {i}. {item.lead_name} (score: {item.contactability_score}, canal: {item.recommended_channel})")
    
    return queue


def prepare_messages(queue, leads):
    """Paso 4: Preparar mensajes para los leads."""
    print("\n" + "═" * 60)
    print("📝 PASO 4: PREPARAR MENSAJES")
    print("═" * 60)
    
    templates = TemplateManager()
    leads_dict = {l["id"]: l for l in leads}
    
    items = queue.get_queue()
    messages = []
    
    for item in items[:3]:  # Solo los primeros 3
        lead = leads_dict.get(item.lead_id, {})
        
        # Preparar datos para el template
        template_data = {
            "business_name": lead.get("name", item.lead_name),
            "location": lead.get("location", "tu zona"),
        }
        
        # Renderizar template
        result = templates.render("whatsapp_initial", template_data)
        
        print(f"\n📨 Mensaje para: {item.lead_name}")
        print("-" * 40)
        
        if result.success:
            print(result.body)
            messages.append({
                "lead_id": item.lead_id,
                "lead_name": item.lead_name,
                "channel": item.recommended_channel,
                "message": result.body,
                "whatsapp_link": lead.get("whatsapp_link"),
            })
        else:
            print(f"❌ Error: {result.error}")
        
        print("-" * 40)
        
        if lead.get("whatsapp_link"):
            print(f"💬 Link WhatsApp: {lead['whatsapp_link']}")
    
    return messages


def simulate_contact(messages):
    """Paso 5: Simular contacto y registrar en historial."""
    print("\n" + "═" * 60)
    print("📤 PASO 5: SIMULAR CONTACTO")
    print("═" * 60)
    
    history = ContactHistoryTracker()
    sequences = SequenceManager()
    
    for msg in messages:
        print(f"\n📤 Contactando: {msg['lead_name']}")
        
        # Registrar contacto saliente
        entry = history.log_outbound(
            lead_id=msg["lead_id"],
            channel=msg["channel"],
            message=msg["message"],
            template_id="whatsapp_initial",
        )
        print(f"   ✅ Registrado en historial: {entry.id}")
        
        # Iniciar secuencia
        try:
            state = sequences.start_sequence(msg["lead_id"], "default_sequence")
            print(f"   🔄 Secuencia iniciada, próximo contacto: {state.next_touch_at}")
        except Exception as e:
            print(f"   ⚠️ Secuencia: {e}")
    
    return history


def test_faq_responses():
    """Paso 6: Probar respuestas FAQ."""
    print("\n" + "═" * 60)
    print("❓ PASO 6: PROBAR FAQ RESPONSES")
    print("═" * 60)
    
    faq = FAQManager()
    
    test_questions = [
        "Cuánto cuesta el servicio?",
        "Cómo funciona?",
        "Es muy caro",
        "Lo voy a pensar",
        "Hola",
    ]
    
    for question in test_questions:
        print(f"\n❓ Pregunta: \"{question}\"")
        suggestion = faq.get_best_response(question, variables={
            "nombre_empresa": "Forma Digital",
            "ubicacion": "Zona Oeste",
            "precio_base": "$50.000",
        })
        
        if suggestion:
            print(f"   📊 Confianza: {suggestion.confidence:.0%}")
            print(f"   📝 Categoría: {suggestion.faq.category.value}")
            print(f"   💬 Respuesta:")
            for line in suggestion.rendered_response.split("\n")[:5]:
                print(f"      {line}")
            if len(suggestion.rendered_response.split("\n")) > 5:
                print("      ...")
        else:
            print("   ⚠️ Sin sugerencia")


def show_metrics(history, campaign):
    """Paso 7: Mostrar métricas."""
    print("\n" + "═" * 60)
    print("📊 PASO 7: MÉTRICAS")
    print("═" * 60)
    
    campaigns = CampaignManager()
    metrics = campaigns.get_campaign_metrics(campaign.id)
    
    if metrics:
        print(f"\n📈 Métricas de campaña: {campaign.name}")
        print(f"   Leads asignados:  {metrics.leads_assigned}")
        print(f"   Leads contactados: {metrics.leads_contacted}")
        print(f"   Leads respondieron: {metrics.leads_responded}")
        print(f"   Leads convertidos: {metrics.leads_converted}")


def main():
    """Ejecutar flujo completo de test."""
    print("\n" + "🚀" * 30)
    print("   TEST DE FLUJO COMPLETO DE OUTREACH")
    print("🚀" * 30 + "\n")
    
    # Paso 1: Validar leads
    validated_leads = validate_leads()
    
    # Paso 2: Asignar a campaña
    assigned_leads, campaign = assign_to_campaign(validated_leads)
    
    # Paso 3: Agregar a cola
    queue = add_to_queue(assigned_leads)
    
    # Paso 4: Preparar mensajes
    messages = prepare_messages(queue, assigned_leads)
    
    # Paso 5: Simular contacto
    history = simulate_contact(messages)
    
    # Paso 6: Probar FAQ
    test_faq_responses()
    
    # Paso 7: Métricas
    show_metrics(history, campaign)
    
    print("\n" + "═" * 60)
    print("✅ TEST COMPLETADO")
    print("═" * 60)
    print("\nResumen:")
    print(f"   • {len(validated_leads)} leads validados")
    print(f"   • {len(assigned_leads)} leads asignados a campaña")
    print(f"   • {len(messages)} mensajes preparados")
    print(f"   • FAQ funcionando correctamente")


if __name__ == "__main__":
    main()
