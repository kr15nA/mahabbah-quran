ALTER TABLE "classes" DROP CONSTRAINT "classes_teacher_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "students" DROP CONSTRAINT "students_class_id_classes_id_fk";
--> statement-breakpoint
ALTER TABLE "classes" DROP COLUMN "teacher_id";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "class_id";