const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Use the actual database file that exists
const dbPath = path.join(__dirname, 'data/harish_jewellers.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create customers table
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mobile TEXT,
        alt_mobile TEXT,
        email TEXT,
        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        country TEXT DEFAULT 'India',
        image_url TEXT,
        ledger_balance DECIMAL(10,2) DEFAULT 0,
        is_gst BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create item_groups table
    db.run(`
      CREATE TABLE IF NOT EXISTS item_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create items table
    db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        group_id INTEGER,
        price DECIMAL(10,2) DEFAULT 0,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES item_groups (id)
      )
    `);

    // Create invoices table
    db.run(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        type TEXT DEFAULT 'non_gst',
        invoice_date DATE,
        subtotal DECIMAL(10,2) NOT NULL,
        discount_type TEXT DEFAULT 'none',
        discount_value DECIMAL(5,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        gst_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        balance_amount DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      )
    `);

    // Create reminders table for payment promises
    db.run(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        invoice_id INTEGER,
        reminder_date DATE NOT NULL,
        amount_promised DECIMAL(10,2) NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (invoice_id) REFERENCES invoices (id)
      )
    `);

    // Create invoice_items table with HSN field
    db.run(`CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      item_id INTEGER,
      item_name TEXT NOT NULL,
      stamp TEXT,
      remarks TEXT,
      hsn INTEGER,
      unit TEXT DEFAULT 'GM',
      pc INTEGER DEFAULT 1,
      gross_weight REAL DEFAULT 0,
      less REAL DEFAULT 0,
      net_weight REAL DEFAULT 0,
      add_weight REAL DEFAULT 0,
      making_charges REAL DEFAULT 0,
      rate REAL DEFAULT 0,
      labour REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      quantity REAL DEFAULT 1,
      amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items (id)
    )`, (err) => {
      if (err) {
        // If table already exists with wrong schema, drop and recreate
        if (err.message.includes('NOT NULL constraint failed')) {
          console.log('Dropping and recreating invoice_items table due to schema mismatch...');
          db.run(`DROP TABLE IF EXISTS invoice_items`, (dropErr) => {
            if (dropErr) {
              console.error('Error dropping invoice_items table:', dropErr);
              reject(dropErr);
              return;
            }
            
            // Recreate table with correct schema
            db.run(`CREATE TABLE invoice_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              invoice_id INTEGER NOT NULL,
              item_id INTEGER,
              item_name TEXT NOT NULL,
              stamp TEXT,
              remarks TEXT,
              hsn INTEGER,
              unit TEXT DEFAULT 'GM',
              pc INTEGER DEFAULT 1,
              gross_weight REAL DEFAULT 0,
              less REAL DEFAULT 0,
              net_weight REAL DEFAULT 0,
              add_weight REAL DEFAULT 0,
              making_charges REAL DEFAULT 0,
              rate REAL DEFAULT 0,
              labour REAL DEFAULT 0,
              discount REAL DEFAULT 0,
              total REAL DEFAULT 0,
              quantity REAL DEFAULT 1,
              amount REAL DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
              FOREIGN KEY (item_id) REFERENCES items (id)
            )`, (createErr) => {
              if (createErr) {
                console.error('Error recreating invoice_items table:', createErr);
                reject(createErr);
                return;
              }
              console.log('Successfully recreated invoice_items table');
              continueInitialization();
            });
          });
        } else {
          console.error('Error creating invoice_items table:', err);
          reject(err);
          return;
        }
      } else {
        continueInitialization();
      }

      function continueInitialization() {
        // Check if we need to add HSN column for existing databases
        db.all("PRAGMA table_info(invoice_items)", (err, columns) => {
          if (err) {
            console.error('Error checking invoice_items table structure:', err);
            reject(err);
            return;
          }

          const columnNames = columns.map(col => col.name);
          
          // Add HSN column if it doesn't exist
          if (!columnNames.includes('hsn')) {
            db.run(`ALTER TABLE invoice_items ADD COLUMN hsn INTEGER`, (err) => {
              if (err) {
                console.log('HSN column might already exist or error:', err.message);
              } else {
                console.log('Added HSN column to invoice_items table');
              }
            });
          }

          // Check and add payment columns to invoices table
          db.all("PRAGMA table_info(invoices)", (err, invoiceColumns) => {
            if (err) {
              console.error('Error checking invoices table structure:', err);
              reject(err);
              return;
            }

            const invoiceColumnNames = invoiceColumns.map(col => col.name);
            
            // Add payment_method column if it doesn't exist
            if (!invoiceColumnNames.includes('payment_method')) {
              db.run(`ALTER TABLE invoices ADD COLUMN payment_method TEXT DEFAULT 'cash'`, (err) => {
                if (err) {
                  console.log('payment_method column might already exist or error:', err.message);
                } else {
                  console.log('Added payment_method column to invoices table');
                }
              });
            }

            // Add payment_status column if it doesn't exist
            if (!invoiceColumnNames.includes('payment_status')) {
              db.run(`ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'unpaid'`, (err) => {
                if (err) {
                  console.log('payment_status column might already exist or error:', err.message);
                } else {
                  console.log('Added payment_status column to invoices table');
                }
              });
            }

            // Add amount_paying column if it doesn't exist
            if (!invoiceColumnNames.includes('amount_paying')) {
              db.run(`ALTER TABLE invoices ADD COLUMN amount_paying DECIMAL(10,2) DEFAULT 0`, (err) => {
                if (err) {
                  console.log('amount_paying column might already exist or error:', err.message);
                } else {
                  console.log('Added amount_paying column to invoices table');
                }
              });
            }

            // Add previous_balance column if it doesn't exist
            if (!invoiceColumnNames.includes('previous_balance')) {
              db.run(`ALTER TABLE invoices ADD COLUMN previous_balance DECIMAL(10,2) DEFAULT 0`, (err) => {
                if (err) {
                  console.log('previous_balance column might already exist or error:', err.message);
                } else {
                  console.log('Added previous_balance column to invoices table');
                }
              });
            }

            // Add current_outstanding column if it doesn't exist
            if (!invoiceColumnNames.includes('current_outstanding')) {
              db.run(`ALTER TABLE invoices ADD COLUMN current_outstanding DECIMAL(10,2) DEFAULT 0`, (err) => {
                if (err) {
                  console.log('current_outstanding column might already exist or error:', err.message);
                } else {
                  console.log('Added current_outstanding column to invoices table');
                }
              });
            }

            // Ensure status column exists (should already exist from original schema)
            if (!invoiceColumnNames.includes('status')) {
              db.run(`ALTER TABLE invoices ADD COLUMN status TEXT DEFAULT 'pending'`, (err) => {
                if (err) {
                  console.log('status column might already exist or error:', err.message);
                } else {
                  console.log('Added status column to invoices table');
                }
              });
            }

            // Add old_item_type column if it doesn't exist
            if (!invoiceColumnNames.includes('old_item_type')) {
              db.run(`ALTER TABLE invoices ADD COLUMN old_item_type TEXT`, (err) => {
                if (err) {
                  console.log('old_item_type column might already exist or error:', err.message);
                } else {
                  console.log('Added old_item_type column to invoices table');
                }
              });
            }

            // Add old_item_value column if it doesn't exist
            if (!invoiceColumnNames.includes('old_item_value')) {
              db.run(`ALTER TABLE invoices ADD COLUMN old_item_value DECIMAL(10,2) DEFAULT 0`, (err) => {
                if (err) {
                  console.log('old_item_value column might already exist or error:', err.message);
                } else {
                  console.log('Added old_item_value column to invoices table');
                }
              });
            }

            // Check and add is_gst column to customers table
            db.all("PRAGMA table_info(customers)", (err, customerColumns) => {
              if (err) {
                console.error('Error checking customers table structure:', err);
                reject(err);
                return;
              }

              const customerColumnNames = customerColumns.map(col => col.name);
              
              // Add is_gst column if it doesn't exist
              if (!customerColumnNames.includes('is_gst')) {
                db.run(`ALTER TABLE customers ADD COLUMN is_gst BOOLEAN DEFAULT 0`, (err) => {
                  if (err) {
                    console.log('is_gst column might already exist or error:', err.message);
                  } else {
                    console.log('Added is_gst column to customers table');
                  }
                });
              }

              // Create default admin user if not exists
              db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, user) => {
                if (err) {
                  console.error('Error checking for admin user:', err);
                  reject(err);
                  return;
                }

                if (!user) {
                  const hashedPassword = bcrypt.hashSync('admin123', 10);
                  db.run(
                    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                    ['admin', hashedPassword, 'admin'],
                    (err) => {
                      if (err) {
                        console.error('Error creating admin user:', err);
                        reject(err);
                      } else {
                        console.log('Default admin user created');
                        console.log('Database initialized successfully');
                        
                        // Add mock data for development
                        addMockData();
                        
                        resolve();
                      }
                    }
                  );
                } else {
                  console.log('Database initialized successfully');
                  
                  // Add mock data for development
                  addMockData();
                  
                  resolve();
                }
              });
            });
          });
        });
      }
    });
  });
};

