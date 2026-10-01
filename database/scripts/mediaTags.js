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

module.exports = { assignTag, getMediaWithTags };
