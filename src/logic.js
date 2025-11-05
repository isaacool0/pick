const db = require('./db')

const slugify = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const slugifyItem = (text) =>
  text.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

let categories = new Map();
let getCategory = async (name) => {
  if (categories.has(name)) return categories.get(name);
  let result = await db.query(
    'SELECT id, name, active FROM categories WHERE name = $1',
    [name]
  )
  let category = result.rows[0] || null;
  if (category) categories.set(name, category);
  return category;
}

let getItems = async (category, ip) => {
  let result = await db.query(`
    SELECT items.id, items.content,
      SUM(CASE WHEN votes.vote THEN 1 ELSE 0 END) AS up,
      SUM(CASE WHEN NOT votes.vote THEN 1 ELSE 0 END) AS down,
      (SELECT vote FROM votes WHERE votes.item = items.id AND votes.ip = $2) AS vote
    FROM items
    LEFT JOIN votes ON items.id = votes.item
    WHERE items.category = $1 AND items.active = true
    GROUP BY items.id
  `, [category, ip])
  return result.rows
}

let getItem = async (id, ip) => {
  let result = await db.query(`
    SELECT items.id, items.content, items.active, items.category,
      SUM(CASE WHEN votes.vote THEN 1 ELSE 0 END) AS up,
      SUM(CASE WHEN NOT votes.vote THEN 1 ELSE 0 END) AS down,
      (SELECT vote FROM votes WHERE votes.item = items.id AND votes.ip = $2) AS vote
    FROM items
    LEFT JOIN votes ON items.id = votes.item
    WHERE items.id = $1 AND items.active = true
    GROUP BY items.id, items.category
  `, [id, ip])
  return result.rows[0]
}

let insertItem = async (category, content) => {
  await db.query(`
    INSERT INTO categories (name)
    VALUES ($1)
    ON CONFLICT (name) DO NOTHING
  `, [category])
  let result = await db.query(`
    INSERT INTO items (category, content)
    SELECT id, $2
    FROM categories
    WHERE name = $1
    RETURNING id
  `, [category, content])
  return result.rows[0]
}

let vote = async (item, ip, vote) => {
  let result = await db.query(`SELECT vote FROM votes WHERE item = $1 AND ip = $2`, [item, ip]);
  if (result.rows.length === 0) {
    await addVote(item, ip, vote);
    return 1;
  };
  if (result.rows[0].vote === vote) {
    await delVote(item, ip);
    return 0;
  };
  if (result.rows[0].vote != vote) {
    await delVote(item, ip);
    await addVote(item, ip, vote);
    return 1;
  };
};
let addVote = async (item, ip, vote) => {
  let query = `INSERT INTO public.votes (item, ip, vote) VALUES ($1, $2, $3) RETURNING *`;
  return await db.query(query, [item, ip, vote]);
};
let delVote = async (item, ip) => {
  let query = `DELETE FROM public.votes WHERE item = $1 AND ip = $2 RETURNING *`;
  return await db.query(query, [item, ip]);
};

let addView = async (itemId, ip) => {
  await db.query(`
    INSERT INTO views (item, ip) VALUES ($1, $2)
    ON CONFLICT (item, ip, viewed_on) DO NOTHING
  `, [itemId, ip])
}

let categoryList = null;
let listExpire = 0;
let getCategories = async () => {
  if (categoryList && Date.now() < listExpire) return categoryList;
  let result = await db.query(`
    SELECT categories.name, COUNT(items.id) AS item_count
    FROM categories 
    LEFT JOIN items ON categories.id = items.category
    WHERE categories.active = true
    GROUP BY categories.name
    ORDER BY item_count DESC, categories.name
  `)
  categoryList = result.rows;
  listExpire = Date.now() + 300000; //5 minutes
  return result.rows
}

let randomItem = async (category, ip) => {
  let items = await getItems(category, ip)
  let random = items.length > 0 ? items[Math.floor(Math.random() * items.length)] : null
  if (!random) return null
  await addView(random.id, ip)
  return random
}

module.exports = {
  slugify,
  getCategory,
  getItems,
  getItem,
  insertItem,
  vote,
  addView,
  getCategories,
  randomItem
}

