CREATE TABLE "tahfiz_surah_coverage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"surah_id" bigint NOT NULL,
	"ayah_start" smallint NOT NULL,
	"ayah_end" smallint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ayah_start_check" CHECK ("tahfiz_surah_coverage"."ayah_start" >= 1),
	CONSTRAINT "ayah_end_check" CHECK ("tahfiz_surah_coverage"."ayah_end" >= "tahfiz_surah_coverage"."ayah_start")
);
--> statement-breakpoint
CREATE TABLE "tahfiz_targets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"academic_year_id" bigint NOT NULL,
	"start_surah_id" bigint NOT NULL,
	"start_ayah" smallint NOT NULL,
	"end_surah_id" bigint NOT NULL,
	"end_ayah" smallint NOT NULL,
	"status" varchar(20) NOT NULL,
	"supersedes_target_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tahfiz_targets_start_surah_check" CHECK ("tahfiz_targets"."start_surah_id" > 0),
	CONSTRAINT "tahfiz_targets_end_surah_check" CHECK ("tahfiz_targets"."end_surah_id" > 0)
);
--> statement-breakpoint
ALTER TABLE "tahfiz_surah_coverage" ADD CONSTRAINT "tahfiz_surah_coverage_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tahfiz_surah_coverage" ADD CONSTRAINT "tahfiz_surah_coverage_surah_id_surahs_id_fk" FOREIGN KEY ("surah_id") REFERENCES "public"."surahs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tahfiz_targets" ADD CONSTRAINT "tahfiz_targets_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tahfiz_targets" ADD CONSTRAINT "tahfiz_targets_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tahfiz_targets" ADD CONSTRAINT "tahfiz_targets_start_surah_id_surahs_id_fk" FOREIGN KEY ("start_surah_id") REFERENCES "public"."surahs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tahfiz_targets" ADD CONSTRAINT "tahfiz_targets_end_surah_id_surahs_id_fk" FOREIGN KEY ("end_surah_id") REFERENCES "public"."surahs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tahfiz_targets" ADD CONSTRAINT "tahfiz_targets_supersedes_target_id_tahfiz_targets_id_fk" FOREIGN KEY ("supersedes_target_id") REFERENCES "public"."tahfiz_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tahfiz_coverage_student_surah_idx" ON "tahfiz_surah_coverage" USING btree ("student_id","surah_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tahfiz_targets_active_unique" ON "tahfiz_targets" USING btree ("student_id","academic_year_id") WHERE "tahfiz_targets"."status" = 'ACTIVE';