import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8081/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to attach JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to format errors gracefully and handle unauthorized/forbidden
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      // Clear storage and notify context
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_info');
      localStorage.removeItem('active_role');
      sessionStorage.removeItem('jwt_token');
      sessionStorage.removeItem('user_info');
      sessionStorage.removeItem('active_role');
      
      window.dispatchEvent(new Event('auth-error'));
    }
    
    // Distinguish HTTP server response errors from true network connection failures
    const rawServerMessage = error.response?.data?.message || 
                             error.response?.data?.data?.message;

    // Filter out generic fallback strings from backend
    const serverMessage = (rawServerMessage && rawServerMessage !== 'An unexpected error occurred') 
      ? rawServerMessage 
      : null;

    let formattedMessage;
    if (!error.response) {
      formattedMessage = 'Network error. Please check the backend connection.';
    } else if (status === 401) {
      formattedMessage = 'Session expired. Please login again.';
    } else if (status === 403) {
      formattedMessage = 'You do not have permission to perform this action.';
    } else if (status === 404) {
      formattedMessage = serverMessage || 'Requested resource was not found.';
    } else if (status === 409) {
      formattedMessage = serverMessage || 'Cannot delete this scheme because it is associated with existing beneficiary applications. Deactivate the scheme instead.';
    } else if (status === 500) {
      formattedMessage = serverMessage || 'Unable to load the requested information.';
    } else {
      formattedMessage = serverMessage || `Server error (HTTP ${status})`;
    }

    const customError = {
      message: formattedMessage,
      validationErrors: error.response?.data?.data?.validationErrors || error.response?.data?.validationErrors || null,
      status: status,
      error: error.response?.data?.data?.error || error.response?.data?.error || (status === 409 ? 'SCHEME_IN_USE' : null),
      response: error.response,
      data: error.response?.data
    };
    return Promise.reject(customError);
  }
);

export default axiosInstance;
