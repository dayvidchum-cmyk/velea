ALTER TABLE `tasks` ADD `cognitiveLoad` enum('Low','Medium','High') DEFAULT 'Medium';--> statement-breakpoint
ALTER TABLE `tasks` ADD `physicalLoad` enum('Low','Medium','High') DEFAULT 'Low';--> statement-breakpoint
ALTER TABLE `tasks` ADD `creativeRequired` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `tasks` ADD `socialRequired` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `tasks` ADD `emotionalLoad` enum('Low','Medium','High') DEFAULT 'Low';