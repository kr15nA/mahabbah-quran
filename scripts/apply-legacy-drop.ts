import { sql } from '@/lib/db/client'

async function runMigration() {
  console.log('--- APPLYING MIGRATION 0007_aberrant_colleen_wing.sql ---')
  
  try {
    // 1. Drop constraints
    await sql`ALTER TABLE "classes" DROP CONSTRAINT "classes_teacher_id_users_id_fk"`
    await sql`ALTER TABLE "students" DROP CONSTRAINT "students_class_id_classes_id_fk"`
    
    // 2. Drop columns
    await sql`ALTER TABLE "classes" DROP COLUMN "teacher_id"`
    await sql`ALTER TABLE "students" DROP COLUMN "class_id"`
    
    console.log('--- MIGRATION APPLIED SUCCESSFULLY ---')
  } catch (error) {
    console.error('--- MIGRATION FAILED ---')
    console.error(error)
    process.exit(1)
  }

  process.exit(0)
}

runMigration()
