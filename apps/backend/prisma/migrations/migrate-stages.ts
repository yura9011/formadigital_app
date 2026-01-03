/**
 * Migration script to set pipeline stages for existing clients
 * based on their current contactStatus and type.
 * 
 * Run with: npx ts-node prisma/migrations/migrate-stages.ts
 */

import { PrismaClient, PipelineStage, ClientType } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateStages() {
  console.log('Starting stage migration...');
  
  // Get all clients
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      type: true,
      contactStatus: true,
      stage: true,
    },
  });
  
  console.log(`Found ${clients.length} clients to process`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const client of clients) {
    // Skip if already has a non-default stage (already migrated)
    if (client.stage !== 'DISCOVERED') {
      skipped++;
      continue;
    }
    
    let newStage: PipelineStage = 'DISCOVERED';
    
    // If client is already a CLIENT type, mark as CONVERTED
    if (client.type === 'CLIENT') {
      newStage = 'CONVERTED';
    } else {
      // Map contactStatus to stage
      switch (client.contactStatus) {
        case 'none':
        case null:
          newStage = 'DISCOVERED';
          break;
        case 'pending':
        case 'approved':
          newStage = 'ANALYZED';
          break;
        case 'sent':
        case 'rejected':
          newStage = 'CONTACTED';
          break;
        case 'responded':
          newStage = 'RESPONDED';
          break;
        default:
          newStage = 'DISCOVERED';
      }
    }
    
    // Update if stage changed
    if (newStage !== 'DISCOVERED' || client.stage !== newStage) {
      await prisma.client.update({
        where: { id: client.id },
        data: { 
          stage: newStage,
          // Set convertedAt if converting to CONVERTED
          ...(newStage === 'CONVERTED' ? { convertedAt: new Date() } : {}),
        },
      });
      updated++;
      console.log(`  Updated client ${client.id}: ${client.stage} -> ${newStage}`);
    }
  }
  
  console.log(`\nMigration complete:`);
  console.log(`  - Updated: ${updated}`);
  console.log(`  - Skipped: ${skipped}`);
}

migrateStages()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
