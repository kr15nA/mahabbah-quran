CREATE TABLE "finance_billing_run_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" bigint NOT NULL,
	"student_id" bigint NOT NULL,
	"assignment_id" bigint NOT NULL,
	"invoice_id" bigint,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"error_code" varchar(50),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_billing_run_items_status_chk" CHECK ("finance_billing_run_items"."status" IN ('PENDING', 'GENERATED', 'SKIPPED_EXISTING', 'FAILED'))
);
--> statement-breakpoint
CREATE TABLE "finance_billing_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"academic_year_id" bigint NOT NULL,
	"fee_type_id" bigint NOT NULL,
	"period" varchar(7) NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"started_by" bigint,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"eligible_count" integer DEFAULT 0 NOT NULL,
	"generated_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_billing_runs_status_chk" CHECK ("finance_billing_runs"."status" IN ('PENDING', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED')),
	CONSTRAINT "finance_billing_runs_period_chk" CHECK ("finance_billing_runs"."period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "finance_billing_runs_eligible_chk" CHECK ("finance_billing_runs"."eligible_count" >= 0),
	CONSTRAINT "finance_billing_runs_generated_chk" CHECK ("finance_billing_runs"."generated_count" >= 0),
	CONSTRAINT "finance_billing_runs_skipped_chk" CHECK ("finance_billing_runs"."skipped_count" >= 0),
	CONSTRAINT "finance_billing_runs_failed_chk" CHECK ("finance_billing_runs"."failed_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "finance_recurring_billing_configs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"fee_type_id" bigint NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"due_day_of_month" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_recurring_billing_configs_fee_type_id_unique" UNIQUE("fee_type_id"),
	CONSTRAINT "finance_rec_billing_due_day_chk" CHECK ("finance_recurring_billing_configs"."due_day_of_month" BETWEEN 1 AND 28)
);
--> statement-breakpoint
CREATE TABLE "finance_student_fee_assignments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"academic_year_id" bigint NOT NULL,
	"fee_type_id" bigint NOT NULL,
	"start_period" varchar(7) NOT NULL,
	"end_period" varchar(7),
	"status" varchar(20) DEFAULT 'VALID' NOT NULL,
	"created_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_fee_assign_start_chk" CHECK ("finance_student_fee_assignments"."start_period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "finance_fee_assign_end_chk" CHECK ("finance_student_fee_assignments"."end_period" IS NULL OR ("finance_student_fee_assignments"."end_period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND "finance_student_fee_assignments"."end_period" >= "finance_student_fee_assignments"."start_period")),
	CONSTRAINT "finance_fee_assign_status_chk" CHECK ("finance_student_fee_assignments"."status" IN ('VALID', 'VOIDED'))
);
--> statement-breakpoint
ALTER TABLE "finance_billing_run_items" ADD CONSTRAINT "finance_billing_run_items_run_id_finance_billing_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."finance_billing_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_billing_run_items" ADD CONSTRAINT "finance_billing_run_items_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_billing_run_items" ADD CONSTRAINT "finance_billing_run_items_assignment_id_finance_student_fee_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."finance_student_fee_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_billing_run_items" ADD CONSTRAINT "finance_billing_run_items_invoice_id_finance_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."finance_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_billing_runs" ADD CONSTRAINT "finance_billing_runs_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_billing_runs" ADD CONSTRAINT "finance_billing_runs_fee_type_id_finance_fee_types_id_fk" FOREIGN KEY ("fee_type_id") REFERENCES "public"."finance_fee_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_billing_runs" ADD CONSTRAINT "finance_billing_runs_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_recurring_billing_configs" ADD CONSTRAINT "finance_recurring_billing_configs_fee_type_id_finance_fee_types_id_fk" FOREIGN KEY ("fee_type_id") REFERENCES "public"."finance_fee_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_student_fee_assignments" ADD CONSTRAINT "finance_student_fee_assignments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_student_fee_assignments" ADD CONSTRAINT "finance_student_fee_assignments_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_student_fee_assignments" ADD CONSTRAINT "finance_student_fee_assignments_fee_type_id_finance_fee_types_id_fk" FOREIGN KEY ("fee_type_id") REFERENCES "public"."finance_fee_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_student_fee_assignments" ADD CONSTRAINT "finance_student_fee_assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_finance_billing_run_items_uniq" ON "finance_billing_run_items" USING btree ("run_id","assignment_id");--> statement-breakpoint
CREATE INDEX "idx_finance_billing_run_items_status" ON "finance_billing_run_items" USING btree ("run_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_finance_billing_runs_logical" ON "finance_billing_runs" USING btree ("academic_year_id","fee_type_id","period");--> statement-breakpoint
CREATE INDEX "idx_finance_assign_eligibility" ON "finance_student_fee_assignments" USING btree ("academic_year_id","fee_type_id","status","start_period","end_period");--> statement-breakpoint
CREATE INDEX "idx_finance_assign_student_hist" ON "finance_student_fee_assignments" USING btree ("student_id","academic_year_id");