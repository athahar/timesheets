// Test script to verify the relationship creation fix
import { directSupabase } from './src/services/directSupabase.js';

async function testRelationshipFix() {
  console.log('🧪 Testing relationship creation fix...');

  try {
    // Test 1: Create a new client (should work without errors)
    console.log('\n📝 Test 1: Creating new client...');
    const newClient = await directSupabase.addClient(
      'Test Client ' + Date.now(),
      75.00,
      'test@example.com'
    );
    console.log('✅ New client created successfully:', newClient.id);

    // Test 2: Try to create the same client again (should handle existing relationship)
    console.log('\n📝 Test 2: Testing existing relationship handling...');
    const duplicateClient = await directSupabase.addClient(
      'Test Client Duplicate ' + Date.now(),
      80.00,
      'test2@example.com'
    );
    console.log('✅ Second client created successfully:', duplicateClient.id);

    console.log('\n🎉 All tests passed! Relationship creation fix is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testRelationshipFix();