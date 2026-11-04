ALTER TABLE "push_subscriptions" DROP CONSTRAINT "push_subscriptions_pkey";--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "id" text;--> statement-breakpoint
UPDATE "push_subscriptions" SET "id" = md5("endpoint" || '|' || "role" || '|' || "listing_id" || '|' || coalesce("deal_id", ''));--> statement-breakpoint
ALTER TABLE "push_subscriptions" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD PRIMARY KEY ("id");
