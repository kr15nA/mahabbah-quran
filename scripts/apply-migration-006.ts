import { sql } from '../lib/db/client'

async function run() {
  await sql`ALTER TABLE "learning_reports" ADD COLUMN "class_id" bigint`
  await sql`ALTER TABLE "learning_reports" ADD CONSTRAINT "learning_reports_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action`
  console.log('Migration applied successfully')
}
run().catch(console.error)
