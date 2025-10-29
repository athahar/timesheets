--
-- PostgreSQL database dump
--

\restrict ROgIuj76tEM44VZBrQegZvznGFEnDOCeMRpjOSyG3cfY935UJdOAkOC2QbYQeO4

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: trackpay_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."trackpay_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "provider_id" "uuid",
    "client_id" "uuid",
    "session_id" "uuid",
    "data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: TABLE "trackpay_activities"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."trackpay_activities" IS 'Activity feed and audit trail';


--
-- Name: trackpay_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."trackpay_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "invite_code" character varying(8) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "claimed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "claimed_at" timestamp with time zone,
    CONSTRAINT "trackpay_invites_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'claimed'::character varying, 'expired'::character varying])::"text"[])))
);


--
-- Name: TABLE "trackpay_invites"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."trackpay_invites" IS 'Client invitation system';


--
-- Name: trackpay_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."trackpay_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "provider_id" "uuid",
    "client_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "method" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "session_ids" "text"[],
    "status" "text" DEFAULT 'completed'::"text",
    CONSTRAINT "trackpay_payments_method_check" CHECK (("method" = ANY (ARRAY['cash'::"text", 'zelle'::"text", 'paypal'::"text", 'bank_transfer'::"text", 'other'::"text"])))
);


--
-- Name: TABLE "trackpay_payments"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."trackpay_payments" IS 'Payment records';


--
-- Name: trackpay_relationship_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."trackpay_relationship_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "reason" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: TABLE "trackpay_relationship_audit"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."trackpay_relationship_audit" IS 'Audit log for deleted relationships';


--
-- Name: trackpay_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."trackpay_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid",
    "client_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: TABLE "trackpay_relationships"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."trackpay_relationships" IS 'Provider-client associations';


--
-- Name: trackpay_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."trackpay_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "provider_id" "uuid",
    "client_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "trackpay_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'declined'::"text"])))
);


--
-- Name: TABLE "trackpay_requests"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."trackpay_requests" IS 'Payment request workflow';


--
-- Name: trackpay_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."trackpay_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid",
    "client_id" "uuid",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "duration_minutes" integer,
    "hourly_rate" numeric(10,2) NOT NULL,
    "amount_due" numeric(10,2),
    "status" "text" DEFAULT 'unpaid'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "crew_size" integer DEFAULT 1 NOT NULL,
    "person_hours" numeric(10,2),
    CONSTRAINT "trackpay_sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'unpaid'::"text", 'requested'::"text", 'paid'::"text"])))
);


--
-- Name: TABLE "trackpay_sessions"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."trackpay_sessions" IS 'Work tracking sessions';


--
-- Name: trackpay_unpaid_balances; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."trackpay_unpaid_balances" AS
 SELECT "s"."client_id",
    "s"."provider_id",
    ("sum"("s"."amount_due") - COALESCE("sum"("p"."amount"), (0)::numeric)) AS "unpaid_balance",
    "count"(
        CASE
            WHEN ("s"."status" = 'unpaid'::"text") THEN 1
            ELSE NULL::integer
        END) AS "unpaid_sessions_count",
    "count"(
        CASE
            WHEN ("s"."status" = 'requested'::"text") THEN 1
            ELSE NULL::integer
        END) AS "requested_sessions_count",
    "sum"(
        CASE
            WHEN ("s"."status" = ANY (ARRAY['unpaid'::"text", 'requested'::"text"])) THEN "s"."duration_minutes"
            ELSE 0
        END) AS "unpaid_minutes"
   FROM ("public"."trackpay_sessions" "s"
     LEFT JOIN "public"."trackpay_payments" "p" ON (("s"."id" = "p"."session_id")))
  WHERE ("s"."status" <> 'active'::"text")
  GROUP BY "s"."client_id", "s"."provider_id";


--
-- Name: trackpay_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."trackpay_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "role" "text" NOT NULL,
    "hourly_rate" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "auth_user_id" "uuid",
    "display_name" "text",
    "claimed_status" character varying(20) DEFAULT 'claimed'::character varying,
    "phone_e164" "text",
    "phone_verified_at" timestamp with time zone,
    CONSTRAINT "trackpay_users_claimed_status_check" CHECK ((("claimed_status")::"text" = ANY ((ARRAY['claimed'::character varying, 'unclaimed'::character varying])::"text"[]))),
    CONSTRAINT "trackpay_users_role_check" CHECK (("role" = ANY (ARRAY['provider'::"text", 'client'::"text"])))
);


