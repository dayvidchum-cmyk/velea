ALTER TABLE `panchang` MODIFY COLUMN `mode` enum('Activate','Build','Selective','Restraint','Flex','ACTION','BUILD','RESTRAINT','SELECTIVE ACTION') NOT NULL;--> statement-breakpoint
ALTER TABLE `panchang` ADD `moonLongitude` varchar(32) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `panchang` ADD `houseActivated` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `panchang` ADD `nakshatraPada` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `panchang` ADD `tithiPaksha` varchar(16) DEFAULT 'Shukla' NOT NULL;--> statement-breakpoint
ALTER TABLE `panchang` ADD `calculatedAt` timestamp DEFAULT (now());