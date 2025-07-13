import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Customer } from '../types';
import { 
  Users, Plus, Search, Edit, Eye, History,
  Camera, X, Save, Phone, Mail, MapPin, 
  User, CreditCard,
  Filter, Download, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import InvoiceDetailModal from './InvoiceDetailModal';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'positive' | 'negative' | 'zero'>('all');
  const [customerType, setCustomerType] = useState<'regular' | 'gst'>('regular');
  const [isFromBilling, setIsFromBilling] = useState(false);
  const [showGstTransactions, setShowGstTransactions] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    alt_mobile: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    ledger_balance: 0,
    is_gst: false
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchCustomers();
    
    // Check if we were redirected from billing page
    const searchParams = new URLSearchParams(location.search);
    const action = searchParams.get('action');
    
    if (action === 'create') {
      setIsFromBilling(true);
      resetForm();
      setShowAddModal(true);
    }
  }, [location]);

  useEffect(() => {
    fetchCustomers();
  }, [customerType]);

  const fetchCustomers = async () => {
    try {
      const data = await api.getCustomers(customerType);
      setCustomers(data as Customer[]);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      mobile: '',
      alt_mobile: '',
      email: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      ledger_balance: 0,
      is_gst: false
    });
    setImageFile(null);
    setImagePreview('');
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.createCustomer(formData, imageFile || undefined);
      toast.success('Customer added successfully');
      fetchCustomers();
      setShowAddModal(false);
      
      // If coming from billing, redirect back with the new customer ID
      if (isFromBilling && response && response.id) {
        navigate(`/billing?newCustomerId=${response.id}`);
        return;
      }
      
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add customer');
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    try {
      await api.updateCustomer(selectedCustomer.id, formData, imageFile || undefined);
      toast.success('Customer updated successfully');
      fetchCustomers();
      setShowEditModal(false);
      resetForm();
      setSelectedCustomer(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update customer');
    }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || '',
      mobile: customer.mobile || '',
      alt_mobile: customer.alt_mobile || '',
      email: customer.email || '',
      address_line1: customer.address_line1 || '',
      address_line2: customer.address_line2 || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      country: customer.country || 'India',
      ledger_balance: customer.ledger_balance || 0,
      is_gst: customer.is_gst || false
    });
    if (customer.image_url) {
      setImagePreview(`${API_BASE_URL}${customer.image_url}`);
    }
    setShowEditModal(true);
  };

  const openViewModal = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowViewModal(true);
  };

  const openTransactionsModal = async (customer: Customer) => {
    setSelectedCustomer(customer);
    try {
      const data = await api.getCustomerTransactions(customer.id);
      setTransactions(data);
      setShowTransactionsModal(true);
    } catch (error) {
      toast.error('Failed to fetch transactions');
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'positive' && (customer.ledger_balance || 0) > 0) ||
      (filterStatus === 'negative' && (customer.ledger_balance || 0) < 0) ||
      (filterStatus === 'zero' && (customer.ledger_balance || 0) === 0);
    
    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-red-600';
    if (balance < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const exportToCSV = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      // Prepare CSV data
      const csvHeaders = [
        'ID',
        'Name',
        'Mobile',
        'Alt Mobile',
        'Email',
        'Address Line 1',
        'Address Line 2',
        'City',
        'State',
        'Pincode',
        'Country',
        'Ledger Balance',
        'Customer Type',
        'Created At'
      ];

      const csvData = filteredCustomers.map(customer => [
        customer.id,
        customer.name || '',
        customer.mobile || '',
        customer.alt_mobile || '',
        customer.email || '',
        customer.address_line1 || '',
        customer.address_line2 || '',
        customer.city || '',
        customer.state || '',
        customer.pincode || '',
        customer.country || '',
        customer.ledger_balance || 0,
        customer.is_gst ? 'GST Customer' : 'Regular Customer',
        customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-IN') : ''
      ]);

      // Create CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => 
          row.map(cell => 
            typeof cell === 'string' && cell.includes(',') 
              ? `"${cell.replace(/"/g, '""')}"` 
              : cell
          ).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `customers_${customerType}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${filteredCustomers.length} ${customerType} customers to CSV`);
    } catch (error) {
      toast.error('Failed to export customers');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gray-900 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
              <p className="text-gray-600 text-sm">Manage your customers</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={exportToCSV}
              disabled={isExporting}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* Stats Cards - Clean and Simple */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {customerType === 'regular' ? 'Regular Customers' : 'GST Customers'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding Amount</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(customers.reduce((sum, c) => sum + Math.max(0, c.ledger_balance || 0), 0))}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Customer Type Filter Tabs */}
        <div className="bg-white p-1 rounded-lg border border-gray-200 inline-flex">
          <button
            onClick={() => setCustomerType('regular')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              customerType === 'regular'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Regular Customers
          </button>
          <button
            onClick={() => setCustomerType('gst')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              customerType === 'gst'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            GST Customers
          </button>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                <option value="all">All Customers</option>
                <option value="positive">Outstanding Balance</option>
                <option value="negative">Credit Balance</option>
                <option value="zero">Zero Balance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customers Grid - Clean and Modern */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCustomers.map((customer) => (
            <div 
              key={customer.id} 
              className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {customer.image_url ? (
                    <img
                      src={`${API_BASE_URL}${customer.image_url}`}
                      alt={customer.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {customer.name}
                    </h3>
                    <p className="text-xs text-gray-500">ID: #{customer.id}</p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {customer.mobile && (
                  <div className="flex items-center text-xs text-gray-600">
                    <Phone className="h-3 w-3 mr-2 text-gray-400" />
                    <span>{customer.mobile}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center text-xs text-gray-600">
                    <Mail className="h-3 w-3 mr-2 text-gray-400" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {(customer.city || customer.state) && (
                  <div className="flex items-center text-xs text-gray-600">
                    <MapPin className="h-3 w-3 mr-2 text-gray-400" />
                    <span className="truncate">
                      {[customer.city, customer.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Balance */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Balance</span>
                  <span className={`text-sm font-semibold ${getBalanceColor(customer.ledger_balance || 0)}`}>
                    {formatCurrency(Math.abs(customer.ledger_balance || 0))}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(customer)}
                  className="flex-1 px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center justify-center space-x-1"
                >
                  <Edit className="h-3 w-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => openViewModal(customer)}
                  className="flex-1 px-3 py-2 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center justify-center space-x-1"
                >
                  <Eye className="h-3 w-3" />
                  <span>View</span>
                </button>
                <button
                  onClick={() => openTransactionsModal(customer)}
                  className="flex-1 px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 flex items-center justify-center space-x-1"
                >
                  <History className="h-3 w-3" />
                  <span>History</span>
                </button>

                {/* Direct Delete Button */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    if (window.confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`)) {
                      try {
                        await api.deleteCustomer(customer.id);
                        toast.success('Customer deleted successfully');
                        fetchCustomers();
                      } catch (error: any) {
                        toast.error(error.message || 'Failed to delete customer');
                      }
                    }
                  }}
                  className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center"
                  title="Delete Customer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg border border-gray-200 p-12 max-w-md mx-auto">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first customer'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  Add Your First Customer
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add New Customer</h2>
                <p className="text-sm text-gray-600 mt-1">Create a new customer profile</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-6 space-y-6">
              {/* Image Upload */}
              <div className="text-center">
                <div className="mb-4">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto border-2 border-dashed border-gray-300">
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="image"
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  {imagePreview ? 'Change Photo' : 'Add Photo'}
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Enter customer's full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alternative Mobile
                  </label>
                  <input
                    type="tel"
                    value={formData.alt_mobile}
                    onChange={(e) => setFormData({ ...formData, alt_mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Alternative contact number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="customer@example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={formData.address_line1}
                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="House/Flat number, Street name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.address_line2}
                    onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Landmark, Area"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="City name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="State name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Country name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Ledger Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.ledger_balance}
                    onChange={(e) => setFormData({ ...formData, ledger_balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter positive amount if customer owes money, negative if customer has credit
                  </p>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="add_is_gst"
                      checked={formData.is_gst}
                      onChange={(e) => setFormData({ ...formData, is_gst: e.target.checked })}
                      className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                    />
                    <label htmlFor="add_is_gst" className="ml-2 block text-sm text-gray-700">
                      GST Customer
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Check this if the customer is a GST-registered business
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Add Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Edit Customer</h2>
                <p className="text-sm text-gray-600 mt-1">Update customer information</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                  setSelectedCustomer(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleEditCustomer} className="p-6 space-y-6">
              {/* Image Upload */}
              <div className="text-center">
                <div className="mb-4">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto border-2 border-dashed border-gray-300">
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id="edit-image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="edit-image"
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  {imagePreview ? 'Change Photo' : 'Add Photo'}
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Enter customer's full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alternative Mobile
                  </label>
                  <input
                    type="tel"
                    value={formData.alt_mobile}
                    onChange={(e) => setFormData({ ...formData, alt_mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Alternative contact number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="customer@example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={formData.address_line1}
                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="House/Flat number, Street name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.address_line2}
                    onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Landmark, Area"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="City name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="State name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Country name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Ledger Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.ledger_balance}
                    onChange={(e) => setFormData({ ...formData, ledger_balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter positive amount if customer owes money, negative if customer has credit
                  </p>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit_is_gst"
                      checked={formData.is_gst}
                      onChange={(e) => setFormData({ ...formData, is_gst: e.target.checked })}
                      className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                    />
                    <label htmlFor="edit_is_gst" className="ml-2 block text-sm text-gray-700">
                      GST Customer
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Check this if the customer is a GST-registered business
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                    setSelectedCustomer(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Update Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Customer Modal */}
      {showViewModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Customer Details</h2>
                <p className="text-sm text-gray-600 mt-1">View customer information</p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedCustomer(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Image and Basic Info */}
              <div className="text-center">
                {selectedCustomer.image_url ? (
                  <img
                    src={`${API_BASE_URL}${selectedCustomer.image_url}`}
                    alt={selectedCustomer.name}
                    className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto border-2 border-gray-200">
                    <User className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-900 mt-4">{selectedCustomer.name}</h3>
                <p className="text-sm text-gray-500">Customer ID: #{selectedCustomer.id}</p>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Contact Information</h4>
                  {selectedCustomer.mobile && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{selectedCustomer.mobile}</span>
                    </div>
                  )}
                  {selectedCustomer.alt_mobile && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{selectedCustomer.alt_mobile}</span>
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{selectedCustomer.email}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Address</h4>
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="text-sm text-gray-600">
                      {selectedCustomer.address_line1 && <div>{selectedCustomer.address_line1}</div>}
                      {selectedCustomer.address_line2 && <div>{selectedCustomer.address_line2}</div>}
                      <div>
                        {[selectedCustomer.city, selectedCustomer.state, selectedCustomer.pincode]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                      {selectedCustomer.country && <div>{selectedCustomer.country}</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <span className="font-medium text-gray-900">Current Balance</span>
                  </div>
                  <span className={`text-lg font-semibold ${getBalanceColor(selectedCustomer.ledger_balance || 0)}`}>
                    {formatCurrency(Math.abs(selectedCustomer.ledger_balance || 0))}
                  </span>
                </div>
                {(selectedCustomer.ledger_balance || 0) < 0 && (
                  <p className="text-xs text-green-600 mt-1">Customer has credit balance</p>
                )}
                {(selectedCustomer.ledger_balance || 0) > 0 && (
                  <p className="text-xs text-red-600 mt-1">Outstanding amount</p>
                )}
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedCustomer);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Customer</span>
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openTransactionsModal(selectedCustomer);
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2"
                >
                  <History className="h-4 w-4" />
                  <span>View History</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {showTransactionsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto w-full max-w-4xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedCustomer.name} - Customer ID: #{selectedCustomer.id}</p>
              </div>
              <button
                onClick={() => {
                  setShowTransactionsModal(false);
                  setSelectedCustomer(null);
                  setTransactions([]);
                  setShowGstTransactions(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* GST Filter */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={showGstTransactions}
                      onChange={(e) => setShowGstTransactions(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Include GST Transactions</span>
                  </label>
                </div>
                
                <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                  {showGstTransactions ? 'Showing: All Transactions' : 'Showing: Non-GST & Repayments'}
                </div>
              </div>
            </div>

            <div className="p-6">
              {(() => {
                const filteredTransactions = transactions.filter(transaction => 
                  showGstTransactions ? true : (transaction.type === 'non_gst' || transaction.type === 'repayment')
                );
                
                return filteredTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {filteredTransactions.map((transaction) => (
                      <div key={transaction.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => {
                                setShowTransactionsModal(false);
                                setSelectedInvoiceId(transaction.id);
                              }}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              {transaction.invoice_number || `Invoice #${transaction.id}`}
                            </button>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              transaction.type === 'gst' 
                                ? 'bg-blue-100 text-blue-800' 
                                : transaction.type === 'repayment'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {transaction.type?.toUpperCase() || 'NON-GST'}
                            </span>
                            {transaction.payment_method && (
                              <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                                {transaction.payment_method.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(transaction.total_amount || 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
                            <span>Paid: {formatCurrency(transaction.paid_amount || 0)}</span>
                            {(transaction.balance_amount || 0) > 0 && (
                              <span className="text-red-600">Outstanding: {formatCurrency(transaction.balance_amount)}</span>
                            )}
                            {transaction.payment_status && (
                              <span className={`capitalize ${
                                transaction.payment_status === 'paid' ? 'text-green-600' :
                                transaction.payment_status === 'partial' ? 'text-yellow-600' :
                                transaction.payment_status === 'credit' ? 'text-blue-600' : 'text-red-600'
                              }`}>
                                {transaction.payment_status}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
                            <button
                              onClick={() => {
                                setShowTransactionsModal(false);
                                setSelectedInvoiceId(transaction.id);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="View Invoice Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {showGstTransactions ? 'No transactions found' : 'No non-GST transactions or repayments found'}
                    </h3>
                    <p className="text-gray-600">
                      {showGstTransactions 
                        ? 'This customer doesn\'t have any transaction history yet.'
                        : 'This customer doesn\'t have any non-GST transactions or repayments. Try enabling "Include GST Transactions" to see all transactions.'
                      }
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* Invoice Detail Modal */}
      {selectedInvoiceId && (
        <InvoiceDetailModal 
          invoiceId={selectedInvoiceId} 
          onClose={() => setSelectedInvoiceId(null)} 
        />
      )}
    </div>
  );
};

export default Customers;