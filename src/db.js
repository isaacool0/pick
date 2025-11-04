const pg = require('pg');

const db = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'pick',
  user: 'postgres'
});

module.exports = db;
