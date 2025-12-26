import axios from 'axios';

// ⚠️ CHANGE THIS WHEN BACKEND GIVES YOU THE URL
const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 seconds
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTHENTICATION APIs
// ============================================
export const authAPI = {
  // Register new patient
  register: async (patientData) => {
    try {
      const response = await api.post('/auth/register', patientData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Login
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      // Save token and user info
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

// ============================================
// PATIENT APIs
// ============================================
export const patientAPI = {
  // Search patient by national ID
  searchByNationalId: async (nationalId) => {
    try {
      const response = await api.get(`/patients/search?nationalId=${nationalId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Search patient by child ID
  searchByChildId: async (childId) => {
    try {
      const response = await api.get(`/patients/search?childId=${childId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get children by parent's national ID
  getChildrenByParent: async (parentNationalId) => {
    try {
      const response = await api.get(`/patients/by-parent/${parentNationalId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get patient by ID
  getById: async (patientId) => {
    try {
      const response = await api.get(`/patients/${patientId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update patient
  update: async (patientId, data) => {
    try {
      const response = await api.put(`/patients/${patientId}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

// ============================================
// DOCTOR APIs
// ============================================
export const doctorAPI = {
  // Get doctor by ID
  getById: async (doctorId) => {
    try {
      const response = await api.get(`/doctors/${doctorId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

// ============================================
// VISIT APIs (Will implement in Week 2)
// ============================================
export const visitAPI = {
  // Create new visit
  create: async (visitData) => {
    try {
      const response = await api.post('/visits', visitData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all visits for a patient
  getPatientVisits: async (patientId) => {
    try {
      const response = await api.get(`/visits/patient/${patientId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get visit by ID
  getById: async (visitId) => {
    try {
      const response = await api.get(`/visits/${visitId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default api;