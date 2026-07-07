ALTER TABLE `profiles` ADD `birthTimeOfDay` varchar(16);--> statement-breakpoint
ALTER TABLE `profiles` ADD `lagnaBasis` varchar(16) DEFAULT 'ascendant';--> statement-breakpoint
ALTER TABLE `profiles` MODIFY COLUMN `birthTime` varchar(8);