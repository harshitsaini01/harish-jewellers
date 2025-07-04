const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function main() {
  console.log('Adding sample data to the database...\n');

  // Sample Indian names and locations
  const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Vivek', 'Aryan', 'Arnav', 'Kartik', 'Karan', 'Dhruv',
    'Ananya', 'Diya', 'Priya', 'Kavya', 'Aanya', 'Aadhya', 'Avni', 'Sara', 'Myra', 'Ira',
    'Kiara', 'Saanvi', 'Riya', 'Navya', 'Aarohi', 'Anvi', 'Pihu', 'Nisha', 'Shreya', 'Tara',
    'Rajesh', 'Suresh', 'Mahesh', 'Ramesh', 'Mukesh', 'Dinesh', 'Naresh', 'Hitesh', 'Jignesh', 'Ritesh',
    'Sunita', 'Geeta', 'Meera', 'Seema', 'Reema', 'Neeta', 'Rita', 'Sita', 'Gita', 'Nita',
    'Amit', 'Sumit', 'Rohit', 'Mohit', 'Lalit', 'Ajit', 'Vinit', 'Ankit', 'Nitin', 'Sachin',
    'Pooja', 'Sonia', 'Rekha', 'Usha', 'Asha', 'Radha', 'Sudha', 'Vidya', 'Maya', 'Lata'
  ];

  const lastNames = [
    'Sharma', 'Verma', 'Gupta', 'Agarwal', 'Bansal', 'Mittal', 'Jain', 'Singhal', 'Goyal', 'Arora',
    'Malhotra', 'Kapoor', 'Chopra', 'Sethi', 'Bhatia', 'Khanna', 'Sood', 'Mehra', 'Tandon', 'Saxena',
    'Singh', 'Kumar', 'Patel', 'Shah', 'Mehta', 'Desai', 'Modi', 'Gandhi', 'Thakkar', 'Vyas',
    'Reddy', 'Rao', 'Nair', 'Menon', 'Pillai', 'Krishnan', 'Iyer', 'Subramanian', 'Raman', 'Swamy',
    'Das', 'Sen', 'Roy', 'Ghosh', 'Banerjee', 'Mukherjee', 'Chatterjee', 'Bhattacharya', 'Chakraborty', 'Bose'
  ];

  const cities = [
    { city: 'Mumbai', state: 'Maharashtra' },
    { city: 'Delhi', state: 'Delhi' },
    { city: 'Bangalore', state: 'Karnataka' },
    { city: 'Hyderabad', state: 'Telangana' },
    { city: 'Chennai', state: 'Tamil Nadu' },
    { city: 'Kolkata', state: 'West Bengal' },
    { city: 'Pune', state: 'Maharashtra' },
    { city: 'Ahmedabad', state: 'Gujarat' },
    { city: 'Jaipur', state: 'Rajasthan' },
    { city: 'Surat', state: 'Gujarat' },
    { city: 'Lucknow', state: 'Uttar Pradesh' },
    { city: 'Kanpur', state: 'Uttar Pradesh' },
    { city: 'Nagpur', state: 'Maharashtra' },
    { city: 'Indore', state: 'Madhya Pradesh' },
    { city: 'Thane', state: 'Maharashtra' },
    { city: 'Bhopal', state: 'Madhya Pradesh' },
    { city: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { city: 'Pimpri-Chinchwad', state: 'Maharashtra' },
    { city: 'Patna', state: 'Bihar' },
    { city: 'Vadodara', state: 'Gujarat' },
    { city: 'Ghaziabad', state: 'Uttar Pradesh' },
    { city: 'Ludhiana', state: 'Punjab' },
    { city: 'Agra', state: 'Uttar Pradesh' },
    { city: 'Nashik', state: 'Maharashtra' },
    { city: 'Faridabad', state: 'Haryana' },
    { city: 'Meerut', state: 'Uttar Pradesh' },
    { city: 'Rajkot', state: 'Gujarat' },
    { city: 'Kalyan-Dombivali', state: 'Maharashtra' },
    { city: 'Vasai-Virar', state: 'Maharashtra' },
    { city: 'Varanasi', state: 'Uttar Pradesh' },
    { city: 'Srinagar', state: 'Jammu and Kashmir' },
    { city: 'Aurangabad', state: 'Maharashtra' },
    { city: 'Dhanbad', state: 'Jharkhand' },
    { city: 'Amritsar', state: 'Punjab' },
    { city: 'Navi Mumbai', state: 'Maharashtra' },
    { city: 'Allahabad', state: 'Uttar Pradesh' },
    { city: 'Ranchi', state: 'Jharkhand' },
    { city: 'Howrah', state: 'West Bengal' },
    { city: 'Coimbatore', state: 'Tamil Nadu' },
    { city: 'Jabalpur', state: 'Madhya Pradesh' }
  ];

  const areas = [
    'Saharanpur', 'MG Road', 'Civil Lines', 'Rajpur Road', 'Gandhi Road', 'Station Road', 'Mall Road',
    'Clock Tower', 'Paltan Bazaar', 'Nehru Colony', 'Model Town', 'Shastri Nagar', 'Laxman Chowk',
    'Ballupur', 'Patel Nagar', 'Karanpur', 'Niranjanpur', 'Dhamawala', 'Hathibarkala', 'Sewla Kalan',
    'Doiwala', 'Clement Town', 'Raipur', 'Kanwali', 'Bhaniawala', 'Mothrowala', 'Bindal Bridge',
    'Turner Road', 'Subhash Road', 'Haridwar Road', 'Rishikesh Road', 'Delhi Road', 'Mussoorie Road'
  ];

  // Generate 200 customers
  const customers = [];
  for (let i = 1; i <= 200; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const location = cities[Math.floor(Math.random() * cities.length)];
    const area = areas[Math.floor(Math.random() * areas.length)];
    
    // Generate realistic phone numbers
    const mobilePrefix = ['98', '99', '97', '96', '95', '94', '93', '92', '91', '90'];
    const prefix = mobilePrefix[Math.floor(Math.random() * mobilePrefix.length)];
    const mobile = prefix + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    
    // Generate email
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'][Math.floor(Math.random() * 4)]}`;
    
    // Generate ledger balance (some positive, some negative, some zero)
    let ledgerBalance = 0;
    const balanceType = Math.random();
    if (balanceType < 0.4) { // 40% have outstanding amount (positive)
      ledgerBalance = Math.floor(Math.random() * 50000) + 1000;
    } else if (balanceType < 0.7) { // 30% have credit (negative)
      ledgerBalance = -(Math.floor(Math.random() * 25000) + 500);
    }
    // 30% have zero balance
    
    const customer = {
      name: `${firstName} ${lastName}`,
      mobile: mobile,
      alt_mobile: Math.random() > 0.7 ? (prefix + Math.floor(Math.random() * 100000000).toString().padStart(8, '0')) : null,
      email: Math.random() > 0.3 ? email : null,
      address_line1: `${Math.floor(Math.random() * 999) + 1}, ${area}`,
      address_line2: `Near ${['Main Market', 'Bus Stand', 'Railway Station', 'Hospital', 'School', 'Temple'][Math.floor(Math.random() * 6)]}`,
      city: location.city,
      state: location.state,
      pincode: Math.floor(Math.random() * 900000) + 100000,
      country: 'India',
      ledger_balance: ledgerBalance,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString(),
      updated_at: new Date().toISOString()
    };
    
    customers.push(customer);
  }

  // Insert customers
  const insertCustomerStmt = db.prepare(`
    INSERT INTO customers (
      name, mobile, alt_mobile, email, address_line1, address_line2, 
      city, state, pincode, country, ledger_balance, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const customer of customers) {
    insertCustomerStmt.run(
      customer.name, customer.mobile, customer.alt_mobile, customer.email,
      customer.address_line1, customer.address_line2, customer.city, customer.state,
      customer.pincode, customer.country, customer.ledger_balance,
      customer.created_at, customer.updated_at
    );
  }

  // Create item groups
  const itemGroups = [
    { name: 'Diamond Jewelry', description: 'Exquisite diamond rings, necklaces, and earrings' },
    { name: 'Gold Jewelry', description: 'Traditional and modern gold ornaments' },
    { name: 'Silver Jewelry', description: 'Elegant silver accessories and ornaments' },
    { name: 'Platinum Jewelry', description: 'Premium platinum jewelry collection' },
    { name: 'Gemstone Jewelry', description: 'Precious and semi-precious gemstone jewelry' },
    { name: 'Bridal Collection', description: 'Special bridal jewelry sets and accessories' }
  ];

  const insertGroupStmt = db.prepare('INSERT OR IGNORE INTO item_groups (name, description, created_at) VALUES (?, ?, ?)');
  
  for (const group of itemGroups) {
    insertGroupStmt.run(group.name, group.description, new Date().toISOString());
  }

  // Create items for each group
  const items = [
    // Diamond Jewelry
    { name: 'Diamond Solitaire Ring', group_id: 1, price: 85000, description: '1 carat diamond solitaire ring in 18k gold' },
    { name: 'Diamond Necklace Set', group_id: 1, price: 125000, description: 'Elegant diamond necklace with matching earrings' },
    { name: 'Diamond Tennis Bracelet', group_id: 1, price: 65000, description: 'Classic tennis bracelet with round diamonds' },
    { name: 'Diamond Stud Earrings', group_id: 1, price: 45000, description: '0.5 carat diamond stud earrings' },
    
    // Gold Jewelry
    { name: 'Gold Chain 22K', group_id: 2, price: 35000, description: 'Traditional 22k gold chain, 20 grams' },
    { name: 'Gold Bangles Set', group_id: 2, price: 28000, description: 'Set of 2 gold bangles, 15 grams each' },
    { name: 'Gold Earrings', group_id: 2, price: 18000, description: 'Traditional gold earrings with intricate design' },
    { name: 'Gold Pendant', group_id: 2, price: 12000, description: 'Religious gold pendant with chain' },
    
    // Silver Jewelry
    { name: 'Silver Necklace', group_id: 3, price: 5500, description: 'Oxidized silver necklace with ethnic design' },
    { name: 'Silver Bracelet', group_id: 3, price: 3200, description: 'Contemporary silver bracelet' },
    { name: 'Silver Anklets', group_id: 3, price: 4800, description: 'Pair of traditional silver anklets' },
    { name: 'Silver Ring', group_id: 3, price: 2500, description: 'Adjustable silver ring with stone' },
    
    // Platinum Jewelry
    { name: 'Platinum Wedding Band', group_id: 4, price: 45000, description: 'Classic platinum wedding band, 5 grams' },
    { name: 'Platinum Pendant', group_id: 4, price: 32000, description: 'Modern platinum pendant with chain' },
    { name: 'Platinum Earrings', group_id: 4, price: 38000, description: 'Elegant platinum drop earrings' },
    
    // Gemstone Jewelry
    { name: 'Ruby Ring', group_id: 5, price: 25000, description: 'Natural ruby ring in gold setting' },
    { name: 'Emerald Necklace', group_id: 5, price: 55000, description: 'Emerald necklace with gold work' },
    { name: 'Sapphire Earrings', group_id: 5, price: 35000, description: 'Blue sapphire earrings in white gold' },
    
    // Bridal Collection
    { name: 'Bridal Necklace Set', group_id: 6, price: 150000, description: 'Complete bridal necklace set with earrings and maang tikka' },
    { name: 'Bridal Bangles', group_id: 6, price: 75000, description: 'Set of 6 bridal gold bangles with stones' },
    { name: 'Bridal Nose Ring', group_id: 6, price: 8500, description: 'Traditional bridal nose ring with chain' }
  ];

  const insertItemStmt = db.prepare('INSERT OR IGNORE INTO items (name, group_id, price, description, created_at) VALUES (?, ?, ?, ?, ?)');
  
  for (const item of items) {
    insertItemStmt.run(item.name, item.group_id, item.price, item.description, new Date().toISOString());
  }

  console.log('Sample data added successfully!');
  console.log(`Added ${customers.length} customers`);
  console.log(`Added ${itemGroups.length} item groups`);
  console.log(`Added ${items.length} items`);

  // Generate sample invoices and transactions
  generateTransactionData(db, () => {
    db.close();
    console.log('Database connection closed.');
  });
}

function generateTransactionData(db, callback) {
  console.log('\nGenerating sample invoices and transactions...');
  
  const invoiceStatuses = ['paid', 'pending', 'partial'];
  const invoiceTypes = ['gst', 'non-gst'];
  
  // Get all customers for invoice generation
  db.all('SELECT * FROM customers', (err, allCustomers) => {
    if (err) {
      console.error('Error fetching customers:', err);
      return callback();
    }
    
    // Generate 50 sample invoices
    const invoices = [];
    for (let i = 1; i <= 50; i++) {
      const customer = allCustomers[Math.floor(Math.random() * allCustomers.length)];
      const status = invoiceStatuses[Math.floor(Math.random() * invoiceStatuses.length)];
      const type = invoiceTypes[Math.floor(Math.random() * invoiceTypes.length)];
      
      // Random date within last 6 months
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 180));
      
      const subtotal = Math.floor(Math.random() * 50000) + 5000; // ₹5,000 to ₹55,000
      const discount = Math.floor(subtotal * (Math.random() * 0.1)); // 0-10% discount
      const taxAmount = type === 'gst' ? Math.floor((subtotal - discount) * 0.18) : 0; // 18% GST
      const totalAmount = subtotal - discount + taxAmount;
      
      let paidAmount = 0;
      let balanceAmount = totalAmount;
      
      if (status === 'paid') {
        paidAmount = totalAmount;
        balanceAmount = 0;
      } else if (status === 'partial') {
        paidAmount = Math.floor(totalAmount * (0.3 + Math.random() * 0.4)); // 30-70% paid
        balanceAmount = totalAmount - paidAmount;
      }
      
      const invoice = {
        customer_id: customer.id,
        invoice_number: `HJ-${Date.now()}-${String(i).padStart(3, '0')}`,
        invoice_date: date.toISOString().split('T')[0],
        due_date: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days later
        type: type,
        status: status,
        subtotal: subtotal,
        discount_amount: discount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        balance_amount: balanceAmount,
        notes: `Sample invoice for ${customer.name}`,
        customer_name: customer.name,
        customer_phone: customer.mobile,
        customer_address: [customer.address_line1, customer.city, customer.state].filter(Boolean).join(', '),
        created_at: date.toISOString(),
        updated_at: date.toISOString()
      };
      
      invoices.push(invoice);
    }
    
    // Insert invoices
    const insertInvoiceStmt = db.prepare(`
      INSERT OR IGNORE INTO invoices (
        customer_id, invoice_number, type, status,
        subtotal, gst_amount, total_amount, paid_amount, balance_amount,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let invoiceCount = 0;
    for (const invoice of invoices) {
      insertInvoiceStmt.run(
        invoice.customer_id, invoice.invoice_number, invoice.type, invoice.status,
        invoice.subtotal, invoice.tax_amount, invoice.total_amount, 
        invoice.paid_amount, invoice.balance_amount, invoice.created_at,
        function(err) {
          if (err) console.error('Error inserting invoice:', err);
          invoiceCount++;
          if (invoiceCount === invoices.length) {
            insertInvoiceStmt.finalize();
            generateInvoiceItems(db, callback);
          }
        }
      );
    }
  });
}

