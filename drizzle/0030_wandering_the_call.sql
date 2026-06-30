CREATE TABLE `narrative_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`surface` varchar(16) NOT NULL,
	`cacheDate` varchar(10) NOT NULL,
	`inputHash` varchar(64) NOT NULL,
	`model` varchar(48) NOT NULL,
	`content` text NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `narrative_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `lifeAreas` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `lifeAreas` text;