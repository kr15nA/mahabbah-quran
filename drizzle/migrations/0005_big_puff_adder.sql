DROP INDEX IF EXISTS "attendance_unique_per_day";
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_unique_per_day" UNIQUE("student_id","attendance_date");