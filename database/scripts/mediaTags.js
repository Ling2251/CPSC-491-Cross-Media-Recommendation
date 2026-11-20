async function assignTag(pool, {
  mediaId,
  tagId,
  confidence = null,
  source = 'manual',
  status = 'approved',
}) {
  const { rows } = await pool.query(
    `INSERT INTO media_tags (media_id, tag_id, confidence, source, status)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (media_id, tag_id) DO UPDATE
       SET confidence = EXCLUDED.confidence, source = EXCLUDED.source, status = EXCLUDED.status
     RETURNING *`,
    [mediaId, tagId, confidence, source, status],
  );
  return rows[0];
}

async function getMediaWithTags(pool, mediaId) {
  const { rows: mediaRows } = await pool.query('SELECT * FROM media WHERE id = $1', [mediaId]);
  const media = mediaRows[0];
  if (!media) return null;

  const { rows: tags } = await pool.query(
    `SELECT t.id, t.name, t.category, mt.confidence, mt.source, mt.status
     FROM media_tags mt
     JOIN tag_taxonomy t ON t.id = mt.tag_id
     WHERE mt.media_id = $1
     ORDER BY t.category, t.name`,
    [mediaId],
  );

  return { ...media, tags };
}

// Sprint 3: the unified media profile downstream consumers (recommendation,
// search) should actually query -- unlike getMediaWithTags above, this only
// ever returns status='approved' tags, so a pending_review or rejected
// candidate can never leak into a recommendation-eligible result.
async function getEligibleMediaProfile(pool, mediaId) {
  const { rows: mediaRows } = await pool.query('SELECT * FROM media WHERE id = $1', [mediaId]);
  const media = mediaRows[0];
  if (!media) return null;

  const { rows: tags } = await pool.query(
    `SELECT t.id, t.name, t.category, mt.confidence, mt.source
     FROM media_tags mt
     JOIN tag_taxonomy t ON t.id = mt.tag_id
     WHERE mt.media_id = $1 AND mt.status = 'approved'
     ORDER BY t.category, t.name`,
    [mediaId],
  );

  return { ...media, tags };
}

// Catalog listing filter: media_type is a plain column filter, while the tag
// filter must only match approved tags, for the same leak-prevention reason
// getEligibleMediaProfile above only selects approved tags.
async function listMediaWithEligibleTagFilter(pool, { mediaType, tagName } = {}) {
  const conditions = [];
  const params = [];

  if (mediaType) {
    params.push(mediaType);
    conditions.push(`m.media_type = $${params.length}`);
  }

  if (tagName) {
    params.push(tagName);
    conditions.push(`EXISTS (
      SELECT 1 FROM media_tags mt
      JOIN tag_taxonomy t ON t.id = mt.tag_id
      WHERE mt.media_id = m.id AND mt.status = 'approved' AND t.name = $${params.length}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT * FROM media m ${whereClause} ORDER BY m.id`,
    params,
  );
  return rows;
}

module.exports = {
  assignTag,
  getMediaWithTags,
  getEligibleMediaProfile,
  listMediaWithEligibleTagFilter,
};
