const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? `${window.location.protocol}//${window.location.hostname}/api`
  : process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private getAuthHeadersForFormData() {
    const token = localStorage.getItem('token');
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An error occurred' }));
      
      // Handle authentication errors specifically
      if (response.status === 401 || response.status === 403) {
        // Clear invalid tokens
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Throw a specific error message for auth issues
        throw new Error(error.error || 'Authentication required');
      }
      
      throw new Error(error.error || 'An error occurred');
    }

    return response.json();
  }

  private async requestFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      method: 'POST',
      headers: this.getAuthHeadersForFormData(),
      body: formData,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(error.error || 'An error occurred');
    }

    return response.json();
  }

  private async requestFormDataPut<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      method: 'PUT',
      headers: this.getAuthHeadersForFormData(),
      body: formData,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(error.error || 'An error occurred');
    }

    return response.json();
  }

  // Auth methods
  async login(username: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // Enhanced Customer methods
  async getCustomers(filter?: 'all' | 'regular' | 'gst'): Promise<any[]> {
    const params = filter && filter !== 'all' ? `?filter=${filter}` : '';
    return this.request<any[]>(`/customers${params}`);
  }

  async getCustomer(id: number): Promise<any> {
    return this.request<any>(`/customers/${id}`);
  }

  async createCustomer(customerData: any, imageFile?: File): Promise<any> {
    const formData = new FormData();
    
    // Add all customer fields to FormData
    Object.keys(customerData).forEach(key => {
      // Include all values except undefined and null (include false, 0, empty string)
      if (customerData[key] !== undefined && customerData[key] !== null) {
        // Convert boolean to string for FormData
        const value = typeof customerData[key] === 'boolean' ? customerData[key].toString() : customerData[key];
        formData.append(key, value);
      }
    });
    
    // Add image file if provided
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    return this.requestFormData<any>('/customers', formData);
  }

  async updateCustomer(id: number, customerData: any, imageFile?: File): Promise<any> {
    const formData = new FormData();
    
    // Add all customer fields to FormData
    Object.keys(customerData).forEach(key => {
      // Include all values except undefined and null (include false, 0, empty string)
      if (customerData[key] !== undefined && customerData[key] !== null) {
        // Convert boolean to string for FormData
        const value = typeof customerData[key] === 'boolean' ? customerData[key].toString() : customerData[key];
        formData.append(key, value);
      }
    });
    
    // Add image file if provided
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    return this.requestFormDataPut<any>(`/customers/${id}`, formData);
  }

  async deleteCustomer(id: number): Promise<any> {
    return this.request<any>(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  async getCustomerTransactions(id: number): Promise<any[]> {
    return this.request<any[]>(`/customers/${id}/transactions`);
  }

  async addCustomerRepayment(id: number, repaymentData: any): Promise<any> {
    return this.request<any>(`/customers/${id}/repayment`, {
      method: 'POST',
      body: JSON.stringify(repaymentData),
    });
  }

  // Item groups methods
  async getItemGroups(): Promise<any[]> {
    return this.request<any[]>('/item-groups');
  }

  async createItemGroup(group: any): Promise<any> {
    return this.request<any>('/item-groups', {
      method: 'POST',
      body: JSON.stringify(group),
    });
  }

  async updateItemGroup(id: number, group: any): Promise<any> {
    return this.request<any>(`/item-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(group),
    });
  }

  async deleteItemGroup(id: number): Promise<any> {
    return this.request<any>(`/item-groups/${id}`, {
      method: 'DELETE',
    });
  }

  // Items methods
  async getItems(): Promise<any[]> {
    return this.request<any[]>('/items');
  }

  async createItem(item: any): Promise<any> {
    return this.request<any>('/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateItem(id: number, item: any): Promise<any> {
    return this.request<any>(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  async deleteItem(id: number): Promise<any> {
    return this.request<any>(`/items/${id}`, {
      method: 'DELETE',
    });
  }

  // Invoice methods
  async getInvoices(): Promise<any[]> {
    return this.request<any[]>('/invoices');
  }

  async getInvoice(id: number): Promise<any> {
    return this.request<any>(`/invoices/${id}`);
  }

  async createInvoice(invoice: any): Promise<any> {
    return this.request<any>('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  }

  async deleteInvoice(id: number): Promise<any> {
    return this.request<any>(`/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async updateInvoice(id: number, invoice: any): Promise<any> {
    return this.request<any>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoice),
    });
  }

  // Dashboard methods
  async getDashboardStats(): Promise<any> {
    return this.request<any>('/dashboard/stats');
  }

  // Reminder methods
  async getReminders(): Promise<any[]> {
    return this.request<any[]>('/reminders');
  }

  async getTodayReminders(): Promise<any[]> {
    return this.request<any[]>('/reminders/today');
  }

  async createReminder(reminder: any): Promise<any> {
    return this.request<any>('/reminders', {
      method: 'POST',
      body: JSON.stringify(reminder),
    });
  }

  async completeReminder(id: number): Promise<any> {
    return this.request<any>(`/reminders/${id}/complete`, {
      method: 'PUT',
    });
  }

  async deleteReminder(id: number): Promise<any> {
    return this.request<any>(`/reminders/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();