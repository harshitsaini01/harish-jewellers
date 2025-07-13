const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { db, initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 7070;
const JWT_SECRET = process.env.JWT_SECRET || 'harish_jewellers_secret_key_2024';

// Security middleware
app.use(helmet());

// Rate limiting middleware - limit to 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'customer-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://harishjewellers.shop',
        'https://www.harishjewellers.shop',
        /^https:\/\/.*\.hostinger\..*$/,
        /^https:\/\/.*\.hpanel\..*$/
      ]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir)); // Serve uploaded files

// Error handling middleware for multer uploads
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field.' });
    }
  }
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({ error: 'Only image files (JPEG, JPG, PNG, GIF) are allowed.' });
  }
  next(error);
});

// General error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message 
  });
});

// API routes should be defined BEFORE static file serving
// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Harish Jewellers API Server', 
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth/login',
      customers: '/api/customers',
      items: '/api/items',
      groups: '/api/item-groups',
      invoices: '/api/invoices',
      dashboard: '/api/dashboard/stats'
    }
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Financial utility function to properly round currency values
const roundCurrency = (value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  });
});

// Enhanced Customer routes
app.get('/api/customers', authenticateToken, (req, res) => {
  const { filter } = req.query;
  
  let whereClause = '';
  if (filter === 'gst') {
    whereClause = 'WHERE c.is_gst = 1';
  } else if (filter === 'regular') {
    whereClause = 'WHERE (c.is_gst = 0 OR c.is_gst IS NULL)';
  }
  
  const query = `
    SELECT 
      c.*,
      COALESCE(SUM(i.balance_amount), 0) as total_pending,
      COUNT(i.id) as total_invoices
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customer_id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;
  
  db.all(query, (err, customers) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(customers);
  });
});

app.get('/api/customers/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  const customerQuery = `
    SELECT 
      c.*,
      COALESCE(SUM(i.balance_amount), 0) as total_pending,
      COUNT(i.id) as total_invoices
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customer_id
    WHERE c.id = ?
    GROUP BY c.id
  `;
  
  db.get(customerQuery, [id], (err, customer) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  });
});

app.post('/api/customers', authenticateToken, upload.single('image'), (req, res) => {
  const { 
    name, mobile, alt_mobile, email, 
    address_line1, address_line2, city, state, pincode, country,
    ledger_balance, is_gst
  } = req.body;
  
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  
  // Parse is_gst properly (it comes as string from FormData)
  const isGstValue = is_gst === 'true' || is_gst === true ? 1 : 0;
  
  db.run(
    `INSERT INTO customers (
      name, mobile, alt_mobile, email, 
      address_line1, address_line2, city, state, pincode, country,
      image_url, ledger_balance, is_gst
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name, mobile, alt_mobile, email,
      address_line1, address_line2, city, state, pincode, country || 'India',
      image_url, ledger_balance || 0, isGstValue
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, message: 'Customer created successfully' });
    }
  );
});

app.put('/api/customers/:id', authenticateToken, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { 
    name, mobile, alt_mobile, email, 
    address_line1, address_line2, city, state, pincode, country,
    ledger_balance, is_gst
  } = req.body;
  
  const image_url = req.file ? `/uploads/${req.file.filename}` : undefined;
  
  // Parse is_gst properly (it comes as string from FormData)
  const isGstValue = is_gst === 'true' || is_gst === true ? 1 : 0;
  
  let query, params;
  
  if (image_url) {
    query = `UPDATE customers SET 
      name = ?, mobile = ?, alt_mobile = ?, email = ?,
      address_line1 = ?, address_line2 = ?, city = ?, state = ?, pincode = ?, country = ?,
      image_url = ?, ledger_balance = ?, is_gst = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`;
    params = [
      name, mobile, alt_mobile, email,
      address_line1, address_line2, city, state, pincode, country || 'India',
      image_url, ledger_balance || 0, isGstValue, id
    ];
  } else {
    query = `UPDATE customers SET 
      name = ?, mobile = ?, alt_mobile = ?, email = ?,
      address_line1 = ?, address_line2 = ?, city = ?, state = ?, pincode = ?, country = ?,
      ledger_balance = ?, is_gst = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`;
    params = [
      name, mobile, alt_mobile, email,
      address_line1, address_line2, city, state, pincode, country || 'India',
      ledger_balance || 0, isGstValue, id
    ];
  }
  
  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ message: 'Customer updated successfully' });
  });
});

