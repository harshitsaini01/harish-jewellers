import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { Invoice } from '../types';
import { X, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

interface InvoiceDetailModalProps {
  invoiceId: number;
  onClose: () => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ invoiceId, onClose }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoiceDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getInvoice(invoiceId);
      console.log('Invoice data:', data);
      setInvoice(data);
    } catch (error) {
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [fetchInvoiceDetails]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Function to convert number to words
  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertHundreds = (n: number): string => {
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
        return result.trim();
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result.trim();
    };
    
    if (num < 0) return 'Negative ' + numberToWords(-num);
    
    let result = '';
    let crores = Math.floor(num / 10000000);
    num %= 10000000;
    let lakhs = Math.floor(num / 100000);
    num %= 100000;
    let thousands = Math.floor(num / 1000);
    num %= 1000;
    let hundreds = num;
    
    if (crores > 0) {
      result += convertHundreds(crores) + ' Crore ';
    }
    if (lakhs > 0) {
      result += convertHundreds(lakhs) + ' Lakh ';
    }
    if (thousands > 0) {
      result += convertHundreds(thousands) + ' Thousand ';
    }
    if (hundreds > 0) {
      result += convertHundreds(hundreds) + ' ';
    }
    
    return result.trim() + ' Only';
  };

  const handlePrint = () => {
    if (!invoice) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; color: black; }
            .invoice-header { text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 15px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .company-details { font-size: 12px; margin-bottom: 10px; }
            .invoice-info { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 20px; }
            .customer-info { margin-bottom: 20px; }
            .customer-info h3 { font-size: 14px; margin-bottom: 5px; }
            .customer-details { font-size: 12px; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid black; padding: 8px 4px; font-size: 11px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .summary { margin-top: 20px; float: right; width: 300px; }
            .summary-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #ccc; }
            .summary-total { font-weight: bold; font-size: 16px; border-top: 2px solid black; margin-top: 10px; padding-top: 10px; }
            .payment-summary { background: #f9f9f9; padding: 15px; border: 1px solid black; margin-bottom: 20px; }
            .payment-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid black; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; }
            @media print { body { margin: 0; padding: 10px; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div style="font-size: 16px; font-weight: bold;">
                  ${invoice.type === 'repayment' ? 'PAYMENT RECEIPT' : 
                    invoice.type === 'gst' ? 'TAX INVOICE' : 'ROUGH ESTIMATE'}
                </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <div class="bis-hallmark">
                ${invoice.type !== 'gst' ? `<img src="https://www.presentations.gov.in/wp-content/uploads/2020/06/BIS-Hallmark_Preview.png" alt="BIS Hallmark" style="width: 80px; height: auto;">` : ''}
              </div>
              <div class="company-name" style="flex: 1; text-align: center; margin: 0;">HARISH JEWELLERS</div>
              <div class="bis-hallmark">
                ${invoice.type !== 'gst' ? `<img src="https://www.presentations.gov.in/wp-content/uploads/2020/06/BIS-Hallmark_Preview.png" alt="BIS Hallmark" style="width: 80px; height: auto;">` : ''}
              </div>
            </div>
            <div class="company-details">Reg. Address:- Rao Market, Sabzi Mandi, Chhutmalpur, Saharanpur- 247662</div>
            <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px;">
              <div>
                <div>Mob No:-9837408824 Uday Shankar Rastogi (Babbu)</div>
                <div>9012000183 Tushar Rastogi</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 10px; margin-bottom: 5px;">
                ${invoice.type === 'gst' ? 'GST No. 09ATFPR7625C1ZJ' : ''}
                <div style="text-align: center;">
                ${invoice.type === 'gst' ? 'Code:- 09' : ''}

                </div>
            </div>
              </div>
              <div style="text-align: right;">
                <div>Bill No. ${invoice.invoice_number}</div>
                <div>Date: ${invoice.invoice_date ? formatDate(invoice.invoice_date) : formatDate(invoice.created_at)}</div>
              </div>
            </div>
          </div>
          
          <div class="customer-info">
            <h3>Customer Name & Address:</h3>
            <div class="customer-details">
              <div style="font-weight: bold;">${invoice.customer_name}</div>
              ${invoice.mobile ? `<div>${invoice.mobile}</div>` : ''}
              ${invoice.address_line1 ? `<div>${invoice.address_line1}${invoice.address_line2 ? `, ${invoice.address_line2}` : ''}${invoice.city ? `, ${invoice.city}` : ''}${invoice.state ? `, ${invoice.state}` : ''}${invoice.pincode ? ` - ${invoice.pincode}` : ''}</div>` : ''}
              <div>State:- ${invoice.state || 'Uttar Pradesh'}</div>
            </div>
          </div>
          
          ${invoice.type !== 'repayment' ? `
          <table>
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Description of Goods</th>
                ${invoice.type === 'gst' ? '<th>HSN/ACS Code</th>' : ''}
                <th>Purity</th>
                <th>N.Wt.</th>
                <th>Pcs</th>
                ${invoice.items && invoice.items.some((item) => item.add_weight && item.add_weight > 0) ? '<th>Polish (gm)</th>' : ''}
                ${invoice.items && invoice.items.some((item) => item.making_charges && item.making_charges > 0) ? '<th>Mk Ch.(%)</th>' : ''}
                <th>Rate</th>
                <th>Labour</th>
                <th>Discount</th>
                <th>Amount (Rupees)</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map((item, index) => `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td>${item.item_name}</td>
                  ${invoice.type === 'gst' ? `<td class="text-center">${item.hsn || ''}</td>` : ''}
                  <td class="text-center">${item.stamp}</td>
                  <td class="text-right">${item.gross_weight.toFixed(3)}</td>
                  <td class="text-center">${item.pc}</td>
                  ${invoice.items && invoice.items.some((itm) => itm.add_weight && itm.add_weight > 0) ? 
                    `<td class="text-right">${item.add_weight && item.add_weight > 0 ? item.add_weight.toFixed(3) : '-'}</td>` : ''}
                  ${invoice.items && invoice.items.some((itm) => itm.making_charges && itm.making_charges > 0) ? 
                    `<td class="text-right">${item.making_charges && item.making_charges > 0 ? item.making_charges.toFixed(2) + '%' : '-'}</td>` : ''}
                  <td class="text-right">${item.rate.toFixed(2)}</td>
                  <td class="text-right">${formatCurrency(item.labour)}</td>
                  <td class="text-right">${formatCurrency(item.discount)}</td>
                  <td class="text-right">${formatCurrency(item.total)}</td>
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

          <div class="summary">
            <div class="summary-row">
              <span>Amount</span>
              <span>${formatCurrency(invoice.subtotal)}</span>
            </div>
            ${(invoice.discount_amount && invoice.discount_amount > 0) ? `
              <div class="summary-row" style="color: red;">
                <span>Discount</span>
                <span>- ${formatCurrency(invoice.discount_amount)}</span>
              </div>
            ` : ''}
            ${(invoice.type === 'non_gst' && invoice.old_item_type && invoice.old_item_value && invoice.old_item_value > 0) ? `
              <div class="summary-row" style="color: green;">
                <span>${invoice.old_item_type === 'old_gold' ? 'Old Gold' : 'Old Silver'} Return</span>
                <span>- ${formatCurrency(invoice.old_item_value)}</span>
              </div>
            ` : ''}
            ${(invoice.type === 'gst' && invoice.gst_amount && invoice.gst_amount > 0) ? `
              <div class="summary-row">
                <span>SGST@1.5%</span>
                <span>${formatCurrency(invoice.gst_amount / 2)}</span>
              </div>
              <div class="summary-row">
                <span>CGST@1.5%</span>
                <span>${formatCurrency(invoice.gst_amount / 2)}</span>
              </div>
            ` : ''}
            <div class="summary-row summary-total">
              <span>Total Amount</span>
              <span>${formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
          
          ${invoice.type === 'gst' ? `
            <!-- Bank Details for GST invoices -->
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
            <!-- Terms and Conditions for GST invoices -->
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
            <div class="payment-summary" style="margin-top: 30px;">
              <h4 style="margin-top: 0; font-size: 14px;">Payment Status</h4>
              <div className="payment-row">
                <span>Payment Method:</span>
                <span style="font-weight: bold; text-transform: capitalize;">${invoice.payment_method || 'Cash'}</span>
              </div>
              <div className="payment-row">
                <span>Total Amount:</span>
                <span style="font-weight: bold;">${formatCurrency(invoice.total_amount)}</span>
              </div>
              <div className="payment-row">
                <span>Amount Paid:</span>
                <span style="font-weight: bold;">${formatCurrency(invoice.paid_amount || 0)}</span>
              </div>
              ${(invoice.balance_amount && invoice.balance_amount > 0) ? `
                <div className="payment-row">
                  <span>Current Outstanding:</span>
                  <span style="font-weight: bold; color: #dc3545;">${formatCurrency(invoice.balance_amount)}</span>
                </div>
              ` : ''}
              ${(invoice.previous_balance !== undefined && invoice.previous_balance !== 0) ? `
                <div className="payment-row">
                  <span>Previous Outstanding Balance:</span>
                  <span style="font-weight: bold; color: ${(invoice.previous_balance || 0) > 0 ? '#dc3545' : '#28a745'};">
                    ${formatCurrency(Math.abs(invoice.previous_balance || 0))} ${(invoice.previous_balance || 0) > 0 ? '(Owed)' : '(Credit)'}
                  </span>
                </div>
              ` : ''}
              <div className="payment-row" style="border-top: 2px solid black; font-weight: bold; margin-top: 10px; padding-top: 10px;">
                <span>Customer Ledger Balance:</span>
                <span style="color: ${(invoice.current_outstanding || invoice.balance_amount || 0) > 0 ? '#dc3545' : (invoice.current_outstanding || invoice.balance_amount || 0) < 0 ? '#28a745' : '#6c757d'};">
                  ${formatCurrency(Math.abs(invoice.current_outstanding || invoice.balance_amount || 0))} 
                  ${(invoice.current_outstanding || invoice.balance_amount || 0) > 0 ? '(Owes)' : 
                    (invoice.current_outstanding || invoice.balance_amount || 0) < 0 ? '(Credit)' : '(Settled)'}
                </span>
              </div>
            </div>
          ` : ''}
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Invoice Details</h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-gold-600 hover:bg-gold-700"
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between pb-6 border-b">
            <div>
              <h1 className="text-2xl font-bold text-gold-600">Harish Jewellers</h1>
              <p className="text-gray-600">Gold & Silver Jewellery</p>
            </div>
            <div className="text-right mt-4 md:mt-0">
              <div className="text-xl font-bold">{invoice.invoice_number}</div>
              <div className="text-gray-600">
                Date: {invoice.invoice_date ? formatDate(invoice.invoice_date) : formatDate(invoice.created_at)}
              </div>
              <div className="text-gray-600">
                Type: <span className="font-semibold">{invoice.type.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Customer Name & Address:</h3>
            <div className="text-gray-600">
              <p className="font-medium text-gray-900">{invoice.customer_name}</p>
              {invoice.mobile && <p>{invoice.mobile}</p>}
              {invoice.address_line1 && (
                <p>
                  {invoice.address_line1}
                  {invoice.address_line2 ? `, ${invoice.address_line2}` : ''}
                  {invoice.city ? `, ${invoice.city}` : ''}
                  {invoice.state ? `, ${invoice.state}` : ''}
                  {invoice.pincode ? ` - ${invoice.pincode}` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Only show invoice items and totals for non-repayment invoices */}
          {invoice.type !== 'repayment' && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3">Invoice Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-400">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-400 px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">S.No.</th>
                        <th className="border border-gray-400 px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="border border-gray-400 px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">Purity</th>
                        <th className="border border-gray-400 px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">N.Wt.</th>
                        <th className="border border-gray-400 px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">Pcs</th>
                        {/* Polish column - only show if any item has add_weight > 0 */}
                        {invoice.items && invoice.items.some((item: any) => item.add_weight && item.add_weight > 0) && (
                          <th className="border border-gray-400 px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">Polish (gm)</th>
                        )}
                        {/* Making Charges column - only show if any item has making_charges > 0 */}
                        {invoice.items && invoice.items.some((item: any) => item.making_charges && item.making_charges > 0) && (
                          <th className="border border-gray-400 px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">Mk Ch.(%)</th>
                        )}
                        <th className="border border-gray-400 px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="border border-gray-400 px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">Labour</th>
                        <th className="border border-gray-400 px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">Discount</th>
                        <th className="border border-gray-400 px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {invoice.items?.map((item, index) => (
                        <tr key={item.id || index}>
                          <td className="border border-gray-400 px-2 py-1 text-xs text-center">{index + 1}</td>
                          <td className="border border-gray-400 px-2 py-1 text-xs">{item.item_name}</td>
                          <td className="border border-gray-400 px-2 py-1 text-xs text-center">{item.stamp}</td>
                          <td className="border border-gray-400 px-2 py-1 text-xs text-right">{item.gross_weight.toFixed(3)}</td>
                          <td className="border border-gray-400 px-2 py-1 text-xs text-center">{item.pc}</td>
                          {/* Polish column - only show if any item has add_weight > 0 */}
                          {invoice.items && invoice.items.some((item: any) => item.add_weight && item.add_weight > 0) && (
                            <td className="border border-gray-400 px-2 py-1 text-xs text-right">
                              {item.add_weight && item.add_weight > 0 ? item.add_weight.toFixed(3) : '-'}
                            </td>
                          )}
                          {/* Making Charges column - only show if any item has making_charges > 0 */}
                          {invoice.items && invoice.items.some((item: any) => item.making_charges && item.making_charges > 0) && (
                            <td className="border border-gray-400 px-2 py-1 text-xs text-right">
                              {item.making_charges && item.making_charges > 0 ? item.making_charges.toFixed(2) + '%' : '-'}
                            </td>
                          )}
                          <td className="border border-gray-400 px-2 py-1 text-xs text-right">{item.rate.toFixed(2)}</td>
                          <td className="border border-gray-400 px-2 py-1 text-xs text-right">{formatCurrency(item.labour)}</td>
                          <td className="border border-gray-400 px-2 py-1 text-xs text-right">{formatCurrency(item.discount)}</td>
                          <td className="border border-gray-400 px-2 py-1 text-xs text-right font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Amount</span>
                      <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>

                    {invoice.type === 'non_gst' && invoice.old_item_type && invoice.old_item_value && invoice.old_item_value > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>{invoice.old_item_type === 'old_gold' ? 'Old Gold' : 'Old Silver'} Return:</span>
                        <span>-{formatCurrency(invoice.old_item_value)}</span>
                      </div>
                    )}

                    {/* {invoice.discount_amount && invoice.discount_amount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(invoice.discount_amount)}</span>
                      </div>
                    )} */}

                    {/* Add CGST and SGST for GST invoices */}
                    {invoice.type === 'gst' && invoice.gst_amount && invoice.gst_amount > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span>SGST@1.5%:</span>
                          <span>{formatCurrency(invoice.gst_amount / 2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CGST@1.5%:</span>
                          <span>{formatCurrency(invoice.gst_amount / 2)}</span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between border-t pt-2 text-lg font-bold">
                      <span>Total Amount</span>
                      <span>{formatCurrency(invoice.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Payment Status</h3>
            <div className="border border-gray-400 p-4">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-400">
                  <span className="font-medium">Payment Method:</span>
                  <span className="font-bold text-right">{invoice.payment_method || 'cash'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-400">
                  <span className="font-medium">Total Amount:</span>
                  <span className="font-bold text-right">{formatCurrency(invoice.total_amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-400">
                  <span className="font-medium">Amount Paid:</span>
                  <span className="font-bold text-right">{formatCurrency(invoice.paid_amount || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-400">
                  <span className="font-medium">Current Outstanding:</span>
                  <span className="font-bold text-right text-red-600">
                    {invoice.balance_amount && invoice.balance_amount > 0 
                      ? formatCurrency(invoice.balance_amount)
                      : '₹0'
                    }
                  </span>
                </div>
                {invoice.previous_balance !== undefined && invoice.previous_balance !== 0 && (
                  <div className="flex justify-between py-2 border-b border-gray-400">
                    <span className="font-medium">Previous Outstanding Balance:</span>
                    <span className={`font-bold text-right ${
                      (invoice.previous_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(Math.abs(invoice.previous_balance || 0))} 
                      {(invoice.previous_balance || 0) > 0 ? ' (Owed)' : ' (Credit)'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-t-2 border-black font-bold text-lg">
                  <span>Customer Ledger Balance:</span>
                  <span className={`text-right ${
                    (invoice.current_outstanding || invoice.balance_amount || 0) > 0 ? 'text-red-600' : 
                    (invoice.current_outstanding || invoice.balance_amount || 0) < 0 ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {(invoice.current_outstanding || invoice.balance_amount || 0) === 0 ? '₹0 (Settled)' : 
                     (invoice.current_outstanding || invoice.balance_amount || 0) < 0 ? 
                       `${formatCurrency(Math.abs(invoice.current_outstanding || invoice.balance_amount || 0))} (Credit)` :
                       `${formatCurrency(invoice.current_outstanding || invoice.balance_amount || 0)} (Owes)`
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-gray-500 text-sm">
            <p>Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
