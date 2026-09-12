CREATE TABLE "attendance" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"class_id" bigint NOT NULL,
	"teacher_id" bigint NOT NULL,
	"attendance_date" date NOT NULL,
	"status" varchar(10) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"program_id" bigint NOT NULL,
	"teacher_id" bigint NOT NULL,
	"name" varchar(100) NOT NULL,
	"level" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hafalan_records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"teacher_id" bigint NOT NULL,
	"surah_id" bigint NOT NULL,
	"session_date" date NOT NULL,
	"ayah_start" smallint NOT NULL,
	"ayah_end" smallint NOT NULL,
	"type" varchar(20) NOT NULL,
	"score" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_reports" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"teacher_id" bigint NOT NULL,
	"report_date" date NOT NULL,
	"attendance_status" varchar(10) NOT NULL,
	"hafalan_record_id" bigint,
	"tahsin_record_id" bigint,
	"hafalan_score" smallint,
	"tahsin_score" smallint,
	"adab_score" smallint,
	"teacher_notes" varchar(200),
	"ai_report_text" text,
	"ai_parent_advice" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"sent_to_parent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"type" varchar(30) NOT NULL,
	"reference_type" varchar(50),
	"reference_id" bigint,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_shares" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"report_id" bigint NOT NULL,
	"creator_id" bigint NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_shares_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "student_parents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"parent_id" bigint NOT NULL,
	"relationship" varchar(30) DEFAULT 'wali' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"class_id" bigint NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"nickname" varchar(100),
	"photo_url" text,
	"date_of_birth" date,
	"gender" varchar(10),
	"enrollment_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "surahs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"number" smallint NOT NULL,
	"name_arabic" varchar(100) NOT NULL,
	"name_latin" varchar(100) NOT NULL,
	"name_translation" varchar(150),
	"total_ayahs" smallint NOT NULL,
	"juz_start" smallint NOT NULL,
	"juz_end" smallint NOT NULL,
	CONSTRAINT "surahs_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "tahsin_records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"teacher_id" bigint NOT NULL,
	"session_date" date NOT NULL,
	"makhraj_score" smallint,
	"tajwid_score" smallint,
	"kelancaran_score" smallint,
	"ghunnah_score" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"avatar_url" text,
	"fcm_token" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hafalan_records" ADD CONSTRAINT "hafalan_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hafalan_records" ADD CONSTRAINT "hafalan_records_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hafalan_records" ADD CONSTRAINT "hafalan_records_surah_id_surahs_id_fk" FOREIGN KEY ("surah_id") REFERENCES "public"."surahs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_reports" ADD CONSTRAINT "learning_reports_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_reports" ADD CONSTRAINT "learning_reports_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_reports" ADD CONSTRAINT "learning_reports_hafalan_record_id_hafalan_records_id_fk" FOREIGN KEY ("hafalan_record_id") REFERENCES "public"."hafalan_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_reports" ADD CONSTRAINT "learning_reports_tahsin_record_id_tahsin_records_id_fk" FOREIGN KEY ("tahsin_record_id") REFERENCES "public"."tahsin_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_report_id_learning_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."learning_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tahsin_records" ADD CONSTRAINT "tahsin_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tahsin_records" ADD CONSTRAINT "tahsin_records_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_report_shares_token_hash" ON "report_shares" USING btree ("token_hash");