// Get complete RLS configuration from STAGING database
const { createClient } = require('@supabase/supabase-js');

const STAGING_URL = 'https://qpoqeqasefatyrjeronp.supabase.co';
const STAGING_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3FlcWFzZWZhdHlyamVyb25wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzQzNjYwNCwiZXhwIjoyMDYzMDEyNjA0fQ.peTN2p6fhfIlC_rE5QwrWTxZQ-XOLhXAiUMKLWZhXUo';

const supabase = createClient(STAGING_URL, STAGING_SERVICE_KEY, {
  db: { schema: 'public' }
});

async function getStagingRLS() {
  console.log('🔍 Getting RLS configuration from STAGING\n');
  console.log('📊 Database:', STAGING_URL);
  console.log('\n' + '='.repeat(80) + '\n');

  // Get all trackpay tables
  const tables = [
    'trackpay_users',
    'trackpay_relationships',
    'trackpay_invites',
    'trackpay_sessions',
    'trackpay_payments',
    'trackpay_requests',
    'trackpay_activities'
  ];

  // SQL to get RLS status
  const rlsStatusQuery = `
    SELECT
      tablename,
      rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'trackpay_%'
    ORDER BY tablename;
  `;

  // SQL to get all policies with full details
  const policiesQuery = `
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE tablename LIKE 'trackpay_%'
    ORDER BY tablename, policyname;
  `;

  try {
    // Get RLS status
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      sql: rlsStatusQuery
    });

    console.log('-- ============================================================================');
    console.log('-- RLS STATUS FOR ALL TRACKPAY TABLES (STAGING)');
    console.log('-- ============================================================================\n');

    if (rlsError) {
      console.log('-- Using direct query instead of RPC\n');

      // Fallback: query pg_tables directly
      for (const table of tables) {
        const { data, error } = await supabase
          .from('pg_tables')
          .select('tablename, rowsecurity')
          .eq('tablename', table)
          .single();

        if (!error && data) {
          const status = data.rowsecurity ? 'ENABLE' : 'DISABLE';
          console.log(`ALTER TABLE ${table} ${status} ROW LEVEL SECURITY;`);
        }
      }
    }

    console.log('\n-- ============================================================================');
    console.log('-- ALL RLS POLICIES (STAGING)');
    console.log('-- ============================================================================\n');

    // Get policies
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: policiesQuery
    });

    if (policiesError) {
      console.log('-- Cannot retrieve policies via RPC');
      console.log('-- Please run this SQL in Supabase SQL Editor to get policies:\n');
      console.log(policiesQuery);
      return;
    }

    // Group policies by table
    const policiesByTable = {};
    if (policies && Array.isArray(policies)) {
      policies.forEach(p => {
        if (!policiesByTable[p.tablename]) {
          policiesByTable[p.tablename] = [];
        }
        policiesByTable[p.tablename].push(p);
      });
    }

    // Generate CREATE POLICY statements
    Object.keys(policiesByTable).sort().forEach(tablename => {
      console.log(`-- Policies for ${tablename}`);
      console.log('-- ' + '-'.repeat(78) + '\n');

      policiesByTable[tablename].forEach(policy => {
        console.log(`CREATE POLICY "${policy.policyname}"`);
        console.log(`ON ${tablename}`);

        // Parse roles array (comes as {role1,role2})
        const rolesStr = policy.roles.replace(/[{}]/g, '');
        const roles = rolesStr.split(',');

        console.log(`FOR ${policy.cmd}`);
        console.log(`TO ${roles.join(', ')}`);

        if (policy.qual) {
          console.log(`USING (${policy.qual})`);
        }

        if (policy.with_check) {
          console.log(`WITH CHECK (${policy.with_check})`);
        }

        console.log(';\n');
      });

      console.log('');
    });

    console.log('\n-- ============================================================================');
    console.log('-- SUMMARY');
    console.log('-- ============================================================================\n');

    tables.forEach(table => {
      const count = policiesByTable[table]?.length || 0;
      console.log(`-- ${table}: ${count} policies`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getStagingRLS().then(() => {
  console.log('\n✅ Complete\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
