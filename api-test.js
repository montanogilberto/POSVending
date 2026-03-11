// Simple test script to verify the API fix
// Run with: node api-test.js

const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

async function testProductsAPI() {
  console.log('Testing Products API with corrected request format...');
  
  const requestBody = {
    products: [
      {
        companyId: "1",
        categoryId: "1002"
      }
    ]
  };

  try {
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/by_company_products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response body:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('Success! Response data structure:');
    console.log('- Has result property:', !!data.result);
    if (data.result && Array.isArray(data.result)) {
      console.log('- Result array length:', data.result.length);
      if (data.result[0]) {
        console.log('- First result has products:', !!data.result[0].products);
        if (data.result[0].products) {
          console.log('- Products array length:', data.result[0].products.length);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Network error:', error.message);
    return false;
  }
}

async function testCategoriesAPI(companyId = 1) {
  console.log('\nTesting Categories API with corrected request format...');
  
  const normalizedCompanyId = Number(companyId);
  if (!Number.isFinite(normalizedCompanyId) || normalizedCompanyId <= 0) {
    console.log('Invalid companyId for testCategoriesAPI:', companyId);
    return false;
  }

  const requestBody = {
    productCategories: [
      {
        companyId: normalizedCompanyId,
        categoryId: null,
      },
    ],
  };

  try {
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/all_products_categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response body:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('Success! Response data structure:');
    console.log('- Has productCategories property:', !!data.productCategories);
    if (data.productCategories && Array.isArray(data.productCategories)) {
      console.log('- Categories array length:', data.productCategories.length);
    }
    
    return true;
  } catch (error) {
    console.error('Network error:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('=== API Fix Verification Test ===\n');
  
  const productsSuccess = await testProductsAPI();
  const categoriesSuccess = await testCategoriesAPI();
  
  console.log('\n=== Test Results ===');
  console.log(`Products API: ${productsSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Categories API: ${categoriesSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (productsSuccess && categoriesSuccess) {
    console.log('\n🎉 All tests passed! The API fix is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the error messages above.');
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('This script requires Node.js 18+ with built-in fetch support.');
  console.log('Alternatively, install node-fetch: npm install node-fetch');
  process.exit(1);
}

runTests().catch(console.error);
