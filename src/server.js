const express = require('express')

const {
  slugify,
  getCategory,
  getItem,
  insertItem,
  vote,
  addView,
  getCategories,
  randomItem
} = require('./logic')

const app = express()
const port = 4242

app.set('trust proxy', true)

app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.get('/', async (req, res) => {
  let categories = await getCategories()
  res.render('home', { categories })
})

app.get('/:generator{/:item}', async (req, res) => {
  let generator = slugify(req.params.generator)
  let slug = req.params.item
  let action = req.query.action
  let ip = req.ip

  let category = await getCategory(generator)
  if (category?.active === false) return res.status(410).send('deleted')

  if (action === 'new') {
    if (slug) return res.redirect(302, `/${generator}?action=new`)
    return res.render('new', {
      title: `Add Item to ${generator}`,
      category: { name: generator }
    })
  }
  
  if (!category && action !== 'create') {
    return res.redirect(302, `/${generator}?action=new`)
  }

  if (action === 'random') {
    if (!category) return res.status(404).json({ error: 'Category not found' })
    let random = await randomItem(category.id, ip)
    if (!random) return res.status(404).json({ error: 'No items found' })
    return res.json(random)
  }

  if (slug) {
    let item = await getItem(category.id, slug, ip)
    if (!item) return res.status(404).send('<h1>404: Not Found</h1>')
    if (item?.active === false) return res.status(410).send('deleted')
    await addView(item.id, ip)
    return res.render('random', {
      category,
      item,
      button: `<a href="/${generator}"><button>Random</button></a>`
    })
  }

  return res.render('random', {
    category: { name: generator },
    item: { content: '', slug: '#' },
    button: `<button onclick="random()">Random</button>`
  })
})

app.post('/:generator', async (req, res) => {
  let generator = slugify(req.params.generator)
  let action = req.query.action
  let ip = req.ip

  if (action === 'create') {
    let content = req.body.content?.trim()
    if (!content) return res.status(400).send('Content required')
    let result = await insertItem(generator, content, slugify(content))
    return res.redirect(`/${generator}/${result.slug}`)
  }

  res.status(400).send('Invalid action')
})

app.post('/:generator/:item', async (req, res) => {
  let generator = slugify(req.params.generator)
  let slug = req.params.item
  let action = req.query.action
  let ip = req.ip
  let category = await getCategory(generator)
  if (!category) return res.status(404).send('Category not found')
  if (category?.active === false) return res.status(410).send('deleted')
  if (action === 'vote') {
    let item = await getItem(category.id, slug, ip)
    if (!item) return res.status(404).end()
    return res.json(await vote(item.id, ip, req.body.vote === '1'))
  }
  res.status(400).send('Invalid action')
})

app.listen(port)

