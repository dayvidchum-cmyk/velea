CREATE TABLE `check_ins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`physicalEnergy` int NOT NULL,
	`mentalClarity` int NOT NULL,
	`emotionalStability` int NOT NULL,
	`creativeFlow` int NOT NULL,
	`motivation` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `check_ins_id` PRIMARY KEY(`id`)
);
