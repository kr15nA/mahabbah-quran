ALTER TABLE "finance_fee_types" ADD COLUMN "category_id" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_fee_types" ADD COLUMN "receivable_account_id" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_fee_types" ADD COLUMN "income_account_id" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_fee_types" ADD COLUMN "default_amount" bigint;--> statement-breakpoint
ALTER TABLE "finance_fee_types" ADD COLUMN "billing_frequency" varchar(20) DEFAULT 'ONE_TIME' NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_fee_types" ADD CONSTRAINT "finance_fee_types_category_id_finance_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."finance_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_fee_types" ADD CONSTRAINT "finance_fee_types_receivable_account_id_finance_accounts_id_fk" FOREIGN KEY ("receivable_account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_fee_types" ADD CONSTRAINT "finance_fee_types_income_account_id_finance_accounts_id_fk" FOREIGN KEY ("income_account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_finance_invoices_monthly_dup" ON "finance_invoices" USING btree ("student_id","academic_year_id","fee_type_id","period") WHERE "finance_invoices"."period" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_fee_types" ADD CONSTRAINT "finance_fee_types_freq_chk" CHECK ("finance_fee_types"."billing_frequency" IN ('ONE_TIME', 'MONTHLY', 'CUSTOM'));--> statement-breakpoint
ALTER TABLE "finance_fee_types" ADD CONSTRAINT "finance_fee_types_amount_chk" CHECK ("finance_fee_types"."default_amount" > 0 OR "finance_fee_types"."default_amount" IS NULL);