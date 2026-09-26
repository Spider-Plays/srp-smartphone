local function parseTimestamp(ts)
    if not ts then return nil end
    if type(ts) == 'number' then
        return ts > 1e12 and math.floor(ts / 1000) or ts
    end
    local y, m, d, h, mi, s = tostring(ts):match('(%d+)-(%d+)-(%d+) (%d+):(%d+):(%d+)')
    if not y then return nil end
    return os.time({
        year = tonumber(y),
        month = tonumber(m),
        day = tonumber(d),
        hour = tonumber(h),
        min = tonumber(mi),
        sec = tonumber(s),
    })
end

local function timeAgo(ts)
    local unix = type(ts) == 'number' and (ts > 1e12 and math.floor(ts / 1000) or ts) or parseTimestamp(ts)
    if not unix then return 'now' end
    local diff = os.time() - unix
    if diff < 60 then return 'now' end
    if diff < 3600 then return ('%dm ago'):format(math.floor(diff / 60)) end
    if diff < 86400 then return ('%dh ago'):format(math.floor(diff / 3600)) end
    return ('%dd ago'):format(math.floor(diff / 86400))
end

local function mapChirpComment(row)
    row.author = row.displayName or row.author
    row.timeAgo = timeAgo(row.created_at)
    row.timestamp = row.timeAgo
    row.imageUrl = row.image_url
    row.verified = row.verified == 1 or row.verified == true
    return row
end

local function isValidChirpImageUrl(url)
    if type(url) ~= 'string' or url == '' or #url > 2048 then return false end
    if url:sub(1, 11) == 'data:image/' then return true end
    if url:sub(1, 8) ~= 'https://' and url:sub(1, 7) ~= 'http://' then return false end
    if url:find('discordapp%.com', 1, true) or url:find('discord%.net', 1, true) then return true end
    if url:match('%.png') or url:match('%.jpe?g') or url:match('%.gif') or url:match('%.webp') then return true end
    return false
end

local function sanitizeChirpImageUrl(url)
    if not url or url == '' then return nil end
    url = tostring(url):sub(1, 2048)
    return isValidChirpImageUrl(url) and url or nil
end

local function mapChirpAccountRow(row)
    if not row then return nil end
    row.avatarUrl = row.avatar_url or ''
    row.bannerUrl = row.banner_url or ''
    row.verified = row.verified == 1 or row.verified == true
    return row
end

local function chirpCfg()
    return Config.Chirp or {}
end

local function getSourceByCitizenId(citizenid)
    if not citizenid or citizenid == '' then return nil end
    for _, playerId in ipairs(GetPlayers()) do
        local src = tonumber(playerId)
        if src and SRBridge.GetCitizenId(src) == citizenid then
            return src
        end
    end
    return nil
end

local function phoneNotificationsEnabled(citizenid)
    local settings = MySQL.single.await(
        'SELECT notifications FROM sr_phone_settings WHERE citizenid = ?',
        { citizenid }
    )
    return not settings or settings.notifications == 1
end

local function chirpPreview(content, imageUrl, maxLen)
    maxLen = maxLen or 72
    local text = tostring(content or ''):gsub('%s+', ' '):match('^%s*(.-)%s*$') or ''
    if text == '' and imageUrl and imageUrl ~= '' then
        text = 'Photo'
    end
    if #text > maxLen then
        return text:sub(1, maxLen - 3) .. '...'
    end
    return text
end

local function pushChirpNotify(targetSource, payload)
    if not targetSource or targetSource < 1 then return end
    local citizenid = SRBridge.GetCitizenId(targetSource)
    if citizenid and not phoneNotificationsEnabled(citizenid) then return end
    TriggerClientEvent('sr-smartphone:client:chirpNotify', targetSource, payload)
end

local function notifyAllOnlineChirp(excludeSource, payload)
    for _, playerId in ipairs(GetPlayers()) do
        local src = tonumber(playerId)
        if src and src ~= excludeSource then
            pushChirpNotify(src, payload)
        end
    end
end

local function getChirpAccountLabel(citizenid, fallbackSource)
    local row = MySQL.single.await(
        'SELECT display_name, username FROM sr_chirp_accounts WHERE citizenid = ?',
        { citizenid }
    )
    if row then
        return row.display_name or row.username, row.username
    end
    if fallbackSource then
        return SRBridge.GetDisplayName(fallbackSource), nil
    end
    return 'Someone', nil
