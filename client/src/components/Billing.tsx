import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { Customer, Item, InvoiceItem } from '../types';
import { Plus, Trash2, Calculator, Calendar, Search, UserPlus, CreditCard, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import InvoiceDetailModal from './InvoiceDetailModal';
import ReminderModal from './ReminderModal';

// Utility function to round currency values to 2 decimal places
const roundCurrency = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const Billing: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [invoiceType, setInvoiceType] = useState<'gst' | 'non_gst'>('non_gst');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'cheque'>('cash');
  const [amountPaying, setAmountPaying] = useState<number>(0);
  
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { 
      item_id: 0, 
      item_name: '', 
      stamp: '',
      remarks: '',
      hsn: undefined,
      unit: 'GM',
      pc: 1,
      gross_weight: 0,
      less: 0,
      net_weight: 0,
      add_weight: 0,
      making_charges: 0,
      rate: 0,
      labour: 0,
      discount: 0,
      total: 0
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerDropdownPosition, setCustomerDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  
  // Item search states
  const [itemSearchTerms, setItemSearchTerms] = useState<string[]>([]);
  const [itemDropdownStates, setItemDropdownStates] = useState<boolean[]>([]);
  const [itemDropdownPositions, setItemDropdownPositions] = useState<({ top: number; left: number } | null)[]>([]);
  const itemDropdownRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [itemHighlightedIndexes, setItemHighlightedIndexes] = useState<number[]>([]);

  // Invoice modal state
  const [createdInvoiceId, setCreatedInvoiceId] = useState<number | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);

  // Old Gold/Silver return states (for non-GST only)
  const [oldItemType, setOldItemType] = useState<'old_gold' | 'old_silver' | ''>('');
  const [oldItemValue, setOldItemValue] = useState<number>(0);

  // Reminder modal state
  const [showReminderModal, setShowReminderModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      const customer = customers.find(c => c.id === parseInt(selectedCustomer));
      setSelectedCustomerData(customer || null);
    } else {
      setSelectedCustomerData(null);
    }
  }, [selectedCustomer, customers]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Customer dropdown
      if (isCustomerDropdownOpen && 
          !target.closest('.customer-dropdown-container') && 
          !target.closest('[data-dropdown="customer"]')) {
        setIsCustomerDropdownOpen(false);
        setCustomerDropdownPosition(null);
      }
      
      // Item dropdowns
      itemDropdownStates.forEach((isOpen, index) => {
        if (isOpen && 
            !target.closest(`[data-dropdown="item-${index}"]`) &&
            !target.closest(`.item-dropdown-container-${index}`)) {
          setItemDropdownStates(prev => {
            const newStates = [...prev];
            newStates[index] = false;
            return newStates;
          });
          setItemDropdownPositions(prev => {
            const newPositions = [...prev];
            newPositions[index] = null;
            return newPositions;
          });
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCustomerDropdownOpen, itemDropdownStates]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    (customer.mobile && customer.mobile.includes(customerSearchTerm))
  );

  // Filter items based on search term for each row
  const getFilteredItems = (searchTerm: string) => {
    if (!searchTerm) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Reset highlighted index when filtered customers change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredCustomers]);

  const fetchData = async () => {
    try {
      const [customersData, itemsData] = await Promise.all([
        api.getCustomers(),
        api.getItems(),
      ]);
      setCustomers(customersData);
      setItems(itemsData);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const addItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { 
        item_id: 0, 
        item_name: '', 
        stamp: '',
        remarks: '',
        hsn: undefined,
        unit: 'GM',
        pc: 1,
        gross_weight: 0,
        less: 0,
        net_weight: 0,
        add_weight: 0,
        making_charges: 0,
        rate: 0,
        labour: 0,
        discount: 0,
        total: 0
      }
    ]);
    
    // Extend search states for new item
    setItemSearchTerms(prev => [...prev, '']);
    setItemDropdownStates(prev => [...prev, false]);
    setItemDropdownPositions(prev => [...prev, null]);
    setItemHighlightedIndexes(prev => [...prev, -1]);
  };

  const removeItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    
    // Remove corresponding search states
    setItemSearchTerms(prev => prev.filter((_, i) => i !== index));
    setItemDropdownStates(prev => prev.filter((_, i) => i !== index));
    setItemDropdownPositions(prev => prev.filter((_, i) => i !== index));
    setItemHighlightedIndexes(prev => prev.filter((_, i) => i !== index));
    itemDropdownRefs.current = itemDropdownRefs.current.filter((_, i) => i !== index);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...invoiceItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Calculate net weight: gross_weight + add_weight + making_charges(% of gross_weight converted to grams)
    if (field === 'gross_weight' || field === 'add_weight' || field === 'making_charges') {
      const grossWeight = updated[index].gross_weight;
      const polishWeight = updated[index].add_weight; // Polish in grams
      const makingChargesPercent = updated[index].making_charges; // Making charges in percentage
      
      // Convert making charges percentage to grams (% of gross weight)
      const makingChargesInGrams = (grossWeight * makingChargesPercent) / 100;
      
      updated[index].net_weight = grossWeight + polishWeight + makingChargesInGrams;
    }
    
    // Calculate total for the item
    if (['net_weight', 'add_weight', 'rate', 'labour', 'discount', 'making_charges', 'pc'].includes(field) || 
        field === 'gross_weight') {
      const netWeight = updated[index].net_weight;
      const rateAmount = netWeight * updated[index].rate;
      const labour = updated[index].labour;
      const pc = updated[index].pc || 1;
      const discount = updated[index].discount;
      
      // Calculate total for single piece first
      const singlePieceTotal = rateAmount + labour;
      
      // Multiply by piece count, then subtract discount from final amount
      updated[index].total = (singlePieceTotal * pc) - discount;
    }
    
    setInvoiceItems(updated);
  };

  const selectItem = (index: number, itemId: string) => {
    const item = items.find(i => i.id === parseInt(itemId));
    if (item) {
      const updated = [...invoiceItems];
      updated[index] = { 
        ...updated[index], 
        item_id: item.id,
        item_name: item.name,
        rate: item.price || 0
      };
      setInvoiceItems(updated);
    } else {
      // If no item selected, clear the fields
      const updated = [...invoiceItems];
      updated[index] = { 
        ...updated[index], 
        item_id: 0,
        item_name: '',
        rate: 0
      };
      setInvoiceItems(updated);
    }
  };

  // Clear item search
  const clearItemSearch = (index: number) => {
    const updated = [...invoiceItems];
    updated[index] = { 
      ...updated[index], 
      item_id: 0,
      item_name: '',
      rate: 0
    };
    setInvoiceItems(updated);
    
    setItemSearchTerms(prev => {
      const newTerms = [...prev];
      newTerms[index] = '';
      return newTerms;
    });
    
    setItemDropdownStates(prev => {
      const newStates = [...prev];
      newStates[index] = false;
      return newStates;
    });
    
    setItemDropdownPositions(prev => {
      const newPositions = [...prev];
      newPositions[index] = null;
      return newPositions;
    });
  };

  const calculateTotals = () => {
    const subtotal = roundCurrency(invoiceItems.reduce((sum, item) => sum + item.total, 0));
    const gstAmount = invoiceType === 'gst' ? roundCurrency(subtotal * 0.03) : 0; // 3% GST
    let total = roundCurrency(subtotal + gstAmount);
    
    // For non-GST invoices, subtract old item value if applicable
    if (invoiceType === 'non_gst' && oldItemType && oldItemValue > 0) {
      total = roundCurrency(total - oldItemValue);
    }
    
    return { subtotal, gstAmount, total, oldItemDeduction: invoiceType === 'non_gst' && oldItemType && oldItemValue > 0 ? oldItemValue : 0 };
  };

  const calculatePaymentSummary = () => {
    const { total } = calculateTotals();
    const currentLedgerBalance = selectedCustomerData?.ledger_balance || 0;
    
    // Current outstanding (positive means customer owes money)
    const currentOutstanding = roundCurrency(currentLedgerBalance);
    
    // Total amount after this invoice
    const totalAmountDue = roundCurrency(currentOutstanding + total);
    
    // Amount paying now
    const paying = roundCurrency(amountPaying || 0);
    
    // New outstanding balance after payment
    const newOutstanding = roundCurrency(totalAmountDue - paying);
    
    return {
      currentOutstanding,
      invoiceTotal: total,
      totalAmountDue,
      amountPaying: paying,
      newOutstanding,
      paymentStatus: newOutstanding <= 0 ? (newOutstanding < 0 ? 'credit' : 'paid') : 'partial'
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    
    if (invoiceItems.length === 0 || invoiceItems.some(item => !item.item_id || item.gross_weight <= 0)) {
      toast.error('Please add at least one valid item with gross weight');
      return;
    }

    setLoading(true);
    
    try {
      const { subtotal, gstAmount, total, oldItemDeduction } = calculateTotals();
      const paymentSummary = calculatePaymentSummary();
      
      const invoiceData = {
        customer_id: parseInt(selectedCustomer),
        type: invoiceType,
        invoice_date: invoiceDate,
        items: invoiceItems,
        subtotal,
        discount_type: 'none',
        discount_value: 0,
        discount_amount: 0,
        gst_amount: gstAmount,
        total_amount: total,
        // Old item data (for non-GST only)
        old_item_type: invoiceType === 'non_gst' && oldItemType ? oldItemType : null,
        old_item_value: invoiceType === 'non_gst' && oldItemType ? Number(oldItemValue) || 0 : null,
        // Payment information
        payment_method: paymentMethod,
        amount_paying: amountPaying || 0,
        paid_amount: amountPaying || 0,
        balance_amount: Math.max(0, total - (amountPaying || 0)),
        payment_status: paymentSummary.paymentStatus,
        // Include previous balance for proper calculation
        previous_balance: selectedCustomerData?.ledger_balance || 0,
        current_outstanding: paymentSummary.newOutstanding,
        // Ledger update
        new_ledger_balance: paymentSummary.newOutstanding
      };
      
      let result;
      if (editMode && editingInvoiceId) {
        // Update existing invoice - log for debugging
        console.log('Updating invoice with data:', invoiceData);
        console.log('Current customer ledger balance:', selectedCustomerData?.ledger_balance);
        
        result = await api.updateInvoice(editingInvoiceId, invoiceData);
        toast.success('Invoice updated successfully');
      } else {
        // Create new invoice
        result = await api.createInvoice(invoiceData);
        toast.success('Invoice created successfully');
      }
      
      // Show the invoice (created or updated)
      const invoiceId = editingInvoiceId || result.id;
      if (invoiceId) {
        setCreatedInvoiceId(invoiceId);
        setShowInvoiceModal(true);
      } else {
        console.error('No invoice ID received:', result);
        toast.error('Invoice created but unable to display. Please check the invoices list.');
      }
      
      // Reset edit mode
      setEditMode(false);
      setEditingInvoiceId(null);
      
      // Reset form
      setSelectedCustomer('');
      setSelectedCustomerData(null);
      setPaymentMethod('cash');
      setAmountPaying(0);
      setOldItemType('');
      setOldItemValue(0);
      setInvoiceItems([{ 
        item_id: 0, 
        item_name: '', 
        stamp: '',
        remarks: '',
        hsn: undefined,
        unit: 'GM',
        pc: 1,
        gross_weight: 0,
        less: 0,
        net_weight: 0,
        add_weight: 0,
        making_charges: 0,
        rate: 0,
        labour: 0,
        discount: 0,
        total: 0
      }]);
      setInvoiceType('non_gst');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      
      // Reset item search states
      setItemSearchTerms(['']);
      setItemDropdownStates([false]);
      setItemDropdownPositions([null]);
      setItemHighlightedIndexes([-1]);
      
    } catch (error) {
      console.error('Invoice creation/update error:', error);
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to create invoice');
      } else {
        toast.error('Failed to create invoice');
      }
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, gstAmount, total, oldItemDeduction } = calculateTotals();

  // Add a function to handle creating a new customer
  const handleCreateNewCustomer = () => {
    // Store current billing state in sessionStorage to restore after customer creation
    sessionStorage.setItem('billingState', JSON.stringify({
      invoiceType,
      invoiceDate,
      invoiceItems,
    }));
    
    // Navigate to customers page with a query param to open the create form
    navigate('/customers?action=create');
  };

  // Check for saved billing state on component mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('billingState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        
        // Restore saved state
        if (parsedState.invoiceType) setInvoiceType(parsedState.invoiceType);
        if (parsedState.invoiceDate) setInvoiceDate(parsedState.invoiceDate);
        if (parsedState.invoiceItems && Array.isArray(parsedState.invoiceItems)) {
          setInvoiceItems(parsedState.invoiceItems);
          // Initialize search states for restored items
          setItemSearchTerms(parsedState.invoiceItems.map((item: any) => item.item_name || ''));
          setItemDropdownStates(parsedState.invoiceItems.map(() => false));
          setItemHighlightedIndexes(parsedState.invoiceItems.map(() => -1));
        }
        
        // Clear the saved state
        sessionStorage.removeItem('billingState');
      } catch (error) {
        console.error('Error restoring billing state:', error);
      }
    }
  }, []);

  // Check for newly created customer in URL params
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const newCustomerId = queryParams.get('newCustomerId');
    
    if (newCustomerId) {
      // Clear the URL parameter without page reload
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Set the newly created customer as selected
      setSelectedCustomer(newCustomerId);
    }
  }, []);

  // Add a method to clear the search and reset the dropdown
  const clearCustomerSearch = () => {
    setSelectedCustomer('');
    setSelectedCustomerData(null);
    setCustomerSearchTerm('');
    setIsCustomerDropdownOpen(false);
  };

  // Initialize search states when component mounts
  useEffect(() => {
    if (itemSearchTerms.length === 0) {
      setItemSearchTerms(['']);
      setItemDropdownStates([false]);
      setItemDropdownPositions([null]);
      setItemHighlightedIndexes([-1]);
    }
  }, [itemSearchTerms.length]);

  // Handle keyboard navigation for customer
  const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
    if (!isCustomerDropdownOpen) {
      if (e.key === 'ArrowDown') {
        setIsCustomerDropdownOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        setHighlightedIndex(prev => 
          prev < filteredCustomers.length - 1 ? prev + 1 : prev
        );
        e.preventDefault();
        break;
      case 'ArrowUp':
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        e.preventDefault();
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < filteredCustomers.length) {
          const customer = filteredCustomers[highlightedIndex];
          setSelectedCustomer(String(customer.id));
          setCustomerSearchTerm(customer.name);
          setIsCustomerDropdownOpen(false);
          setCustomerDropdownPosition(null);
          e.preventDefault();
        }
        break;
      case 'Escape':
        setIsCustomerDropdownOpen(false);
        setCustomerDropdownPosition(null);
        e.preventDefault();
        break;
      default:
        break;
    }
  };

  // Handle keyboard navigation for items
  const handleItemKeyDown = (e: React.KeyboardEvent, itemIndex: number) => {
    const filteredItems = getFilteredItems(itemSearchTerms[itemIndex] || '');
    const isOpen = itemDropdownStates[itemIndex];
    
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setItemDropdownStates(prev => {
          const newStates = [...prev];
          newStates[itemIndex] = true;
          return newStates;
        });
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        setItemHighlightedIndexes(prev => {
          const newIndexes = [...prev];
          newIndexes[itemIndex] = Math.min((newIndexes[itemIndex] || -1) + 1, filteredItems.length - 1);
          return newIndexes;
        });
        e.preventDefault();
        break;
      case 'ArrowUp':
        setItemHighlightedIndexes(prev => {
          const newIndexes = [...prev];
          newIndexes[itemIndex] = Math.max((newIndexes[itemIndex] || 0) - 1, 0);
          return newIndexes;
        });
        e.preventDefault();
        break;
      case 'Enter':
        const highlightedIndex = itemHighlightedIndexes[itemIndex] || 0;
        if (highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
          const item = filteredItems[highlightedIndex];
          selectItem(itemIndex, String(item.id));
          setItemSearchTerms(prev => {
            const newTerms = [...prev];
            newTerms[itemIndex] = item.name;
            return newTerms;
          });
          setItemDropdownStates(prev => {
            const newStates = [...prev];
            newStates[itemIndex] = false;
            return newStates;
          });
          setItemDropdownPositions(prev => {
            const newPositions = [...prev];
            newPositions[itemIndex] = null;
            return newPositions;
          });
          e.preventDefault();
        }
        break;
      case 'Escape':
        setItemDropdownStates(prev => {
          const newStates = [...prev];
          newStates[itemIndex] = false;
          return newStates;
        });
        setItemDropdownPositions(prev => {
          const newPositions = [...prev];
          newPositions[itemIndex] = null;
          return newPositions;
        });
        e.preventDefault();
        break;
      default:
        break;
    }
  };

  // Handle item dropdown focus
  const handleItemFocus = (index: number, event: React.FocusEvent) => {
    if (!itemDropdownStates[index]) {
      const rect = event.currentTarget.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      const dropdownWidth = 300;
      const dropdownHeight = 200;
      
      let left = rect.left + scrollLeft;
      let top = rect.bottom + scrollTop + 4;
      
      if (left + dropdownWidth > window.innerWidth - 10) {
        left = window.innerWidth - dropdownWidth - 10;
      }
      if (top + dropdownHeight > window.innerHeight + scrollTop - 10) {
        top = rect.top + scrollTop - dropdownHeight - 4;
      }
      
      setItemDropdownPositions(prev => {
        const newPositions = [...prev];
        newPositions[index] = { top, left };
        return newPositions;
      });
      setItemDropdownStates(prev => {
        const newStates = [...prev];
        newStates[index] = true;
        return newStates;
      });
    }
  };

  // Check for edit mode from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editInvoiceId = urlParams.get('editInvoiceId');
    
    if (editInvoiceId) {
      setEditMode(true);
      setEditingInvoiceId(parseInt(editInvoiceId));
      loadInvoiceForEdit(parseInt(editInvoiceId));
      
      // Clear URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadInvoiceForEdit = async (invoiceId: number) => {
    try {
      const invoiceData = await api.getInvoice(invoiceId);
      
      // Get the customer data
      const customerData = await api.getCustomer(invoiceData.customer_id);
      
      // Calculate the original customer balance before this invoice
      // Use the previous_balance stored in the invoice directly - this is the correct approach
      let originalBalance = 0;
      
      if (invoiceData.previous_balance !== undefined) {
        // Always use the stored previous balance from when the invoice was created
        originalBalance = invoiceData.previous_balance;
        console.log('Using stored previous_balance from invoice:', originalBalance);
      } else {
        // Fallback only if previous_balance is not available (should not happen)
        const invoiceImpact = invoiceData.current_outstanding || invoiceData.balance_amount || 0;
        originalBalance = customerData.ledger_balance - invoiceImpact;
        console.warn('Using fallback balance calculation - previous_balance not found in invoice');
      }
      
      console.log('Edit mode - Original balance:', originalBalance);
      console.log('Current ledger balance:', customerData.ledger_balance);
      console.log('Invoice impact:', invoiceData.current_outstanding);
      
      // Create a modified customer object with the original balance
      const originalCustomerData = {
        ...customerData,
        ledger_balance: originalBalance
      };
      
      // Populate form with invoice data
      setSelectedCustomer(String(invoiceData.customer_id));
      setSelectedCustomerData(originalCustomerData); // Use original balance
      setInvoiceType(invoiceData.type);
      setInvoiceDate(invoiceData.invoice_date || invoiceData.created_at.split('T')[0]);
      setPaymentMethod(invoiceData.payment_method || 'cash');
      setAmountPaying(invoiceData.paid_amount || 0);
      
      // Load old item data if present (for non-GST invoices)
      if (invoiceData.type === 'non_gst') {
        setOldItemType(invoiceData.old_item_type || '');
        setOldItemValue(invoiceData.old_item_value || 0);
      }
      
      // Populate items
      if (invoiceData.items && invoiceData.items.length > 0) {
        setInvoiceItems(invoiceData.items.map((item: any) => ({
          item_id: item.item_id || 0,
          item_name: item.item_name || '',
          stamp: item.stamp || '',
          remarks: item.remarks || '',
          hsn: item.hsn,
          unit: item.unit || 'GM',
          pc: item.pc || 1,
          gross_weight: item.gross_weight || 0,
          less: item.less || 0,
          net_weight: item.net_weight || 0,
          add_weight: item.add_weight || 0,
          making_charges: item.making_charges || 0,
          rate: item.rate || 0,
          labour: item.labour || 0,
          discount: item.discount || 0,
          total: item.total || 0
        })));
        
        // Initialize search states for loaded items
        setItemSearchTerms(invoiceData.items.map((item: any) => item.item_name || ''));
        setItemDropdownStates(invoiceData.items.map(() => false));
        setItemDropdownPositions(invoiceData.items.map(() => null));
        setItemHighlightedIndexes(invoiceData.items.map(() => -1));
      }
      
      toast.success('Invoice loaded for editing');
    } catch (error) {
      toast.error('Failed to load invoice for editing');
      console.error('Edit load error:', error);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {editMode ? 'Edit Invoice' : 'Create Invoice'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Top Section (Invoice Type and Date) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Invoice Type */}
          <div className="card p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Invoice Type</h2>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="non_gst"
                  checked={invoiceType === 'non_gst'}
                  onChange={(e) => setInvoiceType(e.target.value as 'gst' | 'non_gst')}
                  className="mr-2"
                />
                Non-GST (Local/Ledger)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="gst"
                  checked={invoiceType === 'gst'}
                  onChange={(e) => setInvoiceType(e.target.value as 'gst' | 'non_gst')}
                  className="mr-2"
                />
                GST Invoice
              </label>
            </div>
          </div>

          {/* Invoice Date */}
          <div className="card p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Invoice Date
            </h2>
            <div>
              <input
                type="date"
                className="input-field"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Customer Selection */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Customer Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Customer *
              </label>
              <div className="relative customer-dropdown-container">
                {!selectedCustomerData ? (
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10 pointer-events-none" />
                    <input
                      type="text"
                      className="input-field pl-9 pr-3"
                      placeholder="Search customer by name or mobile..."
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                      }}
                      onFocus={() => {
                        if (!isCustomerDropdownOpen) {
                          const rect = (document.activeElement as HTMLElement)?.getBoundingClientRect();
                          if (rect) {
                            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                            
                            const dropdownWidth = 400;
                            const dropdownHeight = 300;
                            
                            let left = rect.left + scrollLeft;
                            let top = rect.bottom + scrollTop + 4;
                            
                            if (left + dropdownWidth > window.innerWidth - 10) {
                              left = window.innerWidth - dropdownWidth - 10;
                            }
                            if (top + dropdownHeight > window.innerHeight + scrollTop - 10) {
                              top = rect.top + scrollTop - dropdownHeight - 4;
                            }
                            
                            setCustomerDropdownPosition({ top, left });
                            setIsCustomerDropdownOpen(true);
                          }
                        }
                      }}
                      onKeyDown={handleCustomerKeyDown}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div>
                      <div className="font-medium">{selectedCustomerData.name}</div>
                      {selectedCustomerData.mobile && (
                        <div className="text-sm text-gray-600">{selectedCustomerData.mobile}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600"
                      onClick={clearCustomerSearch}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {selectedCustomerData && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-medium text-blue-800 mb-2">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span> {selectedCustomerData.name}
                  </div>
                  {selectedCustomerData.mobile && (
                    <div>
                      <span className="text-gray-600">Mobile:</span> {selectedCustomerData.mobile}
                    </div>
                  )}
                  {selectedCustomerData.address_line1 && (
                    <div className="col-span-1 md:col-span-2">
                      <span className="text-gray-600">Address:</span> {selectedCustomerData.address_line1}
                      {selectedCustomerData.address_line2 && `, ${selectedCustomerData.address_line2}`}
                      {selectedCustomerData.city && `, ${selectedCustomerData.city}`}
                    </div>
                  )}
                  <div className="col-span-1 md:col-span-2">
                    <span className="font-medium text-blue-800">Ledger Balance:</span> 
                    <span className={selectedCustomerData.ledger_balance > 0 ? "text-red-600 font-medium" : selectedCustomerData.ledger_balance < 0 ? "text-green-600 font-medium" : "text-gray-600 font-medium"}>
                      &nbsp;₹{Math.abs(selectedCustomerData.ledger_balance).toLocaleString()}
                      {selectedCustomerData.ledger_balance > 0 ? " (Owes You)" : selectedCustomerData.ledger_balance < 0 ? " (Credit/Advance)" : ""}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="btn-primary flex items-center text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto overflow-y-visible">
            <div className="min-w-[1400px] space-y-3">
              {/* Header Row */}
              <div className={`grid gap-1 items-center p-2 bg-gray-50 rounded text-xs font-medium text-gray-700 ${
                invoiceType === 'gst' ? 'grid-cols-17' : 'grid-cols-16'
              }`} style={{
                gridTemplateColumns: invoiceType === 'gst' 
                  ? '1.5fr 1fr 1fr 0.8fr 1fr 0.7fr 1fr 1fr 1fr 1fr 1fr 0.8fr 1fr 1.2fr 0.5fr' 
                  : '1.5fr 1fr 1fr 1fr 0.7fr 1fr 1fr 1fr 1fr 1fr 0.8fr 1fr 1.2fr 0.5fr'
              }}>
                <div className="col-span-1">Item Name</div>
                <div className="text-center">Stamp</div>
                <div className="text-center">Remarks</div>
                {invoiceType === 'gst' && <div className="text-center">HSN</div>}
                <div className="text-center">Unit</div>
                <div className="text-center">Pc</div>
                <div className="text-center">Net.Wt.</div>
                <div className="text-center">Polish(gm)</div>
                <div className="text-center">Making(%)</div>
                <div className="text-center">Total Wt.</div>
                <div className="text-center">Rate</div>
                <div className="text-center">Lbr.</div>
                <div className="text-center">Dis.</div>
                <div className="text-center">Total</div>
                <div className="text-center">Act</div>
              </div>

              {invoiceItems.map((item, index) => (
                <div key={index} className={`grid gap-1 items-center p-2 border rounded-lg bg-white hover:bg-gray-50 ${
                  invoiceType === 'gst' ? 'grid-cols-17' : 'grid-cols-16'
                }`} style={{
                  gridTemplateColumns: invoiceType === 'gst' 
                    ? '1.5fr 1fr 1fr 0.8fr 1fr 0.7fr 1fr 1fr 1fr 1fr 1fr 0.8fr 1fr 1.2fr 0.5fr' 
                    : '1.5fr 1fr 1fr 1fr 0.7fr 1fr 1fr 1fr 1fr 1fr 0.8fr 1fr 1.2fr 0.5fr'
                }}>
                  {/* Item Name - Searchable Dropdown */}
                  <div>
                    <div className={`relative item-dropdown-container-${index}`}>
                      {!item.item_name ? (
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 z-10 pointer-events-none" />
                          <input
                            type="text"
                            className="input-field text-xs w-full pl-7 pr-2"
                            placeholder="Search item..."
                            value={itemSearchTerms[index] || ''}
                            onChange={(e) => {
                              const newTerms = [...itemSearchTerms];
                              newTerms[index] = e.target.value;
                              setItemSearchTerms(newTerms);
                            }}
                            onFocus={(e) => handleItemFocus(index, e)}
                            onKeyDown={(e) => handleItemKeyDown(e, index)}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md p-2 text-xs">
                          <span className="font-medium truncate">{item.item_name}</span>
                          <button
                            type="button"
                            className="text-gray-400 hover:text-gray-600 ml-1 flex-shrink-0"
                            onClick={() => clearItemSearch(index)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stamp */}
                  <div>
                    <select
                      className="input-field text-xs w-full"
                      value={item.stamp || ''}
                      onChange={(e) => updateItem(index, 'stamp', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="14k">14k</option>
                      <option value="18k">18k</option>
                      <option value="20k">20k</option>
                      <option value="22k">22k</option>
                      <option value="24k">24k</option>
                    </select>
                  </div>

                  {/* Remarks */}
                  <div>
                    <input
                      type="text"
                      placeholder="Notes"
                      className="input-field text-xs w-full"
                      value={item.remarks || ''}
                      onChange={(e) => updateItem(index, 'remarks', e.target.value)}
                    />
                  </div>

                  {/* HSN - Only for GST invoices */}
                  {invoiceType === 'gst' && (
                    <div>
                      <select
                        className="input-field text-xs w-full"
                        value={item.hsn || ''}
                        onChange={(e) => updateItem(index, 'hsn', e.target.value)}
                      >
                        <option value="">Select HSN</option>
                        <option value="711319">711319</option>
                        <option value="71131910">71131910</option>
                      </select>
                    </div>
                  )}

                  {/* Unit */}
                  <div>
                    <select
                      className="input-field text-xs w-full"
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    >
                      <option value="GM">GM</option>
                      <option value="mG">mG</option>
                    </select>
                  </div>

                  {/* Pc */}
                  <div>
                    <input
                      type="number"
                      min="1"
                      className="input-field text-xs w-full"
                      value={item.pc}
                      onChange={(e) => updateItem(index, 'pc', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  {/* Gross Weight */}
                  <div>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      className="input-field text-xs w-full"
                      value={item.gross_weight || ''}
                      onChange={(e) => updateItem(index, 'gross_weight', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  {/* Polish (in grams) */}
                  <div>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      className="input-field text-xs w-full"
                      value={item.add_weight || ''}
                      onChange={(e) => updateItem(index, 'add_weight', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  {/* Making Charges (in percentage) */}
                  <div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0%"
                        className="input-field text-xs w-full pr-6"
                        value={item.making_charges || ''}
                        onChange={(e) => updateItem(index, 'making_charges', parseFloat(e.target.value) || 0)}
                      />
                      <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400 text-xs">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Net Weight (calculated: gross + polish + making) */}
                  <div>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      className="input-field text-xs w-full bg-gray-50"
                      value={item.net_weight.toFixed(3)}
                      readOnly
                    />
                  </div>

                  {/* Rate */}
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Rate"
                      className="input-field text-xs w-full"
                      value={item.rate || ''}
                      onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  {/* Labour */}
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="₹0"
                      className="input-field text-xs w-full"
                      value={item.labour || ''}
                      onChange={(e) => updateItem(index, 'labour', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  {/* Discount */}
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="₹0"
                      className="input-field text-xs w-full"
                      value={item.discount || ''}
                      onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  {/* Total */}
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Total"
                      className="input-field text-xs w-full bg-gray-50 font-medium"
                      value={item.total.toFixed(2)}
                      readOnly
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Old Gold/Silver Return Section - Only for Non-GST */}
        {invoiceType === 'non_gst' && (
          <div className="card p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <svg className="h-5 w-5 mr-2 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2L3 7v11h14V7l-7-5zM8 16H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V6h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
              </svg>
              Old Item Return (Exchange)
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Old Item Type
                  </label>
                  <select
                    value={oldItemType}
                    onChange={(e) => setOldItemType(e.target.value as 'old_gold' | 'old_silver' | '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="">Select Type</option>
                    <option value="old_gold">Old Gold</option>
                    <option value="old_silver">Old Silver</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calculated Value (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={oldItemValue || ''}
                    onChange={(e) => setOldItemValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="0.00"
                    disabled={!oldItemType}
                  />
                </div>
              </div>
              
              {oldItemType && oldItemValue > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">
                      {oldItemType === 'old_gold' ? 'Old Gold' : 'Old Silver'} Return:
                    </span>
                    <span className="text-sm font-bold text-green-900">
                      -₹{oldItemValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Invoice Summary
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2).replace(/\.00$/, '')}</span>
            </div>
            
            {invoiceType === 'gst' && (
              <div className="flex justify-between">
                <span>GST (3%):</span>
                <span>₹{gstAmount.toFixed(2).replace(/\.00$/, '')}</span>
              </div>
            )}
            
            {oldItemDeduction > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{oldItemType === 'old_gold' ? 'Old Gold' : 'Old Silver'} Return:</span>
                <span>-₹{oldItemDeduction.toLocaleString()}</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>₹{total.toFixed(2).replace(/\.00$/, '')}</span>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        {selectedCustomerData && (
          <div className="card p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment Details
            </h2>
            
            {/* Current Status */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium text-gray-900 mb-2">Current Status</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Current Outstanding:</span>
                  <div className={`font-medium ${
                    calculatePaymentSummary().currentOutstanding > 0 ? 'text-red-600' : 
                    calculatePaymentSummary().currentOutstanding < 0 ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    ₹{Math.abs(calculatePaymentSummary().currentOutstanding).toFixed(2).replace(/\.00$/, '')}
                    {calculatePaymentSummary().currentOutstanding < 0 ? ' (Credit)' : ''}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Invoice Total:</span>
                  <div className="font-medium text-gray-900">
                    ₹{calculatePaymentSummary().invoiceTotal.toFixed(2).replace(/\.00$/, '')}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'upi' | 'cheque')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Paying Now (₹)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountPaying || ''}
                    onChange={(e) => setAmountPaying(roundCurrency(parseFloat(e.target.value) || 0))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    onClick={() => setAmountPaying(calculatePaymentSummary().totalAmountDue)}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    title="Pay Full Amount"
                  >
                    Full
                  </button>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-3">Payment Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Outstanding:</span>
                  <span className={calculatePaymentSummary().currentOutstanding > 0 ? "text-red-600" : "text-green-600"}>
                    ₹{Math.abs(calculatePaymentSummary().currentOutstanding).toFixed(2).replace(/\.00$/, '')}
                    {calculatePaymentSummary().currentOutstanding < 0 ? ' (Credit)' : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Total:</span>
                  <span>₹{calculatePaymentSummary().invoiceTotal.toFixed(2).replace(/\.00$/, '')}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-600">Total Amount Due:</span>
                  <span>₹{calculatePaymentSummary().totalAmountDue.toFixed(2).replace(/\.00$/, '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paying Now ({paymentMethod.toUpperCase()}):</span>
                  <span className="font-medium text-green-600">₹{calculatePaymentSummary().amountPaying.toFixed(2).replace(/\.00$/, '')}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">New Outstanding:</span>
                  <span className={calculatePaymentSummary().newOutstanding > 0 ? "font-semibold text-red-600" : "font-semibold text-green-600"}>
                    ₹{Math.abs(calculatePaymentSummary().newOutstanding).toFixed(2).replace(/\.00$/, '')}
                    {calculatePaymentSummary().newOutstanding < 0 ? ' (Credit)' : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className={`font-semibold ${
                    calculatePaymentSummary().paymentStatus === 'paid' ? 'text-green-600' : 
                    calculatePaymentSummary().paymentStatus === 'credit' ? 'text-blue-600' : 'text-amber-600'
                  }`}>
                    {calculatePaymentSummary().paymentStatus === 'paid' ? 'Paid' : 
                     calculatePaymentSummary().paymentStatus === 'credit' ? 'Credit' : 'Partial'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end space-x-3">
          {/* Reminder Button - Only show if customer is selected and there's an outstanding amount */}
          {selectedCustomerData && calculatePaymentSummary().newOutstanding > 0 && (
            <button
              type="button"
              onClick={() => setShowReminderModal(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
              title="Create payment reminder for outstanding amount"
            >
              <Bell className="h-4 w-4" />
              <span>Reminder</span>
            </button>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (editMode ? 'Updating Invoice...' : 'Creating Invoice...') : (editMode ? 'Update Invoice' : 'Create Invoice')}
          </button>
        </div>
      </form>

      {/* Fixed Position Customer Dropdown Portal */}
      {isCustomerDropdownOpen && !selectedCustomerData && customerDropdownPosition && (
        <div
          data-dropdown="customer"
          className="fixed bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm border border-gray-200"
          style={{
            top: `${customerDropdownPosition.top}px`,
            left: `${customerDropdownPosition.left}px`,
            width: '400px',
            zIndex: 9999
          }}
        >
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer, index) => (
              <div
                key={customer.id}
                className={`cursor-pointer ${
                  highlightedIndex === index ? 'bg-blue-50' : 'hover:bg-gray-100'
                } py-2 px-3`}
                onClick={() => {
                  setSelectedCustomer(String(customer.id));
                  setCustomerSearchTerm(customer.name);
                  setIsCustomerDropdownOpen(false);
                  setCustomerDropdownPosition(null);
                }}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{customer.name}</span>
                  {customer.mobile && <span className="text-gray-500">{customer.mobile}</span>}
                </div>
                {customer.address_line1 && (
                  <div className="text-xs text-gray-500 truncate">
                    {customer.address_line1}
                    {customer.city && `, ${customer.city}`}
                  </div>
                )}
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-400">Balance:</span>
                  <span className={`text-xs font-medium ${
                    customer.ledger_balance > 0 ? 'text-red-600' : 
                    customer.ledger_balance < 0 ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    ₹{Math.abs(customer.ledger_balance).toLocaleString()}
                    {customer.ledger_balance > 0 ? ' (Owes)' : 
                     customer.ledger_balance < 0 ? ' (Credit)' : ''}
                  </span>
                </div>
              </div>
            ))
          ) : customerSearchTerm ? (
            <div className="py-4 px-3 text-center">
              <p className="text-gray-500">No customers found</p>
            </div>
          ) : null}
          
          <div className="border-t mt-1 pt-1">
            <div
              className="cursor-pointer hover:bg-blue-50 py-2 px-3 flex items-center text-blue-600"
              onClick={handleCreateNewCustomer}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <span>Create New Customer</span>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Position Item Dropdown Portals */}
      {itemDropdownStates.map((isOpen, index) => (
        isOpen && !invoiceItems[index]?.item_name && itemDropdownPositions[index] && (
          <div
            key={index}
            data-dropdown={`item-${index}`}
            className="fixed bg-white shadow-lg max-h-48 rounded-md py-1 text-base overflow-auto focus:outline-none text-xs border border-gray-200"
            style={{
              top: `${itemDropdownPositions[index]!.top}px`,
              left: `${itemDropdownPositions[index]!.left}px`,
              width: '300px',
              zIndex: 9999
            }}
          >
            {getFilteredItems(itemSearchTerms[index] || '').length > 0 ? (
              getFilteredItems(itemSearchTerms[index] || '').map((availableItem, itemIdx) => (
                <div
                  key={availableItem.id}
                  className={`cursor-pointer ${
                    itemHighlightedIndexes[index] === itemIdx ? 'bg-blue-50' : 'hover:bg-gray-100'
                  } py-2 px-3`}
                  onClick={() => {
                    selectItem(index, String(availableItem.id));
                    const newTerms = [...itemSearchTerms];
                    newTerms[index] = availableItem.name;
                    setItemSearchTerms(newTerms);
                    
                    const newStates = [...itemDropdownStates];
                    newStates[index] = false;
                    setItemDropdownStates(newStates);
                    
                    const newPositions = [...itemDropdownPositions];
                    newPositions[index] = null;
                    setItemDropdownPositions(newPositions);
                  }}
                >
                  <div className="font-medium">{availableItem.name}</div>
                  {availableItem.group_name && (
                    <div className="text-xs text-gray-500">{availableItem.group_name}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-4 px-3 text-center text-gray-500">
                No items found
              </div>
            )}
          </div>
        )
      ))}
      
      {/* Invoice Detail Modal */}
      {showInvoiceModal && createdInvoiceId && (
        <InvoiceDetailModal 
          invoiceId={createdInvoiceId} 
          onClose={() => {
            setShowInvoiceModal(false);
            setCreatedInvoiceId(null);
          }} 
        />
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <ReminderModal
          isOpen={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          preSelectedCustomer={selectedCustomerData}
          preSelectedAmount={calculatePaymentSummary().newOutstanding}
        />
      )}
    </div>
  );
};

export default Billing; 