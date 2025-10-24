
---- staging db -- below ------

-- Check RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('trackpay_activities', 'trackpay_invites', 'trackpay_payments','trackpay_relationship_audit', 'trackpay_relationships', 'trackpay_requests','trackpay_sessions', 'trackpay_unpaid_balances', 'trackpay_users');


[
  {
    "schemaname": "public",
    "tablename": "trackpay_relationship_audit",
    "rowsecurity": true
  },
  {
    "schemaname": "public",
    "tablename": "trackpay_activities",
    "rowsecurity": true
  },
  {
    "schemaname": "public",
    "tablename": "trackpay_payments",
    "rowsecurity": true
  },
  {
    "schemaname": "public",
    "tablename": "trackpay_requests",
    "rowsecurity": true
  },
  {
    "schemaname": "public",
    "tablename": "trackpay_relationships",
    "rowsecurity": true
  },
  {
    "schemaname": "public",
    "tablename": "trackpay_users",
    "rowsecurity": true
  },
  {
    "schemaname": "public",
    "tablename": "trackpay_sessions",
    "rowsecurity": true
  },
  {
    "schemaname": "public",
    "tablename": "trackpay_invites",
    "rowsecurity": false
  }
]




-- List all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('trackpay_activities', 'trackpay_invites', 'trackpay_payments','trackpay_relationship_audit', 'trackpay_relationships', 'trackpay_requests','trackpay_sessions', 'trackpay_unpaid_balances', 'trackpay_users')
ORDER BY tablename, policyname;

[
    {
      "schemaname": "public",
      "tablename": "trackpay_activities",
      "policyname": "All can view activities",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "ALL",
      "qual": "true"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_activities",
      "policyname": "Users can view their own activities",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "SELECT",
      "qual": "(EXISTS ( SELECT 1\n   FROM trackpay_users\n  WHERE ((trackpay_users.id = trackpay_activities.provider_id) AND (trackpay_users.auth_user_id = auth.uid()))))"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_payments",
      "policyname": "All can manage payments",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "ALL",
      "qual": "true"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_payments",
      "policyname": "Users can insert their own payments",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "INSERT",
      "qual": null
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_payments",
      "policyname": "Users can view their own payments",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "SELECT",
      "qual": "(EXISTS ( SELECT 1\n   FROM trackpay_users\n  WHERE ((trackpay_users.id = trackpay_payments.provider_id) AND (trackpay_users.auth_user_id = auth.uid()))))"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_relationship_audit",
      "policyname": "audit_select_by_provider",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "SELECT",
      "qual": "(provider_id = auth.uid())"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_relationships",
      "policyname": "All can view relationships",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "ALL",
      "qual": "true"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_relationships",
      "policyname": "rel_select_by_party",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "SELECT",
      "qual": "((provider_id = auth.uid()) OR (client_id = auth.uid()))"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_requests",
      "policyname": "All can manage requests",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "ALL",
      "qual": "true"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_sessions",
      "policyname": "All can manage sessions",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "ALL",
      "qual": "true"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_sessions",
      "policyname": "Users can insert their own sessions",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "INSERT",
      "qual": null
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_sessions",
      "policyname": "Users can update their own sessions",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "UPDATE",
      "qual": "(EXISTS ( SELECT 1\n   FROM trackpay_users\n  WHERE ((trackpay_users.id = trackpay_sessions.provider_id) AND (trackpay_users.auth_user_id = auth.uid()))))"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_sessions",
      "policyname": "Users can view their own sessions",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "SELECT",
      "qual": "(EXISTS ( SELECT 1\n   FROM trackpay_users\n  WHERE ((trackpay_users.id = trackpay_sessions.provider_id) AND (trackpay_users.auth_user_id = auth.uid()))))"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_users",
      "policyname": "Users can insert their own profile",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "INSERT",
      "qual": null
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_users",
      "policyname": "Users can update their own profile",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "ALL",
      "qual": "true"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_users",
      "policyname": "Users can view their own profile",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "SELECT",
      "qual": "true"
    }
  ]



  ---- prod -- below ------


  -- Check RLS is enabled
  SELECT
    schemaname,
    tablename,
    rowsecurity
  FROM pg_tables
  WHERE tablename IN ('trackpay_activities', 'trackpay_invites', 'trackpay_payments','trackpay_relationship_audit', 'trackpay_relationships', 'trackpay_requests','trackpay_sessions', 'trackpay_unpaid_balances', 'trackpay_users');

  [
    {
      "schemaname": "public",
      "tablename": "trackpay_users",
      "rowsecurity": false
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_relationships",
      "rowsecurity": true
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_sessions",
      "rowsecurity": true
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_requests",
      "rowsecurity": true
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_activities",
      "rowsecurity": false
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_invites",
      "rowsecurity": false
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_relationship_audit",
      "rowsecurity": true
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_payments",
      "rowsecurity": true
    }
  ]


  -- List all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('trackpay_activities', 'trackpay_invites', 'trackpay_payments','trackpay_relationship_audit', 'trackpay_relationships', 'trackpay_requests','trackpay_sessions', 'trackpay_unpaid_balances', 'trackpay_users')
