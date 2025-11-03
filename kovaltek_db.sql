-- =====================================================
-- KOVALTEK IMPORT - Base de Datos MySQL
-- Sistema de Ventas y Administración
-- =====================================================

-- Eliminar base de datos si existe (cuidado en producción)
DROP DATABASE IF EXISTS kovaltek_db;

-- Crear base de datos
CREATE DATABASE kovaltek_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kovaltek_db;

-- =====================================================
-- TABLA: products (Productos)
-- =====================================================
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  category ENUM('fotocopiadoras', 'impresoras', 'proyectores', 'plotters', 'suministros') NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  description TEXT,
  image_url VARCHAR(500) NULL,
  sku VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_category (category),
  INDEX idx_brand (brand),
  INDEX idx_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: customers (Clientes)
-- =====================================================
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  company VARCHAR(255),
  ruc VARCHAR(20),
  department VARCHAR(100),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_ruc (ruc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: orders (Órdenes/Requerimientos)
-- =====================================================
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('tarjeta', 'yape', 'plin', 'transferencia', 'contraentrega') NOT NULL,
  observations TEXT,
  status ENUM('pendiente', 'procesando', 'enviado', 'completado', 'cancelado') DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_order_number (order_number),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: order_items (Items de las órdenes)
-- =====================================================
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * price) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_order (order_id),
  INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: users (Usuarios del sistema - Administradores)
-- =====================================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role ENUM('admin', 'vendedor', 'almacen') DEFAULT 'vendedor',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INSERTAR DATOS DE EJEMPLO - PRODUCTOS
-- =====================================================

INSERT INTO products (name, brand, category, price, stock, description, sku) VALUES
-- FOTOCOPIADORAS
('Fotocopiadora Kyocera TASKalfa 2553ci', 'KYOCERA', 'fotocopiadoras', 12500.00, 5, 
 'Fotocopiadora multifuncional a color, 25 ppm, pantalla táctil 7", impresión, copia, escaneo y fax. Ideal para oficinas medianas con alto volumen de impresión.', 
 'KYO-TAS-2553CI'),

('Fotocopiadora Konica Minolta bizhub C308', 'KONICA MINOLTA', 'fotocopiadoras', 14200.00, 4, 
 'Multifuncional a color de 30 ppm con acabados profesionales, tecnología Simitri HD y panel táctil de 10.1". Perfecta para empresas exigentes.', 
 'KM-C308'),

('Fotocopiadora Sharp MX-3071', 'SHARP', 'fotocopiadoras', 11800.00, 7, 
 'Multifuncional monocromática de 30 ppm con sistema de seguridad avanzado y bajo consumo energético. Ideal para documentos de alto volumen.', 
 'SHP-MX3071'),

('Fotocopiadora Canon imageRUNNER ADVANCE C3530i', 'CANON', 'fotocopiadoras', 13900.00, 3, 
 'Sistema multifuncional a color de 30 ppm con conectividad cloud y funciones inteligentes de gestión documental.', 
 'CAN-IRC3530I'),

-- IMPRESORAS
('Impresora Canon imageRUNNER 2625', 'CANON', 'impresoras', 8900.00, 8, 
 'Impresora multifuncional láser monocromática con funciones de copiado y escaneo, velocidad 25 ppm, bandeja de 550 hojas.', 
 'CAN-IR2625'),

('Impresora Sharp MX-M3071', 'SHARP', 'impresoras', 9800.00, 6, 
 'Impresora multifuncional monocromática de alto volumen, 30 ppm, con escáner duplex de una pasada y acabados profesionales.', 
 'SHP-MXM3071'),

('Impresora Konica Minolta bizhub 287', 'KONICA MINOLTA', 'impresoras', 7200.00, 9, 
 'Multifuncional monocromática con gran capacidad, 28 ppm, panel táctil y opciones de seguridad avanzadas.', 
 'KM-B287'),

('Impresora HP LaserJet Enterprise M506dn', 'HP', 'impresoras', 3200.00, 15, 
 'Impresora láser monocromática de alta velocidad, 43 ppm, impresión duplex automática y conectividad Ethernet.', 
 'HP-M506DN'),

-- PROYECTORES
('Proyector Epson PowerLite X49', 'EPSON', 'proyectores', 1850.00, 12, 
 'Proyector XGA 3LCD con 3600 lúmenes, HDMI, VGA, ideal para salas de conferencias y aulas. Relación de contraste 20,000:1.', 
 'EPS-PLX49'),

('Proyector BenQ MH535A', 'BENQ', 'proyectores', 2100.00, 10, 
 'Proyector Full HD 1080p con 3600 lúmenes ANSI, tecnología DLP, altavoz integrado de 10W, perfecto para presentaciones profesionales.', 
 'BQ-MH535A'),

