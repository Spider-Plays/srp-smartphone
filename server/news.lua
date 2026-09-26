local function formatTimeAgo(createdAt)
    if not createdAt then return 'Recently' end
    local ts = createdAt
    if type(createdAt) == 'string' then
        local y, m, d, h, min, s = createdAt:match('(%d+)-(%d+)-(%d+) (%d+):(%d+):(%d+)')
        if y then
            ts = os.time({ year = tonumber(y), month = tonumber(m), day = tonumber(d), hour = tonumber(h), min = tonumber(min), sec = tonumber(s) })
        end
    end
    local diff = os.time() - (tonumber(ts) or os.time())
    if diff < 60 then return 'Just now' end
    if diff < 3600 then return ('%dm ago'):format(math.floor(diff / 60)) end
    if diff < 86400 then return ('%dh ago'):format(math.floor(diff / 3600)) end
    return ('%dd ago'):format(math.floor(diff / 86400))
end

local function enrichArticles(rows)
    for _, row in ipairs(rows) do
        row.timeAgo = formatTimeAgo(row.published_at)
        row.excerpt = row.body and row.body:sub(1, 160) or ''
    end
    return rows
end

local function ensureOutlet(outlet)
    local row = MySQL.single.await('SELECT id FROM sr_phone_news_outlets WHERE slug = ? LIMIT 1', { outlet.slug })
    if row then return row.id end
    return MySQL.insert.await(
        'INSERT INTO sr_phone_news_outlets (slug, name, description, featured) VALUES (?, ?, ?, ?)',
        { outlet.slug, outlet.name, outlet.description or '', outlet.featured and 1 or 0 }
    )
end

local function ensureDefaultOutlet()
    return ensureOutlet({
        slug = 'weazel',
        name = 'Weazel News',
        description = 'Los Santos premier news network',
        featured = true,
    })
end

local function seedNewsContent()
    SRPhoneAwaitDb()

    local cfg = Config.News or {}
    if cfg.seedOnStartup == false then
        return
    end

    for _, outlet in ipairs(cfg.seedOutlets or {}) do
        ensureOutlet(outlet)
    end
    ensureDefaultOutlet()

    for _, article in ipairs(cfg.seedArticles or {}) do
        local slug = article.outletSlug or cfg.defaultOutlet or 'weazel'
        local outletId = MySQL.scalar.await('SELECT id FROM sr_phone_news_outlets WHERE slug = ? LIMIT 1', { slug })
        if not outletId then
            for _, outlet in ipairs(cfg.seedOutlets or {}) do
                if outlet.slug == slug then
                    outletId = ensureOutlet(outlet)
                    break
                end
            end
        end
        if not outletId then goto continue end

        local exists = MySQL.scalar.await(
            'SELECT 1 FROM sr_phone_news_articles WHERE outlet_id = ? AND headline = ? LIMIT 1',
            { outletId, article.headline }
        )
        if not exists then
            MySQL.insert.await(
                'INSERT INTO sr_phone_news_articles (outlet_id, author_citizenid, author_label, headline, body) VALUES (?, ?, ?, ?, ?)',
                {
                    outletId,
                    'system',
                    article.authorLabel or 'Weazel News',
                    article.headline,
                    article.body,
                }
            )
        end
        ::continue::
    end
end

CreateThread(function()
    Wait(2500)
    seedNewsContent()
end)

