ALTER TABLE "student_parents" ADD COLUMN "can_view_academic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "student_parents" ADD COLUMN "can_view_finance" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "student_parents" ADD COLUMN "can_receive_notification" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "student_parents" ADD COLUMN "can_manage_learning" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "student_parents" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "student_parents" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "student_parents" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
UPDATE "student_parents" SET "relationship" = 'FATHER' WHERE "relationship" = 'ayah';--> statement-breakpoint
UPDATE "student_parents" SET "relationship" = 'MOTHER' WHERE "relationship" = 'bunda';--> statement-breakpoint
UPDATE "student_parents" SET "relationship" = 'GUARDIAN' WHERE "relationship" = 'wali';--> statement-breakpoint
UPDATE "student_parents" SET "relationship" = 'OTHER' WHERE "relationship" NOT IN ('FATHER', 'MOTHER', 'GRANDFATHER', 'GRANDMOTHER', 'BROTHER', 'SISTER', 'GUARDIAN');--> statement-breakpoint
UPDATE "student_parents" SET "can_view_academic" = true, "can_view_finance" = true, "is_active" = true, "updated_at" = now();--> statement-breakpoint
CREATE UNIQUE INDEX "student_parents_active_pair_unq" ON "student_parents" USING btree ("student_id","parent_id") WHERE "student_parents"."is_active" = TRUE AND "student_parents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "student_parents_active_primary_unq" ON "student_parents" USING btree ("student_id") WHERE "student_parents"."is_primary" = TRUE AND "student_parents"."is_active" = TRUE AND "student_parents"."deleted_at" IS NULL;