CREATE TABLE IF NOT EXISTS `sr_phone_contacts` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `favorite` TINYINT(1) NOT NULL DEFAULT 0,
    `note` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_citizenid` (`citizenid`),
    KEY `idx_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_messages` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `sender_citizenid` VARCHAR(50) NOT NULL,
    `receiver_citizenid` VARCHAR(50) NOT NULL,
    `sender_phone` VARCHAR(20) NOT NULL,
    `receiver_phone` VARCHAR(20) NOT NULL,
    `message` TEXT NOT NULL,
    `image` MEDIUMTEXT DEFAULT NULL,
    `read_flag` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_sender` (`sender_citizenid`),
    KEY `idx_receiver` (`receiver_citizenid`),
    KEY `idx_conversation` (`sender_phone`, `receiver_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_settings` (
    `citizenid` VARCHAR(50) NOT NULL,
    `wallpaper` VARCHAR(32) NOT NULL DEFAULT 'default',
    `ringtone` VARCHAR(32) NOT NULL DEFAULT 'default',
    `notifications` TINYINT(1) NOT NULL DEFAULT 1,
    `phone_scale` TINYINT UNSIGNED NOT NULL DEFAULT 100,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_bank_history` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `sender_citizenid` VARCHAR(50) NOT NULL,
    `receiver_citizenid` VARCHAR(50) NOT NULL,
    `amount` INT NOT NULL,
    `note` VARCHAR(128) DEFAULT '',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_chirp_accounts` (
    `citizenid` VARCHAR(50) NOT NULL,
    `display_name` VARCHAR(64) NOT NULL,
    `username` VARCHAR(32) NOT NULL,
    `bio` VARCHAR(160) DEFAULT '',
    `avatar_url` VARCHAR(512) DEFAULT '',
    `banner_url` VARCHAR(512) DEFAULT '',
    `verified` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`citizenid`),
    UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_chirp_posts` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `content` VARCHAR(280) NOT NULL,
    `quote_post_id` INT UNSIGNED NULL DEFAULT NULL,
    `image_url` VARCHAR(512) DEFAULT '',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_quote_post_id` (`quote_post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_chirp_likes` (
    `post_id` INT UNSIGNED NOT NULL,
    `citizenid` VARCHAR(50) NOT NULL,
    PRIMARY KEY (`post_id`, `citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_chirp_comments` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `post_id` INT UNSIGNED NOT NULL,
    `citizenid` VARCHAR(50) NOT NULL,
    `content` VARCHAR(280) NOT NULL,
    `image_url` VARCHAR(512) DEFAULT '',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_post_id` (`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_chirp_reposts` (
    `post_id` INT UNSIGNED NOT NULL,
    `citizenid` VARCHAR(50) NOT NULL,
    PRIMARY KEY (`post_id`, `citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_gallery` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `url` MEDIUMTEXT NOT NULL,
    `label` VARCHAR(64) DEFAULT '',
    `is_selfie` TINYINT(1) NOT NULL DEFAULT 0,
    `is_favorite` TINYINT(1) NOT NULL DEFAULT 0,
    `album_id` INT UNSIGNED DEFAULT NULL,
    `media_type` VARCHAR(8) NOT NULL DEFAULT 'photo',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_citizenid` (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_gallery_albums` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `name` VARCHAR(48) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_citizenid` (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_calls` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `caller_citizenid` VARCHAR(50) NOT NULL,
    `receiver_citizenid` VARCHAR(50) NOT NULL,
    `caller_phone` VARCHAR(20) NOT NULL,
    `receiver_phone` VARCHAR(20) NOT NULL,
    `duration` INT UNSIGNED NOT NULL DEFAULT 0,
    `status` ENUM('missed', 'answered', 'declined', 'cancelled') NOT NULL DEFAULT 'missed',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_caller` (`caller_citizenid`),
    KEY `idx_receiver` (`receiver_citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_map_pins` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `label` VARCHAR(64) NOT NULL,
    `x` DOUBLE NOT NULL,
    `y` DOUBLE NOT NULL,
    `z` DOUBLE NOT NULL DEFAULT 0,
    `category` VARCHAR(32) NOT NULL DEFAULT 'custom',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_citizenid` (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_job_notifications` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `title` VARCHAR(64) NOT NULL,
    `body` VARCHAR(255) NOT NULL,
    `read_flag` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_citizenid` (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_job_applications` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `job_id` VARCHAR(64) NOT NULL,
    `job_label` VARCHAR(64) NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'pending',
    `applied_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `review_at` DATETIME NOT NULL,
    `approved_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_citizen_job` (`citizenid`, `job_id`),
    KEY `idx_pending_review` (`status`, `review_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_mail` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `folder` VARCHAR(16) NOT NULL DEFAULT 'inbox',
    `sender_label` VARCHAR(64) NOT NULL DEFAULT 'System',
    `sender_email` VARCHAR(96) DEFAULT NULL,
    `sender_citizenid` VARCHAR(50) DEFAULT NULL,
    `recipient_email` VARCHAR(96) DEFAULT NULL,
    `recipient_citizenid` VARCHAR(50) DEFAULT NULL,
    `subject` VARCHAR(128) NOT NULL,
    `body` TEXT NOT NULL,
    `read_flag` TINYINT(1) NOT NULL DEFAULT 0,
    `starred` TINYINT(1) NOT NULL DEFAULT 0,
    `attachments` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_citizenid` (`citizenid`),
    KEY `idx_folder` (`citizenid`, `folder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_market_listings` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `title` VARCHAR(64) NOT NULL,
    `description` VARCHAR(500) NOT NULL DEFAULT '',
    `price` INT NOT NULL,
    `category` VARCHAR(32) NOT NULL DEFAULT 'misc',
    `image_url` VARCHAR(512) NOT NULL DEFAULT '',
    `sold` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_service_requests` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `requester_citizenid` VARCHAR(50) NOT NULL,
    `service_type` VARCHAR(32) NOT NULL,
    `message` VARCHAR(255) NOT NULL DEFAULT '',
    `status` VARCHAR(16) NOT NULL DEFAULT 'open',
    `worker_citizenid` VARCHAR(50) DEFAULT NULL,
    `x` DOUBLE NOT NULL DEFAULT 0,
    `y` DOUBLE NOT NULL DEFAULT 0,
    `z` DOUBLE NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE IF NOT EXISTS `sr_phone_dispatch_calls` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `caller_citizenid` VARCHAR(50) NOT NULL,
    `caller_phone` VARCHAR(20) NOT NULL DEFAULT '',
    `caller_name` VARCHAR(64) NOT NULL DEFAULT '',
    `category` VARCHAR(32) NOT NULL,
    `message` VARCHAR(500) NOT NULL DEFAULT '',
    `status` VARCHAR(16) NOT NULL DEFAULT 'open',
    `x` DOUBLE NOT NULL DEFAULT 0,
    `y` DOUBLE NOT NULL DEFAULT 0,
    `z` DOUBLE NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_notes` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `title` VARCHAR(64) NOT NULL,
    `content` TEXT NOT NULL,
    `color` VARCHAR(16) NOT NULL DEFAULT '#FFD60A',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_citizenid` (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_invoices` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `sender_citizenid` VARCHAR(50) NOT NULL,
    `receiver_citizenid` VARCHAR(50) NOT NULL,
    `amount` INT NOT NULL,
    `note` VARCHAR(128) NOT NULL DEFAULT '',
    `status` ENUM('pending', 'paid', 'declined') NOT NULL DEFAULT 'pending',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_receiver` (`receiver_citizenid`),
    KEY `idx_sender` (`sender_citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_doc_templates` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `name` VARCHAR(64) NOT NULL DEFAULT 'Untitled Template',
    `description` VARCHAR(255) NOT NULL DEFAULT '',
    `icon` VARCHAR(32) NOT NULL DEFAULT 'document',
    `fields` JSON DEFAULT NULL,
    `requires_signature` TINYINT(1) NOT NULL DEFAULT 0,
    `base_content` MEDIUMTEXT,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_citizenid` (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_documents` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `owner_citizenid` VARCHAR(50) NOT NULL,
    `recipient_citizenid` VARCHAR(50) DEFAULT NULL,
    `template_id` INT UNSIGNED DEFAULT NULL,
    `title` VARCHAR(128) NOT NULL DEFAULT 'Untitled Document',
    `category` VARCHAR(32) NOT NULL DEFAULT 'general',
    `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
    `field_values` JSON DEFAULT NULL,
    `content` MEDIUMTEXT,
    `requires_signature` TINYINT(1) NOT NULL DEFAULT 0,
    `signed` TINYINT(1) NOT NULL DEFAULT 0,
    `signed_at` TIMESTAMP NULL DEFAULT NULL,
    `read_flag` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_owner` (`owner_citizenid`),
    KEY `idx_recipient` (`recipient_citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_doc_notifications` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `document_id` INT UNSIGNED DEFAULT NULL,
    `title` VARCHAR(64) NOT NULL DEFAULT 'Document',
    `body` VARCHAR(255) NOT NULL DEFAULT '',
    `read_flag` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_citizenid` (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_news_outlets` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(32) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NOT NULL DEFAULT '',
    `featured` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_news_articles` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `outlet_id` INT UNSIGNED NOT NULL,
    `author_citizenid` VARCHAR(50) NOT NULL DEFAULT 'system',
    `author_label` VARCHAR(64) NOT NULL DEFAULT 'Reporter',
    `headline` VARCHAR(128) NOT NULL,
    `body` TEXT NOT NULL,
    `image_url` VARCHAR(512) DEFAULT NULL,
    `published_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_outlet` (`outlet_id`),
    KEY `idx_published` (`published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sr_phone_news_follows` (
    `citizenid` VARCHAR(50) NOT NULL,
    `outlet_id` INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`citizenid`, `outlet_id`),
    KEY `idx_outlet` (`outlet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
