async function createTag(pool, { name, category, parentTagId = null }) {
  const { rows } = await pool.query(
    `INSERT INTO tag_taxonomy (name, category, parent_tag_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (name, category) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [name, category, parentTagId],
  );
  return rows[0];
}

async function getTagByNameAndCategory(pool, name, category) {
  const { rows } = await pool.query(
    'SELECT * FROM tag_taxonomy WHERE name = $1 AND category = $2',
    [name, category],
  );
  return rows[0] || null;
}

async function listTagsByCategory(pool, category) {
  const { rows } = await pool.query(
    'SELECT * FROM tag_taxonomy WHERE category = $1 ORDER BY name',
    [category],
  );
  return rows;
}

module.exports = { createTag, getTagByNameAndCategory, listTagsByCategory };
