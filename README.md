# Harish Jewellers - Management System

A comprehensive jewelry shop management system built with React, Node.js, and SQLite. This system helps manage customers, inventory, billing (both GST and non-GST), and provides a complete overview of business operations.

## Features

### 🏪 Business Management
- **Dashboard**: Overview of sales, customers, and pending amounts
- **Customer Management**: Add, edit, and track customer details with transaction history
- **Inventory Management**: Organize items by groups (Diamond, Gold, Silver, etc.)
- **Dual Billing System**: 
  - Non-GST billing for local customers with ledger amounts
  - GST billing for customers paying in full
- **Invoice Management**: View and manage all invoices with detailed breakdowns

### 🔐 Security
- JWT-based authentication
- Secure login system for shop owners only
- Protected routes and API endpoints

### 🎨 Modern UI/UX
- Clean, modern interface built with Tailwind CSS
- Responsive design for desktop and mobile
- Intuitive navigation with sidebar layout
- Toast notifications for user feedback

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons
- **React Hot Toast** for notifications

### Backend
- **Node.js** with Express
- **SQLite** database (perfect for local business)
- **JWT** for authentication
- **bcryptjs** for password hashing

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### 1. Clone and Install Dependencies
```bash
# Install all dependencies (root, server, and client)
npm run install-all
```

### 2. Start the Application
```bash
# Start both backend and frontend concurrently
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### 3. Default Login Credentials
- **Username**: ***********
- **Password**: ***********

## Project Structure

```
Harish-Jewellers/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── context/        # Auth context
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # API utilities
│   │   └── App.tsx
│   ├── public/
│   └── package.json
├── server/                 # Node.js backend
│   ├── database.js         # Database setup
│   ├── index.js           # Express server
│   ├── .env               # Environment variables
│   └── package.json
└── README.md
```

## Database Schema

The system uses SQLite with the following main tables:
- **users**: Shop owner authentication
- **customers**: Customer information
- **item_groups**: Product categories (Diamond, Gold, etc.)
- **items**: Individual products
- **invoices**: Bill records
- **invoice_items**: Line items for each invoice
- **payments**: Payment tracking

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `GET /api/customers/:id/transactions` - Get customer transaction history

### Inventory
- `GET /api/item-groups` - Get all item groups
- `POST /api/item-groups` - Create item group
- `GET /api/items` - Get all items
- `POST /api/items` - Create new item

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice
- `GET /api/invoices/:id` - Get specific invoice

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Usage Guide

### 1. Customer Management
- Add new customers with contact details
- View transaction history for each customer
- Edit customer information as needed

### 2. Inventory Setup
- Create item groups (e.g., Diamond, Gold, Silver)
- Add individual items to each group with pricing
- Manage your complete product catalog

### 3. Billing Process
- Choose between GST and Non-GST billing
- Select customer and add items to invoice
- System automatically calculates totals and GST (3%)
- Generate professional invoices

### 4. Invoice Management
- View all invoices with filtering options
- Track payment status (Pending/Paid/Partial)
- View detailed invoice breakdowns

## Customization

### GST Rate
The GST rate is currently set to 3% in the billing component. To change it:
1. Open `client/src/components/Billing.tsx`
2. Modify the GST calculation in the `calculateTotals` function

### Styling
The application uses Tailwind CSS with a custom gold color scheme. Modify `client/tailwind.config.js` to change colors and styling.

### Database
The SQLite database file (`database.sqlite`) is created automatically in the server directory. For production, consider upgrading to PostgreSQL or MySQL.

## Production Deployment

### Frontend Build
```bash
cd client
npm run build
```

### Environment Variables
Create a production `.env` file in the server directory:
```
PORT=5000
JWT_SECRET=your-production-secret-key
DB_PATH=./database.sqlite
```

### Server Deployment
The built React app can be served by the Express server for a single-deployment solution.

## Support & Maintenance

This system is designed to be simple and maintainable for a local jewelry business. The SQLite database ensures easy backups and no complex server setup requirements.

### Backup
Regularly backup the `server/database.sqlite` file to prevent data loss.

### Updates
The modular structure allows for easy feature additions and modifications.

## License

This project is created for Harish Jewellers and is proprietary software.

---

**Built with ❤️ for Harish Jewellers** 