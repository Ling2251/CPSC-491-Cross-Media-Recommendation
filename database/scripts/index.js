const { createPool } = require('./db');
const media = require('./media');
const tags = require('./tags');
const mediaTags = require('./mediaTags');

module.exports = {
  createPool,
  ...media,
  ...tags,
  ...mediaTags,
};
