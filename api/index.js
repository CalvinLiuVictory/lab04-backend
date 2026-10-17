import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const createProductLinks = (product, req) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  return {
    self: { href: `${baseUrl}/api/products/${product.id}`, method: 'GET' },
    category: { href: `${baseUrl}/api/categories/${product.category_id}`, method: 'GET' },
    update: { href: `${baseUrl}/api/products/${product.id}`, method: 'PUT' },
    delete: { href: `${baseUrl}/api/products/${product.id}`, method: 'DELETE' }
  };
};

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    const products = result.rows.map((p) => ({
      ...p,
      price: parseFloat(p.price),
      _links: createProductLinks(p, req)
    }));
    res.json({ count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    
    const product = result.rows[0];
    res.json({
      ...product,
      price: parseFloat(product.price),
      _links: createProductLinks(product, req)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Wajib diekspor untuk Vercel Serverless Function
export default app;