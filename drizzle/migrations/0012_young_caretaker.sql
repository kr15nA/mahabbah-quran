ALTER TABLE "finance_disbursements" DROP CONSTRAINT "finance_disbursements_status_chk";--> statement-breakpoint
ALTER TABLE "finance_disbursements" DROP CONSTRAINT "finance_disbursements_account_id_finance_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "finance_disbursements" DROP COLUMN "account_id";--> statement-breakpoint
ALTER TABLE "finance_disbursements" ADD CONSTRAINT "finance_disbursements_status_chk" CHECK ("finance_disbursements"."status" IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'CANCELLED', 'REVERSED'));