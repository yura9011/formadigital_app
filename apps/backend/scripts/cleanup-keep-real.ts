import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Leads reales que queremos mantener (contactados por Lucas)
const KEEP_NAMES = [
  'APOLONIA RAMOS MEJÍA',
  'Pizza Beto',
  'Punto Diario',
  'Los Hornos - Especialidad en pizza a la piedra',
  'Mercado Ruffiano',
  'Modo Fit (Gym Femenino)',
  'Sport Time Gym',
  'Veterinaria Dra. Carrizo',
  'AREZZO',
];

async function main() {
  console.log('🔍 Buscando leads a mantener...');
  
  // Encontrar los IDs de los leads a mantener
  const keepLeads = await prisma.client.findMany({
    where: {
      name: { in: KEEP_NAMES }
    },
    select: { id: true, name: true }
  });
  
  console.log(`✅ Encontrados ${keepLeads.length} leads a mantener:`);
  keepLeads.forEach(l => console.log(`   - ${l.name}`));
  
  const keepIds = keepLeads.map(l => l.id);
  
  // Contar cuántos vamos a borrar
  const toDeleteCount = await prisma.client.count({
    where: {
      id: { notIn: keepIds }
    }
  });
  
  console.log(`\n🗑️  Se borrarán ${toDeleteCount} leads...`);
  
  // Primero borrar registros relacionados
  console.log('   Borrando contact records...');
  await prisma.contactRecord.deleteMany({
    where: {
      clientId: { notIn: keepIds }
    }
  });
  
  console.log('   Borrando stage transitions...');
  await prisma.stageTransition.deleteMany({
    where: {
      clientId: { notIn: keepIds }
    }
  });
  
  console.log('   Borrando client notes...');
  await prisma.clientNote.deleteMany({
    where: {
      clientId: { notIn: keepIds }
    }
  });
  
  console.log('   Borrando projects...');
  await prisma.project.deleteMany({
    where: {
      clientId: { notIn: keepIds }
    }
  });
  
  // Ahora borrar los clients
  console.log('   Borrando clients...');
  const deleted = await prisma.client.deleteMany({
    where: {
      id: { notIn: keepIds }
    }
  });
  
  console.log(`\n✅ Limpieza completada. ${deleted.count} leads eliminados.`);
  
  // Verificar resultado
  const remaining = await prisma.client.count();
  console.log(`📊 Leads restantes en la DB: ${remaining}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
