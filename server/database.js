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
              console.log('Database initialized successfully');              
             resolve();
            });
          });
        });
      }
    });
  });
};

module.exports = { db, initializeDatabase };