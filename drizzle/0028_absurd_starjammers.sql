CREATE TABLE `sessions` (
	`token` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_token` PRIMARY KEY(`token`)
);
--> statement-breakpoint
ALTER TABLE `profile_natal_bodies` ADD `isRetrograde` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `profiles` ADD `linkedUserId` int;