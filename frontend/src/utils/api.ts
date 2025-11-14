// API utility functions for consistent API calls

export const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${getApiUrl()}${endpoint}`;
  return fetch(url, options);
};

export const apiGet = async (endpoint: string) => {
  return apiCall(endpoint, { method: 'GET' });
};

export const apiPost = async (endpoint: string, data?: any) => {
  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  return apiCall(endpoint, options);
};

export const apiPut = async (endpoint: string, data?: any) => {
  const options: RequestInit = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  return apiCall(endpoint, options);
};

export const apiDelete = async (endpoint: string) => {
  return apiCall(endpoint, { method: 'DELETE' });
};

export const apiPostFormData = async (endpoint: string, formData: FormData) => {
  return apiCall(endpoint, {
    method: 'POST',
    body: formData,
  });
};
