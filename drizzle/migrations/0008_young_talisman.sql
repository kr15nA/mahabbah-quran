CREATE TABLE "finance_accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "finance_campaigns" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"domain" varchar(50) NOT NULL,
	"default_fund_id" bigint,
	"start_date" date,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_campaigns_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "finance_categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) NOT NULL,
	"domain" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "finance_category_funds" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"category_id" bigint NOT NULL,
	"fund_id" bigint NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_disbursements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"disbursement_number" varchar(50) NOT NULL,
	"fund_id" bigint NOT NULL,
	"category_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"amount" bigint NOT NULL,
	"transaction_date" date NOT NULL,
	"description" text NOT NULL,
	"beneficiary_name" varchar(255),
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"requested_by" bigint,
	"approved_by" bigint,
	"paid_by" bigint,
	"approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_disbursements_disbursement_number_unique" UNIQUE("disbursement_number")
);
--> statement-breakpoint
CREATE TABLE "finance_fee_types" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"default_fund_id" bigint,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "finance_fee_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "finance_funds" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"fund_type" varchar(50) NOT NULL,
	"restriction_type" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_funds_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "finance_invoices" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"student_id" bigint NOT NULL,
	"academic_year_id" bigint NOT NULL,
	"fee_type_id" bigint NOT NULL,
	"period" varchar(50),
	"description" text,
	"amount" bigint NOT NULL,
	"due_date" date NOT NULL,
	"issued_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"created_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "finance_journal_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"journal_number" varchar(50) NOT NULL,
	"transaction_date" date NOT NULL,
	"description" text NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_id" bigint NOT NULL,
	"source_event" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_by" bigint,
	"posted_by" bigint,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reversal_of_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_journal_entries_journal_number_unique" UNIQUE("journal_number")
);
--> statement-breakpoint
CREATE TABLE "finance_journal_lines" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"journal_entry_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"fund_id" bigint,
	"debit" bigint DEFAULT 0 NOT NULL,
	"credit" bigint DEFAULT 0 NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "finance_number_sequences" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"document_type" varchar(20) NOT NULL,
	"year" smallint NOT NULL,
	"last_number" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_parties" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"email" varchar(255),
	"address" text,
	"party_type" varchar(50) NOT NULL,
	"user_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_payment_allocations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"payment_id" bigint NOT NULL,
	"invoice_id" bigint NOT NULL,
	"allocated_amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_payments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"payment_number" varchar(50) NOT NULL,
	"student_id" bigint NOT NULL,
	"amount" bigint NOT NULL,
	"payment_date" date NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"destination_account_id" bigint,
	"reference_number" varchar(100),
	"notes" text,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"received_by" bigint,
	"confirmed_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_payments_payment_number_unique" UNIQUE("payment_number")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" bigint NOT NULL,
	"permission_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" bigint NOT NULL,
	"role_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ziswaf_receipt_allocations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"receipt_id" bigint NOT NULL,
	"fund_id" bigint NOT NULL,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ziswaf_receipts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"receipt_number" varchar(50) NOT NULL,
	"party_id" bigint,
	"ziswaf_type" varchar(50) NOT NULL,
	"category_id" bigint NOT NULL,
	"amount" bigint NOT NULL,
	"received_date" date NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"destination_account_id" bigint NOT NULL,
	"reference_number" varchar(100),
	"notes" text,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"received_by" bigint,
	"confirmed_by" bigint,
	"campaign_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ziswaf_receipts_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
ALTER TABLE "finance_campaigns" ADD CONSTRAINT "finance_campaigns_default_fund_id_finance_funds_id_fk" FOREIGN KEY ("default_fund_id") REFERENCES "public"."finance_funds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_category_funds" ADD CONSTRAINT "finance_category_funds_category_id_finance_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."finance_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_category_funds" ADD CONSTRAINT "finance_category_funds_fund_id_finance_funds_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."finance_funds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_disbursements" ADD CONSTRAINT "finance_disbursements_fund_id_finance_funds_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."finance_funds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_disbursements" ADD CONSTRAINT "finance_disbursements_category_id_finance_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."finance_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_disbursements" ADD CONSTRAINT "finance_disbursements_account_id_finance_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_disbursements" ADD CONSTRAINT "finance_disbursements_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_disbursements" ADD CONSTRAINT "finance_disbursements_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_disbursements" ADD CONSTRAINT "finance_disbursements_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_fee_types" ADD CONSTRAINT "finance_fee_types_default_fund_id_finance_funds_id_fk" FOREIGN KEY ("default_fund_id") REFERENCES "public"."finance_funds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_fee_type_id_finance_fee_types_id_fk" FOREIGN KEY ("fee_type_id") REFERENCES "public"."finance_fee_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_journal_entries" ADD CONSTRAINT "finance_journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_journal_entries" ADD CONSTRAINT "finance_journal_entries_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_journal_entry_id_finance_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."finance_journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_account_id_finance_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_fund_id_finance_funds_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."finance_funds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_parties" ADD CONSTRAINT "finance_parties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_payment_allocations" ADD CONSTRAINT "finance_payment_allocations_payment_id_finance_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."finance_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_payment_allocations" ADD CONSTRAINT "finance_payment_allocations_invoice_id_finance_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."finance_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_destination_account_id_finance_accounts_id_fk" FOREIGN KEY ("destination_account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ziswaf_receipt_allocations" ADD CONSTRAINT "ziswaf_receipt_allocations_receipt_id_ziswaf_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."ziswaf_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ziswaf_receipt_allocations" ADD CONSTRAINT "ziswaf_receipt_allocations_fund_id_finance_funds_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."finance_funds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ziswaf_receipts" ADD CONSTRAINT "ziswaf_receipts_party_id_finance_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."finance_parties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ziswaf_receipts" ADD CONSTRAINT "ziswaf_receipts_category_id_finance_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."finance_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ziswaf_receipts" ADD CONSTRAINT "ziswaf_receipts_destination_account_id_finance_accounts_id_fk" FOREIGN KEY ("destination_account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ziswaf_receipts" ADD CONSTRAINT "ziswaf_receipts_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ziswaf_receipts" ADD CONSTRAINT "ziswaf_receipts_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ziswaf_receipts" ADD CONSTRAINT "ziswaf_receipts_campaign_id_finance_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."finance_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_finance_cat_fund" ON "finance_category_funds" USING btree ("category_id","fund_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_finance_journal_source" ON "finance_journal_entries" USING btree ("source_type","source_id","source_event");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_finance_seq_doc_year" ON "finance_number_sequences" USING btree ("document_type","year");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_permissions_pk" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_roles_pk" ON "user_roles" USING btree ("user_id","role_id");