import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Customer } from '../types';
import { X, Calendar, IndianRupee, User, FileText, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedCustomer?: Customer | null;
  preSelectedInvoiceId?: number | null;
  preSelectedAmount?: number;
}

const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  preSelectedCustomer,
  preSelectedInvoiceId,
  preSelectedAmount
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [reminderDate, setReminderDate] = useState<string>('');
  const [amountPromised, setAmountPromised] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      
      // Pre-populate if customer is provided
      if (preSelectedCustomer) {
        setSelectedCustomerId(String(preSelectedCustomer.id));
      }
      
      // Pre-populate amount if provided
      if (preSelectedAmount) {
        setAmountPromised(String(preSelectedAmount));
      }
      
      // Set default reminder date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setReminderDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [isOpen, preSelectedCustomer, preSelectedAmount]);

  const fetchCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomerId || !reminderDate || !amountPromised) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    
    try {
      const reminderData = {
        customer_id: parseInt(selectedCustomerId),
        invoice_id: preSelectedInvoiceId || null,
        reminder_date: reminderDate,
        amount_promised: parseFloat(amountPromised),
        notes: notes.trim()
      };

      await api.createReminder(reminderData);
      toast.success('Payment reminder created successfully!');
      onClose();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create reminder');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setReminderDate('');
    setAmountPromised('');
    setNotes('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const selectedCustomer = customers.find(c => c.id === parseInt(selectedCustomerId));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-100 p-2 rounded-full">
              <Bell className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Create Payment Reminder</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Customer *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
              disabled={!!preSelectedCustomer}
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.mobile ? `(${customer.mobile})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Info Display */}
          {selectedCustomer && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Customer Information</h4>
              <div className="text-sm space-y-1">
                <div><span className="text-gray-600">Name:</span> {selectedCustomer.name}</div>
                {selectedCustomer.mobile && (
                  <div><span className="text-gray-600">Mobile:</span> {selectedCustomer.mobile}</div>
                )}
                <div>
                  <span className="text-gray-600">Current Balance:</span>
                  <span className={selectedCustomer.ledger_balance > 0 ? "text-red-600 font-medium ml-1" : selectedCustomer.ledger_balance < 0 ? "text-green-600 font-medium ml-1" : "text-gray-600 font-medium ml-1"}>
                    ₹{Math.abs(selectedCustomer.ledger_balance).toLocaleString()}
                    {selectedCustomer.ledger_balance > 0 ? " (Owes)" : selectedCustomer.ledger_balance < 0 ? " (Credit)" : ""}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Reminder Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Promise Date *
            </label>
            <input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Date when customer promised to pay</p>
          </div>

          {/* Amount Promised */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <IndianRupee className="h-4 w-4 inline mr-1" />
              Amount Promised (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountPromised}
              onChange={(e) => setAmountPromised(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Additional notes about the payment promise..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  <span>Create Reminder</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReminderModal; 