function generateInvoiceItems(db, callback) {
  // Generate invoice items for each invoice
  db.all('SELECT * FROM items', (err, allItems) => {
    if (err) {
      console.error('Error fetching items:', err);
      return callback();
    }
    
    db.all('SELECT * FROM invoices', (err, allInvoices) => {
      if (err) {
        console.error('Error fetching invoices:', err);
        return callback();
      }
      
      const insertInvoiceItemStmt = db.prepare(`
        INSERT INTO invoice_items (invoice_id, item_id, item_name, quantity, rate, amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      let totalItemsToInsert = 0;
      let itemsInserted = 0;
      
      for (const invoice of allInvoices) {
        // Add 1-5 items per invoice
        const itemCount = Math.floor(Math.random() * 5) + 1;
        totalItemsToInsert += itemCount;
        
        for (let i = 0; i < itemCount; i++) {
          const item = allItems[Math.floor(Math.random() * allItems.length)];
          const quantity = Math.floor(Math.random() * 5) + 1;
          const rate = item.price || Math.floor(Math.random() * 10000) + 1000;
          const amount = quantity * rate;
          
          insertInvoiceItemStmt.run(
            invoice.id,
            item.id,
            item.name,
            quantity,
            rate,
            amount,
            function(err) {
              if (err) console.error('Error inserting invoice item:', err);
              itemsInserted++;
              if (itemsInserted === totalItemsToInsert) {
                insertInvoiceItemStmt.finalize();
                generatePayments(db, allInvoices, callback);
              }
            }
          );
        }
      }
    });
  });
}

function generatePayments(db, allInvoices, callback) {
  // Generate payment transactions
  const insertPaymentStmt = db.prepare(`
    INSERT INTO payments (invoice_id, amount, payment_method, notes, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const paymentMethods = ['cash', 'card', 'upi', 'bank_transfer', 'cheque'];
  let totalPaymentsToInsert = 0;
  let paymentsInserted = 0;
  
  // Count total payments to insert
  for (const invoice of allInvoices) {
    if (invoice.paid_amount > 0) {
      const paymentCount = invoice.status === 'paid' ? 
        (Math.random() > 0.7 ? 2 : 1) : // 70% single payment, 30% split
        Math.floor(Math.random() * 2) + 1; // 1-2 payments for partial
      totalPaymentsToInsert += paymentCount;
    }
  }
  
  if (totalPaymentsToInsert === 0) {
    insertPaymentStmt.finalize();
    console.log(`Added 50 sample invoices`);
    console.log('Added sample invoice items and payments');
    console.log('Sample transaction data generated successfully!');
    return callback();
  }
  
  for (const invoice of allInvoices) {
    if (invoice.paid_amount > 0) {
      // For paid invoices, create 1-3 payment entries
      const paymentCount = invoice.status === 'paid' ? 
        (Math.random() > 0.7 ? 2 : 1) : // 70% single payment, 30% split
        Math.floor(Math.random() * 2) + 1; // 1-2 payments for partial
      
      let remainingAmount = invoice.paid_amount;
      
      for (let i = 0; i < paymentCount && remainingAmount > 0; i++) {
        const paymentAmount = i === paymentCount - 1 ? 
          remainingAmount : 
          Math.floor(remainingAmount * (0.3 + Math.random() * 0.4));
        
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        
        insertPaymentStmt.run(
          invoice.id,
          paymentAmount,
          paymentMethod,
          `Payment ${i + 1} for ${invoice.invoice_number}`,
          new Date().toISOString(),
          function(err) {
            if (err) console.error('Error inserting payment:', err);
            paymentsInserted++;
            if (paymentsInserted === totalPaymentsToInsert) {
              insertPaymentStmt.finalize();
              console.log(`Added 50 sample invoices`);
              console.log('Added sample invoice items and payments');
              console.log('Sample transaction data generated successfully!');
              callback();
            }
          }
        );
        
        remainingAmount -= paymentAmount;
      }
    }
  }
}

// Run the main function
main().catch(console.error); 