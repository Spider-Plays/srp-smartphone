-- Optional: remove legacy home layout column (also dropped automatically on resource start).
ALTER TABLE `sr_phone_settings` DROP COLUMN IF EXISTS `home_app_order`;