--
-- Name: TABLE "trackpay_users"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."trackpay_users" IS 'TrackPay users: providers and clients';


--
-- Name: COLUMN "trackpay_users"."auth_user_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."trackpay_users"."auth_user_id" IS 'Links to Supabase auth.users.id for authentication';


--
-- Name: COLUMN "trackpay_users"."display_name"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."trackpay_users"."display_name" IS 'User display name for the profile';


--
-- Name: trackpay_activities trackpay_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_activities"
    ADD CONSTRAINT "trackpay_activities_pkey" PRIMARY KEY ("id");


--
-- Name: trackpay_invites trackpay_invites_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_invites"
    ADD CONSTRAINT "trackpay_invites_invite_code_key" UNIQUE ("invite_code");


--
-- Name: trackpay_invites trackpay_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_invites"
    ADD CONSTRAINT "trackpay_invites_pkey" PRIMARY KEY ("id");


--
-- Name: trackpay_payments trackpay_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_payments"
    ADD CONSTRAINT "trackpay_payments_pkey" PRIMARY KEY ("id");


--
-- Name: trackpay_relationship_audit trackpay_relationship_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_relationship_audit"
    ADD CONSTRAINT "trackpay_relationship_audit_pkey" PRIMARY KEY ("id");


--
-- Name: trackpay_relationships trackpay_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_relationships"
    ADD CONSTRAINT "trackpay_relationships_pkey" PRIMARY KEY ("id");


--
-- Name: trackpay_relationships trackpay_relationships_provider_id_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_relationships"
    ADD CONSTRAINT "trackpay_relationships_provider_id_client_id_key" UNIQUE ("provider_id", "client_id");


--
-- Name: trackpay_requests trackpay_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_requests"
    ADD CONSTRAINT "trackpay_requests_pkey" PRIMARY KEY ("id");


--
-- Name: trackpay_sessions trackpay_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_sessions"
    ADD CONSTRAINT "trackpay_sessions_pkey" PRIMARY KEY ("id");


--
-- Name: trackpay_users trackpay_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_users"
    ADD CONSTRAINT "trackpay_users_email_key" UNIQUE ("email");


--
-- Name: trackpay_users trackpay_users_phone_e164_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_users"
    ADD CONSTRAINT "trackpay_users_phone_e164_key" UNIQUE ("phone_e164");


--
-- Name: trackpay_users trackpay_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_users"
    ADD CONSTRAINT "trackpay_users_pkey" PRIMARY KEY ("id");


--
-- Name: idx_activities_provider_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_activities_provider_client" ON "public"."trackpay_activities" USING "btree" ("provider_id", "client_id");


--
-- Name: idx_payments_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_payments_session" ON "public"."trackpay_payments" USING "btree" ("session_id");


--
-- Name: idx_relationship_audit_client_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_relationship_audit_client_created" ON "public"."trackpay_relationship_audit" USING "btree" ("client_id", "created_at" DESC);


--
-- Name: idx_relationship_audit_provider_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_relationship_audit_provider_created" ON "public"."trackpay_relationship_audit" USING "btree" ("provider_id", "created_at" DESC);


--
-- Name: idx_relationships_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_relationships_client" ON "public"."trackpay_relationships" USING "btree" ("client_id");


--
-- Name: idx_relationships_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_relationships_provider" ON "public"."trackpay_relationships" USING "btree" ("provider_id");


--
-- Name: idx_requests_provider_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_requests_provider_client_status" ON "public"."trackpay_requests" USING "btree" ("provider_id", "client_id", "status");


--
-- Name: idx_sessions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_sessions_created_at" ON "public"."trackpay_sessions" USING "btree" ("created_at");


--
-- Name: idx_sessions_provider_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_sessions_provider_client" ON "public"."trackpay_sessions" USING "btree" ("provider_id", "client_id");


--
-- Name: idx_sessions_provider_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_sessions_provider_client_status" ON "public"."trackpay_sessions" USING "btree" ("provider_id", "client_id", "status");


--
-- Name: idx_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_sessions_status" ON "public"."trackpay_sessions" USING "btree" ("status");


--
-- Name: idx_trackpay_invites_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_trackpay_invites_client_id" ON "public"."trackpay_invites" USING "btree" ("client_id");


--
-- Name: idx_trackpay_invites_invite_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_trackpay_invites_invite_code" ON "public"."trackpay_invites" USING "btree" ("invite_code");


