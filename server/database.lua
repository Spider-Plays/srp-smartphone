SRPhoneDbReady = false
SRPhonePlayerCollate = 'utf8mb4_unicode_ci'

local CITIZENID_COLUMNS = {
    { table = 'sr_phone_contacts', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_messages', column = 'sender_citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_messages', column = 'receiver_citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_settings', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_calls', column = 'caller_citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_calls', column = 'receiver_citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_map_pins', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_job_notifications', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_job_applications', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_mail', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_market_listings', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_service_requests', column = 'requester_citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_service_worker_stats', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_npc_service_jobs', column = 'worker_citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_dispatch_calls', column = 'caller_citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_notes', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_invoices', column = 'sender_citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_invoices', column = 'receiver_citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_doc_templates', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_documents', column = 'owner_citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_documents', column = 'recipient_citizenid', def = 'VARCHAR(50) DEFAULT NULL' },
    { table = 'sr_phone_doc_notifications', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_news_articles', column = 'author_citizenid', def = "VARCHAR(50) NOT NULL DEFAULT 'system'" },
    { table = 'sr_phone_news_follows', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_crypto_holdings', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_crypto_transactions', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_stock_holdings', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_stock_transactions', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_trading_watchlist', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_trading_alerts', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_bank_history', column = 'sender_citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_bank_history', column = 'receiver_citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_gallery', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_gallery_albums', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_installed_apps', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_calendar_events', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
    { table = 'sr_phone_darkweb_listings', column = 'citizenid', def = 'VARCHAR(50) NOT NULL' },
}

local function debugPrint(...)
    if Config.Debug then
        print('[sr-smartphone]', ...)
    end
end

local function columnExists(tableName, columnName)
    local count = MySQL.scalar.await([[
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
    ]], { tableName, columnName })
    return (tonumber(count) or 0) > 0
end

local function ensureColumn(tableName, columnName, alterSql)
    if columnExists(tableName, columnName) then return end
    MySQL.query.await(alterSql)
    print(('[sr-smartphone] Database: added column %s.%s'):format(tableName, columnName))
end

local function dropColumnIfExists(tableName, columnName)
    if not columnExists(tableName, columnName) then return end
    MySQL.query.await(('ALTER TABLE `%s` DROP COLUMN `%s`'):format(tableName, columnName))
    print(('[sr-smartphone] Database: removed column %s.%s'):format(tableName, columnName))
end

local function getPlayersCitizenCollation()
    local collate = MySQL.scalar.await([[
        SELECT COLLATION_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'players'
          AND COLUMN_NAME = 'citizenid'
        LIMIT 1
    ]])
    if collate and collate ~= '' then return collate end
    return 'utf8mb4_unicode_ci'
end

local function syncCitizenIdCollations()
    SRPhonePlayerCollate = getPlayersCitizenCollation()
    for _, spec in ipairs(CITIZENID_COLUMNS) do
        if columnExists(spec.table, spec.column) then
            pcall(function()
                MySQL.query.await(('ALTER TABLE `%s` MODIFY `%s` %s COLLATE %s'):format(
                    spec.table,
                    spec.column,
                    spec.def,
                    SRPhonePlayerCollate
                ))
            end)
        end
    end
    print(('[sr-smartphone] Database: citizenid collations synced to %s'):format(SRPhonePlayerCollate))
end

--- JOIN players.citizenid to a phone-table citizenid column without collation errors.
function SRPhoneJoinCitizenId(playersColumn, phoneColumn)
    return ('%s = %s COLLATE %s'):format(playersColumn, phoneColumn, SRPhonePlayerCollate)
end

local function runMigrations()
    ensureColumn(
        'sr_phone_settings',
        'phone_scale',
        'ALTER TABLE sr_phone_settings ADD COLUMN phone_scale TINYINT UNSIGNED NOT NULL DEFAULT 100'
    )
    dropColumnIfExists('sr_phone_settings', 'home_app_order')
    ensureColumn(
        'sr_phone_messages',
        'image',
        'ALTER TABLE sr_phone_messages ADD COLUMN image MEDIUMTEXT DEFAULT NULL'
    )
    ensureColumn(
        'sr_phone_mail',
        'folder',
        "ALTER TABLE sr_phone_mail ADD COLUMN folder VARCHAR(16) NOT NULL DEFAULT 'inbox'"
    )
    ensureColumn(
        'sr_phone_mail',
        'sender_email',
        'ALTER TABLE sr_phone_mail ADD COLUMN sender_email VARCHAR(96) DEFAULT NULL'
    )
    ensureColumn(
        'sr_phone_mail',
        'sender_citizenid',
        'ALTER TABLE sr_phone_mail ADD COLUMN sender_citizenid VARCHAR(50) DEFAULT NULL'
    )
    ensureColumn(
        'sr_phone_mail',
        'recipient_email',
        'ALTER TABLE sr_phone_mail ADD COLUMN recipient_email VARCHAR(96) DEFAULT NULL'
    )
    ensureColumn(
        'sr_phone_mail',
        'recipient_citizenid',
        'ALTER TABLE sr_phone_mail ADD COLUMN recipient_citizenid VARCHAR(50) DEFAULT NULL'
    )
    ensureColumn(
        'sr_phone_mail',
        'starred',
        'ALTER TABLE sr_phone_mail ADD COLUMN starred TINYINT(1) NOT NULL DEFAULT 0'
    )
    ensureColumn(
        'sr_phone_mail',
        'attachments',
        'ALTER TABLE sr_phone_mail ADD COLUMN attachments TEXT DEFAULT NULL'
    )
    ensureColumn(
        'sr_phone_market_listings',
        'image_url',
        'ALTER TABLE sr_phone_market_listings ADD COLUMN image_url VARCHAR(512) NOT NULL DEFAULT ""'
    )
    ensureColumn(
        'sr_phone_gallery',
        'is_selfie',
        'ALTER TABLE sr_phone_gallery ADD COLUMN is_selfie TINYINT(1) NOT NULL DEFAULT 0'
    )
    ensureColumn(
        'sr_phone_gallery',
        'is_favorite',
        'ALTER TABLE sr_phone_gallery ADD COLUMN is_favorite TINYINT(1) NOT NULL DEFAULT 0'
    )
    ensureColumn(
        'sr_phone_gallery',
        'album_id',
        'ALTER TABLE sr_phone_gallery ADD COLUMN album_id INT UNSIGNED NULL DEFAULT NULL'
    )
    ensureColumn(
        'sr_phone_gallery',
        'created_at',
        'ALTER TABLE sr_phone_gallery ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
    )
    ensureColumn(
        'sr_phone_gallery',
        'media_type',
        "ALTER TABLE sr_phone_gallery ADD COLUMN media_type VARCHAR(8) NOT NULL DEFAULT 'photo'"
    )
    ensureColumn(
        'sr_phone_service_requests',
        'worker_citizenid',
        'ALTER TABLE sr_phone_service_requests ADD COLUMN worker_citizenid VARCHAR(50) DEFAULT NULL'
    )
end

--- Wait until schema migrations finished (call before settings queries).
function SRPhoneAwaitDb(timeoutMs)
    local deadline = GetGameTimer() + (timeoutMs or 15000)
    while not SRPhoneDbReady do
        if GetGameTimer() > deadline then
            print('[sr-smartphone] WARNING: database migrations timed out')
            return false
        end
        Wait(50)
    end
    return true
end

MySQL.ready(function()
    MySQL.query.await([[
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
    ]])

    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `sr_phone_messages` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `sender_citizenid` VARCHAR(50) NOT NULL,
            `receiver_citizenid` VARCHAR(50) NOT NULL,
            `sender_phone` VARCHAR(20) NOT NULL,
            `receiver_phone` VARCHAR(20) NOT NULL,
            `message` TEXT NOT NULL,
            `read_flag` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_sender` (`sender_citizenid`),
            KEY `idx_receiver` (`receiver_citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])

    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `sr_phone_settings` (
            `citizenid` VARCHAR(50) NOT NULL,
            `wallpaper` VARCHAR(32) NOT NULL DEFAULT 'default',
            `ringtone` VARCHAR(32) NOT NULL DEFAULT 'default',
            `notifications` TINYINT(1) NOT NULL DEFAULT 1,
            `phone_scale` TINYINT UNSIGNED NOT NULL DEFAULT 100,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])

    MySQL.query.await([[
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
    ]])

    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `sr_phone_gallery_albums` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(50) NOT NULL,
            `name` VARCHAR(48) NOT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_citizenid` (`citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])

    runMigrations()

    MySQL.query.await([[
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
    ]])

    debugPrint('Database tables ready')

    local extendedTables = {
        'sr_phone_map_pins', 'sr_phone_job_notifications', 'sr_phone_job_applications', 'sr_phone_mail',
        'sr_phone_market_listings', 'sr_phone_service_requests', 'sr_phone_service_worker_stats',
        'sr_phone_npc_service_jobs', 'sr_phone_dispatch_calls',
        'sr_phone_notes', 'sr_phone_invoices',
        'sr_phone_credit_profiles', 'sr_phone_loans', 'sr_phone_loan_payments',
        'sr_phone_doc_templates', 'sr_phone_documents', 'sr_phone_doc_notifications',
        'sr_phone_news_outlets', 'sr_phone_news_articles', 'sr_phone_news_follows',
    }
    for _, name in ipairs(extendedTables) do
        debugPrint('Extended table check:', name)
    end

    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_map_pins` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(50) NOT NULL,
            `label` VARCHAR(64) NOT NULL,
            `x` DOUBLE NOT NULL, `y` DOUBLE NOT NULL, `z` DOUBLE NOT NULL DEFAULT 0,
            `category` VARCHAR(32) NOT NULL DEFAULT 'custom',
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`), KEY `idx_citizenid` (`citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_job_notifications` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(50) NOT NULL,
            `title` VARCHAR(64) NOT NULL, `body` VARCHAR(255) NOT NULL,
            `read_flag` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`), KEY `idx_citizenid` (`citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
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
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_mail` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(50) NOT NULL,
            `folder` VARCHAR(16) NOT NULL DEFAULT 'inbox',
            `sender_label` VARCHAR(64) NOT NULL DEFAULT 'System',
            `sender_email` VARCHAR(96) DEFAULT NULL,
            `sender_citizenid` VARCHAR(50) DEFAULT NULL,
            `recipient_email` VARCHAR(96) DEFAULT NULL,
            `recipient_citizenid` VARCHAR(50) DEFAULT NULL,
            `subject` VARCHAR(128) NOT NULL, `body` TEXT NOT NULL,
            `read_flag` TINYINT(1) NOT NULL DEFAULT 0,
            `starred` TINYINT(1) NOT NULL DEFAULT 0,
            `attachments` TEXT DEFAULT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`), KEY `idx_citizenid` (`citizenid`),
            KEY `idx_folder` (`citizenid`, `folder`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_market_listings` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(50) NOT NULL,
            `title` VARCHAR(64) NOT NULL, `description` VARCHAR(500) NOT NULL DEFAULT '',
            `price` INT NOT NULL, `category` VARCHAR(32) NOT NULL DEFAULT 'misc',
            `image_url` VARCHAR(512) NOT NULL DEFAULT '',
            `sold` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`), KEY `idx_category` (`category`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_service_requests` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `requester_citizenid` VARCHAR(50) NOT NULL,
            `service_type` VARCHAR(32) NOT NULL,
            `message` VARCHAR(255) NOT NULL DEFAULT '',
            `status` VARCHAR(16) NOT NULL DEFAULT 'open',
            `worker_citizenid` VARCHAR(50) DEFAULT NULL,
            `x` DOUBLE NOT NULL DEFAULT 0, `y` DOUBLE NOT NULL DEFAULT 0, `z` DOUBLE NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
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
    ]])
    MySQL.query([[
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
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_dispatch_calls` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `caller_citizenid` VARCHAR(50) NOT NULL,
            `caller_phone` VARCHAR(20) NOT NULL DEFAULT '',
            `caller_name` VARCHAR(64) NOT NULL DEFAULT '',
            `category` VARCHAR(32) NOT NULL,
            `message` VARCHAR(500) NOT NULL DEFAULT '',
            `status` VARCHAR(16) NOT NULL DEFAULT 'open',
            `x` DOUBLE NOT NULL DEFAULT 0, `y` DOUBLE NOT NULL DEFAULT 0, `z` DOUBLE NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_notes` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(50) NOT NULL,
            `title` VARCHAR(64) NOT NULL, `content` TEXT NOT NULL,
            `color` VARCHAR(16) NOT NULL DEFAULT '#FFD60A',
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`), KEY `idx_citizenid` (`citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_invoices` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `sender_citizenid` VARCHAR(50) NOT NULL,
            `receiver_citizenid` VARCHAR(50) NOT NULL,
            `amount` INT NOT NULL, `note` VARCHAR(128) NOT NULL DEFAULT '',
            `status` ENUM('pending', 'paid', 'declined') NOT NULL DEFAULT 'pending',
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_receiver` (`receiver_citizenid`),
            KEY `idx_sender` (`sender_citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_credit_profiles` (
            `citizenid` VARCHAR(50) NOT NULL,
            `score` INT NOT NULL DEFAULT 620,
            `band` VARCHAR(16) NOT NULL DEFAULT 'fair',
            `total_borrowed` BIGINT NOT NULL DEFAULT 0,
            `total_repaid` BIGINT NOT NULL DEFAULT 0,
            `on_time_payments` INT NOT NULL DEFAULT 0,
            `missed_payments` INT NOT NULL DEFAULT 0,
            `open_loans` INT NOT NULL DEFAULT 0,
            `hard_inquiries` INT NOT NULL DEFAULT 0,
            `blacklisted_until` BIGINT DEFAULT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_loans` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(50) NOT NULL,
            `product_id` VARCHAR(32) NOT NULL,
            `status` ENUM('active', 'paid', 'defaulted') NOT NULL DEFAULT 'active',
            `principal` INT NOT NULL,
            `balance` INT NOT NULL,
            `apr` DECIMAL(8,5) NOT NULL,
            `term_days` INT NOT NULL,
            `origination_fee` INT NOT NULL DEFAULT 0,
            `total_interest` INT NOT NULL DEFAULT 0,
            `payment_amount` INT NOT NULL,
            `payments_total` INT NOT NULL,
            `payments_made` INT NOT NULL DEFAULT 0,
            `missed_count` INT NOT NULL DEFAULT 0,
            `next_due_at` BIGINT DEFAULT NULL,
            `autopay` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `closed_at` TIMESTAMP NULL DEFAULT NULL,
            PRIMARY KEY (`id`),
            KEY `idx_citizenid` (`citizenid`),
            KEY `idx_status` (`status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_loan_payments` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `loan_id` INT UNSIGNED NOT NULL,
            `installment` INT NOT NULL,
            `amount_due` INT NOT NULL,
            `amount_paid` INT NOT NULL DEFAULT 0,
            `late_fee` INT NOT NULL DEFAULT 0,
            `due_at` BIGINT NOT NULL,
            `status` ENUM('pending', 'paid', 'late', 'missed') NOT NULL DEFAULT 'pending',
            `paid_at` BIGINT DEFAULT NULL,
            PRIMARY KEY (`id`),
            KEY `idx_loan` (`loan_id`),
            KEY `idx_due` (`due_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
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
    ]])
    MySQL.query([[
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
    ]])
    MySQL.query([[
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
    ]])
    MySQL.query([[
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
    ]])
    MySQL.query([[
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
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_news_follows` (
            `citizenid` VARCHAR(50) NOT NULL,
            `outlet_id` INT UNSIGNED NOT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`citizenid`, `outlet_id`),
            KEY `idx_outlet` (`outlet_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_crypto_holdings` (
            `citizenid` VARCHAR(50) NOT NULL,
            `asset_id` VARCHAR(16) NOT NULL,
            `quantity` DECIMAL(18,8) NOT NULL DEFAULT 0,
            `avg_cost` DECIMAL(18,4) NOT NULL DEFAULT 0,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`citizenid`, `asset_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_crypto_transactions` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(50) NOT NULL,
            `asset_id` VARCHAR(16) NOT NULL,
            `action` ENUM('buy', 'sell') NOT NULL,
            `quantity` DECIMAL(18,8) NOT NULL,
            `price` DECIMAL(18,4) NOT NULL,
            `total` INT NOT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_citizenid` (`citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_stock_holdings` (
            `citizenid` VARCHAR(50) NOT NULL,
            `asset_id` VARCHAR(16) NOT NULL,
            `quantity` DECIMAL(18,4) NOT NULL DEFAULT 0,
            `avg_cost` DECIMAL(18,4) NOT NULL DEFAULT 0,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`citizenid`, `asset_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_stock_transactions` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(50) NOT NULL,
            `asset_id` VARCHAR(16) NOT NULL,
            `action` ENUM('buy', 'sell') NOT NULL,
            `quantity` DECIMAL(18,4) NOT NULL,
            `price` DECIMAL(18,4) NOT NULL,
            `total` INT NOT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_citizenid` (`citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_trading_watchlist` (
            `citizenid` VARCHAR(50) NOT NULL,
            `market_kind` VARCHAR(16) NOT NULL,
            `asset_id` VARCHAR(16) NOT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`citizenid`, `market_kind`, `asset_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_trading_alerts` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(50) NOT NULL,
            `market_kind` VARCHAR(16) NOT NULL,
            `asset_id` VARCHAR(16) NOT NULL,
            `direction` ENUM('above', 'below') NOT NULL,
            `target_price` DECIMAL(18,4) NOT NULL,
            `triggered` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_citizenid` (`citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_installed_apps` (
            `citizenid` VARCHAR(50) NOT NULL,
            `app_id` VARCHAR(32) NOT NULL,
            `installed` TINYINT(1) NOT NULL DEFAULT 1,
            `installed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`citizenid`, `app_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_calendar_events` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(50) NOT NULL,
            `title` VARCHAR(96) NOT NULL,
            `description` VARCHAR(256) DEFAULT NULL,
            `location` VARCHAR(96) DEFAULT NULL,
            `starts_at` DATETIME NOT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_citizenid` (`citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `sr_phone_darkweb_listings` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(50) NOT NULL,
            `title` VARCHAR(64) NOT NULL,
            `description` VARCHAR(256) DEFAULT NULL,
            `price` INT UNSIGNED NOT NULL DEFAULT 0,
            `category` VARCHAR(24) NOT NULL DEFAULT 'contraband',
            `seller_alias` VARCHAR(32) NOT NULL,
            `active` TINYINT(1) NOT NULL DEFAULT 1,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_citizenid` (`citizenid`),
            KEY `idx_active` (`active`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])

    syncCitizenIdCollations()
    SRPhoneDbReady = true
    debugPrint('Database migrations complete')
end)
