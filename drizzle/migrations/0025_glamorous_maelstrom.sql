CREATE TABLE "institution_settings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"institution_name" text DEFAULT 'Yayasan Rumah Tahfizh Mahabbah Qur''an Indonesia' NOT NULL,
	"short_name" varchar(100) DEFAULT 'Mahabbah Qur''an',
	"address" text,
	"phone" varchar(50),
	"email" varchar(100),
	"min_attendance_pct" integer DEFAULT 70 NOT NULL,
	"daily_report_schedule" varchar(10) DEFAULT '16:30' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" bigint
);
--> statement-breakpoint
ALTER TABLE "institution_settings" ADD CONSTRAINT "institution_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;