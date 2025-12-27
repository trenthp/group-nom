import { config } from 'dotenv';
config({ path: '.env.local' });

const key = process.env.TRIPADVISOR_API_KEY;
console.log('Key exists:', !!key);
console.log('Key length:', key?.length || 0);
console.log('Key starts with:', key?.substring(0, 8) + '...');

// Test a direct API call
async function testApi() {
  if (!key) {
    console.log('\nNo API key found!');
    return;
  }

  console.log('\nTesting API call...');

  // Try the search endpoint
  const params = new URLSearchParams({
    key: key,
    searchQuery: 'pizza',
    latLong: '40.7128,-74.0060', // NYC
    category: 'restaurants',
    language: 'en',
  });

  const url = `https://api.content.tripadvisor.com/api/v1/location/search?${params}`;
  console.log('URL:', url.replace(key, 'KEY_HIDDEN'));

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);

    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
  } catch (error) {
    console.log('Error:', error);
  }
}

testApi();
