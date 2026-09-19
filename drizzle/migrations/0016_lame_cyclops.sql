CREATE TABLE "tasmi_sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"examiner_id" bigint NOT NULL,
	"mode" varchar(20) NOT NULL,
	"surah_id" bigint,
	"start_juz" smallint,
	"end_juz" smallint,
	"session_date" date NOT NULL,
	"score" smallint,
	"status" varchar(20) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasmi_sessions_mode_chk" CHECK ("tasmi_sessions"."mode" IN ('SURAH', 'JUZ_RANGE')),
	CONSTRAINT "tasmi_sessions_status_chk" CHECK ("tasmi_sessions"."status" IN ('PASSED', 'NEEDS_REVIEW')),
	CONSTRAINT "tasmi_sessions_mode_payload_chk" CHECK (("tasmi_sessions"."mode" = 'SURAH' AND "tasmi_sessions"."surah_id" IS NOT NULL AND "tasmi_sessions"."start_juz" IS NULL AND "tasmi_sessions"."end_juz" IS NULL) OR ("tasmi_sessions"."mode" = 'JUZ_RANGE' AND "tasmi_sessions"."surah_id" IS NULL AND "tasmi_sessions"."start_juz" IS NOT NULL AND "tasmi_sessions"."end_juz" IS NOT NULL)),
	CONSTRAINT "tasmi_sessions_juz_bounds_chk" CHECK ("tasmi_sessions"."mode" != 'JUZ_RANGE' OR ("tasmi_sessions"."start_juz" BETWEEN 1 AND 30 AND "tasmi_sessions"."end_juz" BETWEEN 1 AND 30 AND "tasmi_sessions"."start_juz" <= "tasmi_sessions"."end_juz")),
	CONSTRAINT "tasmi_sessions_score_bounds_chk" CHECK ("tasmi_sessions"."score" IS NULL OR ("tasmi_sessions"."score" >= 0 AND "tasmi_sessions"."score" <= 100))
);
--> statement-breakpoint
ALTER TABLE "tasmi_sessions" ADD CONSTRAINT "tasmi_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasmi_sessions" ADD CONSTRAINT "tasmi_sessions_examiner_id_users_id_fk" FOREIGN KEY ("examiner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasmi_sessions" ADD CONSTRAINT "tasmi_sessions_surah_id_surahs_id_fk" FOREIGN KEY ("surah_id") REFERENCES "public"."surahs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tasmi_student_date" ON "tasmi_sessions" USING btree ("student_id","session_date");--> statement-breakpoint
CREATE INDEX "idx_tasmi_mode" ON "tasmi_sessions" USING btree ("mode");