('Proyector Sony VPL-PHZ10', 'SONY', 'proyectores', 4500.00, 5, 
 'Proyector láser WUXGA con 5000 lúmenes, tecnología 3LCD, hasta 20,000 horas de vida útil de la lámpara. Ideal para grandes auditorios.', 
 'SNY-VPLPHZ10'),

('Proyector Optoma X400LVe', 'OPTOMA', 'proyectores', 1650.00, 8, 
 'Proyector XGA de 4000 lúmenes, DLP, vida de lámpara hasta 15,000 horas en modo Eco. Económico y confiable.', 
 'OPT-X400LVE'),

-- PLOTTERS
('Plotter HP DesignJet T650', 'HP', 'plotters', 15600.00, 3, 
 'Plotter de 36 pulgadas con Wi-Fi integrado para impresión de planos arquitectónicos e ingeniería. Incluye escáner opcional.', 
 'HP-DJT650'),

('Plotter Canon imagePROGRAF TM-300', 'CANON', 'plotters', 18900.00, 2, 
 'Plotter de 36 pulgadas con tecnología de tinta de 5 colores, ideal para CAD y GIS. Incluye soporte y carrete.', 
 'CAN-IPTM300'),

('Plotter Epson SureColor T3170', 'EPSON', 'plotters', 16800.00, 4, 
 'Plotter inalámbrico de 24 pulgadas con tecnología PrecisionCore, impresión rápida y precisa para diseño técnico.', 
 'EPS-SCT3170'),

-- SUMINISTROS
('Tóner Kyocera TK-3182', 'KYOCERA', 'suministros', 320.00, 50, 
 'Tóner original negro con rendimiento de 21,000 páginas. Compatible con modelos ECOSYS P3055dn y M3655idn.', 
 'KYO-TK3182'),

('Tambor Canon C-EXV 18', 'CANON', 'suministros', 580.00, 30, 
 'Unidad de tambor original para imageRUNNER, rendimiento aproximado de 26,900 páginas. Garantía de calidad Canon.', 
 'CAN-CEXV18'),

('Tóner HP 05A Negro', 'HP', 'suministros', 280.00, 40, 
 'Tóner original negro para LaserJet P2035/P2055, rendimiento de 2,300 páginas. Calidad certificada HP.', 
 'HP-CE505A'),

('Kit de Mantenimiento Konica Minolta', 'KONICA MINOLTA', 'suministros', 890.00, 20, 
 'Kit de mantenimiento original incluye fusor, rodillos y componentes esenciales. Rendimiento 200,000 páginas.', 
 'KM-MAINT'),

('Guillotina Ideal 4315', 'IDEAL', 'suministros', 850.00, 15, 
 'Guillotina de palanca manual con capacidad de corte de 43cm, puede cortar hasta 40 hojas a la vez. Ideal para oficinas.', 
 'IDL-4315'),

('Anilladora Profesional GBC CombBind C450e', 'GBC', 'suministros', 1250.00, 10, 
 'Anilladora eléctrica profesional, perfora hasta 30 hojas, anilla hasta 500 hojas. Perfecta para encuadernación de documentos.', 
 'GBC-C450E');

-- =====================================================
-- INSERTAR USUARIO ADMINISTRADOR DE EJEMPLO
-- Contraseña: admin123 (debes cambiarla en producción)
-- =====================================================
INSERT INTO users (username, password, full_name, email, role) VALUES
('admin', '$2b$10$rQ8YvWvF5k3K8YvWvF5k3O8YvWvF5k3K8YvWvF5k3K8YvWvF5k3K', 'Administrador Kovaltek', 'admin@kovaltek.com', 'admin');

-- =====================================================
-- INSERTAR CLIENTES DE EJEMPLO
-- =====================================================
INSERT INTO customers (name, email, phone, company, ruc, department, address) VALUES
('Juan Pérez García', 'juan.perez@empresa.com', '+51 987 654 321', 'Constructora Pérez SAC', '20123456789', 'Lima', 
 'Av. Javier Prado Este 4567, San Isidro, Lima'),

('María González López', 'maria.gonzalez@tech.com', '+51 998 765 432', 'TechSolutions EIRL', '20987654321', 'Arequipa', 
 'Calle San José 234, Yanahuara, Arequipa'),

('Carlos Rodríguez Sánchez', 'carlos.rodriguez@educacion.gob.pe', '+51 965 432 198', 'I.E. San Martín de Porres', '20456789123', 'Cusco', 
 'Jr. Los Incas 890, Wanchaq, Cusco'),

('Ana Martínez Torres', 'ana.martinez@hospital.gob.pe', '+51 954 321 876', 'Hospital Regional de Huancayo', '20789456123', 'Junín', 
 'Av. Ferrocarril 1500, El Tambo, Huancayo');

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de productos con stock bajo
CREATE VIEW productos_stock_bajo AS
SELECT id, name, brand, category, stock, price
FROM products
WHERE stock < 10 AND deleted_at IS NULL
ORDER BY stock ASC;

