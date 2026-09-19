CREATE TABLE "finance_invoice_scholarships" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"invoice_id" bigint NOT NULL,
	"student_scholarship_id" bigint NOT NULL,
	"scholarship_program_id" bigint NOT NULL,
	"calculation_type_snapshot" varchar(20) NOT NULL,
	"percentage_basis_points_snapshot" integer,
	"fixed_amount_snapshot" bigint,
	"gross_eligible_amount" bigint NOT NULL,
	"scholarship_amount" bigint NOT NULL,
	"fund_id_snapshot" bigint,
	"scholarship_account_id_snapshot" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_invoice_scholarships_amounts_chk" CHECK ("finance_invoice_scholarships"."gross_eligible_amount" >= 0 AND "finance_invoice_scholarships"."scholarship_amount" >= 0 AND "finance_invoice_scholarships"."scholarship_amount" <= "finance_invoice_scholarships"."gross_eligible_amount"),
	CONSTRAINT "finance_invoice_scholarships_calc_type_chk" CHECK ("finance_invoice_scholarships"."calculation_type_snapshot" IN ('PERCENTAGE', 'FIXED_AMOUNT', 'FULL'))
);
--> statement-breakpoint
CREATE TABLE "scholarship_program_fee_types" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"program_id" bigint NOT NULL,
	"fee_type_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scholarship_programs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"calculation_type" varchar(20) NOT NULL,
	"percentage_basis_points" integer,
	"fixed_amount" bigint,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"funding_fund_id" bigint,
	"scholarship_account_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" bigint,
	"updated_by" bigint,
	CONSTRAINT "scholarship_programs_calc_type_chk" CHECK ("scholarship_programs"."calculation_type" IN ('PERCENTAGE', 'FIXED_AMOUNT', 'FULL')),
	CONSTRAINT "scholarship_programs_pct_range_chk" CHECK ("scholarship_programs"."percentage_basis_points" IS NULL OR ("scholarship_programs"."percentage_basis_points" > 0 AND "scholarship_programs"."percentage_basis_points" <= 10000)),
	CONSTRAINT "scholarship_programs_fixed_amount_chk" CHECK ("scholarship_programs"."fixed_amount" IS NULL OR "scholarship_programs"."fixed_amount" > 0),
	CONSTRAINT "scholarship_programs_calc_constraints_chk" CHECK (
    ("scholarship_programs"."calculation_type" = 'PERCENTAGE' AND "scholarship_programs"."percentage_basis_points" IS NOT NULL AND "scholarship_programs"."fixed_amount" IS NULL) OR
    ("scholarship_programs"."calculation_type" = 'FIXED_AMOUNT' AND "scholarship_programs"."fixed_amount" IS NOT NULL AND "scholarship_programs"."percentage_basis_points" IS NULL) OR
    ("scholarship_programs"."calculation_type" = 'FULL' AND "scholarship_programs"."fixed_amount" IS NULL AND "scholarship_programs"."percentage_basis_points" IS NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "student_scholarships" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"scholarship_program_id" bigint NOT NULL,
	"academic_year_id" bigint NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "student_scholarships_status_chk" CHECK ("student_scholarships"."status" IN ('ACTIVE', 'REVOKED', 'EXPIRED'))
);
--> statement-breakpoint
ALTER TABLE "finance_invoice_scholarships" ADD CONSTRAINT "finance_invoice_scholarships_invoice_id_finance_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."finance_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_invoice_scholarships" ADD CONSTRAINT "finance_invoice_scholarships_student_scholarship_id_student_scholarships_id_fk" FOREIGN KEY ("student_scholarship_id") REFERENCES "public"."student_scholarships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_invoice_scholarships" ADD CONSTRAINT "finance_invoice_scholarships_scholarship_program_id_scholarship_programs_id_fk" FOREIGN KEY ("scholarship_program_id") REFERENCES "public"."scholarship_programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_invoice_scholarships" ADD CONSTRAINT "finance_invoice_scholarships_fund_id_snapshot_finance_funds_id_fk" FOREIGN KEY ("fund_id_snapshot") REFERENCES "public"."finance_funds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_invoice_scholarships" ADD CONSTRAINT "finance_invoice_scholarships_scholarship_account_id_snapshot_finance_accounts_id_fk" FOREIGN KEY ("scholarship_account_id_snapshot") REFERENCES "public"."finance_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_program_fee_types" ADD CONSTRAINT "scholarship_program_fee_types_program_id_scholarship_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."scholarship_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_program_fee_types" ADD CONSTRAINT "scholarship_program_fee_types_fee_type_id_finance_fee_types_id_fk" FOREIGN KEY ("fee_type_id") REFERENCES "public"."finance_fee_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_programs" ADD CONSTRAINT "scholarship_programs_funding_fund_id_finance_funds_id_fk" FOREIGN KEY ("funding_fund_id") REFERENCES "public"."finance_funds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_programs" ADD CONSTRAINT "scholarship_programs_scholarship_account_id_finance_accounts_id_fk" FOREIGN KEY ("scholarship_account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_programs" ADD CONSTRAINT "scholarship_programs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_programs" ADD CONSTRAINT "scholarship_programs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_scholarships" ADD CONSTRAINT "student_scholarships_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_scholarships" ADD CONSTRAINT "student_scholarships_scholarship_program_id_scholarship_programs_id_fk" FOREIGN KEY ("scholarship_program_id") REFERENCES "public"."scholarship_programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_scholarships" ADD CONSTRAINT "student_scholarships_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_finance_invoice_scholarships_invoice" ON "finance_invoice_scholarships" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_scholarship_program_fee_types_uniq" ON "scholarship_program_fee_types" USING btree ("program_id","fee_type_id");--> statement-breakpoint
CREATE INDEX "idx_student_scholarships_active" ON "student_scholarships" USING btree ("student_id","academic_year_id","status");