// Demonstrates the Sprint 1 definition of done: insert sample media across
// at least three media types, assign multiple tags each (with varied
// confidence/source/status), and retrieve each one with its complete tag set.
const { createPool } = require('./db');
const { createMedia, listMedia } = require('./media');
const { getTagByNameAndCategory } = require('./tags');
const { assignTag, getMediaWithTags } = require('./mediaTags');

const SAMPLE_MEDIA = [
  {
    title: 'Everything Everywhere All at Once',
    mediaType: 'movie',
    description: 'A multiverse adventure about a woman who must connect with parallel lives.',
    tags: [
      { name: 'Sci-Fi', category: 'genre', source: 'external', confidence: 0.95 },
      { name: 'Uplifting', category: 'mood', source: 'auto', confidence: 0.81 },
      { name: 'Coming of Age', category: 'theme', source: 'manual', confidence: null },
    ],
  },
  {
    title: 'Project Hail Mary',
    mediaType: 'book',
    description: 'A lone astronaut must save humanity from an extinction-level threat.',
    tags: [
      { name: 'Sci-Fi', category: 'genre', source: 'external', confidence: 0.92 },
      { name: 'Intense', category: 'mood', source: 'auto', confidence: 0.77 },
      { name: 'Survival', category: 'theme', source: 'manual', confidence: null },
    ],
  },
  {
    title: 'Blonde',
    mediaType: 'music',
    description: 'A genre-blending R&B album exploring memory and identity.',
    tags: [
      { name: 'Nostalgic', category: 'mood', source: 'auto', confidence: 0.68 },
      { name: '2010s', category: 'era', source: 'external', confidence: 0.99 },
      { name: 'Electronic', category: 'instrumentation', source: 'manual', confidence: null },
    ],
  },
];

async function ensureTag(pool, name, category) {
  const tag = await getTagByNameAndCategory(pool, name, category);
  if (!tag) {
    throw new Error(
      `Expected seeded tag not found: "${name}" (${category}). Run seed/seed_initial_tags.sql first.`,
    );
  }
  return tag;
}

async function main() {
  const pool = createPool();
  try {
    // Re-runnable: clear out any previous run of this demo's own rows first.
    await pool.query('DELETE FROM media WHERE title = ANY($1::text[])', [
      SAMPLE_MEDIA.map((m) => m.title),
    ]);

    for (const item of SAMPLE_MEDIA) {
      const media = await createMedia(pool, {
        title: item.title,
        mediaType: item.mediaType,
        description: item.description,
      });
      for (const tag of item.tags) {
        const tagRow = await ensureTag(pool, tag.name, tag.category);
        await assignTag(pool, {
          mediaId: media.id,
          tagId: tagRow.id,
          confidence: tag.confidence,
          source: tag.source,
        });
      }
    }

    console.log('--- Media profiles with tags ---');
    const all = await listMedia(pool);
    for (const m of all) {
      if (!SAMPLE_MEDIA.some((s) => s.title === m.title)) continue;
      const profile = await getMediaWithTags(pool, m.id);
      console.log(`\n${profile.title} (${profile.media_type})`);
      for (const t of profile.tags) {
        console.log(
          `  - ${t.name} [${t.category}] source=${t.source} confidence=${t.confidence ?? 'n/a'} status=${t.status}`,
        );
      }
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main, SAMPLE_MEDIA };
