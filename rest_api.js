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

const PORT = process.env.REST_PORT || 3000;

// Helper function untuk membuat HATEOAS Links (Level 3)
const createProductLinks = (product, req) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return {
    self: {
      href: `${baseUrl}/api/products/${product.id}`,
      method: 'GET',
      description: 'Detail produk ini'
    },
    category: {
      href: `${baseUrl}/api/categories/${product.category_id}`,
      method: 'GET',
      description: 'Detail kategori dari produk ini'
    },
    update: {
      href: `${baseUrl}/api/products/${product.id}`,
      method: 'PUT',
      description: 'Memperbarui data produk ini'
    },
    delete: {
      href: `${baseUrl}/api/products/${product.id}`,
      method: 'DELETE',
      description: 'Menghapus produk ini'
    }
  };
};

// 1. GET /api/products (Mengambil Semua Produk + HATEOAS Links)
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const products = result.rows.map((product) => ({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      stock: product.stock,
      category_id: product.category_id,
      _links: createProductLinks(product, req)
    }));

    res.json({
      count: products.length,
      data: products,
      _links: {
        self: { href: `${baseUrl}/api/products`, method: 'GET' },
        create: { href: `${baseUrl}/api/products`, method: 'POST', description: 'Tambah produk baru' }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/products/:id (Mengambil Detail Produk berdasarkan ID + HATEOAS Links)
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    const product = result.rows[0];

    res.json({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      stock: product.stock,
      category_id: product.category_id,
      _links: createProductLinks(product, req)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/products (Membuat Produk Baru)
app.post('/api/products', async (req, res) => {
  try {
    const { name, price, stock, category_id } = req.body;
    const result = await pool.query(
      'INSERT INTO products (name, price, stock, category_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, price, stock, category_id]
    );

    const newProduct = result.rows[0];

    res.status(201).json({
      message: 'Produk berhasil dibuat',
      data: {
        id: newProduct.id,
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        stock: newProduct.stock,
        category_id: newProduct.category_id,
        _links: createProductLinks(newProduct, req)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. GET /api/categories/:id (Mengambil Detail Kategori)
app.get('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    }

    const category = result.rows[0];
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({
      id: category.id,
      name: category.name,
      _links: {
        self: { href: `${baseUrl}/api/categories/${category.id}`, method: 'GET' },
        all_products: { href: `${baseUrl}/api/products`, method: 'GET' }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 REST API Level 3 (HATEOAS) berjalan di http://localhost:${PORT}`);
});