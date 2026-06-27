CREATE TABLE `panchang` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`display` varchar(32) NOT NULL,
	`sunrise` varchar(16) NOT NULL,
	`moonSign` varchar(64) NOT NULL,
	`nakshatra` varchar(64) NOT NULL,
	`tithi` varchar(64) NOT NULL,
	`mode` enum('ACTION','BUILD','RESTRAINT','SELECTIVE ACTION') NOT NULL,
	`instruction` text NOT NULL,
	CONSTRAINT `panchang_id` PRIMARY KEY(`id`),
	CONSTRAINT `panchang_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`mode` enum('Restraint','Build','Selective','Action') NOT NULL DEFAULT 'Build',
	`priority` enum('High','Medium','Low') NOT NULL DEFAULT 'Medium',
	`isPinned` boolean NOT NULL DEFAULT false,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