app.delete('/api/customers/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  // First check if customer has any invoices
  db.get('SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (result.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with existing invoices. Please delete all invoices for this customer first.' 
      });
    }
    
    // Get customer image to delete file
    db.get('SELECT image_url FROM customers WHERE id = ?', [id], (err, customer) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Delete customer from database
      db.run('DELETE FROM customers WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Customer not found' });
        }
        
        // Delete image file if exists
        if (customer?.image_url) {
          const imagePath = path.join(__dirname, customer.image_url);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }
        
        res.json({ message: 'Customer deleted successfully' });
      });
    });
  });
});

// Item groups routes
app.get('/api/item-groups', authenticateToken, (req, res) => {
  db.all('SELECT * FROM item_groups ORDER BY name', (err, groups) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(groups);
  });
});

app.post('/api/item-groups', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  
  db.run(
    'INSERT INTO item_groups (name, description) VALUES (?, ?)',
    [name, description],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, message: 'Item group created successfully' });
    }
  );
});

app.put('/api/item-groups/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  
  db.run(
    'UPDATE item_groups SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, description, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Item group not found' });
      }
      
      res.json({ message: 'Item group updated successfully' });
    }
  );
});

app.delete('/api/item-groups/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  // First check if there are items in this group
  db.get('SELECT COUNT(*) as count FROM items WHERE group_id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete item group that contains items. Please delete or move the items first.' });
    }
    
    // Delete the item group
    db.run('DELETE FROM item_groups WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Item group not found' });
      }
      
      res.json({ message: 'Item group deleted successfully' });
    });
  });
});

// Items routes
app.get('/api/items', authenticateToken, (req, res) => {
  const query = `
    SELECT i.*, ig.name as group_name 
    FROM items i 
    LEFT JOIN item_groups ig ON i.group_id = ig.id 
    ORDER BY i.created_at DESC
  `;
  
  db.all(query, (err, items) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(items);
  });
});

app.post('/api/items', authenticateToken, (req, res) => {
  const { name, group_id, price, description } = req.body;
  
  db.run(
    'INSERT INTO items (name, group_id, price, description) VALUES (?, ?, ?, ?)',
    [name, group_id, price, description],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, message: 'Item created successfully' });
    }
  );
});

app.put('/api/items/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, group_id, price, description } = req.body;
  
  db.run(
    'UPDATE items SET name = ?, group_id = ?, price = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, group_id, price, description, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }
      
      res.json({ message: 'Item updated successfully' });
    }
  );
});

app.delete('/api/items/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM items WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ message: 'Item deleted successfully' });
  });
});

// Invoice routes
app.get('/api/invoices', authenticateToken, (req, res) => {
  const query = `
    SELECT i.*, c.name as customer_name 
    FROM invoices i 
    LEFT JOIN customers c ON i.customer_id = c.id 
    ORDER BY i.created_at DESC
  `;
  
  db.all(query, (err, invoices) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(invoices);
  });
});