end

local function notifyNewChirpPost(source, postId, content, imageUrl)
    local cfg = chirpCfg()
    if cfg.notifyNewPosts == false then return end

    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return end

    local displayName, username = getChirpAccountLabel(citizenid, source)
    local handle = username and ('@' .. username) or displayName
    local preview = chirpPreview(content, imageUrl)

    notifyAllOnlineChirp(source, {
        kind = 'new_post',
        title = 'New Tweet',
        message = ('%s: %s'):format(handle, preview),
        postId = postId,
        username = username,
    })
end

local function notifyChirpPostOwner(postId, actorSource, kind, message)
    local cfg = chirpCfg()
    if kind == 'like' and cfg.notifyLikes == false then return end
    if kind == 'reply' and cfg.notifyReplies == false then return end

    local postRow = MySQL.single.await('SELECT citizenid FROM sr_chirp_posts WHERE id = ?', { postId })
    if not postRow or not postRow.citizenid then return end

    local actorCitizenid = SRBridge.GetCitizenId(actorSource)
    if not actorCitizenid or postRow.citizenid == actorCitizenid then return end

    local ownerSource = getSourceByCitizenId(postRow.citizenid)
    if not ownerSource then return end

    local _, actorUsername = getChirpAccountLabel(actorCitizenid, actorSource)

    pushChirpNotify(ownerSource, {
        kind = kind,
        title = kind == 'like' and 'Twitter Like' or 'Twitter Reply',
        message = message,
        postId = postId,
        username = actorUsername,
    })
end

local function mapChirpFeedRow(row)
    row.author = row.displayName
    row.timeAgo = timeAgo(row.created_at)
    row.timestamp = row.timeAgo
    row.liked = row.liked == 1
    row.isLiked = row.liked
    row.reposted = row.reposted == 1
    row.isReposted = row.reposted
    row.replies = row.comments or 0
    row.isFollowing = false
    row.imageUrl = row.image_url
    row.avatarUrl = row.avatar_url or ''
    row.verified = row.verified == 1 or row.verified == true

    if row.quoteId then
        row.quotePost = {
            id = row.quoteId,
            author = row.quoteDisplayName,
            displayName = row.quoteDisplayName,
            username = row.quoteUsername,
            content = row.quoteContent,
            timeAgo = timeAgo(row.quoteCreatedAt),
            timestamp = timeAgo(row.quoteCreatedAt),
        }
    end

    row.quoteId = nil
    row.quoteContent = nil
    row.quoteCreatedAt = nil
    row.quoteDisplayName = nil
    row.quoteUsername = nil

    return row
end

