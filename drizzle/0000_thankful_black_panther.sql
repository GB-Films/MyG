CREATE TABLE `gift_confirmations` (
	`id` text PRIMARY KEY NOT NULL,
	`gift_id` text NOT NULL,
	`gift_name` text NOT NULL,
	`amount` integer NOT NULL,
	`giver_name` text NOT NULL,
	`email` text NOT NULL,
	`dedication` text NOT NULL,
	`status` text DEFAULT 'transfer_declared' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rsvps` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`attendance` text NOT NULL,
	`guest_count` integer DEFAULT 1 NOT NULL,
	`guest_names` text DEFAULT '' NOT NULL,
	`dietary` text DEFAULT '' NOT NULL,
	`transport` text DEFAULT 'no' NOT NULL,
	`song` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