--
-- Name: idx_trackpay_invites_provider_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_trackpay_invites_provider_id" ON "public"."trackpay_invites" USING "btree" ("provider_id");


--
-- Name: idx_trackpay_invites_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_trackpay_invites_status" ON "public"."trackpay_invites" USING "btree" ("status");


--
-- Name: idx_trackpay_users_auth_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_trackpay_users_auth_user_id" ON "public"."trackpay_users" USING "btree" ("auth_user_id");


--
-- Name: idx_trackpay_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_trackpay_users_email" ON "public"."trackpay_users" USING "btree" ("email");


--
-- Name: ux_relationships_provider_client; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ux_relationships_provider_client" ON "public"."trackpay_relationships" USING "btree" ("provider_id", "client_id");


--
-- Name: trackpay_sessions trg_trackpay_sessions_person_hours; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trg_trackpay_sessions_person_hours" BEFORE INSERT OR UPDATE ON "public"."trackpay_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."trackpay_sessions_person_hours_default"();


--
-- Name: trackpay_users trigger_set_display_name_from_email; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_set_display_name_from_email" BEFORE INSERT OR UPDATE ON "public"."trackpay_users" FOR EACH ROW EXECUTE FUNCTION "public"."set_display_name_from_email"();


--
-- Name: trackpay_requests update_trackpay_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_trackpay_requests_updated_at" BEFORE UPDATE ON "public"."trackpay_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: trackpay_sessions update_trackpay_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_trackpay_sessions_updated_at" BEFORE UPDATE ON "public"."trackpay_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: trackpay_users update_trackpay_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_trackpay_users_updated_at" BEFORE UPDATE ON "public"."trackpay_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: trackpay_activities trackpay_activities_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_activities"
    ADD CONSTRAINT "trackpay_activities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."trackpay_users"("id") ON DELETE RESTRICT;


--
-- Name: trackpay_activities trackpay_activities_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_activities"
    ADD CONSTRAINT "trackpay_activities_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."trackpay_users"("id") ON DELETE RESTRICT;


--
-- Name: trackpay_activities trackpay_activities_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_activities"
    ADD CONSTRAINT "trackpay_activities_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."trackpay_sessions"("id") ON DELETE SET NULL;


--
-- Name: trackpay_invites trackpay_invites_claimed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_invites"
    ADD CONSTRAINT "trackpay_invites_claimed_by_fkey" FOREIGN KEY ("claimed_by") REFERENCES "public"."trackpay_users"("id") ON DELETE SET NULL;


--
-- Name: trackpay_invites trackpay_invites_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_invites"
    ADD CONSTRAINT "trackpay_invites_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."trackpay_users"("id") ON DELETE CASCADE;


--
-- Name: trackpay_invites trackpay_invites_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_invites"
    ADD CONSTRAINT "trackpay_invites_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."trackpay_users"("id") ON DELETE CASCADE;


--
-- Name: trackpay_payments trackpay_payments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_payments"
    ADD CONSTRAINT "trackpay_payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."trackpay_users"("id") ON DELETE RESTRICT;


--
-- Name: trackpay_payments trackpay_payments_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_payments"
    ADD CONSTRAINT "trackpay_payments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."trackpay_users"("id") ON DELETE RESTRICT;


--
-- Name: trackpay_payments trackpay_payments_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_payments"
    ADD CONSTRAINT "trackpay_payments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."trackpay_sessions"("id") ON DELETE RESTRICT;


--
-- Name: trackpay_relationships trackpay_relationships_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_relationships"
    ADD CONSTRAINT "trackpay_relationships_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."trackpay_users"("id") ON DELETE RESTRICT;


--
-- Name: trackpay_relationships trackpay_relationships_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_relationships"
    ADD CONSTRAINT "trackpay_relationships_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."trackpay_users"("id") ON DELETE RESTRICT;


--
-- Name: trackpay_requests trackpay_requests_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_requests"
    ADD CONSTRAINT "trackpay_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."trackpay_users"("id") ON DELETE RESTRICT;


--
-- Name: trackpay_requests trackpay_requests_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_requests"
    ADD CONSTRAINT "trackpay_requests_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."trackpay_users"("id") ON DELETE RESTRICT;


--
-- Name: trackpay_requests trackpay_requests_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_requests"
    ADD CONSTRAINT "trackpay_requests_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."trackpay_sessions"("id") ON DELETE SET NULL;


