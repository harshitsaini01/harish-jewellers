import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Customer } from '../types';
import { 
  CreditCard, Search, X, Users, IndianRupee,
  CheckCircle, AlertCircle, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import InvoiceDetailModal from './InvoiceDetailModal';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const Udhaar: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<number>(0);
  const [repaymentMethod, setRepaymentMethod] = useState<'cash' | 'upi' | 'cheque'>('cash');
  const [repaymentNotes, setRepaymentNotes] = useState('');
  const [createdInvoiceId, setCreatedInvoiceId] = useState<number | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data as Customer[]);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer || repaymentAmount <= 0) {
      toast.error('Please enter a valid repayment amount');
      return;
    }

    try {
      console.log('Creating repayment invoice for customer:', selectedCustomer.id);
      
      // Create a simple repayment invoice with proper format
      const repaymentInvoice = {
        customer_id: selectedCustomer.id,
        type: 'repayment',
        items: [{
          item_id: null, // Use null for repayment items
          item_name: 'Payment Received',
          stamp: '', // No purity for payments
          remarks: repaymentNotes || 'Customer repayment',
          hsn: null,
          unit: 'PC',
          pc: 1,
          gross_weight: 0, // No weight for payments
          less: 0,
          net_weight: 0, // No weight for payments
          add_weight: 0,
          making_charges: 0,
          rate: repaymentAmount,
          labour: 0,
          discount: 0,
          total: repaymentAmount,
          quantity: 1,
          amount: repaymentAmount
        }],
        subtotal: repaymentAmount,
        discount_type: 'none',
        discount_value: 0,
        discount_amount: 0,
        gst_amount: 0,
        total_amount: repaymentAmount,
        invoice_date: new Date().toISOString().split('T')[0],
        // Payment information
        payment_method: repaymentMethod,
        amount_paying: repaymentAmount,
        paid_amount: repaymentAmount,
        balance_amount: 0, // No balance for repayment invoices
        payment_status: 'paid',
        new_ledger_balance: selectedCustomer.ledger_balance - repaymentAmount,
        // Add previous balance for proper display
        previous_balance: selectedCustomer.ledger_balance,
        current_outstanding: selectedCustomer.ledger_balance - repaymentAmount
      };

      console.log('Repayment invoice data:', repaymentInvoice);

      // Create the repayment invoice
      const result = await api.createInvoice(repaymentInvoice);
      console.log('Repayment result:', result);
      
      toast.success('Repayment recorded successfully with invoice created');
      setShowRepaymentModal(false);
      setSelectedCustomer(null);
      setRepaymentAmount(0);
      setRepaymentNotes('');
      setRepaymentMethod('cash');
      fetchCustomers(); // Refresh customer list
      setCreatedInvoiceId(result.id);
      // Skip success modal and go directly to invoice
      setShowInvoiceModal(true);
    } catch (error: any) {
      console.error('Repayment error:', error);
      toast.error(error.message || 'Failed to record repayment');
    }
  };

  // Filter customers with outstanding balances
  const outstandingCustomers = customers.filter(customer => {
    const hasOutstanding = (customer.ledger_balance || 0) > 0;
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.mobile?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return hasOutstanding && matchesSearch;
  });

  const totalOutstanding = customers.reduce((sum, customer) => 
    sum + Math.max(0, customer.ledger_balance || 0), 0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading outstanding accounts...</p>
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
            <div className="p-3 bg-red-600 rounded-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Udhaar Management</h1>
              <p className="text-gray-600 text-sm">Manage customer outstanding payments</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Outstanding</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalOutstanding)}
                </p>
              </div>
              <IndianRupee className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Customers with Outstanding</p>
                <p className="text-2xl font-bold text-orange-600">
                  {customers.filter(c => (c.ledger_balance || 0) > 0).length}
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-400" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Outstanding</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(outstandingCustomers.length > 0 ? totalOutstanding / outstandingCustomers.length : 0)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search customers with outstanding amounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Outstanding Customers List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Customers with Outstanding Payments</h2>
            <p className="text-sm text-gray-600 mt-1">
              {outstandingCustomers.length} customers have pending payments
            </p>
          </div>

          {outstandingCustomers.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {outstandingCustomers.map((customer) => (
                <div key={customer.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
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
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          {customer.mobile && <span>📞 {customer.mobile}</span>}
                          <span>ID: #{customer.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Outstanding Amount</p>
                        <p className="text-xl font-bold text-red-600">
                          {formatCurrency(customer.ledger_balance || 0)}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setRepaymentAmount(0);
                          setRepaymentNotes('');
                          setRepaymentMethod('cash');
                          setShowRepaymentModal(true);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Record Payment</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No matching customers found' : 'All payments are up to date!'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'No customers have outstanding payments at the moment.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Repayment Modal */}
      {showRepaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Record Repayment</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedCustomer.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowRepaymentModal(false);
                  setSelectedCustomer(null);
                  setRepaymentAmount(0);
                  setRepaymentNotes('');
                  setRepaymentMethod('cash');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleRepayment} className="p-6">
              {/* Current Outstanding */}
              <div className="bg-red-50 p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-700">Current Outstanding:</span>
                  <span className="text-lg font-bold text-red-800">
                    ₹{Math.abs(selectedCustomer.ledger_balance).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repayment Amount (₹) *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedCustomer.ledger_balance}
                      value={repaymentAmount || ''}
                      onChange={(e) => setRepaymentAmount(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter amount"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setRepaymentAmount(selectedCustomer.ledger_balance)}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      title="Pay Full Outstanding"
                    >
                      Full
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={repaymentMethod}
                    onChange={(e) => setRepaymentMethod(e.target.value as 'cash' | 'upi' | 'cheque')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={repaymentNotes}
                    onChange={(e) => setRepaymentNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                    placeholder="Add any notes about this repayment..."
                  />
                </div>

                {/* Payment Summary */}
                {repaymentAmount > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium text-green-800 mb-2">Payment Summary</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Outstanding:</span>
                        <span className="font-medium">₹{selectedCustomer.ledger_balance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Repayment Amount:</span>
                        <span className="font-medium text-green-600">₹{repaymentAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="font-medium">New Outstanding:</span>
                        <span className={`font-bold ${
                          (selectedCustomer.ledger_balance - repaymentAmount) <= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ₹{Math.abs(selectedCustomer.ledger_balance - repaymentAmount).toLocaleString()}
                          {(selectedCustomer.ledger_balance - repaymentAmount) <= 0 ? ' (Paid)' : ' (Outstanding)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowRepaymentModal(false);
                    setSelectedCustomer(null);
                    setRepaymentAmount(0);
                    setRepaymentNotes('');
                    setRepaymentMethod('cash');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!repaymentAmount || repaymentAmount <= 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Record Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && createdInvoiceId && (
        <InvoiceDetailModal
          invoiceId={createdInvoiceId}
          onClose={() => {
            setShowInvoiceModal(false);
            setCreatedInvoiceId(null);
          }}
        />
      )}
    </div>
  );
};

export default Udhaar; 