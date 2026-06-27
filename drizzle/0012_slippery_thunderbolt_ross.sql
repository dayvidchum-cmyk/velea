ALTER TABLE `time_lord_transits` ADD `coPresentPlanets` text;--> statement-breakpoint
ALTER TABLE `time_lord_transits` ADD `rahuKetuPresence` varchar(32);--> statement-breakpoint
ALTER TABLE `time_lord_transits` ADD `combustionStatus` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `time_lord_transits` ADD `closeConjunctions` text;--> statement-breakpoint
ALTER TABLE `time_lord_transits` ADD `solitaryStatus` boolean DEFAULT false NOT NULL;