app.get('/api/invoices/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  const invoiceQuery = `
    SELECT i.*, c.name as customer_name, c.mobile, c.address_line1, c.address_line2, c.city, c.state, c.pincode
    FROM invoices i 
    LEFT JOIN customers c ON i.customer_id = c.id 
    WHERE i.id = ?
  `;
  
  const itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = ?';
  
  db.get(invoiceQuery, [id], (err, invoice) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    db.all(itemsQuery, [id], (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ ...invoice, items });
    });
  });
});

// Generate sequential invoice number
const generateInvoiceNumber = async (type) => {
  return new Promise((resolve, reject) => {
    if (type === 'repayment') {
      // Get the highest REP number (only look for sequential format REP-XXXX where XXXX is 4-5 digits)
      const query = "SELECT invoice_number FROM invoices WHERE type = 'repayment' AND invoice_number LIKE 'REP-%' AND LENGTH(SUBSTR(invoice_number, 5)) <= 5 AND CAST(SUBSTR(invoice_number, 5) AS INTEGER) >= 1000 ORDER BY CAST(SUBSTR(invoice_number, 5) AS INTEGER) DESC LIMIT 1";
      console.log('REP Query:', query);
      
      db.get(query, (err, row) => {
        if (err) {
          console.error('REP Query Error:', err);
          reject(err);
          return;
        }
        
        console.log('REP Query Result:', row);
        let nextNumber = 1000;
        if (row && row.invoice_number) {
          const currentNumber = parseInt(row.invoice_number.replace('REP-', ''));
          nextNumber = currentNumber + 1;
        }
        
        // Ensure we don't exceed 99999
        if (nextNumber > 99999) {
          nextNumber = 1000; // Reset to 1000 if we exceed 99999
        }
        
        console.log('Next REP Number:', `REP-${nextNumber}`);
        resolve(`REP-${nextNumber}`);
      });
    } else if (type === 'gst') {
      // For GST invoices, use HJ/YY-YY-XXXX format based on financial year
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
      
      // Financial year starts from April 1st
      let financialYear;
      if (currentMonth >= 4) {
        // April to March of next year
        financialYear = `${currentYear.toString().slice(-2)}-${(currentYear + 1).toString().slice(-2)}`;
      } else {
        // January to March of current year (belongs to previous financial year)
        financialYear = `${(currentYear - 1).toString().slice(-2)}-${currentYear.toString().slice(-2)}`;
      }
      
      // Get the highest HJ number for current financial year
      const query = `SELECT invoice_number FROM invoices WHERE type = 'gst' AND invoice_number LIKE 'HJ/${financialYear}-%' ORDER BY CAST(SUBSTR(invoice_number, LENGTH('HJ/${financialYear}-') + 1) AS INTEGER) DESC LIMIT 1`;
      console.log('GST Query:', query);
      
      db.get(query, (err, row) => {
        if (err) {
          console.error('GST Query Error:', err);
          reject(err);
          return;
        }
        
        console.log('GST Query Result:', row);
        let nextNumber = 1000;
        if (row && row.invoice_number) {
          const currentNumber = parseInt(row.invoice_number.split('-').pop());
          nextNumber = currentNumber + 1;
        }
        
        // Ensure we don't exceed 9999
        if (nextNumber > 9999) {
          nextNumber = 1000; // Reset to 1000 if we exceed 9999
        }
        
        const gstInvoiceNumber = `HJ/${financialYear}-${nextNumber}`;
        console.log('Next GST Number:', gstInvoiceNumber);
        resolve(gstInvoiceNumber);
      });
    } else {
      // For non-GST invoices, use INV-XXXX format
      const query = "SELECT invoice_number FROM invoices WHERE type = 'non_gst' AND invoice_number LIKE 'INV-%' AND LENGTH(SUBSTR(invoice_number, 5)) <= 5 AND CAST(SUBSTR(invoice_number, 5) AS INTEGER) >= 1000 ORDER BY CAST(SUBSTR(invoice_number, 5) AS INTEGER) DESC LIMIT 1";
      console.log('INV Query:', query);
      
      db.get(query, (err, row) => {
        if (err) {
          console.error('INV Query Error:', err);
          reject(err);
          return;
        }
        
        console.log('INV Query Result:', row);
        let nextNumber = 1000;
        if (row && row.invoice_number) {
          const currentNumber = parseInt(row.invoice_number.replace('INV-', ''));
          nextNumber = currentNumber + 1;
        }
        
        // Ensure we don't exceed 99999
        if (nextNumber > 99999) {
          nextNumber = 1000; // Reset to 1000 if we exceed 99999
        }
        
        console.log('Next INV Number:', `INV-${nextNumber}`);
        resolve(`INV-${nextNumber}`);
      });
    }
  });
};

app.post('/api/invoices', authenticateToken, async (req, res) => {
  const { 
    customer_id, 
    type, 
    items, 
    subtotal, 
    discount_type, 
    discount_value, 
    discount_amount,
    gst_amount, 
    total_amount,
    invoice_date,
    // Old item data (for non-GST only)
    old_item_type,
    old_item_value,
    // Payment information
    payment_method,
    amount_paying,
    paid_amount,
    balance_amount,
    payment_status,
    new_ledger_balance,
    // Additional fields for repayment invoices
    previous_balance,
    current_outstanding
  } = req.body;
  
  let invoiceNumber;
  try {
    invoiceNumber = await generateInvoiceNumber(type);
  } catch (error) {
    console.error('Error generating invoice number:', error);
    return res.status(500).json({ error: 'Failed to generate invoice number' });
  }
  
  // If invoice_date is not provided, use current date
  const formattedInvoiceDate = invoice_date || new Date().toISOString().split('T')[0];
  
  // Calculate balance_amount and payment_status with proper rounding
  let calculatedBalanceAmount = roundCurrency(total_amount - (paid_amount || 0));
  let calculatedPaymentStatus = 'pending';
  let calculatedCurrentOutstanding = 0;
  
  // For non-GST invoices, include previous balance in calculations
  if (type === 'non_gst' && previous_balance) {
    calculatedCurrentOutstanding = roundCurrency(previous_balance + calculatedBalanceAmount);
  } else {
    calculatedCurrentOutstanding = calculatedBalanceAmount;
  }
  
  if (paid_amount >= total_amount) {
    calculatedPaymentStatus = 'paid';
  } else if (paid_amount > 0) {
    calculatedPaymentStatus = 'partial';
  } else {
    calculatedPaymentStatus = 'pending';
  }
  
  // Override with provided values if available, with proper rounding
  const finalBalanceAmount = balance_amount !== undefined ? roundCurrency(balance_amount) : calculatedBalanceAmount;
  const finalPaymentStatus = payment_status || calculatedPaymentStatus;
  const finalCurrentOutstanding = current_outstanding !== undefined ? roundCurrency(current_outstanding) : calculatedCurrentOutstanding;
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Insert invoice with payment information and additional fields (with rounded values)
    db.run(
      `INSERT INTO invoices (
        invoice_number, customer_id, type, subtotal, discount_type, discount_value, 
        discount_amount, gst_amount, total_amount, invoice_date, old_item_type, old_item_value,
        payment_method, amount_paying, paid_amount, balance_amount, payment_status, status, 
        previous_balance, current_outstanding
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber, customer_id, type, roundCurrency(subtotal), discount_type || 'none', discount_value || 0,
        roundCurrency(discount_amount || 0), roundCurrency(gst_amount || 0), roundCurrency(total_amount), formattedInvoiceDate, 
        old_item_type || null, roundCurrency(old_item_value || 0),
        payment_method || 'cash', roundCurrency(amount_paying || 0), roundCurrency(paid_amount || 0), finalBalanceAmount, 
        finalPaymentStatus, finalPaymentStatus, // Sync status with payment_status
        roundCurrency(previous_balance || 0), finalCurrentOutstanding
      ],
      function(err) {
        if (err) {
          console.error('Error inserting invoice:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Database error inserting invoice' });
        }

        const invoiceId = this.lastID;
        
        // Insert invoice items
        const stmt = db.prepare(`
          INSERT INTO invoice_items (
            invoice_id, item_id, item_name, stamp, remarks, hsn, unit, pc, 
            gross_weight, less, net_weight, add_weight, making_charges, rate, 
            labour, discount, total, quantity, amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        let itemsProcessed = 0;
        let itemInsertError = false;
        const totalItems = items.length;
        
        items.forEach(item => {
          stmt.run([
            invoiceId, 
            item.item_id || null, // Handle null item_id for repayment invoices
            item.item_name, 
            item.stamp || null,
            item.remarks || '',
            item.hsn || null,
            item.unit || 'GM',
            item.pc || 1,
            item.gross_weight || 0,
            item.less || 0,
            item.net_weight || 0,
            item.add_weight || 0,
            item.making_charges || 0,
            item.rate || 0,
            item.labour || 0,
            item.discount || 0,
            item.total || 0,
            item.pc || 1, // quantity = pc (piece count)
            item.total || 0 // amount = total
          ], (err) => {
            itemsProcessed++;
            if (err) {
              console.error('Error inserting invoice item:', err);
              console.error('Item data:', item);
              itemInsertError = true;
            }
            
            // Check if all items are processed
            if (itemsProcessed === totalItems) {
              stmt.finalize((err) => {
                if (err || itemInsertError) {
                  console.error('Error finalizing invoice items:', err);
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Database error inserting items' });
                }
                
                // Update customer's ledger balance if provided
                if (new_ledger_balance !== undefined) {
                  db.run(
                    'UPDATE customers SET ledger_balance = ? WHERE id = ?',
                    [roundCurrency(new_ledger_balance), customer_id],
                    function(updateErr) {
                      if (updateErr) {
                        return db.run('ROLLBACK', () => {
                          res.status(500).json({ error: 'Failed to update customer balance' });
                        });
                      }
                      
                      // Commit transaction
                      db.run('COMMIT', (commitErr) => {
                        if (commitErr) {
                          console.error('Commit error:', commitErr);
                          return res.status(500).json({ error: 'Failed to commit transaction' });
                        } else {
                          res.status(201).json({ 
                            id: invoiceId, 
                            invoice_number: invoiceNumber, 
                            message: type === 'repayment' ? 'Repayment recorded successfully' : 'Invoice created successfully',
                            payment_status: finalPaymentStatus,
                            new_ledger_balance: roundCurrency(finalCurrentOutstanding)
                          });
                        }
                      });
                    }
                  );
                } else {
                  // For non-GST invoices, update customer balance with the new outstanding amount
                  if (type === 'non_gst') {
                    db.run(
                      'UPDATE customers SET ledger_balance = ? WHERE id = ?',
                      [roundCurrency(finalCurrentOutstanding), customer_id],
                      function(updateErr) {
                        if (updateErr) {
                          return db.run('ROLLBACK', () => {
                            res.status(500).json({ error: 'Failed to update customer balance' });
                          });
                        }
                        
                        // Commit transaction
                        db.run('COMMIT', (commitErr) => {
                          if (commitErr) {
                            console.error('Commit error:', commitErr);
                            return res.status(500).json({ error: 'Failed to commit transaction' });
                          } else {
                            res.status(201).json({ 
                              id: invoiceId, 
                              invoice_number: invoiceNumber, 
                              message: type === 'repayment' ? 'Repayment recorded successfully' : 'Invoice created successfully',
                              payment_status: finalPaymentStatus,
                              new_ledger_balance: roundCurrency(finalCurrentOutstanding)
                            });
                          }
                        });
                      }
                    );
                  } else {
                    // For GST invoices, don't update ledger balance (they pay 100%)
                    // Commit transaction
                    db.run('COMMIT', (commitErr) => {
                      if (commitErr) {
                        console.error('Commit error:', commitErr);
                        return res.status(500).json({ error: 'Failed to commit transaction' });
                      } else {
                        res.status(201).json({ 
                          id: invoiceId, 
                          invoice_number: invoiceNumber, 
                          message: type === 'repayment' ? 'Repayment recorded successfully' : 'Invoice created successfully',
                          payment_status: finalPaymentStatus,
                          new_ledger_balance: 0 // GST customers always pay full
                        });
                      }
                    });
                  }
                }
              });
            }
          });
        });
      }
    );
  });
});

// Update invoice endpoint
app.put('/api/invoices/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { 
    customer_id, 
    type, 
    items, 
    subtotal, 
    discount_type, 
    discount_value, 
    discount_amount,
    gst_amount, 
    total_amount,
    invoice_date,
    // Old item data (for non-GST only)
    old_item_type,
    old_item_value,
    // Payment information
    payment_method,
    amount_paying,
    paid_amount,
    balance_amount,
    payment_status,
    new_ledger_balance,
    // Additional fields for repayment invoices
    previous_balance,
    current_outstanding
  } = req.body;
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Get original invoice to calculate balance changes
    db.get('SELECT * FROM invoices WHERE id = ?', [id], (err, originalInvoice) => {
      if (err) {
        console.error('Error getting original invoice:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!originalInvoice) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Get current customer balance
      db.get('SELECT ledger_balance FROM customers WHERE id = ?', [customer_id], (err, customer) => {
        if (err) {
          console.error('Error getting customer:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Database error getting customer' });
        }
        
        if (!customer) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'Customer not found' });
        }
        
        // For update operations, we ALWAYS use the previous_balance from the original invoice
        // This ensures we don't compound the balance changes
        let originalCustomerBalance = originalInvoice.previous_balance || 0;
        
        console.log('Update Invoice - Customer ID:', customer_id);
        console.log('Current ledger balance:', customer.ledger_balance);
        console.log('Original previous balance:', originalCustomerBalance);
        console.log('Original invoice impact:', originalInvoice.current_outstanding);
        
        // First, remove the impact of the original invoice from the current ledger balance
        // This gives us the balance as if the invoice never existed
        let adjustedLedgerBalance = customer.ledger_balance;
        if (type === 'non_gst') {
          // For non-GST invoices, subtract the current_outstanding from the ledger balance
          adjustedLedgerBalance = roundCurrency(customer.ledger_balance - (originalInvoice.current_outstanding || 0));
          console.log('Adjusted ledger balance (after removing original invoice impact):', adjustedLedgerBalance);
        }
        
        // Calculate balance_amount and payment_status for the updated invoice
        let calculatedBalanceAmount = roundCurrency(total_amount - (paid_amount || 0));
        let calculatedPaymentStatus = 'pending';
        let calculatedCurrentOutstanding = 0;
        
        // For non-GST invoices, include previous balance in calculations
        if (type === 'non_gst') {
          // Use the adjusted ledger balance as the previous_balance for the updated invoice
          calculatedCurrentOutstanding = roundCurrency(adjustedLedgerBalance + calculatedBalanceAmount);
        } else {
          calculatedCurrentOutstanding = calculatedBalanceAmount;
        }
        
        if (paid_amount >= total_amount) {
          calculatedPaymentStatus = 'paid';
        } else if (paid_amount > 0) {
          calculatedPaymentStatus = 'partial';
        } else {
          calculatedPaymentStatus = 'pending';
        }
        
        // Override with provided values if available
        const finalBalanceAmount = balance_amount !== undefined ? roundCurrency(balance_amount) : calculatedBalanceAmount;
        const finalPaymentStatus = payment_status || calculatedPaymentStatus;
        const finalCurrentOutstanding = current_outstanding !== undefined ? roundCurrency(current_outstanding) : calculatedCurrentOutstanding;
        
        // Calculate the new customer ledger balance
        const newCustomerLedgerBalance = new_ledger_balance !== undefined ? roundCurrency(new_ledger_balance) : finalCurrentOutstanding;
        
        console.log('New calculated ledger balance:', newCustomerLedgerBalance);
        
        // Update invoice
        db.run(
          `UPDATE invoices SET 
            customer_id = ?, type = ?, subtotal = ?, discount_type = ?, discount_value = ?, 
            discount_amount = ?, gst_amount = ?, total_amount = ?, invoice_date = ?, old_item_type = ?, 
            old_item_value = ?, payment_method = ?, amount_paying = ?, paid_amount = ?, balance_amount = ?, 
            payment_status = ?, status = ?, previous_balance = ?, current_outstanding = ?
          WHERE id = ?`,
          [
            customer_id, type, roundCurrency(subtotal), discount_type || 'none', discount_value || 0,
            roundCurrency(discount_amount || 0), roundCurrency(gst_amount || 0), roundCurrency(total_amount), invoice_date, old_item_type || null,
            roundCurrency(old_item_value || 0), payment_method || 'cash', roundCurrency(amount_paying || 0), roundCurrency(paid_amount || 0), finalBalanceAmount, 
            finalPaymentStatus, finalPaymentStatus, // Sync status with payment_status
            roundCurrency(adjustedLedgerBalance), finalCurrentOutstanding, id
          ],
          function(err) {
            if (err) {
              console.error('Error updating invoice:', err);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Database error updating invoice' });
            }

            // Delete existing invoice items
            db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [id], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to delete old invoice items' });
              }
              
              // Insert updated invoice items
              const stmt = db.prepare(`
                INSERT INTO invoice_items (
                  invoice_id, item_id, item_name, stamp, remarks, hsn, unit, pc, 
                  gross_weight, less, net_weight, add_weight, making_charges, rate, 
                  labour, discount, total, quantity, amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              
              let itemsProcessed = 0;
              let itemInsertError = false;
              const totalItems = items.length;
              
              items.forEach(item => {
                stmt.run([
                  id, 
                  item.item_id || null,
                  item.item_name, 
                  item.stamp || null,
                  item.remarks || '',
                  item.hsn || null,
                  item.unit || 'GM',
                  item.pc || 1,
                  item.gross_weight || 0,
                  item.less || 0,
                  item.net_weight || 0,
                  item.add_weight || 0,
                  item.making_charges || 0,
                  item.rate || 0,
                  item.labour || 0,
                  item.discount || 0,
                  item.total || 0,
                  item.pc || 1,
                  item.total || 0
                ], (err) => {
                  itemsProcessed++;
                  if (err) {
                    console.error('Error inserting updated invoice item:', err);
                    itemInsertError = true;
                  }
                  
                  // Check if all items are processed
                  if (itemsProcessed === totalItems) {
                    stmt.finalize((err) => {
                      if (err || itemInsertError) {
                        console.error('Error finalizing updated invoice items:', err);
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Database error updating items' });
                      }
                      
                      // Always update the customer's ledger balance for non-GST invoices
                      if (type === 'non_gst') {
                        db.run(
                          'UPDATE customers SET ledger_balance = ? WHERE id = ?',
                          [roundCurrency(newCustomerLedgerBalance), customer_id],
                          function(updateErr) {
                            if (updateErr) {
                              console.error('Error updating customer balance:', updateErr);
                              return db.run('ROLLBACK', () => {
                                res.status(500).json({ error: 'Failed to update customer balance' });
                              });
                            }
                            
                            // Commit transaction
                            db.run('COMMIT', (commitErr) => {
                              if (commitErr) {
                                console.error('Commit error:', commitErr);
                                return res.status(500).json({ error: 'Failed to commit transaction' });
                              } else {
                                res.json({ 
                                  id: id, 
                                  message: 'Invoice updated successfully',
                                  payment_status: finalPaymentStatus,
                                  new_ledger_balance: roundCurrency(newCustomerLedgerBalance)
                                });
                              }
                            });
                          }
                        );
                      } else {
                        // For GST invoices, don't update ledger balance
                        db.run('COMMIT', (commitErr) => {
                          if (commitErr) {
                            console.error('Commit error:', commitErr);
                            return res.status(500).json({ error: 'Failed to commit transaction' });
                          } else {
                            res.json({ 
                              id: id, 
                              message: 'Invoice updated successfully',
                              payment_status: finalPaymentStatus
                            });
                          }
                        });
                      }
                    });
                  }
                });
              });
            });
          }
        );
      });
    });
  });
});

