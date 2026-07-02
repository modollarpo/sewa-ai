import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedEpi() {
  console.log('Seeding Epidemiology Data...');

  const diseases = ['Tuberculosis', 'Pneumonia', 'ICH', 'Stroke'];
  const regions = [
    { country: 'NG', subRegion: 'Lagos' },
    { country: 'NG', subRegion: 'Abuja' },
    { country: 'KE', subRegion: 'Nairobi' },
    { country: 'UK', subRegion: 'London' },
    { country: 'ZA', subRegion: 'Johannesburg' }
  ];

  const events = [];

  for (let i = 0; i < 500; i++) {
    const disease = diseases[Math.floor(Math.random() * diseases.length)];
    const r = regions[Math.floor(Math.random() * regions.length)];
    
    // Create a sudden spike of TB in Lagos over the last 3 days
    let daysAgo = Math.floor(Math.random() * 60);
    if (disease === 'Tuberculosis' && r.subRegion === 'Lagos') {
      if (Math.random() > 0.3) {
        daysAgo = Math.floor(Math.random() * 3); // 70% of TB in Lagos is in the last 3 days
      }
    }

    const detectedAt = new Date();
    detectedAt.setDate(detectedAt.getDate() - daysAgo);

    events.push({
      disease,
      region: r.country,
      subRegion: r.subRegion,
      severity: Math.random() > 0.8 ? 'High' : 'Medium',
      confidenceScore: 0.8 + (Math.random() * 0.19),
      scanOrigin: Math.random() > 0.5 ? 'edge' : 'cloud',
      detectedAt
    });
  }

  await prisma.epidemiologyEvent.createMany({ data: events });
  console.log('Seeded 500 epidemiology events.');
}

seedEpi()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
