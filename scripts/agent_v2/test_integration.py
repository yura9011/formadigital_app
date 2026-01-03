"""
Prueba Integral - Flujo Completo de Validación
==============================================
Simula el flujo completo con datos reales de un negocio.
"""

import sys
import json
from pathlib import Path
import tempfile

sys.path.insert(0, str(Path(__file__).parent))

from models import Lead
from skills.validator import LeadValidator
from skills.approval import ApprovalManager
from skills.merger import SourceMerger


def main():
    print("=" * 60)
    print("PRUEBA INTEGRAL - FLUJO COMPLETO DE VALIDACION")
    print("=" * 60)

    # Simular datos reales de Harv3st (barberia en Castelar)
    harv3st_data = {
        "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
        "name": "Barberia Don Carlos",
        "fullAddress": "Av. San Martin 2345, Castelar, Buenos Aires",
        "phones": ["11 6789-4321"],
        "website": "https://barberiadoncarlos.com.ar",
        "averageRating": 4.7,
        "reviewCount": 89,
        "categories": ["Barberia", "Peluqueria"],
        "photoCount": 15,
        "latitude": -34.6512,
        "longitude": -58.6283,
    }

    print()
    print("1. DATOS DE ENTRADA (Harv3st)")
    print("-" * 40)
    print(f"   Nombre: {harv3st_data['name']}")
    print(f"   Direccion: {harv3st_data['fullAddress']}")
    print(f"   Telefono: {harv3st_data['phones'][0]}")
    print(f"   Website: {harv3st_data['website']}")
    print(f"   Rating: {harv3st_data['averageRating']} ({harv3st_data['reviewCount']} reviews)")

    # Crear Lead desde datos Harv3st
    print()
    print("2. CREAR LEAD")
    print("-" * 40)
    lead = Lead.from_harv3st(harv3st_data)
    print(f"   Lead ID: {lead.id}")
    print(f"   Place ID: {lead.place_id}")
    print(f"   Source: {lead.source}")
    print(f"   Status inicial: {lead.validation_status}")
    print(f"   Score inicial: {lead.contactability_score}")

    # Ejecutar validacion completa
    print()
    print("3. EJECUTAR VALIDACION")
    print("-" * 40)
    validator = LeadValidator()
    result = validator.validate_lead(lead)

    print(f"   Success: {result.success}")
    print(f"   Steps: {result.steps_completed}")
    print(f"   Early exit: {result.early_exit}")
    print(f"   Tiempo: {result.validation_time_ms}ms")

    # Mostrar resultados de validacion
    print()
    print("4. RESULTADOS DE VALIDACION")
    print("-" * 40)
    validated_lead = result.lead
    print(f"   Phone Status: {validated_lead.phone_status}")
    print(f"   Phone Type: {validated_lead.phone_type}")
    print(f"   Normalized: {validated_lead.normalized_phone}")
    print(f"   WhatsApp: {validated_lead.whatsapp_link}")
    print(f"   Instagram: {validated_lead.instagram_status} - @{validated_lead.instagram_handle}")
    print(f"   Email: {validated_lead.email_status} - {validated_lead.email}")
    print(f"   Score: {validated_lead.contactability_score}")
    print(f"   Best Channel: {validated_lead.best_channel}")
    print(f"   Status: {validated_lead.validation_status}")
    print(f"   Notes: {validated_lead.validation_notes}")

    # Crear propuesta de aprobacion
    print()
    print("5. CREAR PROPUESTA DE APROBACION")
    print("-" * 40)
    temp_path = Path(tempfile.mktemp(suffix=".json"))
    manager = ApprovalManager(storage_path=temp_path)

    current_values = {
        "phone_status": "missing",
        "contactability_score": 0,
        "validation_status": "unvalidated",
    }
    proposed_values = {
        "phone_status": validated_lead.phone_status,
        "phone_type": validated_lead.phone_type,
        "whatsapp_link": validated_lead.whatsapp_link,
        "contactability_score": validated_lead.contactability_score,
        "best_channel": validated_lead.best_channel,
        "validation_status": validated_lead.validation_status,
    }

    proposal = manager.propose(
        lead_id=validated_lead.id,
        lead_name=validated_lead.name,
        current_values=current_values,
        proposed_values=proposed_values,
        reasoning=validated_lead.validation_notes or "Validacion completada"
    )

    print(proposal.format_for_display())

    # Simular aprobacion
    print()
    print("6. APROBAR CAMBIOS")
    print("-" * 40)
    changes = manager.approve(proposal.id, approved_by="admin_test")
    print(f"   Proposal ID: {proposal.id}")
    print(f"   Status: {proposal.status}")
    print(f"   Approved by: {proposal.approved_by}")
    print(f"   Changes applied:")
    for k, v in changes.items():
        print(f"      {k}: {v}")

    # Verificar duplicados (simular segundo scrape)
    print()
    print("7. VERIFICAR DUPLICADOS")
    print("-" * 40)
    merger = SourceMerger()
    existing_leads = [validated_lead.to_dict()]
    new_data = {"place_id": harv3st_data["placeId"], "name": "Barberia Don Carlos Updated"}
    is_dup, existing_id = merger.detect_duplicate(new_data, existing_leads)
    print(f"   Nuevo lead con mismo placeId")
    print(f"   Es duplicado: {is_dup}")
    print(f"   ID existente: {existing_id}")

    # Cleanup
    temp_path.unlink(missing_ok=True)

    print()
    print("=" * 60)
    print("PRUEBA INTEGRAL COMPLETADA EXITOSAMENTE")
    print("=" * 60)
    print()
    print("RESUMEN:")
    print(f"  - Lead validado: {validated_lead.name}")
    print(f"  - Score final: {validated_lead.contactability_score}/100")
    print(f"  - Status: {validated_lead.validation_status.upper()}")
    print(f"  - Mejor canal: {validated_lead.best_channel.upper()}")
    print(f"  - Propuesta aprobada: {proposal.id}")


if __name__ == "__main__":
    main()
