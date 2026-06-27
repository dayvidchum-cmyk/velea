ALTER TABLE `panchang` MODIFY COLUMN `mode` varchar(32) NOT NULL DEFAULT 'Build';--> statement-breakpoint
ALTER TABLE `users` ADD `locationCity` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `locationLat` varchar(24);--> statement-breakpoint
ALTER TABLE `users` ADD `locationLon` varchar(24);--> statement-breakpoint
ALTER TABLE `users` ADD `locationTimezone` varchar(64);