import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { DashboardStats } from '../types';
import { Users, FileText, IndianRupee, TrendingUp, Eye, EyeOff, Bell, Calendar, Phone, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalInvoices: 0,
    pendingAmount: 0,
    todaySales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hideSensitiveData, setHideSensitiveData] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [todayReminders, setTodayReminders] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data as DashboardStats);
      } catch (error: any) {
        console.error('Dashboard stats error:', error);
        if (error.message === 'Access token required' || error.message === 'Invalid token') {
          toast.error('Session expired. Please login again.');
          logout();
          navigate('/login');
          return;
        }
        toast.error('Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    const fetchReminders = async () => {
      setLoadingReminders(true);
      try {
        const [allReminders, todayReminderData] = await Promise.all([
          api.getReminders(),
          api.getTodayReminders()
        ]);
        setReminders(allReminders);
        setTodayReminders(todayReminderData);
      } catch (error: any) {
        console.error('Reminders error:', error);
        // Don't show error toast for reminders as they're not critical
      } finally {
        setLoadingReminders(false);
      }
    };

    // Only fetch stats if user is authenticated
    if (user) {
      fetchStats();
      fetchReminders();
    } else {
      setLoading(false);
    }
  }, [user, logout, navigate]);

  const handleCompleteReminder = async (reminderId: number) => {
    try {
      await api.completeReminder(reminderId);
      toast.success('Reminder marked as completed');
      // Refresh reminders
      const [allReminders, todayReminderData] = await Promise.all([
        api.getReminders(),
        api.getTodayReminders()
      ]);
      setReminders(allReminders);
      setTodayReminders(todayReminderData);
    } catch (error: any) {
      toast.error('Failed to complete reminder');
    }
  };

  const handleDeleteReminder = async (reminderId: number) => {
    if (window.confirm('Are you sure you want to delete this reminder?')) {
      try {
        await api.deleteReminder(reminderId);
        toast.success('Reminder deleted successfully');
        // Refresh reminders
        const [allReminders, todayReminderData] = await Promise.all([
          api.getReminders(),
          api.getTodayReminders()
        ]);
        setReminders(allReminders);
        setTodayReminders(todayReminderData);
      } catch (error: any) {
        toast.error('Failed to delete reminder');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const statCards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Total Invoices',
      value: stats.totalInvoices,
      icon: FileText,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Pending Amount',
      value: hideSensitiveData ? '****' : `₹${stats.pendingAmount.toLocaleString()}`,
      icon: IndianRupee,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
    {
      title: "Today's Sales",
      value: hideSensitiveData ? '****' : `₹${stats.todaySales.toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-gold-500',
      bgColor: 'bg-gold-50',
      textColor: 'text-gold-600',
    },
  ];

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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setHideSensitiveData(!hideSensitiveData)}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            title={hideSensitiveData ? 'Show sensitive data' : 'Hide sensitive data'}
          >
            {hideSensitiveData ? (
              <>
                <EyeOff className="h-4 w-4" />
                <span>Show Data</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span>Hide Data</span>
              </>
            )}
          </button>
          <p className="text-gray-600">Welcome to Harish Jewellers Management System</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/customers')}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gold-300 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Add New Customer</h3>
            <p className="text-sm text-gray-600 mt-1">Register a new customer with full details</p>
          </button>
          <button 
            onClick={() => navigate('/billing')}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gold-300 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Create Invoice</h3>
            <p className="text-sm text-gray-600 mt-1">Generate GST or Non-GST bill</p>
          </button>
          <button 
            onClick={() => navigate('/inventory')}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gold-300 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Manage Inventory</h3>
            <p className="text-sm text-gray-600 mt-1">Add items and groups</p>
          </button>
        </div>
      </div>

      {/* Today's Payment Reminders */}
      {todayReminders.length > 0 && (
        <div className="card p-6 border-l-4 border-l-orange-500 bg-orange-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-orange-800">Today's Payment Reminders</h2>
              <span className="bg-orange-200 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                {todayReminders.length}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {todayReminders.map((reminder) => (
              <div key={reminder.id} className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-gray-900">{reminder.customer_name}</h3>
                      {reminder.mobile && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-3 w-3 mr-1" />
                          <span>{reminder.mobile}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <IndianRupee className="h-3 w-3 mr-1" />
                        <span className="font-medium text-green-600">
                          {formatCurrency(reminder.amount_promised)}
                        </span>
                      </div>
                      {reminder.invoice_number && (
                        <div>
                          <span className="text-gray-500">Invoice:</span>
                          <span className="font-medium ml-1">{reminder.invoice_number}</span>
                        </div>
                      )}
                    </div>
                    {reminder.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">{reminder.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleCompleteReminder(reminder.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Mark as completed"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete reminder"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Payment Reminders */}
      {reminders.filter(r => new Date(r.reminder_date) > new Date()).length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Payment Reminders</h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                {reminders.filter(r => new Date(r.reminder_date) > new Date()).length}
              </span>
            </div>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {reminders
              .filter(r => new Date(r.reminder_date) > new Date())
              .sort((a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime())
              .slice(0, 10)
              .map((reminder) => (
                <div key={reminder.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">{reminder.customer_name}</h3>
                        {reminder.mobile && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3 w-3 mr-1" />
                            <span>{reminder.mobile}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span className="font-medium">{formatDate(reminder.reminder_date)}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium text-green-600">
                            {formatCurrency(reminder.amount_promised)}
                          </span>
                        </div>
                        {reminder.invoice_number && (
                          <div>
                            <span className="text-gray-500">Invoice:</span>
                            <span className="font-medium ml-1">{reminder.invoice_number}</span>
                          </div>
                        )}
                      </div>
                      {reminder.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">{reminder.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleCompleteReminder(reminder.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Mark as completed"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete reminder"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">System Ready</p>
              <p className="text-xs text-gray-600">Your jewelry management system is fully operational</p>
            </div>
            <span className="text-xs text-gray-500">Active</span>
          </div>
          {stats.totalCustomers > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">{stats.totalCustomers} Customer{stats.totalCustomers > 1 ? 's' : ''} Registered</p>
                <p className="text-xs text-gray-600">Customer database is growing</p>
              </div>
              <span className="text-xs text-gray-500">Recent</span>
            </div>
          )}
          {stats.totalInvoices > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">{stats.totalInvoices} Invoice{stats.totalInvoices > 1 ? 's' : ''} Generated</p>
                <p className="text-xs text-gray-600">Billing system is active</p>
              </div>
              <span className="text-xs text-gray-500">Recent</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 