MySQL.ready(function()
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS sr_chirp_accounts (
            citizenid VARCHAR(50) NOT NULL PRIMARY KEY,
            display_name VARCHAR(64) NOT NULL,
            username VARCHAR(32) NOT NULL UNIQUE,
            bio VARCHAR(160) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS sr_chirp_posts (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            citizenid VARCHAR(50) NOT NULL,
            content VARCHAR(280) NOT NULL,
            quote_post_id INT UNSIGNED NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_citizenid (citizenid),
            KEY idx_quote_post_id (quote_post_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS sr_chirp_likes (
            post_id INT UNSIGNED NOT NULL,
            citizenid VARCHAR(50) NOT NULL,
            PRIMARY KEY (post_id, citizenid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS sr_chirp_comments (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            post_id INT UNSIGNED NOT NULL,
            citizenid VARCHAR(50) NOT NULL,
            content VARCHAR(280) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_post_id (post_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ]])
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS sr_chirp_reposts (
            post_id INT UNSIGNED NOT NULL,
            citizenid VARCHAR(50) NOT NULL,
            PRIMARY KEY (post_id, citizenid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ]])
    pcall(function()
        MySQL.query.await('ALTER TABLE sr_chirp_posts ADD COLUMN quote_post_id INT UNSIGNED NULL DEFAULT NULL')
    end)
    pcall(function()
        MySQL.query.await('ALTER TABLE sr_chirp_accounts ADD COLUMN avatar_url VARCHAR(512) DEFAULT ""')
    end)
    pcall(function()
        MySQL.query.await('ALTER TABLE sr_chirp_accounts ADD COLUMN banner_url VARCHAR(512) DEFAULT ""')
    end)
    pcall(function()
        MySQL.query.await('ALTER TABLE sr_chirp_accounts ADD COLUMN verified TINYINT(1) NOT NULL DEFAULT 0')
    end)
    pcall(function()
        MySQL.query.await('ALTER TABLE sr_chirp_posts ADD COLUMN image_url VARCHAR(512) DEFAULT ""')
    end)
    pcall(function()
        MySQL.query.await('ALTER TABLE sr_chirp_comments ADD COLUMN image_url VARCHAR(512) DEFAULT ""')
    end)
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS sr_phone_gallery (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            citizenid VARCHAR(50) NOT NULL,
            url MEDIUMTEXT NOT NULL,
            label VARCHAR(64) DEFAULT '',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_citizenid (citizenid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ]])
    pcall(function()
        MySQL.query.await(
            'ALTER TABLE sr_phone_gallery MODIFY COLUMN url MEDIUMTEXT NOT NULL'
        )
    end)
    pcall(function()
        MySQL.query.await(
            'ALTER TABLE sr_phone_gallery ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
        )
    end)
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS sr_phone_bank_history (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            sender_citizenid VARCHAR(50) NOT NULL,
            receiver_citizenid VARCHAR(50) NOT NULL,
            amount INT NOT NULL,
            note VARCHAR(128) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ]])
end)

lib.callback.register('sr-smartphone:server:chirpGetAccount', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return nil end
    local row = MySQL.single.await(
        'SELECT display_name AS displayName, username, bio, avatar_url, banner_url, verified FROM sr_chirp_accounts WHERE citizenid = ?',
        { citizenid }
    )
    return mapChirpAccountRow(row)
end)

lib.callback.register('sr-smartphone:server:chirpGetConfig', function()
    local cfg = Config.Chirp or {}
    return {
        verificationPrice = cfg.verificationPrice or 25000,
    }
end)

lib.callback.register('sr-smartphone:server:chirpRegister', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data?.username or not data?.displayName then
        return { ok = false, success = false }
    end

    local exists = MySQL.scalar.await('SELECT citizenid FROM sr_chirp_accounts WHERE username = ?', { data.username })
    if exists then return { ok = false, success = false, error = 'username_taken' } end

    MySQL.insert.await(
        'INSERT INTO sr_chirp_accounts (citizenid, display_name, username, bio) VALUES (?, ?, ?, ?)',
        { citizenid, data.displayName:sub(1, 64), data.username:sub(1, 32), '' }
    )
    return {
        ok = true,
        success = true,
        user = {
            name = data.displayName,
            username = data.username,
            bio = '',
        },
    }
end)

lib.callback.register('sr-smartphone:server:chirpLogin', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data?.username then
        return { success = false, error = 'Invalid username or password' }
    end

    local account = MySQL.single.await(
        'SELECT display_name AS displayName, username, bio, avatar_url, banner_url, verified FROM sr_chirp_accounts WHERE citizenid = ? AND username = ?',
        { citizenid, data.username:sub(1, 32) }
    )

    if not account then
        return { success = false, error = 'Invalid username or password' }
    end
    mapChirpAccountRow(account)

    return {
        ok = true,
        success = true,
        user = {
            name = account.displayName,
            username = account.username,
            bio = account.bio or '',
            avatarUrl = account.avatarUrl or '',
            bannerUrl = account.bannerUrl or '',
            verified = account.verified or false,
        },
    }
end)

