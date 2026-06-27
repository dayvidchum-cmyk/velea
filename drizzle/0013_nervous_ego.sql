CREATE TABLE `natal_bodies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planet` varchar(32) NOT NULL,
	`sign` varchar(32) NOT NULL,
	`degree` varchar(16) NOT NULL,
	`house` int NOT NULL,
	`nakshatra` varchar(64),
	`pada` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `natal_bodies_id` PRIMARY KEY(`id`)
);
