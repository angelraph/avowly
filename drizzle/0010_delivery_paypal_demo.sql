ALTER TABLE "deals" ADD COLUMN "shipping" jsonb;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "delivery" text DEFAULT 'meetup' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "paypal_identity" jsonb;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "demo" boolean DEFAULT false NOT NULL;