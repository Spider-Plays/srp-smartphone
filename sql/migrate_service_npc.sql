-- NPC service contracts + worker XP/reputation (auto-created on resource start; run manually if needed)

CREATE TABLE IF NOT EXISTS `sr_phone_service_worker_stats` (
    `citizenid` VARCHAR(50) NOT NULL,
    `service_type` VARCHAR(32) NOT NULL,
    `xp` INT UNSIGNED NOT NULL DEFAULT 0,
    `reputation` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `npc_jobs_enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `total_npc_jobs` INT UNSIGNED NOT NULL DEFAULT 0,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`citizenid`, `service_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_npc_service_jobs` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `worker_citizenid` VARCHAR(50) NOT NULL,
    `service_type` VARCHAR(32) NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'open',
    `title` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NOT NULL DEFAULT '',
    `customer_name` VARCHAR(64) NOT NULL DEFAULT 'Citizen',
    `payout` INT NOT NULL DEFAULT 0,
    `x` DOUBLE NOT NULL DEFAULT 0,
    `y` DOUBLE NOT NULL DEFAULT 0,
    `z` DOUBLE NOT NULL DEFAULT 0,
    `dest_x` DOUBLE DEFAULT NULL,
    `dest_y` DOUBLE DEFAULT NULL,
    `dest_z` DOUBLE DEFAULT NULL,
    `dest_label` VARCHAR(64) DEFAULT NULL,
    `expires_at` DATETIME NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_worker_status` (`worker_citizenid`, `status`),
    KEY `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
