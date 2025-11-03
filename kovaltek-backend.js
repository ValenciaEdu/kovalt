// backend/server.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kovaltek_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

// Inicializar conexión a la base de datos
async function initDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log('✅ Conectado a MySQL');
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error);
    process.exit(1);
  }
}

// Configuración de Nodemailer (opcional)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ========== PRODUCTOS ==========

// Obtener todos los productos
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener producto por ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear producto
app.post('/api/products', async (req, res) => {
  try {
    const { name, brand, category, price, stock, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO products (name, brand, category, price, stock, description) VALUES (?, ?, ?, ?, ?, ?)',
      [name, brand, category, price, stock, description]
    );
    res.status(201).json({ id: result.insertId, message: 'Producto creado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar producto
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, brand, category, price, stock, description } = req.body;
    await pool.query(
      'UPDATE products SET name = ?, brand = ?, category = ?, price = ?, stock = ?, description = ? WHERE id = ?',
      [name, brand, category, price, stock, description, req.params.id]
    );
    res.json({ message: 'Producto actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar producto (soft delete)
app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query('UPDATE products SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
    res.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Filtrar productos por categoría
app.get('/api/products/category/:category', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE category = ? AND deleted_at IS NULL',
      [req.params.category]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ÓRDENES ==========

// Obtener todas las órdenes
app.get('/api/orders', async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT o.*, c.name as customer_name, c.email as customer_email 
      FROM orders o 
      LEFT JOIN customers c ON o.customer_id = c.id 
      ORDER BY o.created_at DESC
    `);
    
    for (let order of orders) {
      const [items] = await pool.query(`
        SELECT oi.*, p.name as product_name, p.brand 
        FROM order_items oi 
        LEFT JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = ?
      `, [order.id]);
      order.items = items;
    }
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener orden por ID
app.get('/api/orders/:id', async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT o.*, c.* 
      FROM orders o 
      LEFT JOIN customers c ON o.customer_id = c.id 
      WHERE o.id = ?
    `, [req.params.id]);
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    
    const order = orders[0];
    const [items] = await pool.query(`
      SELECT oi.*, p.name as product_name, p.brand 
      FROM order_items oi 
      LEFT JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = ?
    `, [order.id]);
    
    order.items = items;
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear orden
app.post('/api/orders', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { customer, items, payment_method, total, observations } = req.body;
    
    // Verificar o crear cliente
    let customerId;
    const [existingCustomer] = await connection.query(
      'SELECT id FROM customers WHERE email = ?',
      [customer.email]
    );
    
    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].id;
      await connection.query(
        'UPDATE customers SET name = ?, phone = ?, company = ?, ruc = ?, department = ?, address = ? WHERE id = ?',
        [customer.name, customer.phone, customer.company, customer.ruc, customer.department, customer.address, customerId]
      );
    } else {
      const [result] = await connection.query(
        'INSERT INTO customers (name, email, phone, company, ruc, department, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [customer.name, customer.email, customer.phone, customer.company, customer.ruc, customer.department, customer.address]
      );
      customerId = result.insertId;
    }
    
    // Crear orden
    const orderNumber = `ORD-${Date.now()}`;
    const [orderResult] = await connection.query(
      'INSERT INTO orders (order_number, customer_id, total, payment_method, observations, status) VALUES (?, ?, ?, ?, ?, ?)',
      [orderNumber, customerId, total, payment_method, observations, 'pendiente']
    );
    
    const orderId = orderResult.insertId;
    
    // Insertar items y actualizar stock
    for (const item of items) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.id, item.quantity, item.price]
      );
      
      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.id]
      );
    }
    
    await connection.commit();
    
    // Enviar email de notificación (opcional)
    try {
      await sendOrderNotification(customer, orderNumber, items, total);
    } catch (emailError) {
      console.error('Error enviando email:', emailError);
    }
    
    res.status(201).json({ 
      id: orderId, 
      orderNumber, 
      message: 'Orden creada exitosamente' 
    });
    
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Actualizar estado de orden
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Estado actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== CLIENTES ==========

// Obtener todos los clientes
app.get('/api/customers', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, COUNT(o.id) as total_orders, COALESCE(SUM(o.total), 0) as total_spent 
      FROM customers c 
      LEFT JOIN orders o ON c.id = o.customer_id 
      GROUP BY c.id 
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ESTADÍSTICAS ==========

// Obtener estadísticas del dashboard
app.get('/api/stats', async (req, res) => {
  try {
    const [totalSales] = await pool.query('SELECT COALESCE(SUM(total), 0) as total FROM orders');
    const [totalOrders] = await pool.query('SELECT COUNT(*) as total FROM orders');
    const [totalProducts] = await pool.query('SELECT COUNT(*) as total FROM products WHERE deleted_at IS NULL');
    const [totalCustomers] = await pool.query('SELECT COUNT(*) as total FROM customers');
    
    res.json({
      totalSales: totalSales[0].total,
      totalOrders: totalOrders[0].total,
      totalProducts: totalProducts[0].total,
      totalCustomers: totalCustomers[0].total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Función para enviar notificación por email
async function sendOrderNotification(customer, orderNumber, items, total) {
  const itemsList = items.map(item => 
    `- ${item.name} x${item.quantity} - S/ ${(item.price * item.quantity).toFixed(2)}`
  ).join('\n');
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customer.email,
    subject: `Confirmación de Requerimiento - ${orderNumber}`,
    text: `
Estimado/a ${customer.name},

Hemos recibido su requerimiento de compra:

Número de Orden: ${orderNumber}

Productos:
${itemsList}

Total: S/ ${total.toFixed(2)}
Método de Pago: ${customer.payment_method}

Nos pondremos en contacto con usted a la brevedad.

Gracias por confiar en KOVALTEK IMPORT.
    `
  };
  
  return transporter.sendMail(mailOptions);
}

// Iniciar servidor
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
});