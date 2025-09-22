// Find Lucy's Provider ID
// Copy and paste this in browser console at http://localhost:8087

console.log('🔍 Finding Lucy Provider ID...');

async function findLucyProviderId() {
  try {
    if (typeof hybridStorage === 'undefined') {
      console.error('❌ hybridStorage not available');
      return;
    }

    // Get all users
    console.log('👥 Getting all users...');
    const users = await hybridStorage.getUsers();
    console.log(`📊 Found ${users.length} users`);

    // Find Lucy
    const lucy = users.find(user =>
      user.name.toLowerCase().includes('lucy') ||
      user.email.toLowerCase().includes('lucy')
    );

    if (lucy) {
      console.log('✅ Found Lucy Provider:');
      console.log('  - ID:', lucy.id);
      console.log('  - Name:', lucy.name);
      console.log('  - Email:', lucy.email);
      console.log('  - Role:', lucy.role);

      return lucy.id;
    } else {
      console.log('⚠️ Lucy provider not found in users');
      console.log('📋 Available users:');
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
      });
    }

  } catch (error) {
    console.error('❌ Error finding Lucy provider:', error);
  }
}

// Auto-run
findLucyProviderId();

window.findLucyProviderId = findLucyProviderId;