ORDER BY tablename, policyname;

[
    {
      "schemaname": "public",
      "tablename": "trackpay_activities",
      "policyname": "tp_activities_select_party",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "SELECT",
      "qual": "((provider_id = current_trackpay_user_id()) OR (client_id = current_trackpay_user_id()))"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_payments",
      "policyname": "tp_payments_insert_provider",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "INSERT",
      "qual": null
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_payments",
      "policyname": "tp_payments_select_party",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "SELECT",
      "qual": "((provider_id = current_trackpay_user_id()) OR (client_id = current_trackpay_user_id()))"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_payments",
      "policyname": "tp_payments_update_provider",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "UPDATE",
      "qual": "(provider_id = current_trackpay_user_id())"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_relationship_audit",
      "policyname": "audit_select_by_provider",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "SELECT",
      "qual": "(provider_id = auth.uid())"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_relationship_audit",
      "policyname": "tp_rel_audit_select_provider",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "SELECT",
      "qual": "(provider_id = current_trackpay_user_id())"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_relationships",
      "policyname": "tp_rels_insert_provider",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "INSERT",
      "qual": null
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_relationships",
      "policyname": "tp_rels_select_party",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "SELECT",
      "qual": "((provider_id = current_trackpay_user_id()) OR (client_id = current_trackpay_user_id()))"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_relationships",
      "policyname": "tp_rels_update_provider",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "UPDATE",
      "qual": "(provider_id = current_trackpay_user_id())"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_requests",
      "policyname": "tp_requests_insert_provider",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "INSERT",
      "qual": null
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_requests",
      "policyname": "tp_requests_select_party",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "SELECT",
      "qual": "((provider_id = current_trackpay_user_id()) OR (client_id = current_trackpay_user_id()))"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_requests",
      "policyname": "tp_requests_update_provider",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "UPDATE",
      "qual": "(provider_id = current_trackpay_user_id())"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_sessions",
      "policyname": "tp_sessions_insert_provider",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "INSERT",
      "qual": null
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_sessions",
      "policyname": "tp_sessions_select_party",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "SELECT",
      "qual": "((provider_id = current_trackpay_user_id()) OR (client_id = current_trackpay_user_id()))"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_sessions",
      "policyname": "tp_sessions_update_provider",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "UPDATE",
      "qual": "(provider_id = current_trackpay_user_id())"
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_users",
      "policyname": "Users can insert their own\n  profile",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "INSERT",
      "qual": null
    },
    {
      "schemaname": "public",
      "tablename": "trackpay_users",
      "policyname": "Users can view their own\n  profile",
      "permissive": "PERMISSIVE",
      "roles": "{public}",
      "cmd": "SELECT",
      "qual": "true"
    }
  ]


  date: oct 24 2025