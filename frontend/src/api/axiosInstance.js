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
    
    const customError = {
      message: error.response?.data?.data?.message || error.response?.data?.message || 'A network error occurred. Please try again.',
      validationErrors: error.response?.data?.data?.validationErrors || null,
      status: status
    };
    return Promise.reject(customError);
  }
);

export default axiosInstance;