function addMockData() {
  // Check if data already exists
  db.get("SELECT COUNT(*) as count FROM customers", (err, result) => {
    if (err || result.count > 0) {
      console.log('Mock data already exists or error checking data');
      return;
    }
    
    console.log('Adding mock data...');
    
    // Mock customers data
    const customers = [
      {
        name: 'Rajesh Kumar',
        mobile: '9876543210',
        alt_mobile: '9876543211',
        email: 'rajesh@example.com',
        address_line1: '123 Main Street',
        address_line2: 'Near City Mall',
        city: 'Saharanpur',
        state: 'Uttar Pradesh',
        pincode: '247001',
        country: 'India',
        ledger_balance: 25000
      },
      {
        name: 'Priya Sharma',
        mobile: '9876543212',
        alt_mobile: null,
        email: 'priya@example.com',
        address_line1: '456 Park Avenue',
        address_line2: 'Sector 15',
        city: 'Saharanpur',
        state: 'Uttar Pradesh',
        pincode: '247002',
        country: 'India',
        ledger_balance: 15000
      },
      {
        name: 'Amit Singh',
        mobile: '9876543213',
        alt_mobile: '9876543214',
        email: 'amit@example.com',
        address_line1: '789 Garden Road',
        address_line2: 'Civil Lines',
        city: 'Saharanpur',
        state: 'Uttar Pradesh',
        pincode: '247003',
        country: 'India',
        ledger_balance: 0
      },
      {
        name: 'Sunita Gupta',
        mobile: '9876543215',
        alt_mobile: null,
        email: 'sunita@example.com',
        address_line1: '321 Market Street',
        address_line2: 'Old City',
        city: 'Saharanpur',
        state: 'Uttar Pradesh',
        pincode: '247004',
        country: 'India',
        ledger_balance: 8500
      },
      {
        name: 'Vikram Chandra',
        mobile: '9876543216',
        alt_mobile: '9876543217',
        email: 'vikram@example.com',
        address_line1: '654 Temple Road',
        address_line2: 'Near Railway Station',
        city: 'Saharanpur',
        state: 'Uttar Pradesh',
        pincode: '247005',
        country: 'India',
        ledger_balance: -2000 // Customer has credit balance
      }
    ];
    
    // Insert customers
    const customerStmt = db.prepare(`
      INSERT INTO customers (name, mobile, alt_mobile, email, address_line1, address_line2, city, state, pincode, country, ledger_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    customers.forEach(customer => {
      customerStmt.run([
        customer.name, customer.mobile, customer.alt_mobile, customer.email,
        customer.address_line1, customer.address_line2, customer.city, customer.state,
        customer.pincode, customer.country, customer.ledger_balance
      ]);
    });
    
    customerStmt.finalize(() => {
      // Add mock invoices after customers are inserted
      addMockInvoices();
    });
  });
}

function addMockInvoices() {
  // Mock invoices data
  const invoices = [
    {
      invoice_number: 'INV-1701234567890',
      customer_id: 1, // Rajesh Kumar
      type: 'gst',
      invoice_date: '2024-06-15',
      subtotal: 45000,
      discount_type: 'percentage',
      discount_value: 5,
      discount_amount: 2250,
      gst_amount: 7695, // 18% GST on discounted amount
      total_amount: 50445,
      paid_amount: 25445,
      balance_amount: 25000,
      payment_method: 'cash',
      payment_status: 'partial',
      status: 'partial'
    },
    {
      invoice_number: 'INV-1701234567891',
      customer_id: 2, // Priya Sharma
      type: 'non_gst',
      invoice_date: '2024-06-20',
      subtotal: 28000,
      discount_type: 'fixed',
      discount_value: 1000,
      discount_amount: 1000,
      gst_amount: 0,
      total_amount: 27000,
      paid_amount: 12000,
      balance_amount: 15000,
      payment_method: 'upi',
      payment_status: 'partial',
      status: 'partial'
    },
    {
      invoice_number: 'INV-1701234567892',
      customer_id: 3, // Amit Singh
      type: 'gst',
      invoice_date: '2024-06-25',
      subtotal: 15000,
      discount_type: 'none',
      discount_value: 0,
      discount_amount: 0,
      gst_amount: 2700, // 18% GST
      total_amount: 17700,
      paid_amount: 17700,
      balance_amount: 0,
      payment_method: 'cheque',
      payment_status: 'paid',
      status: 'paid'
    },
    {
      invoice_number: 'INV-1701234567893',
      customer_id: 4, // Sunita Gupta
      type: 'non_gst',
      invoice_date: '2024-06-30',
      subtotal: 12000,
      discount_type: 'percentage',
      discount_value: 10,
      discount_amount: 1200,
      gst_amount: 0,
      total_amount: 10800,
      paid_amount: 2300,
      balance_amount: 8500,
      payment_method: 'cash',
      payment_status: 'partial',
      status: 'partial'
    },
    {
      invoice_number: 'INV-1701234567894',
      customer_id: 5, // Vikram Chandra
      type: 'gst',
      invoice_date: '2024-07-05',
      subtotal: 8000,
      discount_type: 'none',
      discount_value: 0,
      discount_amount: 0,
      gst_amount: 1440, // 18% GST
      total_amount: 9440,
      paid_amount: 11440, // Overpaid by 2000
      balance_amount: -2000,
      payment_method: 'upi',
      payment_status: 'credit',
      status: 'paid'
    }
  ];
  
  // Insert invoices
  const invoiceStmt = db.prepare(`
    INSERT INTO invoices (
      invoice_number, customer_id, type, invoice_date, subtotal, 
      discount_type, discount_value, discount_amount, gst_amount, total_amount,
      paid_amount, balance_amount, payment_method, payment_status, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  invoices.forEach(invoice => {
    invoiceStmt.run([
      invoice.invoice_number, invoice.customer_id, invoice.type, invoice.invoice_date,
      invoice.subtotal, invoice.discount_type, invoice.discount_value, invoice.discount_amount,
      invoice.gst_amount, invoice.total_amount, invoice.paid_amount, invoice.balance_amount,
      invoice.payment_method, invoice.payment_status, invoice.status
    ]);
  });
  
  invoiceStmt.finalize(() => {
    // Add mock invoice items
    addMockInvoiceItems();
  });
}

function addMockInvoiceItems() {
  // Mock invoice items
  const invoiceItems = [
    // Items for Invoice 1 (Rajesh Kumar - GST)
    {
      invoice_id: 1,
      item_id: 1,
      item_name: 'Gold Ring 22K',
      stamp: '916',
      remarks: 'Wedding ring with diamonds',
      hsn: 71131900,
      unit: 'GM',
      pc: 1,
      gross_weight: 8.500,
      less: 0.200,
      net_weight: 8.300,
      add_weight: 0.000,
      making_charges: 2500,
      rate: 5200,
      labour: 1500,
      discount: 0,
      total: 45000,
      quantity: 1,
      amount: 45000
    },
    // Items for Invoice 2 (Priya Sharma - Non-GST)
    {
      invoice_id: 2,
      item_id: 2,
      item_name: 'Silver Necklace',
      stamp: '925',
      remarks: 'Traditional design necklace',
      hsn: null,
      unit: 'GM',
      pc: 1,
      gross_weight: 45.000,
      less: 1.000,
      net_weight: 44.000,
      add_weight: 0.000,
      making_charges: 8000,
      rate: 80,
      labour: 6000,
      discount: 0,
      total: 28000,
      quantity: 1,
      amount: 28000
    },
    // Items for Invoice 3 (Amit Singh - GST)
    {
      invoice_id: 3,
      item_id: 3,
      item_name: 'Gold Earrings 18K',
      stamp: '750',
      remarks: 'Pair of stud earrings',
      hsn: 71131900,
      unit: 'GM',
      pc: 2,
      gross_weight: 3.200,
      less: 0.100,
      net_weight: 3.100,
      add_weight: 0.000,
      making_charges: 3000,
      rate: 4500,
      labour: 1500,
      discount: 0,
      total: 15000,
      quantity: 2,
      amount: 15000
    },
    // Items for Invoice 4 (Sunita Gupta - Non-GST)
    {
      invoice_id: 4,
      item_id: 4,
      item_name: 'Silver Bracelet',
      stamp: '925',
      remarks: 'Adjustable silver bracelet',
      hsn: null,
      unit: 'GM',
      pc: 1,
      gross_weight: 25.000,
      less: 0.500,
      net_weight: 24.500,
      add_weight: 0.000,
      making_charges: 4000,
      rate: 75,
      labour: 2000,
      discount: 0,
      total: 12000,
      quantity: 1,
      amount: 12000
    },
    // Items for Invoice 5 (Vikram Chandra - GST)
    {
      invoice_id: 5,
      item_id: 5,
      item_name: 'Gold Chain 22K',
      stamp: '916',
      remarks: 'Simple gold chain',
      hsn: 71131900,
      unit: 'GM',
      pc: 1,
      gross_weight: 2.000,
      less: 0.050,
      net_weight: 1.950,
      add_weight: 0.000,
      making_charges: 1500,
      rate: 5200,
      labour: 500,
      discount: 0,
      total: 8000,
      quantity: 1,
      amount: 8000
    }
  ];
  
  // Insert invoice items
  const itemStmt = db.prepare(`
    INSERT INTO invoice_items (
      invoice_id, item_id, item_name, stamp, remarks, hsn, unit, pc,
      gross_weight, less, net_weight, add_weight, making_charges, rate,
      labour, discount, total, quantity, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  invoiceItems.forEach(item => {
    itemStmt.run([
      item.invoice_id, item.item_id, item.item_name, item.stamp, item.remarks,
      item.hsn, item.unit, item.pc, item.gross_weight, item.less, item.net_weight,
      item.add_weight, item.making_charges, item.rate, item.labour, item.discount,
      item.total, item.quantity, item.amount
    ]);
  });
  
  itemStmt.finalize(() => {
    console.log('Mock data added successfully!');
    console.log('- 5 customers with varying balances');
    console.log('- 5 invoices with different payment statuses');
    console.log('- Invoice items with realistic jewelry data');
    console.log('- All balances are synchronized');
    
    // Add inventory data
    addMockInventory();
  });
}

function addMockInventory() {
  // Add item groups
  const itemGroups = [
    { name: 'Gold Jewelry', description: 'Gold rings, necklaces, earrings, etc.' },
    { name: 'Silver Jewelry', description: 'Silver ornaments and accessories' },
    { name: 'Diamond Jewelry', description: 'Diamond studded jewelry items' },
    { name: 'Platinum Jewelry', description: 'Premium platinum jewelry' }
  ];
  
  const groupStmt = db.prepare('INSERT INTO item_groups (name, description) VALUES (?, ?)');
  
  itemGroups.forEach(group => {
    groupStmt.run([group.name, group.description]);
  });
  
  groupStmt.finalize(() => {
    // Add items
    const items = [
      { name: 'Gold Ring 22K', group_id: 1, price: 45000, description: 'Traditional 22K gold ring' },
      { name: 'Gold Necklace 18K', group_id: 1, price: 85000, description: '18K gold chain necklace' },
      { name: 'Gold Earrings 22K', group_id: 1, price: 25000, description: 'Pair of gold stud earrings' },
      { name: 'Silver Bracelet', group_id: 2, price: 8500, description: 'Sterling silver bracelet' },
      { name: 'Silver Necklace', group_id: 2, price: 15000, description: 'Traditional silver necklace' },
      { name: 'Diamond Ring', group_id: 3, price: 125000, description: 'Diamond engagement ring' },
      { name: 'Diamond Earrings', group_id: 3, price: 95000, description: 'Diamond stud earrings' },
      { name: 'Platinum Band', group_id: 4, price: 65000, description: 'Simple platinum wedding band' }
    ];
    
    const itemStmt = db.prepare('INSERT INTO items (name, group_id, price, description) VALUES (?, ?, ?, ?)');
    
    items.forEach(item => {
      itemStmt.run([item.name, item.group_id, item.price, item.description]);
    });
    
    itemStmt.finalize(() => {
      console.log('- Mock inventory added (4 groups, 8 items)');
      console.log('Mock data setup complete!');
    });
  });
}

module.exports = { db, initializeDatabase };