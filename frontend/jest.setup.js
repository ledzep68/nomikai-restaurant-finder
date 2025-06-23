// Mock for import.meta.env
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_BASE_URL: 'http://localhost:5000/api',
      },
    },
  },
  writable: true,
});

// Set NODE_ENV for constants.ts
process.env.NODE_ENV = 'test';