lib.callback.register('sr-smartphone:server:getNewsArticles', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    data = data or {}
    local scope = data.scope or 'home'
    local search = data.search and tostring(data.search):lower() or ''
    local params = {}
    local query = [[
        SELECT a.id, a.outlet_id, a.author_label, a.headline, a.body, a.image_url, a.published_at,
               o.name AS outlet_name, o.slug AS outlet_slug
        FROM sr_phone_news_articles a
        INNER JOIN sr_phone_news_outlets o ON o.id = a.outlet_id
    ]]

    if scope == 'following' then
        query = query .. [[
            INNER JOIN sr_phone_news_follows f ON f.outlet_id = a.outlet_id AND f.citizenid = ?
        ]]
        params[#params + 1] = citizenid
    end

    query = query .. ' WHERE 1=1'

    if search ~= '' then
        query = query .. ' AND (LOWER(a.headline) LIKE ? OR LOWER(a.body) LIKE ? OR LOWER(o.name) LIKE ?)'
        local pattern = '%' .. search .. '%'
        params[#params + 1] = pattern
        params[#params + 1] = pattern
        params[#params + 1] = pattern
    end

    query = query .. ' ORDER BY a.published_at DESC LIMIT 50'

    return enrichArticles(MySQL.query.await(query, params) or {})
end)

lib.callback.register('sr-smartphone:server:getNewsOutlets', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    data = data or {}
    local search = data.search and tostring(data.search):lower() or ''
    local params = { citizenid }
    local query = [[
        SELECT o.id, o.slug, o.name, o.description, o.featured,
               CASE WHEN f.outlet_id IS NOT NULL THEN 1 ELSE 0 END AS is_following
        FROM sr_phone_news_outlets o
        LEFT JOIN sr_phone_news_follows f ON f.outlet_id = o.id AND f.citizenid = ?
        WHERE 1=1
    ]]

    if search ~= '' then
        query = query .. ' AND (LOWER(o.name) LIKE ? OR LOWER(o.description) LIKE ?)'
        local pattern = '%' .. search .. '%'
        params[#params + 1] = pattern
        params[#params + 1] = pattern
    end

    query = query .. ' ORDER BY o.featured DESC, o.name ASC LIMIT 40'

    return MySQL.query.await(query, params) or {}
end)

lib.callback.register('sr-smartphone:server:getNewsArticle', function(source, articleId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not articleId then return { ok = false } end

    local row = MySQL.single.await(
        [[SELECT a.id, a.outlet_id, a.author_label, a.headline, a.body, a.image_url, a.published_at,
                 o.name AS outlet_name, o.slug AS outlet_slug,
                 CASE WHEN f.outlet_id IS NOT NULL THEN 1 ELSE 0 END AS is_following
          FROM sr_phone_news_articles a
          INNER JOIN sr_phone_news_outlets o ON o.id = a.outlet_id
          LEFT JOIN sr_phone_news_follows f ON f.outlet_id = o.id AND f.citizenid = ?
          WHERE a.id = ?]],
        { citizenid, articleId }
    )

    if not row then return { ok = false } end
    row.timeAgo = formatTimeAgo(row.published_at)
    return { ok = true, article = row }
end)

lib.callback.register('sr-smartphone:server:toggleNewsFollow', function(source, outletId)
    if not SRCheckRate(source, 'news', 20) then return { ok = false, error = 'rate_limit' } end

    local citizenid = SRBridge.GetCitizenId(source)
    outletId = tonumber(outletId)
    if not citizenid or not outletId then return { ok = false } end

    local existing = MySQL.scalar.await(
        'SELECT 1 FROM sr_phone_news_follows WHERE citizenid = ? AND outlet_id = ?',
        { citizenid, outletId }
    )

    if existing then
        MySQL.update.await('DELETE FROM sr_phone_news_follows WHERE citizenid = ? AND outlet_id = ?', { citizenid, outletId })
        return { ok = true, following = false }
    end

    MySQL.insert.await('INSERT INTO sr_phone_news_follows (citizenid, outlet_id) VALUES (?, ?)', { citizenid, outletId })
    return { ok = true, following = true }
end)

lib.callback.register('sr-smartphone:server:publishNewsArticle', function(source, data)
    if not SRCheckRate(source, 'newsPublish', 5) then return { ok = false, error = 'rate_limit' } end

    local citizenid = SRBridge.GetCitizenId(source)
    local player = exports.qbx_core:GetPlayer(source)
    if not citizenid or not player or not data then return { ok = false } end

    if not SRNewsCanPublish(source) then return { ok = false, error = 'not_allowed' } end

    local headline = tostring(data.headline or ''):sub(1, 128)
    local body = tostring(data.body or ''):sub(1, 8000)
    if headline == '' or body == '' then return { ok = false, error = 'invalid' } end

    local outletId = tonumber(data.outletId) or ensureDefaultOutlet()
    local authorLabel = SRBridge.GetDisplayName(source)
    local imageUrl = data.imageUrl and tostring(data.imageUrl):sub(1, 512) or nil

    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_news_articles (outlet_id, author_citizenid, author_label, headline, body, image_url) VALUES (?, ?, ?, ?, ?, ?)',
        { outletId, citizenid, authorLabel, headline, body, imageUrl }
    )

    if not id then return { ok = false } end

    local row = MySQL.single.await(
        [[SELECT a.id, a.outlet_id, a.author_label, a.headline, a.body, a.image_url, a.published_at,
                 o.name AS outlet_name, o.slug AS outlet_slug
          FROM sr_phone_news_articles a
          INNER JOIN sr_phone_news_outlets o ON o.id = a.outlet_id
          WHERE a.id = ?]],
        { id }
    )

    if row then
        row.timeAgo = formatTimeAgo(row.published_at)
        row.excerpt = row.body and row.body:sub(1, 160) or ''
    end

    return { ok = true, id = id, article = row }
end)

-- Admin / server helper: exports['sr-smartphone']:PublishNewsArticle({ headline, body, outletSlug })
exports('PublishNewsArticle', function(payload)
    if type(payload) ~= 'table' then return false end
    local slug = payload.outletSlug or (Config.News and Config.News.defaultOutlet) or 'weazel'
    local outlet = MySQL.single.await('SELECT id FROM sr_phone_news_outlets WHERE slug = ? LIMIT 1', { slug })
    if not outlet then
        outlet = { id = ensureDefaultOutlet() }
    end

    local headline = tostring(payload.headline or ''):sub(1, 128)
    local body = tostring(payload.body or ''):sub(1, 8000)
    if headline == '' or body == '' then return false end

    MySQL.insert.await(
        'INSERT INTO sr_phone_news_articles (outlet_id, author_citizenid, author_label, headline, body, image_url) VALUES (?, ?, ?, ?, ?, ?)',
        {
            outlet.id,
            payload.authorCitizenid or 'system',
            payload.authorLabel or 'Weazel News',
            headline,
            body,
            payload.imageUrl,
        }
    )
    return true
end)
