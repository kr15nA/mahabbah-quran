CREATE TABLE "login_rate_limits" (
	"key_hash" varchar(64) PRIMARY KEY NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_login_rate_limits_expires_at" ON "login_rate_limits" USING btree ("expires_at");