// Delete invoice endpoint
app.delete('/api/invoices/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // First get the invoice details to update customer balance
    db.get('SELECT * FROM invoices WHERE id = ?', [id], (err, invoice) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!invoice) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Get current customer balance
      db.get('SELECT ledger_balance FROM customers WHERE id = ?', [invoice.customer_id], (err, customer) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!customer) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'Customer not found' });
        }
        
        let newLedgerBalance = customer.ledger_balance;
        
        // Reverse the invoice impact on customer balance
        if (invoice.type === 'repayment') {
          // For repayment, add back the amount that was paid
          newLedgerBalance += invoice.total_amount;
        } else {
          // For regular invoices, subtract the outstanding amount that was added to ledger
          // Use current_outstanding if available, otherwise calculate from balance_amount
          const outstandingToReverse = invoice.current_outstanding || invoice.balance_amount || 0;
          newLedgerBalance -= outstandingToReverse;
        }
        
        // Delete invoice items first
        db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [id], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to delete invoice items' });
          }
          
          // Delete the invoice
          db.run('DELETE FROM invoices WHERE id = ?', [id], function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to delete invoice' });
            }
            
            // Update customer balance
            db.run('UPDATE customers SET ledger_balance = ? WHERE id = ?', [newLedgerBalance, invoice.customer_id], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to update customer balance' });
              }
              
              // Commit transaction
              db.run('COMMIT', (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Failed to commit transaction' });
                }
                
                res.json({ 
                  message: 'Invoice deleted successfully',
                  updatedBalance: newLedgerBalance
                });
              });
            });
          });
        });
      });
    });
  });
});

