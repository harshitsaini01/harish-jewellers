#!/bin/bash

echo "🚀 Harish Jewellers - VPS Deployment Script"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

print_status "Node.js is installed: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "npm is installed: $(npm --version)"

# Install server dependencies
echo ""
echo "📦 Installing server dependencies..."
cd server
npm install --production
if [ $? -eq 0 ]; then
    print_status "Server dependencies installed successfully"
else
    print_error "Failed to install server dependencies"
    exit 1
fi

# Create necessary directories
echo ""
echo "📁 Creating necessary directories..."
mkdir -p data
mkdir -p uploads
mkdir -p logs
mkdir -p backups

# Set up environment file
echo ""
echo "⚙️ Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.production .env
    print_warning "Created .env file from template"
    print_warning "IMPORTANT: Please update JWT_SECRET in .env file before starting!"
else
    print_status "Environment file already exists"
fi

# Set permissions
echo ""
echo "🔐 Setting up permissions..."
chmod 755 data uploads logs backups
print_status "Directory permissions set"

# Go back to root directory
cd ..

echo ""
echo "🎉 Deployment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update JWT_SECRET in server/.env file"
echo "2. Update your domain in server/.env if different from harishjewellers.shop"
echo "3. Run: cd server && NODE_ENV=production node index.js"
echo ""
echo "🌐 Your application will be available at: https://harishjewellers.shop"
echo "🔑 Default login: username=admin, password=admin123"
echo ""
print_warning "Don't forget to change the default admin password after first login!"