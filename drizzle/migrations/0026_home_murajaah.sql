CREATE TABLE IF NOT EXISTS "home_murajaah_records" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "student_id" bigint NOT NULL REFERENCES "students"("id"),
  "parent_user_id" bigint NOT NULL REFERENCES "users"("id"),
  "surah_id" bigint NOT NULL REFERENCES "surahs"("id"),
  "session_date" date NOT NULL,
  "ayah_start" smallint NOT NULL,
  "ayah_end" smallint NOT NULL,
  "notes" text,
  "status" varchar(20) DEFAULT 'PENDING' NOT NULL,
  "verified_by_teacher_id" bigint REFERENCES "users"("id"),
  "verified_at" timestamp with time zone,
  "verification_notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "home_murajaah_ayah_start_check" CHECK ("ayah_start" >= 1),
  CONSTRAINT "home_murajaah_ayah_end_check" CHECK ("ayah_end" >= "ayah_start")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "home_murajaah_student_date_idx" ON "home_murajaah_records" ("student_id", "session_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "home_murajaah_status_idx" ON "home_murajaah_records" ("status");