// Customer transaction history
app.get('/api/customers/:id/transactions', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT * FROM invoices 
    WHERE customer_id = ? 
    ORDER BY created_at DESC
  `;
  
  db.all(query, [id], (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(transactions);
  });
});

// Customer repayment
app.post('/api/customers/:id/repayment', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { amount, payment_method, notes } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid repayment amount' });
  }
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Get current customer balance
    db.get('SELECT ledger_balance FROM customers WHERE id = ?', [id], (err, customer) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!customer) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      const currentBalance = roundCurrency(customer.ledger_balance || 0);
      const newBalance = roundCurrency(currentBalance - amount);
      
      // Update customer balance
      db.run(
        'UPDATE customers SET ledger_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newBalance, id],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to update customer balance' });
          }
          
          // Create repayment record (optional - you can create a separate repayments table if needed)
          // For now, we'll just update the balance and return success
          
          db.run('COMMIT', (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to commit transaction' });
            }
            
            res.json({ 
              message: 'Repayment recorded successfully',
              previous_balance: currentBalance,
              repayment_amount: roundCurrency(amount),
              new_balance: newBalance,
              payment_method: payment_method
            });
          });
        }
      );
    });
  });
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const stats = {};
  
  // Get total regular customers (excluding GST customers)
  db.get('SELECT COUNT(*) as count FROM customers WHERE (is_gst = 0 OR is_gst IS NULL)', (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    stats.totalCustomers = result.count;
    
    // Get total invoices
    db.get('SELECT COUNT(*) as count FROM invoices', (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      stats.totalInvoices = result.count;
      
      // Get pending amount
      db.get('SELECT SUM(balance_amount) as amount FROM invoices WHERE balance_amount > 0', (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        stats.pendingAmount = result.amount || 0;
        
        // Get today's sales (IST timezone - UTC+5:30)
        db.get(`SELECT SUM(total_amount) as amount FROM invoices 
                WHERE DATE(created_at, '+5 hours', '+30 minutes') = DATE('now', '+5 hours', '+30 minutes')`, (err, result) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          stats.todaySales = result.amount || 0;
          
          res.json(stats);
        });
      });
    });
  });
});

// Reminders endpoints
app.get('/api/reminders', authenticateToken, (req, res) => {
  const query = `
    SELECT r.*, c.name as customer_name, c.mobile, i.invoice_number
    FROM reminders r
    LEFT JOIN customers c ON r.customer_id = c.id
    LEFT JOIN invoices i ON r.invoice_id = i.id
    WHERE r.status = 'pending'
    ORDER BY r.reminder_date ASC
  `;
  
  db.all(query, (err, reminders) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(reminders);
  });
});

app.get('/api/reminders/today', authenticateToken, (req, res) => {
  const query = `
    SELECT r.*, c.name as customer_name, c.mobile, i.invoice_number
    FROM reminders r
    LEFT JOIN customers c ON r.customer_id = c.id
    LEFT JOIN invoices i ON r.invoice_id = i.id
    WHERE r.status = 'pending' AND DATE(r.reminder_date) = DATE('now')
    ORDER BY r.reminder_date ASC
  `;
  
  db.all(query, (err, reminders) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(reminders);
  });
});

app.post('/api/reminders', authenticateToken, (req, res) => {
  const { customer_id, invoice_id, reminder_date, amount_promised, notes } = req.body;
  
  if (!customer_id || !reminder_date || !amount_promised) {
    return res.status(400).json({ error: 'Customer ID, reminder date, and amount promised are required' });
  }
  
  db.run(
    `INSERT INTO reminders (customer_id, invoice_id, reminder_date, amount_promised, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [customer_id, invoice_id || null, reminder_date, amount_promised, notes || ''],
    function(err) {
      if (err) {
        console.error('Error creating reminder:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, message: 'Reminder created successfully' });
    }
  );
});

app.put('/api/reminders/:id/complete', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.run(
    'UPDATE reminders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ['completed', id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Reminder not found' });
      }
      
      res.json({ message: 'Reminder marked as completed' });
    }
  );
});

app.delete('/api/reminders/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM reminders WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    
    res.json({ message: 'Reminder deleted successfully' });
  });
});

// Serve static files in production (MOVE THIS TO THE END)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Handle React Router - send all non-API requests to React app
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Default login: username=admin, password=admin123');
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});