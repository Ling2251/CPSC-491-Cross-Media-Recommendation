async function createMedia(pool, {
  title,
  mediaType,
  externalSource = null,
  externalId = null,
  description = null,
  releaseDate = null,
  coverImageUrl = null,
}) {
  const { rows } = await pool.query(
    `INSERT INTO media (title, media_type, external_source, external_id, description, release_date, cover_image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [title, mediaType, externalSource, externalId, description, releaseDate, coverImageUrl],
  );
  return rows[0];
}

// For provider imports: relies on the UNIQUE(external_source, external_id)
// constraint to skip records already imported, rather than erroring.
// Returns the inserted row, or null if it was a duplicate.
async function insertMediaIfNew(pool, {
  title,
  mediaType,
  externalSource,
  externalId,
  description = null,
  releaseDate = null,
  coverImageUrl = null,
}) {
  const { rows } = await pool.query(
    `INSERT INTO media (title, media_type, external_source, external_id, description, release_date, cover_image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (external_source, external_id) DO NOTHING
     RETURNING *`,
    [title, mediaType, externalSource, externalId, description, releaseDate, coverImageUrl],
  );
  return rows[0] || null;
}

async function getMediaById(pool, id) {
  const { rows } = await pool.query('SELECT * FROM media WHERE id = $1', [id]);
  return rows[0] || null;
}

async function listMedia(pool, { mediaType } = {}) {
  if (mediaType) {
    const { rows } = await pool.query(
      'SELECT * FROM media WHERE media_type = $1 ORDER BY id',
      [mediaType],
    );
    return rows;
  }
  const { rows } = await pool.query('SELECT * FROM media ORDER BY id');
  return rows;
}

module.exports = { createMedia, insertMediaIfNew, getMediaById, listMedia };