lib.callback.register('sr-smartphone:server:chirpGetFeed', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    local rows = MySQL.query.await([[
        SELECT p.id, p.content, p.image_url, p.created_at, p.quote_post_id, a.display_name AS displayName, a.username,
               a.avatar_url, a.verified,
               (SELECT COUNT(*) FROM sr_chirp_likes l WHERE l.post_id = p.id) AS likes,
               (SELECT COUNT(*) FROM sr_chirp_comments c WHERE c.post_id = p.id) AS comments,
               (SELECT COUNT(*) FROM sr_chirp_reposts r WHERE r.post_id = p.id) AS reposts,
               EXISTS(SELECT 1 FROM sr_chirp_likes l WHERE l.post_id = p.id AND l.citizenid = ?) AS liked,
               EXISTS(SELECT 1 FROM sr_chirp_reposts r WHERE r.post_id = p.id AND r.citizenid = ?) AS reposted,
               qp.id AS quoteId, qp.content AS quoteContent, qp.created_at AS quoteCreatedAt,
               qa.display_name AS quoteDisplayName, qa.username AS quoteUsername
        FROM sr_chirp_posts p
        JOIN sr_chirp_accounts a ON a.citizenid = p.citizenid
        LEFT JOIN sr_chirp_posts qp ON qp.id = p.quote_post_id
        LEFT JOIN sr_chirp_accounts qa ON qa.citizenid = qp.citizenid
        ORDER BY p.created_at DESC
        LIMIT 50
    ]], { citizenid or '', citizenid or '' }) or {}

    for _, row in ipairs(rows) do
        mapChirpFeedRow(row)
    end

    return rows
end)

lib.callback.register('sr-smartphone:server:chirpPost', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    local content = tostring(data.content or ''):sub(1, 280)
    local quotePostId = data.quotePostId and tonumber(data.quotePostId) or nil
    local imageUrl = sanitizeChirpImageUrl(data.imageUrl or data.image)

    if quotePostId then
        local postExists = MySQL.scalar.await('SELECT id FROM sr_chirp_posts WHERE id = ?', { quotePostId })
        if not postExists then return { ok = false, error = 'post_not_found' } end
    elseif content == '' and not imageUrl then
        return { ok = false }
    end

    local id = MySQL.insert.await(
        'INSERT INTO sr_chirp_posts (citizenid, content, quote_post_id, image_url) VALUES (?, ?, ?, ?)',
        { citizenid, content, quotePostId, imageUrl or '' }
    )

    if quotePostId then
        local reposted = MySQL.scalar.await(
            'SELECT 1 FROM sr_chirp_reposts WHERE post_id = ? AND citizenid = ?',
            { quotePostId, citizenid }
        )
        if not reposted then
            MySQL.insert.await(
                'INSERT INTO sr_chirp_reposts (post_id, citizenid) VALUES (?, ?)',
                { quotePostId, citizenid }
            )
        end
    end

    notifyNewChirpPost(source, id, content, imageUrl)

    return { ok = true, id = id }
end)

lib.callback.register('sr-smartphone:server:chirpLike', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data?.postId then return { ok = false } end
    local liked = MySQL.scalar.await(
        'SELECT 1 FROM sr_chirp_likes WHERE post_id = ? AND citizenid = ?',
        { data.postId, citizenid }
    )
    if liked then
        MySQL.update.await('DELETE FROM sr_chirp_likes WHERE post_id = ? AND citizenid = ?', { data.postId, citizenid })
    else
        MySQL.insert.await('INSERT INTO sr_chirp_likes (post_id, citizenid) VALUES (?, ?)', { data.postId, citizenid })
        local displayName = select(1, getChirpAccountLabel(citizenid, source))
        notifyChirpPostOwner(data.postId, source, 'like', ('%s liked your tweet'):format(displayName))
    end
    return { ok = true }
end)

lib.callback.register('sr-smartphone:server:chirpRepost', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data?.postId then return { ok = false } end
    local reposted = MySQL.scalar.await(
        'SELECT 1 FROM sr_chirp_reposts WHERE post_id = ? AND citizenid = ?',
        { data.postId, citizenid }
    )
    if reposted then
        MySQL.update.await('DELETE FROM sr_chirp_reposts WHERE post_id = ? AND citizenid = ?', { data.postId, citizenid })
    else
        MySQL.insert.await('INSERT INTO sr_chirp_reposts (post_id, citizenid) VALUES (?, ?)', { data.postId, citizenid })
    end
    return { ok = true }
end)

lib.callback.register('sr-smartphone:server:chirpSearch', function(_, query)
    if not query or #query < 2 then return {} end
    return MySQL.query.await(
        'SELECT display_name AS displayName, username FROM sr_chirp_accounts WHERE username LIKE ? OR display_name LIKE ? LIMIT 20',
        { '%' .. query .. '%', '%' .. query .. '%' }
    ) or {}
end)