-- Vista de mejores clientes
CREATE VIEW mejores_clientes AS
SELECT 
  c.id,
  c.name,
  c.email,
  c.company,
  COUNT(o.id) as total_ordenes,
  SUM(o.total) as total_gastado
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id
ORDER BY total_gastado DESC;

-- Vista de ventas del mes actual
CREATE VIEW ventas_mes_actual AS
SELECT 
  DATE(o.created_at) as fecha,
  COUNT(o.id) as total_ordenes,
  SUM(o.total) as total_ventas
FROM orders o
WHERE MONTH(o.created_at) = MONTH(CURRENT_DATE())
  AND YEAR(o.created_at) = YEAR(CURRENT_DATE())
GROUP BY DATE(o.created_at)
ORDER BY fecha DESC;

-- =====================================================
-- PROCEDIMIENTOS ALMACENADOS
-- =====================================================

-- Procedimiento para obtener reporte de ventas por fecha
DELIMITER //
CREATE PROCEDURE sp_reporte_ventas(
  IN fecha_inicio DATE,
  IN fecha_fin DATE
)
BEGIN
  SELECT 
    o.order_number,
    o.created_at as fecha,
    c.name as cliente,
    c.company,
    o.total,
    o.payment_method,
    o.status
  FROM orders o
  INNER JOIN customers c ON o.customer_id = c.id
  WHERE DATE(o.created_at) BETWEEN fecha_inicio AND fecha_fin
  ORDER BY o.created_at DESC;
END //
DELIMITER ;

-- =====================================================
-- CONSULTAS ÚTILES DE EJEMPLO
-- =====================================================

-- Ver todos los productos disponibles
-- SELECT * FROM products WHERE deleted_at IS NULL ORDER BY category, brand;

-- Ver órdenes pendientes
-- SELECT * FROM orders WHERE status = 'pendiente' ORDER BY created_at DESC;

-- Ver productos más vendidos
-- SELECT p.name, p.brand, SUM(oi.quantity) as total_vendido
-- FROM order_items oi
-- INNER JOIN products p ON oi.product_id = p.id
-- GROUP BY p.id
-- ORDER BY total_vendido DESC
-- LIMIT 10;

-- Ver ingresos totales
-- SELECT SUM(total) as ingresos_totales FROM orders WHERE status != 'cancelado';

-- =====================================================
-- FINALIZADO
-- =====================================================

-- Agregar columna imageKey
ALTER TABLE products ADD COLUMN image_key VARCHAR(100);

-- Actualizar productos con sus imageKeys
UPDATE products SET image_key = 'canon_c256if' WHERE name LIKE '%Canon%C256%';
UPDATE products SET image_key = 'canon_c3750' WHERE name LIKE '%Canon%C3750%';
UPDATE products SET image_key = 'konica_bizhub_454e' WHERE name LIKE '%bizhub 454%';
UPDATE products SET image_key = 'konica_c250i' WHERE name LIKE '%C250i%';
UPDATE products SET image_key = 'impresora_canon_3300' WHERE name LIKE '%Canon 3300%';
UPDATE products SET image_key = 'impresora_konica_4001' WHERE name LIKE '%Konica 4001%';
UPDATE products SET image_key = 'impresora_sharp_3071' WHERE name LIKE '%Sharp 3071%';
UPDATE products SET image_key = 'plotter_canon_340' WHERE name LIKE '%Canon 340%';
UPDATE products SET image_key = 'plotter_hp_t650' WHERE name LIKE '%HP T650%';
UPDATE products SET image_key = 'proyector_benq_mx666' WHERE name LIKE '%BenQ MX666%';
UPDATE products SET image_key = 'proyector_epson_3lcd' WHERE name LIKE '%Epson 3LCD%';
UPDATE products SET image_key = 'proyector_viewsonic_pa503s' WHERE name LIKE '%ViewSonic PA503%';
UPDATE products SET image_key = 'guillotina_negra' WHERE name LIKE '%Guillotina Negra%';
UPDATE products SET image_key = 'tambor_canon_exv18' WHERE name LIKE '%Tambor Canon%EXV 18%';
UPDATE products SET image_key = 'toner_hp_05a' WHERE name LIKE '%Toner HP 05A%';
UPDATE products SET image_key = 'toner_kyocera_tk3182' WHERE name LIKE '%Kyocera TK-3182%';

SELECT '✅ Base de datos KOVALTEK_DB creada exitosamente!' as mensaje;
SELECT CONCAT('📊 Total de productos: ', COUNT(*)) as info FROM products;
SELECT CONCAT('👥 Total de clientes: ', COUNT(*)) as info FROM customers;