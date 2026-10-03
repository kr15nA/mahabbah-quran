CREATE TABLE "rate_limits" (
	"namespace" text NOT NULL,
	"subject_key" text NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limits_namespace_subject_key_pk" PRIMARY KEY("namespace","subject_key")
);