lib.callback.register('sr-smartphone:server:chirpGetComments', function(_, postId)
    if not postId then return {} end
    local rows = MySQL.query.await([[
        SELECT c.id, c.content, c.image_url, c.created_at, a.display_name AS displayName, a.username, a.verified
        FROM sr_chirp_comments c
        JOIN sr_chirp_accounts a ON a.citizenid = c.citizenid
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
        LIMIT 100
    ]], { postId }) or {}

    for _, row in ipairs(rows) do
        mapChirpComment(row)
    end

    return rows
end)

lib.callback.register('sr-smartphone:server:chirpReply', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data?.postId then
        return { ok = false, success = false }
    end

    local content = tostring(data.content or ''):sub(1, 280)
    local imageUrl = sanitizeChirpImageUrl(data.imageUrl or data.image)
    if content == '' and not imageUrl then
        return { ok = false, success = false }
    end

    local postExists = MySQL.scalar.await('SELECT id FROM sr_chirp_posts WHERE id = ?', { data.postId })
    if not postExists then return { ok = false, success = false, error = 'post_not_found' } end

    local id = MySQL.insert.await(
        'INSERT INTO sr_chirp_comments (post_id, citizenid, content, image_url) VALUES (?, ?, ?, ?)',
        { data.postId, citizenid, content, imageUrl or '' }
    )

    local account = MySQL.single.await(
        'SELECT display_name AS displayName, username, verified FROM sr_chirp_accounts WHERE citizenid = ?',
        { citizenid }
    )

    local displayName = account and account.displayName or SRBridge.GetDisplayName(source)
    notifyChirpPostOwner(
        data.postId,
        source,
        'reply',
        ('%s replied: %s'):format(displayName, chirpPreview(content, imageUrl))
    )

    return {
        ok = true,
        success = true,
        id = id,
        comment = mapChirpComment({
            id = id,
            content = content,
            image_url = imageUrl or '',
            created_at = os.date('%Y-%m-%d %H:%M:%S'),
            displayName = account and account.displayName or 'You',
            username = account and account.username or 'you',
            verified = account and account.verified or 0,
        }),
    }
end)

lib.callback.register('sr-smartphone:server:chirpUpdateProfile', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false, success = false } end

    local avatarUrl = sanitizeChirpImageUrl(data.avatarUrl) or ''
    local bannerUrl = sanitizeChirpImageUrl(data.bannerUrl) or ''

    MySQL.update.await(
        'UPDATE sr_chirp_accounts SET display_name = ?, bio = ?, avatar_url = ?, banner_url = ? WHERE citizenid = ?',
        { data.displayName:sub(1, 64), (data.bio or ''):sub(1, 160), avatarUrl, bannerUrl, citizenid }
    )
    return {
        ok = true,
        success = true,
        user = {
            name = data.displayName,
            username = data.username,
            bio = data.bio or '',
            avatarUrl = avatarUrl,
            bannerUrl = bannerUrl,
            verified = MySQL.scalar.await('SELECT verified FROM sr_chirp_accounts WHERE citizenid = ?', { citizenid }) == 1,
        },
    }
end)

lib.callback.register('sr-smartphone:server:chirpBuyVerification', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false, error = 'no_player' } end

    local account = MySQL.single.await(
        'SELECT verified FROM sr_chirp_accounts WHERE citizenid = ?',
        { citizenid }
    )
    if not account then return { ok = false, error = 'no_account' } end
    if account.verified == 1 then return { ok = false, error = 'already_verified' } end

    local cfg = Config.Chirp or {}
    local price = tonumber(cfg.verificationPrice) or 25000
    local currency = cfg.verificationCurrency == 'cash' and 'cash' or 'bank'

    if not SRBridge.RemoveMoney(source, currency, price, 'Twitter verification badge') then
        return { ok = false, error = 'insufficient_funds', price = price }
    end

    MySQL.update.await('UPDATE sr_chirp_accounts SET verified = 1 WHERE citizenid = ?', { citizenid })

    return {
        ok = true,
        success = true,
        verified = true,
        bank = SRBanking and SRBanking.GetBalance(source) or SRBridge.GetMoney(source, 'bank'),
        cash = SRBridge.GetMoney(source, 'cash'),
    }
end)
