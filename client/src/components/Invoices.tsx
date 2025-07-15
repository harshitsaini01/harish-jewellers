import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Invoice } from '../types';
import { Receipt, Search, Eye, Calendar, Filter, Trash2, Download, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import InvoiceDetailModal from './InvoiceDetailModal';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [showGstInvoices, setShowGstInvoices] = useState(() => {
    const saved = localStorage.getItem('invoices_showGstInvoices');
    return saved ? JSON.parse(saved) : false;
  });
  const [showRepaymentInvoices, setShowRepaymentInvoices] = useState(() => {
    const saved = localStorage.getItem('invoices_showRepaymentInvoices');
    return saved ? JSON.parse(saved) : true;
  });
  const [startDate, setStartDate] = useState(() => {
    return localStorage.getItem('invoices_startDate') || '';
  });
  const [endDate, setEndDate] = useState(() => {
    return localStorage.getItem('invoices_endDate') || '';
  });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Persist filter states to localStorage
  useEffect(() => {
    localStorage.setItem('invoices_showGstInvoices', JSON.stringify(showGstInvoices));
  }, [showGstInvoices]);

  useEffect(() => {
    localStorage.setItem('invoices_showRepaymentInvoices', JSON.stringify(showRepaymentInvoices));
  }, [showRepaymentInvoices]);

  useEffect(() => {
    localStorage.setItem('invoices_startDate', startDate);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('invoices_endDate', endDate);
  }, [endDate]);

  const resetAllFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setShowGstInvoices(false);
    setShowRepaymentInvoices(true);
    // Also clear from localStorage
    localStorage.removeItem('invoices_startDate');
    localStorage.removeItem('invoices_endDate');
    localStorage.setItem('invoices_showGstInvoices', 'false');
    localStorage.setItem('invoices_showRepaymentInvoices', 'true');
  };

  const fetchInvoices = async () => {
    try {
      const data = await api.getInvoices();
      setInvoices(data as Invoice[]);
    } catch (error) {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}? This will also update the customer's ledger balance and cannot be undone.`)) {
      try {
        await api.deleteInvoice(invoice.id);
        toast.success('Invoice deleted successfully');
        fetchInvoices(); // Refresh the list
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete invoice');
      }
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    // Navigate to billing page with edit mode
    // We'll pass the invoice ID as a URL parameter to indicate edit mode
    const editUrl = `/billing?editInvoiceId=${invoice.id}`;
    window.location.href = editUrl;
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date range filter
    let matchesDateRange = true;
    if (startDate || endDate) {
      const invoiceDate = new Date(invoice.invoice_date || invoice.created_at);
      if (startDate) {
        const start = new Date(startDate);
        matchesDateRange = matchesDateRange && invoiceDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        matchesDateRange = matchesDateRange && invoiceDate <= end;
      }
    }
    
    // Filter by type
    let matchesTypeFilter = false;
    
    if (invoice.type === 'repayment') {
      // Repayment invoices are shown only if repayment checkbox is enabled
      matchesTypeFilter = showRepaymentInvoices;
    } else if (invoice.type === 'gst') {
      // GST invoices are shown only if GST checkbox is enabled
      matchesTypeFilter = showGstInvoices;
    } else {
      // Non-GST invoices (including 'non_gst' and other types) are shown when GST is disabled
      matchesTypeFilter = !showGstInvoices;
    }
    
    return matchesSearch && matchesDateRange && matchesTypeFilter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';
    
    const convertHundreds = (n: number): string => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
      const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      
      let result = '';
      
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + ' ';
        n = 0;
      }
      
      if (n > 0) {
        result += ones[n] + ' ';
      }
      
      return result;
    };
    
    // Handle Indian numbering system
    if (num >= 10000000) { // 1 crore
      return convertHundreds(Math.floor(num / 10000000)) + 'Crore ' + numberToWords(num % 10000000);
    } else if (num >= 100000) { // 1 lakh
      return convertHundreds(Math.floor(num / 100000)) + 'Lakh ' + numberToWords(num % 100000);
    } else if (num >= 1000) { // 1 thousand
      return convertHundreds(Math.floor(num / 1000)) + 'Thousand ' + numberToWords(num % 1000);
    } else {
      return convertHundreds(num);
    }
  };

  const generateInvoicePDF = async (invoice: any): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        console.log('Generating PDF for invoice:', invoice.invoice_number);
        
        // Create the exact same HTML that customers see when printing
        const invoiceHTML = `
        <div style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; color: black; width: 800px;">
          <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 15px;">
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">
              ${invoice.type === 'repayment' ? 'PAYMENT RECEIPT' : 
                invoice.type === 'gst' ? 'TAX INVOICE' : 'ROUGH ESTIMATE'}
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <div style="width: 80px; height: 80px; border: 2px solid black; display: flex; flex-direction: column; align-items: center; justify-content: center; background: white; position: relative;">
                <div style="width: 50px; height: 50px; border: 2px solid black; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 2px; background: white; position: relative;">
                  <div style="font-size: 7px; font-weight: bold; line-height: 0.9; font-family: Arial, sans-serif;">BIS</div>
                  <div style="font-size: 5px; font-weight: bold; line-height: 0.9; font-family: Arial, sans-serif;">HALLMARK</div>
                  <div style="position: absolute; top: -1px; left: -1px; width: 52px; height: 52px; border-radius: 50%; border: 1px solid black;"></div>
                </div>
                <div style="font-size: 4px; font-weight: bold; text-align: center; line-height: 0.8; font-family: Arial, sans-serif;">
                  <div>INDIA</div>
                  <div>GUARANTEED</div>
                  <div>PURITY</div>
                </div>
              </div>
              <div style="font-size: 24px; font-weight: bold; flex: 1; text-align: center;">HARISH JEWELLERS</div>
              <div style="width: 80px; height: 80px; border: 2px solid black; display: flex; flex-direction: column; align-items: center; justify-content: center; background: white; position: relative;">
                <div style="width: 50px; height: 50px; border: 2px solid black; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 2px; background: white; position: relative;">
                  <div style="font-size: 7px; font-weight: bold; line-height: 0.9; font-family: Arial, sans-serif;">BIS</div>
                  <div style="font-size: 5px; font-weight: bold; line-height: 0.9; font-family: Arial, sans-serif;">HALLMARK</div>
                  <div style="position: absolute; top: -1px; left: -1px; width: 52px; height: 52px; border-radius: 50%; border: 1px solid black;"></div>
                </div>
                <div style="font-size: 4px; font-weight: bold; text-align: center; line-height: 0.8; font-family: Arial, sans-serif;">
                  <div>INDIA</div>
                  <div>GUARANTEED</div>
                  <div>PURITY</div>
                </div>
              </div>
            </div>
            <div style="font-size: 12px; margin-bottom: 10px;">Reg. Address:- Rao Market, Sabzi Mandi, Chhutmalpur, Saharanpur- 247662</div>
            <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px;">
              <div>
                 <div>Mob No:-9837408824 Uday Shankar Rastogi (Babbu)</div>
                <div>9012000183 Tushar Rastogi</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 10px; margin-bottom: 5px;">
                ${invoice.type === 'gst' ? 'GST No. 09ATFPR7625C1ZJ' : ''}
                </div>
                <div style="text-align: center;">
                ${invoice.type === 'gst' ? 'Code:- 09' : ''}
                </div>
              </div>
              <div style="text-align: right;">
                <div>Bill No. ${invoice.invoice_number}</div>
                <div>Date: ${invoice.invoice_date ? formatDate(invoice.invoice_date) : formatDate(invoice.created_at)}</div>
              </div>
            </div>
          </div>
          
          <div style="margin-bottom: 20px; border: 1px solid black; padding: 10px;">
            <h3 style="font-size: 14px; margin: 0 0 10px 0;">Customer Name & Address:</h3>
            <div style="font-size: 12px; line-height: 1.4;">
              <div style="font-weight: bold;">${invoice.customer_name}</div>
              ${invoice.mobile ? `<div>${invoice.mobile}</div>` : ''}
              ${invoice.address_line1 ? `<div>${invoice.address_line1}${invoice.address_line2 ? `, ${invoice.address_line2}` : ''}${invoice.city ? `, ${invoice.city}` : ''}${invoice.state ? `, ${invoice.state}` : ''}${invoice.pincode ? ` - ${invoice.pincode}` : ''}</div>` : ''}
              <div>State:- ${invoice.state || 'Uttar Pradesh'}</div>
            </div>
          </div>
          
          ${invoice.type !== 'repayment' ? `
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
            <thead>
              <tr>
                <th style="border: 1px solid black; padding: 8px 4px; background-color: #f5f5f5; font-weight: bold; text-align: center;">S.No.</th>
                <th style="border: 1px solid black; padding: 8px 4px; background-color: #f5f5f5; font-weight: bold; text-align: center;">Description of Goods</th>
                ${invoice.type === 'gst' ? '<th style="border: 1px solid black; padding: 8px 4px; background-color: #f5f5f5; font-weight: bold; text-align: center;">HSN/ACS Code</th>' : ''}
                <th style="border: 1px solid black; padding: 8px 4px; background-color: #f5f5f5; font-weight: bold; text-align: center;">Purity</th>
                <th style="border: 1px solid black; padding: 8px 4px; background-color: #f5f5f5; font-weight: bold; text-align: center;">N.Wt.</th>
                <th style="border: 1px solid black; padding: 8px 4px; background-color: #f5f5f5; font-weight: bold; text-align: center;">Pcs</th>
                ${invoice.items && invoice.items.some((item: import('../types').InvoiceItem) => item.add_weight && item.add_weight > 0) ? '<th style="border: 1px solid black; padding: 8px 4px; background-color: #f5f5f5; font-weight: bold; text-align: center;">Polish (gm)</th>' : ''}
                ${invoice.items && invoice.items.some((item: import('../types').InvoiceItem) => item.making_charges && item.making_charges > 0) ? '<th style="border: 1px solid black; padding: 8px 4px; background-color: #f5f5f5; font-weight: bold; text-align: center;">Mk Ch.(%)</th>' : ''}
                <th style="border: 1px solid black; padding: 8px 4px; background-color: #f5f5f5; font-weight: bold; text-align: center;">Rate</th>
                <th style="border: 1px solid black; padding: 8px 4px; background-color: #f5f5f5; font-weight: bold; text-align: center;">Labour</th>
                <th style="border: 1px solid black; padding: 8px 4px; background-color: #f5f5f5; font-weight: bold; text-align: center;">Discount</th>
                <th style="border: 1px solid black; padding: 8px 4px; background-color: #f5f5f5; font-weight: bold; text-align: center;">Amount (Rupees)</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map((item: import('../types').InvoiceItem, index: number) => `
                <tr>
                  <td style="border: 1px solid black; padding: 8px 4px; text-align: center;">${index + 1}</td>
                  <td style="border: 1px solid black; padding: 8px 4px;">${item.item_name}</td>
                  ${invoice.type === 'gst' ? `<td style="border: 1px solid black; padding: 8px 4px; text-align: center;">${item.hsn || ''}</td>` : ''}
                  <td style="border: 1px solid black; padding: 8px 4px; text-align: center;">${item.stamp}</td>
                  <td style="border: 1px solid black; padding: 8px 4px; text-align: right;">${item.gross_weight.toFixed(3)}</td>
                  <td style="border: 1px solid black; padding: 8px 4px; text-align: center;">${item.pc}</td>
                  ${invoice.items && invoice.items.some((itm: import('../types').InvoiceItem) => itm.add_weight && itm.add_weight > 0) ? 
                    `<td style="border: 1px solid black; padding: 8px 4px; text-align: right;">${item.add_weight && item.add_weight > 0 ? item.add_weight.toFixed(3) : '-'}</td>` : ''}
                  ${invoice.items && invoice.items.some((itm: import('../types').InvoiceItem) => itm.making_charges && itm.making_charges > 0) ? 
                    `<td style="border: 1px solid black; padding: 8px 4px; text-align: right;">${item.making_charges && item.making_charges > 0 ? item.making_charges.toFixed(2) + '%' : '-'}</td>` : ''}
                  <td style="border: 1px solid black; padding: 8px 4px; text-align: right;">${item.rate.toFixed(2)}</td>
                  <td style="border: 1px solid black; padding: 8px 4px; text-align: right;">${formatCurrency(item.labour)}</td>
                  <td style="border: 1px solid black; padding: 8px 4px; text-align: right;">${formatCurrency(item.discount)}</td>
                  <td style="border: 1px solid black; padding: 8px 4px; text-align: right;">${formatCurrency(item.total)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>
          
          ${invoice.type === 'non_gst' && invoice.old_item_type && invoice.old_item_value && invoice.old_item_value > 0 ? `
            <div style="margin: 15px 0; padding: 10px; border: 1px solid black; background: #f9f9f9;">
              <h4 style="margin-top: 0; font-size: 12px; font-weight: bold;">OLD ITEM RETURN (EXCHANGE)</h4>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 5px;">
                <div>
                  <span style="font-weight: bold;">Item Type:</span>
                  <span style="margin-left: 5px;">${invoice.old_item_type === 'old_gold' ? 'Old Gold' : 'Old Silver'}</span>
                </div>
                <div>
                  <span style="font-weight: bold;">Return Value:</span>
                  <span style="margin-left: 5px;">${formatCurrency(invoice.old_item_value)}</span>
                </div>
                <div>
                  <span style="font-weight: bold;">Adjusted:</span>
                  <span style="margin-left: 5px;">-${formatCurrency(invoice.old_item_value)}</span>
                </div>
              </div>
              <div style="font-size: 10px; font-style: italic;">
                Note: Customer returned ${invoice.old_item_type === 'old_gold' ? 'old gold' : 'old silver'} items worth ${formatCurrency(invoice.old_item_value)} adjusted in final bill.
              </div>
            </div>
          ` : ''}

          <div style="margin-top: 20px; float: right; width: 300px; border: 1px solid black; padding: 10px; background: #f9f9f9;">
            <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #ccc;">
              <span>Amount</span>
              <span>${formatCurrency(invoice.subtotal)}</span>
            </div>
            ${(invoice.discount_amount && invoice.discount_amount > 0) ? `
              <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #ccc; color: red;">
                <span>Discount</span>
                <span>- ${formatCurrency(invoice.discount_amount)}</span>
              </div>
            ` : ''}
            ${(invoice.type === 'non_gst' && invoice.old_item_type && invoice.old_item_value && invoice.old_item_value > 0) ? `
              <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #ccc; color: green;">
                <span>${invoice.old_item_type === 'old_gold' ? 'Old Gold' : 'Old Silver'} Return</span>
                <span>- ${formatCurrency(invoice.old_item_value)}</span>
              </div>
            ` : ''}
            ${(invoice.type === 'gst' && invoice.gst_amount && invoice.gst_amount > 0) ? `
              <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #ccc;">
                <span>SGST@1.5%</span>
                <span>${formatCurrency(invoice.gst_amount / 2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #ccc;">
                <span>CGST@1.5%</span>
                <span>${formatCurrency(invoice.gst_amount / 2)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 5px 0; font-weight: bold; font-size: 16px; border-top: 2px solid black; margin-top: 10px; padding-top: 10px;">
              <span>Total Amount</span>
              <span>${formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
          
          ${invoice.type === 'gst' ? `
            <div style="float: left; width: 300px; margin-top: 20px;">
              <div style="font-size: 12px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Rupees in Words:</div>
                <div style="border-bottom: 1px dotted black; padding: 5px 0; margin-bottom: 10px; min-height: 20px; font-weight: bold;">
                  ${numberToWords(Math.floor(invoice.total_amount))}
                </div>
                <div style="font-weight: bold; margin-bottom: 5px;">Bank Name:- Indian Bank Chhutmalpur</div>
                <div>A/c No:- 50410284664</div>
                <div>IFSC:- IDIB000C623</div>
              </div>
            </div>
          ` : ''}
          
          <div style="clear: both;"></div>
          ` : ''}
          
          ${invoice.type === 'gst' ? `
            <div style="display: flex; justify-content: space-between; margin-top: 40px;">
              <div style="width: 60%; font-size: 12px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Terms & Conditions:</div>
                <div style="line-height: 1.4;">
                  <div>1- Disputes of all nature will be settled in saharanpur court.</div>
                  <div>2- No claim kindly check the material before use.</div>
                  <div>3- No claim for breaking even the slightly piece of ornament.</div>
                </div>
              </div>
              <div style="text-align: right; width: 35%;">
                <div style="font-size: 14px; font-weight: bold;">For Harish Jewellers</div>
                <div style="margin-top: 30px;">
                  <div style="border-bottom: 1px solid black; width: 150px; margin-left: auto;"></div>
                  <div style="font-size: 12px; margin-top: 5px;">Prop.</div>
                </div>
              </div>
            </div>
          ` : invoice.type === 'non_gst' ? `
            <div style="margin-top: 40px; text-align: right;">
              <div style="font-size: 14px; font-weight: bold;">For Harish Jewellers</div>
              <div style="margin-top: 30px;">
                <div style="border-bottom: 1px solid black; width: 150px; margin-left: auto;"></div>
                <div style="font-size: 12px; margin-top: 5px;">Prop.</div>
              </div>
            </div>
          ` : ''}
          
          ${invoice.type === 'non_gst' || invoice.type === 'repayment' ? `
            <div style="background: #f9f9f9; padding: 15px; border: 1px solid black; margin-top: 30px; clear: both;">
              <h4 style="margin-top: 0; font-size: 14px;">Payment Status</h4>
              <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid black;">
                <span>Payment Method:</span>
                <span style="font-weight: bold; text-transform: capitalize;">${invoice.payment_method || 'Cash'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid black;">
                <span>Total Amount:</span>
                <span style="font-weight: bold;">${formatCurrency(invoice.total_amount)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid black;">
                <span>Amount Paid:</span>
                <span style="font-weight: bold;">${formatCurrency(invoice.paid_amount || 0)}</span>
              </div>
              ${(invoice.balance_amount && invoice.balance_amount > 0) ? `
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid black;">
                  <span>Current Outstanding:</span>
                  <span style="font-weight: bold; color: #dc3545;">${formatCurrency(invoice.balance_amount)}</span>
                </div>
              ` : ''}
              ${(invoice.previous_balance && invoice.previous_balance !== 0) ? `
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid black;">
                  <span>Previous Outstanding Balance:</span>
                  <span style="font-weight: bold; color: ${(invoice.previous_balance || 0) > 0 ? '#dc3545' : '#28a745'};">
                    ${formatCurrency(Math.abs(invoice.previous_balance || 0))} ${(invoice.previous_balance || 0) > 0 ? '(Owed)' : '(Credit)'}
                  </span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 5px 0; border-top: 2px solid black; font-weight: bold; margin-top: 10px; padding-top: 10px;">
                <span>Customer Ledger Balance:</span>
                <span style="color: ${(invoice.current_outstanding || invoice.balance_amount || 0) > 0 ? '#dc3545' : (invoice.current_outstanding || invoice.balance_amount || 0) < 0 ? '#28a745' : '#6c757d'};">
                  ${formatCurrency(Math.abs(invoice.current_outstanding || invoice.balance_amount || 0))} 
                  ${(invoice.current_outstanding || invoice.balance_amount || 0) > 0 ? '(Owes)' : 
                    (invoice.current_outstanding || invoice.balance_amount || 0) < 0 ? '(Credit)' : '(Settled)'}
                </span>
              </div>
            </div>
          ` : ''}
        </div>
      `;

        console.log('HTML generated, creating temp div...');

        // Create a temporary div to hold the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = invoiceHTML;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.style.width = '800px';
        document.body.appendChild(tempDiv);

        console.log('Temp div created, converting to canvas...');

        // Convert HTML to canvas
        html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 800,
          height: tempDiv.scrollHeight
        }).then((canvas) => {
          console.log('Canvas created, generating PDF...');
          
          // Create PDF
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          
          const imgWidth = 210; // A4 width in mm
          const pageHeight = 295; // A4 height in mm
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;

          // Add first page
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          // Add additional pages if needed
          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }

          // Clean up
          document.body.removeChild(tempDiv);

          // Convert to blob
          const pdfBlob = pdf.output('blob');
          console.log('PDF generated successfully:', pdfBlob);
          resolve(pdfBlob);
        }).catch((error) => {
          console.error('html2canvas error:', error);
          // Clean up
          document.body.removeChild(tempDiv);
          reject(new Error(`Failed to convert HTML to canvas: ${error.message}`));
        });
      } catch (error) {
        console.error('PDF generation error:', error);
        if (error instanceof Error) {
          reject(new Error(`PDF generation failed: ${error.message}`));
        } else {
          reject(new Error('PDF generation failed: Unknown error'));
        }
      }
    });
  };

  const exportInvoicePDFs = async () => {
    if (isExporting) return;
    
    // Check if required libraries are available
    if (typeof html2canvas === 'undefined') {
      toast.error('html2canvas library not loaded. Please refresh the page.');
      return;
    }
    
    if (typeof jsPDF === 'undefined') {
      toast.error('jsPDF library not loaded. Please refresh the page.');
      return;
    }
    
    if (typeof JSZip === 'undefined') {
      toast.error('JSZip library not loaded. Please refresh the page.');
      return;
    }
    
    setIsExporting(true);
    
    try {
      console.log('Starting PDF export...', { filteredInvoicesCount: filteredInvoices.length });
      
      if (filteredInvoices.length === 0) {
        toast.error('No invoices to export. Please check your filters.');
        return;
      }
      
      const zip = new JSZip();
      const folder = zip.folder("invoices");
      
      // Show progress
      toast.loading(`Generating ${filteredInvoices.length} PDF invoices...`, { id: 'export-progress' });
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process invoices one by one to avoid memory issues
      for (let i = 0; i < filteredInvoices.length; i++) {
        const invoice = filteredInvoices[i];
        
        try {
          // Update progress
          toast.loading(`Processing invoice ${i + 1}/${filteredInvoices.length}: ${invoice.invoice_number}`, { id: 'export-progress' });
          
          console.log(`Processing invoice ${i + 1}/${filteredInvoices.length}:`, invoice.invoice_number);
          
          // Fetch detailed invoice data
          const detailedInvoice = await api.getInvoice(invoice.id);
          console.log('Fetched detailed invoice:', detailedInvoice);
          
          // Generate PDF
          const pdfBlob = await generateInvoicePDF(detailedInvoice);
          console.log('Generated PDF blob:', pdfBlob);
          
          // Create clean filename
          const filename = `${invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, '_')}_${invoice.customer_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Unknown'}.pdf`;
          
          // Add PDF to zip
          folder?.file(filename, pdfBlob);
          successCount++;
          
        } catch (error) {
          console.error(`Error processing invoice ${invoice.invoice_number}:`, error);
          if (error instanceof Error) {
            toast.error(`Failed to process invoice ${invoice.invoice_number}: ${error.message || 'Unknown error'}`, { duration: 3000 });
          } else {
            toast.error(`Failed to process invoice ${invoice.invoice_number}: Unknown error`, { duration: 3000 });
          }
          errorCount++;
        }
      }
      
      if (successCount === 0) {
        toast.error('Failed to generate any PDFs. Please check console for errors.', { id: 'export-progress' });
        return;
      }
      
      // Update progress
      toast.loading('Creating ZIP file...', { id: 'export-progress' });
      
      // Add README file
      const readmeContent = `
HARISH JEWELLERS - INVOICE PDF EXPORT
====================================

This ZIP file contains ${successCount} invoice files in PDF format.
These are EXACT PDF COPIES of the invoices that customers received during billing.

✅ PERFECT FOR CA/ACCOUNTANT:
- Exact same PDFs customers received
- Proper formatting and layout
- All financial details included
- Ready for accounting/audit purposes

✅ FEATURES INCLUDED:
- BIS Hallmark logos
- Proper currency symbols (₹)
- Complete customer details
- Item tables with weights, rates, amounts
- GST calculations (SGST/CGST for GST invoices)
- Payment status and outstanding balances
- Terms & conditions (for GST invoices)
- Bank details (for GST invoices)

INVOICE TYPES:
- GST Invoices: Full tax invoices with GST calculations
- Non-GST Invoices: Regular estimates with payment tracking
- Repayment Receipts: Payment confirmation receipts

DATE RANGE: ${startDate || 'Beginning'} to ${endDate || 'Now'}
EXPORT DATE: ${new Date().toLocaleString('en-IN')}
TOTAL INVOICES: ${successCount}
${errorCount > 0 ? `FAILED INVOICES: ${errorCount}` : ''}

For support, contact: 9837408824
      `.trim();
      
      folder?.file("README.txt", readmeContent);
      
      console.log('Generating ZIP file...');
      
      // Generate ZIP file
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      });
      
      console.log('ZIP file generated:', content);
      
      // Create download link
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      
      const dateRangeText = startDate || endDate 
        ? `_${startDate?.replace(/-/g, '') || 'start'}_to_${endDate?.replace(/-/g, '') || 'end'}`
        : '_all_time';
      
      const filename = `Harish_Jewellers_Invoice_PDFs${dateRangeText}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.zip`;
      link.download = filename;
      
      console.log('Triggering download:', filename);
      
      // Make the link more visible for debugging
      link.style.display = 'none';
      link.setAttribute('target', '_blank');
      
      document.body.appendChild(link);
      
      // Try multiple approaches to trigger download
      try {
        link.click();
      } catch (e) {
        console.warn('Click method failed, trying dispatchEvent:', e);
        try {
          const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          link.dispatchEvent(event);
        } catch (e2) {
          console.error('Both click methods failed:', e2);
          // Fallback: open in new tab
          window.open(url, '_blank');
        }
      }
      
      // Clean up after a delay
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 1000);
      
      toast.success(`Successfully exported ${successCount} invoice PDFs!${errorCount > 0 ? ` (${errorCount} failed)` : ''} Perfect for your CA.`, { id: 'export-progress' });
      
    } catch (error) {
      console.error('Export error:', error);
      if (error instanceof Error) {
        toast.error(`Failed to export invoice PDFs: ${error.message || 'Unknown error'}`, { id: 'export-progress' });
      } else {
        toast.error('Failed to export invoice PDFs: Unknown error', { id: 'export-progress' });
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Receipt className="h-8 w-8 text-gold-600" />
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          {(startDate || endDate || searchTerm || showGstInvoices || !showRepaymentInvoices) && (
            <button
              onClick={resetAllFilters}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset Filters</span>
            </button>
          )}
          
          <button
            onClick={exportInvoicePDFs}
            disabled={isExporting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? 'Generating PDFs...' : 'Export as PDFs'}</span>
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="card p-4">
        <div className="flex flex-col gap-4">
          {/* Date Range Filter */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center flex-1">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Date Range:</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">From:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">To:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            </div>
            
            {/* Total Amount Section - Moved to Right */}
            {filteredInvoices.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 min-w-fit">
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Amount: {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0))}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Search and Type Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search invoices by number or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={showGstInvoices}
                    onChange={(e) => setShowGstInvoices(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Include GST Invoices</span>
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={showRepaymentInvoices}
                    onChange={(e) => setShowRepaymentInvoices(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Show Repayment Invoices</span>
                </label>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                Showing: {(() => {
                  const types = [];
                  if (!showGstInvoices) types.push('Non-GST');
                  if (showGstInvoices) types.push('GST');
                  if (showRepaymentInvoices) types.push('Repayments');
                  return types.length > 0 ? types.join(' + ') : 'None';
                })()}
              </div>
            </div>
          </div>
          
          {/* Filter Summary */}
          {(startDate || endDate || searchTerm) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-800">
                  <span className="font-medium">Active Filters:</span>
                  {(startDate || endDate) && (
                    <span className="ml-2">
                      📅 {startDate ? formatDate(startDate) : 'Beginning'} to {endDate ? formatDate(endDate) : 'Now'}
                    </span>
                  )}
                  {searchTerm && (
                    <span className="ml-2">🔍 "{searchTerm}"</span>
                  )}
                </div>
                <div className="text-sm font-medium text-blue-900">
                  {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoices List */}
      <div className="card">
        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {invoice.customer_name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {invoice.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                      </div>
                      {invoice.balance_amount > 0 && (
                        <div className="text-xs text-red-600">
                          Pending: {formatCurrency(invoice.balance_amount)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        {invoice.invoice_date ? formatDate(invoice.invoice_date) : formatDate(invoice.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <button 
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                          onClick={() => setSelectedInvoiceId(invoice.id)}
                          title="View Invoice"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </button>
                        
                        {invoice.type !== 'repayment' && (
                          <button 
                            className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                            onClick={() => handleEditInvoice(invoice)}
                            title="Edit Invoice"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                        )}
                        
                        <button 
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          onClick={() => handleDeleteInvoice(invoice)}
                          title="Delete Invoice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search criteria' : 'No invoices have been created yet'}
            </p>
          </div>
        )}
      </div>

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

export default Invoices; 