--
-- Name: trackpay_sessions trackpay_sessions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_sessions"
    ADD CONSTRAINT "trackpay_sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."trackpay_users"("id") ON DELETE RESTRICT;


--
-- Name: trackpay_sessions trackpay_sessions_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_sessions"
    ADD CONSTRAINT "trackpay_sessions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."trackpay_users"("id") ON DELETE RESTRICT;


--
-- Name: trackpay_users trackpay_users_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trackpay_users"
    ADD CONSTRAINT "trackpay_users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: trackpay_payments All can manage payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All can manage payments" ON "public"."trackpay_payments" USING (true);


--
-- Name: trackpay_requests All can manage requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All can manage requests" ON "public"."trackpay_requests" USING (true);


--
-- Name: trackpay_sessions All can manage sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All can manage sessions" ON "public"."trackpay_sessions" USING (true);


--
-- Name: trackpay_activities All can view activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All can view activities" ON "public"."trackpay_activities" USING (true);


--
-- Name: trackpay_relationships All can view relationships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All can view relationships" ON "public"."trackpay_relationships" USING (true);


--
-- Name: trackpay_payments Users can insert their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own payments" ON "public"."trackpay_payments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trackpay_users"
  WHERE (("trackpay_users"."id" = "trackpay_payments"."provider_id") AND ("trackpay_users"."auth_user_id" = "auth"."uid"())))));


--
-- Name: trackpay_users Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON "public"."trackpay_users" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));


--
-- Name: trackpay_sessions Users can insert their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own sessions" ON "public"."trackpay_sessions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trackpay_users"
  WHERE (("trackpay_users"."id" = "trackpay_sessions"."provider_id") AND ("trackpay_users"."auth_user_id" = "auth"."uid"())))));


--
-- Name: trackpay_users Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON "public"."trackpay_users" USING (true);


--
-- Name: trackpay_sessions Users can update their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own sessions" ON "public"."trackpay_sessions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."trackpay_users"
  WHERE (("trackpay_users"."id" = "trackpay_sessions"."provider_id") AND ("trackpay_users"."auth_user_id" = "auth"."uid"())))));


--
-- Name: trackpay_activities Users can view their own activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own activities" ON "public"."trackpay_activities" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."trackpay_users"
  WHERE (("trackpay_users"."id" = "trackpay_activities"."provider_id") AND ("trackpay_users"."auth_user_id" = "auth"."uid"())))));


--
-- Name: trackpay_payments Users can view their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own payments" ON "public"."trackpay_payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."trackpay_users"
  WHERE (("trackpay_users"."id" = "trackpay_payments"."provider_id") AND ("trackpay_users"."auth_user_id" = "auth"."uid"())))));


--
-- Name: trackpay_users Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON "public"."trackpay_users" FOR SELECT USING (true);


--
-- Name: trackpay_sessions Users can view their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sessions" ON "public"."trackpay_sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."trackpay_users"
  WHERE (("trackpay_users"."id" = "trackpay_sessions"."provider_id") AND ("trackpay_users"."auth_user_id" = "auth"."uid"())))));


--
-- Name: trackpay_relationship_audit audit_select_by_provider; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "audit_select_by_provider" ON "public"."trackpay_relationship_audit" FOR SELECT TO "authenticated" USING (("provider_id" = "auth"."uid"()));


--
-- Name: trackpay_relationships rel_select_by_party; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "rel_select_by_party" ON "public"."trackpay_relationships" FOR SELECT TO "authenticated" USING ((("provider_id" = "auth"."uid"()) OR ("client_id" = "auth"."uid"())));


--
-- Name: trackpay_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."trackpay_activities" ENABLE ROW LEVEL SECURITY;

--
-- Name: trackpay_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."trackpay_payments" ENABLE ROW LEVEL SECURITY;

--
-- Name: trackpay_relationship_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."trackpay_relationship_audit" ENABLE ROW LEVEL SECURITY;

--
-- Name: trackpay_relationships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."trackpay_relationships" ENABLE ROW LEVEL SECURITY;

--
-- Name: trackpay_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."trackpay_requests" ENABLE ROW LEVEL SECURITY;

--
-- Name: trackpay_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."trackpay_sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: trackpay_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."trackpay_users" ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict ROgIuj76tEM44VZBrQegZvznGFEnDOCeMRpjOSyG3cfY935UJdOAkOC2QbYQeO4

