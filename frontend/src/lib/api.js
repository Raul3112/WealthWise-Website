// API client for WealthWise backend

import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async withAuthHeaders(headers = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    
    // For development: use a test token if no real token is available
    const authToken = token || 'test_user_123';
    
    return {
      Authorization: `Bearer ${authToken}`,
      ...headers,
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const authHeaders = await this.withAuthHeaders(options.headers);
    
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    };
    
    if (options.body) {
      config.body = options.body;
    }

    console.log("[API] Request:", config.method, url, "Headers:", config.headers);

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      // Re-throw with better message for network errors
      if (error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Please ensure the backend is running.');
      }
      throw error;
    }
  }

  // Transaction endpoints
  async createTransaction(data) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTransactions(filters = {}) {
    const params = new URLSearchParams({
      ...filters,
    });
    const url = `/transactions/?${params}`;
    console.log("[API] Getting transactions with URL:", url, "Filters:", filters);
    return this.request(url);
  }

  async getTransaction(txnId) {
    return this.request(`/transactions/${txnId}`);
  }

  async updateTransaction(txnId, data) {
    return this.request(`/transactions/${txnId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(txnId) {
    return this.request(`/transactions/${txnId}`, {
      method: 'DELETE',
    });
  }

  async getTransactionSummary(month, year) {
    const params = new URLSearchParams({
      ...(month && { month }),
      ...(year && { year }),
    });
    return this.request(`/transactions/summary?${params}`);
  }

  // OCR endpoint
  async scanReceipt(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const authHeaders = await this.withAuthHeaders();
    const response = await fetch(`${this.baseUrl}/transactions/scan-and-create`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  // Budget endpoints
  async createBudget(data) {
    return this.request('/budgets/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBudgets(filters = {}) {
    const params = new URLSearchParams({
      ...filters,
    });
    return this.request(`/budgets/?${params}`);
  }

  async getBudget(budgetId) {
    return this.request(`/budgets/${budgetId}`);
  }

  async updateBudget(budgetId, data) {
    return this.request(`/budgets/${budgetId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBudget(budgetId) {
    return this.request(`/budgets/${budgetId}`, {
      method: 'DELETE',
    });
  }

  async getCategories() {
    return this.request('/budgets/categories');
  }

  // Income endpoints
  async createIncome(data) {
    return this.request('/income/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getLatestIncome() {
    return this.request('/income/latest');
  }

  async getIncomeTotal(month, year) {
    const params = new URLSearchParams({
      ...(month && { month }),
      ...(year && { year }),
    });
    const query = params.toString();
    return this.request(`/income/total${query ? `?${query}` : ''}`);
  }

  async copyPreviousIncome() {
    return this.request('/income/same-as-previous', {
      method: 'POST',
    });
  }

  // Goal endpoints
  async createGoal(data) {
    return this.request('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGoals() {
    return this.request('/goals');
  }

  async getGoal(goalId) {
    return this.request(`/goals/${goalId}`);
  }

  async updateGoal(goalId, data) {
    return this.request(`/goals/${goalId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteGoal(goalId) {
    return this.request(`/goals/${goalId}`, {
      method: 'DELETE',
    });
  }

  async addSavingsToGoal(goalId, data) {
    return this.request(`/goals/${goalId}/savings`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ======================== REPORTS ENDPOINTS ========================

  // L1: Core Analytics
  async getIncomeVsExpenseTrends(months = 12) {
    return this.request(`/reports/trends/income-vs-expense?months=${months}`);
  }

  async getCategorySpendingBreakdown(year, month) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    return this.request(`/reports/breakdown/category-spending?${params}`);
  }

  async getPaymentModeBreakdown(year, month) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    return this.request(`/reports/breakdown/payment-mode?${params}`);
  }

  async getGoalsProgress() {
    return this.request('/reports/goals/progress');
  }

  async getBudgetsPerformance(year, month) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    return this.request(`/reports/budgets/performance?${params}`);
  }

  // L2: Advanced Analytics
  async getSavingsRateTrend(months = 12) {
    return this.request(`/reports/trends/savings-rate?months=${months}`);
  }

  async getTopTransactionsReport(limit = 10, txnType = 'expense') {
    return this.request(`/reports/breakdown/top-transactions?limit=${limit}&txn_type=${txnType}`);
  }

  async getMonthlyComparison() {
    return this.request('/reports/trends/monthly-comparison');
  }

  async getRecurringExpensesReport() {
    return this.request('/reports/patterns/recurring-expenses');
  }

  async getSpendingAnomaliesReport() {
    return this.request('/reports/patterns/spending-anomalies');
  }

  async getDetailedSummary(year, month) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    return this.request(`/reports/summary/detailed?${params}`);
  }

  // Export Endpoints
  async exportToCSV(year, month, reportType = 'transactions') {
    const params = new URLSearchParams();
    if (year !== null && year !== undefined) params.append('year', year);
    if (month !== null && month !== undefined) params.append('month', month);
    params.append('report_type', reportType);
    return this.request(`/reports/export/csv?${params}`);
  }

  async getExportSummaryData(year, month) {
    const params = new URLSearchParams();
    if (year !== null && year !== undefined) params.append('year', year);
    if (month !== null && month !== undefined) params.append('month', month);
    return this.request(`/reports/export/summary-data?${params}`);
  }

  // Profile endpoints
  async getProfile() {
    return this.request('/profile/');
  }

  async updateProfile(data) {
    return this.request('/profile/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateSettings(data) {
    return this.request('/profile/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getProfileStats() {
    return this.request('/profile/stats');
  }

  async deleteProfile() {
    return this.request('/profile/', {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
