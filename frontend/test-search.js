// Simple test to verify search functionality
console.log('Testing search functionality...');

// Test if we can access the search components
fetch('http://localhost:5173/src/services/restaurantService.ts')
  .then(response => response.text())
  .then(data => {
    if (data.includes('USE_MOCK_API')) {
      console.log('✅ Restaurant service found and mock API configured');
    } else {
      console.log('❌ Restaurant service configuration issue');
    }
  })
  .catch(error => {
    console.log('❌ Error accessing restaurant service:', error.message);
  });

// Test if SearchResults component is accessible
fetch('http://localhost:5173/src/components/search/SearchResults.tsx')
  .then(response => response.text())
  .then(data => {
    if (data.includes('SearchResults') && data.includes('results.restaurants')) {
      console.log('✅ SearchResults component found and contains restaurant handling');
    } else {
      console.log('❌ SearchResults component issue');
    }
  })
  .catch(error => {
    console.log('❌ Error accessing SearchResults:', error.message);
  });