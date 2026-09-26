-- Gallery schema fix — safe to run multiple times (skips columns that already exist).
-- Run the whole file in HeidiSQL / phpMyAdmin, then: restart sr-smartphone
--
-- Server.cfg:
--   setr sr_phone_fivemanage_image_key "YOUR_IMAGE_API_KEY"
--   setr sr_phone_fivemanage_video_key "YOUR_VIDEO_API_KEY"

-- 1) See current gallery columns (optional check)
SELECT COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'sr_phone_gallery'
ORDER BY ORDINAL_POSITION;

-- 2) Add any missing columns (no "Duplicate column" errors)
DROP PROCEDURE IF EXISTS `sr_phone_migrate_gallery`;

DELIMITER $$

CREATE PROCEDURE `sr_phone_migrate_gallery`()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sr_phone_gallery'
          AND COLUMN_NAME = 'is_selfie'
    ) THEN
        ALTER TABLE `sr_phone_gallery`
            ADD COLUMN `is_selfie` TINYINT(1) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sr_phone_gallery'
          AND COLUMN_NAME = 'is_favorite'
    ) THEN
        ALTER TABLE `sr_phone_gallery`
            ADD COLUMN `is_favorite` TINYINT(1) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sr_phone_gallery'
          AND COLUMN_NAME = 'album_id'
    ) THEN
        ALTER TABLE `sr_phone_gallery`
            ADD COLUMN `album_id` INT UNSIGNED NULL DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sr_phone_gallery'
          AND COLUMN_NAME = 'created_at'
    ) THEN
        ALTER TABLE `sr_phone_gallery`
            ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sr_phone_gallery'
          AND COLUMN_NAME = 'media_type'
    ) THEN
        ALTER TABLE `sr_phone_gallery`
            ADD COLUMN `media_type` VARCHAR(8) NOT NULL DEFAULT 'photo';
    END IF;
END$$

DELIMITER ;

CALL `sr_phone_migrate_gallery`();
DROP PROCEDURE IF EXISTS `sr_phone_migrate_gallery`;

-- 3) Albums table (safe if it already exists)
CREATE TABLE IF NOT EXISTS `sr_phone_gallery_albums` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `name` VARCHAR(48) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_citizenid` (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) Confirm final columns
SELECT COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'sr_phone_gallery'
ORDER BY ORDINAL_POSITION;
