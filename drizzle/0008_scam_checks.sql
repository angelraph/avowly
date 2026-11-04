CREATE TABLE "scam_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"score" integer NOT NULL,
	"headline" text NOT NULL,
	"reasons" jsonb NOT NULL,
	"product" text,
	"price_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
