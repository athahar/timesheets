-- Check current trackpay_users policies in detail
SELECT
  policyname,
  cmd,
  roles,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'trackpay_users'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'trackpay_users';
