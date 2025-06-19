// Mock for import.meta.env
global.importMeta = {
  env: {
    VITE_API_BASE_URL: 'http://localhost:5000/api',
  },
};