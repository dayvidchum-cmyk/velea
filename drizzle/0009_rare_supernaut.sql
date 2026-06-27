CREATE TABLE `profection_years` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`age` int NOT NULL,
	`activatedHouse` int NOT NULL,
	`activatedSign` varchar(32) NOT NULL,
	`timeLord` varchar(32) NOT NULL,
	`yearStart` varchar(10) NOT NULL,
	`yearEnd` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profection_years_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `birthDate` varchar(10);