// backend/server.js - VERSION SQLITE
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de SQLite
const db = new sqlite3.Database('./kovaltek.db', (err) => {
  if (err) {
    console.error('❌ Error conectando a SQLite:', err);
    process.exit(1);
  }
  console.log('✅ Conectado a SQLite');
  initDatabase();
});

// Inicializar tablas
function initDatabase() {
  db.serialize(() => {
    // Tabla productos
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('fotocopiadoras', 'impresoras', 'proyectores', 'plotters', 'suministros')),
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      sku TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL
    )`);

    // Tabla clientes
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      company TEXT,
      ruc TEXT,
      department TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla órdenes
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('tarjeta', 'yape', 'plin', 'transferencia', 'contraentrega')),
      observations TEXT,
      status TEXT DEFAULT 'pendiente' CHECK(status IN ('pendiente', 'procesando', 'enviado', 'completado', 'cancelado')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )`);

    // Tabla items de órdenes
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`, (err) => {
      if (!err) {
        insertSampleData();
      }
    });
  });
}

// Insertar datos de ejemplo
function insertSampleData() {
  db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
    if (row.count === 0) {
      const products = [
        ['Fotocopiadora Kyocera TASKalfa 2553ci', 'KYOCERA', 'fotocopiadoras', 12500.00, 5, 'Fotocopiadora multifuncional a color, 25 ppm', 'KYO-TAS-2553CI'],
        ['Impresora Canon imageRUNNER 2625', 'CANON', 'impresoras', 8900.00, 8, 'Impresora multifuncional láser monocromática', 'CAN-IR2625'],
        ['Proyector Epson PowerLite X49', 'EPSON', 'proyectores', 1850.00, 12, 'Proyector XGA 3LCD, 3600 lúmenes', 'EPS-PLX49'],
        ['Plotter HP DesignJet T650', 'HP', 'plotters', 15600.00, 3, 'Plotter de 36 pulgadas con Wi-Fi', 'HP-DJT650'],
        ['Tóner Kyocera TK-3182', 'KYOCERA', 'suministros', 320.00, 50, 'Tóner original negro, 21,000 páginas', 'KYO-TK3182'],
        ['Fotocopiadora Konica Minolta bizhub C308', 'KONICA MINOLTA', 'fotocopiadoras', 14200.00, 4, 'Multifuncional a color, 30 ppm', 'KM-C308'],
        ['Impresora Sharp MX-M3071', 'SHARP', 'impresoras', 9800.00, 6, 'Impresora multifuncional monocromática', 'SHP-MXM3071'],
        ['Proyector BenQ MH535A', 'BENQ', 'proyectores', 2100.00, 10, 'Proyector Full HD 1080p, 3600 lúmenes', 'BQ-MH535A'],
        ['Tambor Canon C-EXV 18', 'CANON', 'suministros', 580.00, 30, 'Unidad de tambor original', 'CAN-CEXV18'],
        ['Guillotina Ideal 4315', 'IDEAL', 'suministros', 850.00, 15, 'Guillotina manual, corte 43cm', 'IDL-4315'],
        ['Fotocopiadora Sharp MX-3071', 'SHARP', 'fotocopiadoras', 11800.00, 7, 'Multifuncional monocromática 30 ppm', 'SHP-MX3071'],
        ['Proyector Sony VPL-PHZ10', 'SONY', 'proyectores', 4500.00, 5, 'Proyector láser WUXGA, 5000 lúmenes', 'SNY-VPLPHZ10'],
        ['Tóner HP 05A Negro', 'HP', 'suministros', 280.00, 40, 'Tóner original para LaserJet', 'HP-CE505A'],
        ['Impresora Konica Minolta bizhub 287', 'KONICA MINOLTA', 'impresoras', 7200.00, 9, 'Multifuncional monocromática', 'KM-B287'],
        ['Plotter Canon imagePROGRAF TM-300', 'CANON', 'plotters', 18900.00, 2, 'Plotter 36", tecnología 5 colores', 'CAN-IPTM300']
      ];

      const stmt = db.prepare("INSERT INTO products (name, brand, category, price, stock, description, sku) VALUES (?, ?, ?, ?, ?, ?, ?)");
      products.forEach(product => stmt.run(product));
      stmt.finalize();
      console.log('✅ Productos de ejemplo insertados');
    }
  });
}

// ========== PRODUCTOS ==========

app.get('/api/products', (req, res) => {
  db.all("SELECT * FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/products/:id', (req, res) => {
  db.get("SELECT * FROM products WHERE id = ? AND deleted_at IS NULL", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(row);
  });
});

app.post('/api/products', (req, res) => {
  const { name, brand, category, price, stock, description, sku } = req.body;
  db.run(
    "INSERT INTO products (name, brand, category, price, stock, description, sku) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [name, brand, category, price, stock, description, sku],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Producto creado exitosamente' });
    }
  );
});

app.put('/api/products/:id', (req, res) => {
  const { name, brand, category, price, stock, description, sku } = req.body;
  db.run(
    "UPDATE products SET name = ?, brand = ?, category = ?, price = ?, stock = ?, description = ?, sku = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [name, brand, category, price, stock, description, sku, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Producto actualizado exitosamente' });
    }
  );
});

app.delete('/api/products/:id', (req, res) => {
  db.run("UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Producto eliminado exitosamente' });
  });
});

app.get('/api/products/category/:category', (req, res) => {
  db.all("SELECT * FROM products WHERE category = ? AND deleted_at IS NULL", [req.params.category], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ========== ÓRDENES ==========

app.get('/api/orders', (req, res) => {
  db.all(`
    SELECT o.*, c.name as customer_name, c.email as customer_email 
    FROM orders o 
    LEFT JOIN customers c ON o.customer_id = c.id 
    ORDER BY o.created_at DESC
  `, [], (err, orders) => {
    if (err) return res.status(500).json({ error: err.message });
    
    let completed = 0;
    orders.forEach((order, index) => {
      db.all(`
        SELECT oi.*, p.name as product_name, p.brand 
        FROM order_items oi 
        LEFT JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = ?
      `, [order.id], (err, items) => {
        order.items = items || [];
        completed++;
        if (completed === orders.length) {
          res.json(orders);
        }
      });
    });
    
    if (orders.length === 0) res.json([]);
  });
});

app.get('/api/orders/:id', (req, res) => {
  db.get(`
    SELECT o.*, c.* 
    FROM orders o 
    LEFT JOIN customers c ON o.customer_id = c.id 
    WHERE o.id = ?
  `, [req.params.id], (err, order) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    
    db.all(`
      SELECT oi.*, p.name as product_name, p.brand 
      FROM order_items oi 
      LEFT JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = ?
    `, [order.id], (err, items) => {
      order.items = items || [];
      res.json(order);
    });
  });
});

app.post('/api/orders', (req, res) => {
  const { customer, items, payment_method, total, observations } = req.body;
  
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    
    // Verificar o crear cliente
    db.get("SELECT id FROM customers WHERE email = ?", [customer.email], (err, existingCustomer) => {
      let customerId;
      
      const processOrder = (custId) => {
        const orderNumber = `ORD-${Date.now()}`;
        
        db.run(
          "INSERT INTO orders (order_number, customer_id, total, payment_method, observations, status) VALUES (?, ?, ?, ?, ?, ?)",
          [orderNumber, custId, total, payment_method, observations, 'pendiente'],
          function(err) {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: err.message });
            }
            
            const orderId = this.lastID;
            let itemsInserted = 0;
            
            items.forEach(item => {
              db.run(
                "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
                [orderId, item.id, item.quantity, item.price],
                (err) => {
                  if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                  }
                  
                  db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.id]);
                  
                  itemsInserted++;
                  if (itemsInserted === items.length) {
                    db.run("COMMIT");
                    res.status(201).json({ id: orderId, orderNumber, message: 'Orden creada exitosamente' });
                  }
                }
              );
            });
          }
        );
      };
      
      if (existingCustomer) {
        db.run(
          "UPDATE customers SET name = ?, phone = ?, company = ?, ruc = ?, department = ?, address = ? WHERE id = ?",
          [customer.name, customer.phone, customer.company, customer.ruc, customer.department, customer.address, existingCustomer.id],
          () => processOrder(existingCustomer.id)
        );
      } else {
        db.run(
          "INSERT INTO customers (name, email, phone, company, ruc, department, address) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [customer.name, customer.email, customer.phone, customer.company, customer.ruc, customer.department, customer.address],
          function(err) {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: err.message });
            }
            processOrder(this.lastID);
          }
        );
      }
    });
  });
});

app.put('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  db.run("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Estado actualizado exitosamente' });
  });
});

// ========== CLIENTES ==========

app.get('/api/customers', (req, res) => {
  db.all(`
    SELECT c.*, COUNT(o.id) as total_orders, COALESCE(SUM(o.total), 0) as total_spent 
    FROM customers c 
    LEFT JOIN orders o ON c.id = o.customer_id 
    GROUP BY c.id 
    ORDER BY c.created_at DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ========== ESTADÍSTICAS ==========

app.get('/api/stats', (req, res) => {
  const stats = {};
  
  db.get("SELECT COALESCE(SUM(total), 0) as total FROM orders", [], (err, row) => {
    stats.totalSales = row.total;
    
    db.get("SELECT COUNT(*) as total FROM orders", [], (err, row) => {
      stats.totalOrders = row.total;
      
      db.get("SELECT COUNT(*) as total FROM products WHERE deleted_at IS NULL", [], (err, row) => {
        stats.totalProducts = row.total;
        
        db.get("SELECT COUNT(*) as total FROM customers", [], (err, row) => {
          stats.totalCustomers = row.total;
          res.json(stats);
        });
      });
    });
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});