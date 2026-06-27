CREATE TABLE `time_lord_transits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profectionYearId` int NOT NULL,
	`userId` int NOT NULL,
	`timeLord` varchar(32) NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`sign` varchar(32) NOT NULL,
	`house` int NOT NULL,
	`nakshatra` varchar(64),
	`isRetrograde` boolean NOT NULL DEFAULT false,
	`condition` text NOT NULL,
	`operationalMeaning` text NOT NULL,
	`recommendedUse` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `time_lord_transits_id` PRIMARY KEY(`id`)
);
