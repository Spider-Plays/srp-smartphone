Config = {}

-- General
Config.Debug = false
Config.ResourceName = 'sr-smartphone'

-- Phone item (ox_inventory). Set RequireItem = false to allow phone without item.
Config.RequireItem = true
Config.PhoneItem = 'phone'

-- Open phone: keybind + command
Config.OpenKey = 'M'
Config.OpenCommand = 'phone'

-- While the phone UI is open: block GTA controls + common busy states (inventory, etc.)
Config.PhoneControls = {
    blockGameControls = true,   -- DisableAllControlActions except whitelisted below
    allowMovement = true,       -- Keep WASD / walk on foot
    allowSprint = false,        -- Block sprint (21) while phone is out
    allowJump = false,          -- Block jump (22) while phone is out
    allowVehicleControls = true, -- Keep steer / gas / brake while driving with phone open
    allowPhoneInVehicle = true, -- Can open and use the phone while in a vehicle
}

-- Phone number uses charinfo.phone from Qbox (auto-generated on character create)
Config.DefaultWallpaper = 'default'

-- Settings → My Details (profile display; optional housing label)
Config.Profile = {
    HousingExports = {
        { resource = 'srp-apartment', export = 'GetPlayerApartmentLabel' },
        { resource = 'nolag_properties', export = 'GetAllProperties' },
        { resource = 'ps-housing', export = 'GetPlayerApartmentLabel' },
        { resource = 'qb-apartments', export = 'GetPlayerApartmentLabel' },
        { resource = 'qbx_apartments', export = 'GetPlayerApartmentLabel' },
        { resource = 'ox_property', export = 'GetPlayerApartmentLabel' },
    },
    NearbyRadius = 35.0,
    NearbyTickMs = 8000,
    NearbyListRefreshMs = 4000,
}
Config.DefaultRingtone = 'opening'

-- Phone UI size presets (% of base 360×780). Saved per character — discrete sizes only (sharp layout, no zoom).
Config.PhoneScale = {
    default = 100,
    presets = { 85, 100, 110, 120 },
}

-- Apps enabled on home screen (alphabetical by id)
Config.Apps = {
    bank = true,
    calculator = true,
    camera = true,
    chirp = true,
    contacts = true,
    dispatch = true,
    documents = true,
    gallery = true,
    garage = true,
    invoices = true,
    jobs = true,
    mail = true,
    maps = true,
    market = true,
    messages = true,
    news = true,
    notes = true,
    phone = true,
    properties = true,
    services = true,
    settings = true,
    trading = true,
    weather = true,
    loans = true,
    boss = true,
    appstore = true,
    darkweb = true,
    calendar = true,
    music = true,
}

-- App Store: essential apps cannot be removed; everything else is listed in the store.
Config.AppStore = {
    essentialApps = { 'phone', 'messages', 'camera', 'settings', 'appstore' },
    catalog = {
        { id = 'bank', label = 'Bank', description = 'Balances, transfers, and history', price = 0, defaultInstalled = true },
        { id = 'boss', label = 'Company', description = 'Manage your business and employees', price = 0, defaultInstalled = false },
        { id = 'calculator', label = 'Calculator', description = 'Quick arithmetic on the go', price = 0, defaultInstalled = true },
        { id = 'calendar', label = 'Calendar', description = 'City events and personal reminders', price = 0, defaultInstalled = true },
        { id = 'chirp', label = 'Twitter', description = 'Social feed, posts, and profiles', price = 0, defaultInstalled = true },
        { id = 'documents', label = 'Documents', description = 'IDs, contracts, and signatures', price = 0, defaultInstalled = true },
        { id = 'darkweb', label = 'Onion', description = 'Anonymous black market listings', price = 0, defaultInstalled = false },
        { id = 'dispatch', label = 'Emergency', description = '911 dispatch and city services', price = 0, defaultInstalled = true },
        { id = 'gallery', label = 'Gallery', description = 'Photos and videos from your camera', price = 0, defaultInstalled = true },
        { id = 'garage', label = 'Garage', description = 'Vehicles, tracking, and impound', price = 0, defaultInstalled = true },
        { id = 'invoices', label = 'Invoices', description = 'Send and pay bills', price = 0, defaultInstalled = true },
        { id = 'jobs', label = 'Jobs', description = 'Duty, MDT, EMS, and job alerts', price = 0, defaultInstalled = true },
        { id = 'loans', label = 'Loans', description = 'Maze Bank lending and credit', price = 0, defaultInstalled = false },
        { id = 'mail', label = 'Mail', description = 'Email inbox and official notices', price = 0, defaultInstalled = true },
        { id = 'maps', label = 'Maps', description = 'GPS, pins, and share location', price = 0, defaultInstalled = true },
        { id = 'market', label = 'LifeInvader', description = 'Marketplace and job center', price = 0, defaultInstalled = true },
        { id = 'music', label = 'Radio', description = 'Los Santos radio stations', price = 0, defaultInstalled = true },
        { id = 'news', label = 'News', description = 'Weazel News and local outlets', price = 0, defaultInstalled = true },
        { id = 'notes', label = 'Notes', description = 'Personal memos and reminders', price = 0, defaultInstalled = true },
        { id = 'properties', label = 'Properties', description = 'Owned homes and browse listings', price = 0, defaultInstalled = true },
        { id = 'services', label = 'Services', description = 'Taxi, mechanic, and tow requests', price = 0, defaultInstalled = true },
        { id = 'trading', label = 'Trade', description = 'Crypto and stock trading', price = 0, defaultInstalled = false },
        { id = 'weather', label = 'Weather', description = 'Live San Andreas forecast', price = 0, defaultInstalled = true },
    },
}

Config.Wallet = {
    cards = {
        { id = 'state_id', label = 'State ID', icon = 'id' },
        { id = 'driver', label = 'Driver License', icon = 'car', licenceKey = 'driver' },
        { id = 'weapon', label = 'Weapon Permit', icon = 'shield', licenceKey = 'weapon' },
        { id = 'hunting', label = 'Hunting License', icon = 'target', licenceKey = 'hunting' },
        { id = 'fishing', label = 'Fishing License', icon = 'fish', licenceKey = 'fishing' },
        { id = 'pilot', label = 'Pilot License', icon = 'plane', licenceKey = 'pilot' },
    },
}

Config.Boss = { minBossGrade = 3 }

Config.MDT = {
    policeJobs = { 'police', 'bcso', 'sasp', 'sheriff' },
    emsJobs = { 'ambulance', 'doctor', 'ems' },
    bolos = {},
    warrants = {},
}

Config.RealEstate = {
    agentPhone = '555-REAL',
    agents = {},
    listings = {},
}

Config.DarkWeb = {
    categories = {
        { id = 'all', label = 'All' },
        { id = 'contraband', label = 'Contraband' },
        { id = 'services', label = 'Services' },
        { id = 'forged', label = 'Forged Docs' },
    },
    listingFee = 100,
    maxListings = 5,
}

Config.Calendar = {
    serverEvents = {},
}

Config.Radio = {
    stations = {
        { id = 'los_santos_rock', label = 'Los Santos Rock Radio', genre = 'Rock', frequency = '106.1' },
        { id = 'non_stop_pop', label = 'Non-Stop-Pop FM', genre = 'Pop', frequency = '96.3' },
        { id = 'west_coast_talk', label = 'West Coast Talk Radio', genre = 'Talk', frequency = '97.1' },
        { id = 'rebel_radio', label = 'Rebel Radio', genre = 'Country', frequency = '99.4' },
        { id = 'blaine_county', label = 'Blaine County Radio', genre = 'Folk', frequency = '101.3' },
        { id = 'flylo_fm', label = 'FlyLo FM', genre = 'Electronic', frequency = '103.5' },
    },
}

Config.Weather = {
    cityName = 'Los Santos',
    countyName = 'San Andreas',
}

-- Mail app (player-to-player + system mail via export)
Config.Mail = {
    domain = 'spider.mail',
    systemAddress = 'noreply@spider.mail',
    maxSubjectLength = 128,
    maxBodyLength = 4000,
    maxAttachments = 5,
    listLimit = 80,
}

-- Weazel News app
Config.News = {
    appName = 'Weazel News',
    defaultOutlet = 'weazel',
    -- Set true to insert seedOutlets/seedArticles on resource start (off for production)
    seedOnStartup = false,
    -- Jobs allowed to publish in-app (empty = no in-app publishing; use export PublishNewsArticle)
    publisherJobs = { 'reporter' },
    seedOutlets = {},
    seedArticles = {},
}

-- Twitter social app (internal id: chirp)
Config.Chirp = {
    verificationPrice = 25000, -- bank balance charged once for verified badge
    verificationCurrency = 'bank', -- bank | cash
    notifyNewPosts = true, -- push to all online players when someone posts
    notifyLikes = true, -- notify post author when someone likes their tweet
    notifyReplies = true, -- notify post author when someone replies to their tweet
}

-- Phone emote while open
Config.PhoneEmote = {
    enabled = true,
    mode = 'command', -- 'auto' | 'command' | 'native' | 'event'
    name = 'phone',
    openCommand = 'e phone',
    closeCommand = 'e c',
    -- native fallback (used when mode is native/auto and command menus fail)
    dict = 'cellphone@',
    anim = 'cellphone_text_read_base',
    prop = 'prop_npc_phone_02',
}

-- Camera app — NUI captures the WebGL canvas (lb-phone style).
-- Upload hosting (same idea as lb-phone Config.UploadMethod.Image = "Fivemanage"):
--   • fivemanage — NUI fetch → presigned URL (permanent CDN links, recommended)
--   • discord    — server webhook multipart (URLs expire ~24h)
--   • local      — store base64 data URL in DB (fallback, large rows)
--   • auto       — fivemanage if API key set, else discord if webhook set, else local
--
--   setr sr_phone_fivemanage_image_key "YOUR_IMAGE_API_KEY"
--   setr sr_phone_fivemanage_video_key "YOUR_VIDEO_API_KEY"
--   setr sr_phone_fivemanage_key "FALLBACK_KEY_IF_IMAGE/VIDEO_NOT_SET"
--   setr sr_phone_camera_webhook "https://discord.com/api/webhooks/..."
Config.Camera = {
    enabled = true,
    phoneType = 1,
    quality = 0.9,
    maxPhotos = 50,
    shutterSound = true,
    cursorKey = 'LMENU',

    -- Video mode (canvas MediaRecorder → webm, same pipeline as photos)
    videoEnabled = true,
    maxVideoDuration = 15, -- seconds (auto-stops recording)
    maxVideoSizeMb = 24,   -- reject larger blobs before upload

    -- iPhone-style lens switcher (CellCamSetDistance each frame while camera is open)
    defaultZoom = 'wide',
    -- distance: CellCamSetDistance (0.0–1.0). scale: NUI viewfinder optical zoom (0.5 / 1 / 2).
    zoomLevels = {
        { id = 'ultrawide', label = '0.5', distance = 1.0,  selfieDistance = 0.92, scale = 0.5 },
        { id = 'wide',      label = '1',   distance = 0.55, selfieDistance = 0.55, scale = 1.0 },
        { id = 'telephoto', label = '2',   distance = 0.0,  selfieDistance = 0.22, scale = 2.0 },
    },

    uploadMethod = 'fivemanage', -- fivemanage | discord | local | auto

    fivemanage = {
        -- Prefer server.cfg convars (image + video keys). apiKey is legacy fallback only.
        imageApiKey = '',
        videoApiKey = '',
        apiKey = '',
        apiVersion = 'v3', -- v2 = fmapi.net (lb-phone), v3 = api.fivemanage.com
    },

    -- Discord (optional storage or mirror when using Fivemanage)
    discordWebhook = 'https://discord.com/api/webhooks/1508032916268126308/4OhIMQp-ItixsHkoBlE5vf_0Sh4mGmtAVcxXaDin9dFmx0ho1UtBf0AqFzqdeSxO_oDO',
    discordUsername = 'SR Phone',
    discordAvatar = '',
    -- Optional: mirror Fivemanage CDN links to Discord (not used for storage)
    discordMirror = false,
}

-- Bank app (Renewed-Banking recommended)
Config.Bank = {
    enabled = true,
    provider = 'renewed', -- 'renewed' | 'framework' (qbx money only, local history table)
    resource = 'Renewed-Banking',
    allowTransfer = true,
    minTransfer = 1,
    maxTransfer = 50000,
    transferFee = 0, -- flat fee in bank currency
}

-- Loans app (Maze Bank lending)
Config.Loans = {
    lenderName = 'Maze Bank',
    scoreRange = { min = 300, max = 850 },
    defaultScore = 620,
    paymentIntervalHours = 24,
    gracePeriodHours = 6,
    lateFeePercent = 0.05,
    maxMissedBeforeDefault = 3,
    hardInquiryPenalty = 5,
    onTimePaymentBonus = 4,
    missedPaymentPenalty = 28,
    earlyPayoffBonus = 12,
    -- Max borrowable % of each product's maxAmount by credit score tier
    amountLimitMultipliers = {
        { minScore = 740, multiplier = 1.0 },   -- Excellent: full product limit
        { minScore = 670, multiplier = 0.85 },  -- Good
        { minScore = 580, multiplier = 0.65 },  -- Fair
        { minScore = 0,   multiplier = 0.45 },  -- Poor (still eligible if above product minCreditScore)
    },
    products = {
        {
            id = 'payday',
            label = 'Payday Loan',
            description = 'Fast cash for short-term needs. Higher rates apply.',
            minAmount = 500,
            maxAmount = 5000,
            minTermDays = 3,
            maxTermDays = 7,
            baseApr = 0.45,
            originationFee = 0.03,
            minCreditScore = 500,
            maxOpenLoans = 1,
            icon = 'zap',
        },
        {
            id = 'personal',
            label = 'Personal Loan',
            description = 'Flexible financing for everyday expenses.',
            minAmount = 1000,
            maxAmount = 25000,
            minTermDays = 7,
            maxTermDays = 30,
            baseApr = 0.18,
            originationFee = 0.02,
            minCreditScore = 550,
            maxOpenLoans = 2,
            icon = 'user',
        },
        {
            id = 'auto',
            label = 'Auto Loan',
            description = 'Finance a vehicle purchase with competitive rates.',
            minAmount = 5000,
            maxAmount = 75000,
            minTermDays = 14,
            maxTermDays = 60,
            baseApr = 0.12,
            originationFee = 0.015,
            minCreditScore = 600,
            maxOpenLoans = 1,
            icon = 'car',
        },
        {
            id = 'business',
            label = 'Business Loan',
            description = 'Capital for employed professionals and business owners.',
            minAmount = 10000,
            maxAmount = 100000,
            minTermDays = 30,
            maxTermDays = 90,
            baseApr = 0.10,
            originationFee = 0.01,
            minCreditScore = 650,
            maxOpenLoans = 1,
            icon = 'briefcase',
        },
    },
}

-- Garage app (qb-garages / qb-garage)
Config.Garage = {
    provider = 'qb-garages', -- 'qb-garages' | 'builtin' (direct DB query)
    resource = 'qb-garages', -- auto-detects qb-garages / qb-garage if this name differs
    eventPrefix = 'qb-garages', -- callback/event prefix used by the garage script
}

-- Properties app (srp-apartment apartments + nolag_properties houses)
Config.Properties = {
    apartments = {
        resource = 'srp-apartment',
    },
    houses = {
        resource = 'nolag_properties',
        ownerType = 'user',
        includeRents = true,
    },
    Buildings = {
        tinsel_towers = {
            label = 'Tinsel Towers',
            enter = vector3(-614.58, 46.52, 43.59),
        },
    },
}

-- Messages
Config.Messages = {
    maxLength = 500,
    maxContactsPerPage = 50,
}

-- Calls
Config.Calls = {
    ringTimeout = 30, -- seconds before auto-decline
    maxDistance = 0, -- 0 = unlimited (voice handled by your VOIP)
    anonymousName = 'Anonymous',
    anonymousNumber = 'Unknown',
  -- Phone voice: pma-voice call channels (false to disable)
    voice = 'pma-voice', -- false | 'pma-voice'
}

-- Rate limits (per player, per minute)
Config.RateLimit = {
    sendMessage = 30,
    startCall = 10,
    bankTransfer = 5,
    maps = 15,
    market = 10,
    services = 5,
    dispatch = 3,
    invoices = 8,
    properties = 10,
    documents = 15,
    news = 30,
    newsPublish = 5,
    mail = 15,
    cryptoTrade = 10,
    stockTrade = 10,
    tradingAlert = 5,
    loans = 10,
}

-- Documents app
Config.Documents = {
    categories = {
        { id = 'all', label = 'All' },
        { id = 'general', label = 'General' },
        { id = 'legal', label = 'Legal' },
        { id = 'medical', label = 'Medical' },
        { id = 'business', label = 'Business' },
    },
    -- Starter templates (read-only; mirrored in ui/.../premadeTemplates.js)
    premadeTemplates = {
        {
            slug = 'employment_contract',
            name = 'Employment Contract',
            description = 'Hire agreement with role, pay, and start date',
            icon = 'contract',
            category = 'legal',
            requiresSignature = true,
            baseContent = '<p>This agreement is entered into between the employer and employee named below.</p>',
            fields = {
                { id = 'employee_name', label = 'Employee name', type = 'text', required = true },
                { id = 'role', label = 'Position', type = 'text', required = true },
                { id = 'salary', label = 'Salary ($)', type = 'number', required = false },
                { id = 'start_date', label = 'Start date', type = 'date', required = true },
            },
        },
        {
            slug = 'traffic_citation',
            name = 'Traffic Citation',
            description = 'Moving violation notice for patrol citations',
            icon = 'citation',
            category = 'legal',
            requiresSignature = true,
            baseContent = '<p>You are cited for the violation described below. Sign to acknowledge receipt.</p>',
            fields = {
                { id = 'driver_name', label = 'Driver name', type = 'text', required = true },
                { id = 'plate', label = 'License plate', type = 'text', required = true },
                { id = 'vehicle', label = 'Vehicle description', type = 'text', required = false },
                { id = 'violation', label = 'Violation', type = 'textarea', required = true },
                { id = 'fine', label = 'Fine amount ($)', type = 'number', required = false },
                { id = 'citation_date', label = 'Date of citation', type = 'date', required = true },
            },
        },
        {
            slug = 'medical_release',
            name = 'Medical Release',
            description = 'Authorize release of medical records',
            icon = 'medical',
            category = 'medical',
            requiresSignature = true,
            baseContent = '<p>I authorize the facility below to release my medical information to the party specified.</p>',
            fields = {
                { id = 'patient_name', label = 'Patient name', type = 'text', required = true },
                { id = 'facility', label = 'Medical facility', type = 'text', required = true },
                { id = 'recipient', label = 'Release to', type = 'text', required = true },
                { id = 'purpose', label = 'Purpose', type = 'textarea', required = true },
                { id = 'effective_date', label = 'Effective date', type = 'date', required = true },
            },
        },
        {
            slug = 'nda',
            name = 'Non-Disclosure Agreement',
            description = 'Confidentiality between two parties',
            icon = 'legal',
            category = 'business',
            requiresSignature = true,
            baseContent = '<p>The parties agree to keep shared business information confidential for the term below.</p>',
            fields = {
                { id = 'party_a', label = 'Disclosing party', type = 'text', required = true },
                { id = 'party_b', label = 'Receiving party', type = 'text', required = true },
                { id = 'term_months', label = 'Term (months)', type = 'number', required = true },
                { id = 'effective_date', label = 'Effective date', type = 'date', required = true },
            },
        },
        {
            slug = 'vehicle_sale',
            name = 'Vehicle Bill of Sale',
            description = 'Private vehicle transfer agreement',
            icon = 'business',
            category = 'business',
            requiresSignature = true,
            baseContent = '<p>The seller transfers ownership of the vehicle described below to the buyer.</p>',
            fields = {
                { id = 'seller', label = 'Seller name', type = 'text', required = true },
                { id = 'buyer', label = 'Buyer name', type = 'text', required = true },
                { id = 'vehicle', label = 'Vehicle (make/model)', type = 'text', required = true },
                { id = 'plate', label = 'Plate / VIN', type = 'text', required = true },
                { id = 'sale_price', label = 'Sale price ($)', type = 'number', required = true },
                { id = 'sale_date', label = 'Sale date', type = 'date', required = true },
            },
        },
        {
            slug = 'rental_lease',
            name = 'Rental Agreement',
            description = 'Residential or commercial lease terms',
            icon = 'contract',
            category = 'legal',
            requiresSignature = true,
            baseContent = '<p>The landlord agrees to lease the property below to the tenant under these terms.</p>',
            fields = {
                { id = 'landlord', label = 'Landlord', type = 'text', required = true },
                { id = 'tenant', label = 'Tenant', type = 'text', required = true },
                { id = 'property', label = 'Property address', type = 'textarea', required = true },
                { id = 'rent', label = 'Monthly rent ($)', type = 'number', required = true },
                { id = 'deposit', label = 'Security deposit ($)', type = 'number', required = false },
                { id = 'lease_start', label = 'Lease start', type = 'date', required = true },
            },
        },
        {
            slug = 'incident_report',
            name = 'Incident Report',
            description = 'Law enforcement or security incident log',
            icon = 'citation',
            category = 'general',
            requiresSignature = false,
            baseContent = '<p>Report of incident including location, parties, and narrative.</p>',
            fields = {
                { id = 'officer', label = 'Reporting officer', type = 'text', required = true },
                { id = 'location', label = 'Location', type = 'text', required = true },
                { id = 'involved', label = 'Parties involved', type = 'textarea', required = true },
                { id = 'narrative', label = 'Narrative', type = 'textarea', required = true },
                { id = 'incident_date', label = 'Date of incident', type = 'date', required = true },
            },
        },
        {
            slug = 'witness_statement',
            name = 'Witness Statement',
            description = 'Sworn or informal witness account',
            icon = 'form',
            category = 'legal',
            requiresSignature = true,
            baseContent = '<p>I declare the following to be true to the best of my knowledge.</p>',
            fields = {
                { id = 'witness_name', label = 'Witness name', type = 'text', required = true },
                { id = 'case_ref', label = 'Case / reference #', type = 'text', required = false },
                { id = 'statement', label = 'Statement', type = 'textarea', required = true },
                { id = 'statement_date', label = 'Date', type = 'date', required = true },
            },
        },
        {
            slug = 'warning_letter',
            name = 'Written Warning',
            description = 'HR disciplinary notice to employee',
            icon = 'document',
            category = 'business',
            requiresSignature = true,
            baseContent = '<p>This written warning documents the issue below and expected corrective action.</p>',
            fields = {
                { id = 'employee', label = 'Employee name', type = 'text', required = true },
                { id = 'department', label = 'Department', type = 'text', required = false },
                { id = 'issue', label = 'Issue / violation', type = 'textarea', required = true },
                { id = 'action', label = 'Required action', type = 'textarea', required = true },
                { id = 'warning_date', label = 'Date', type = 'date', required = true },
            },
        },
        {
            slug = 'promissory_note',
            name = 'Promissory Note',
            description = 'Loan repayment agreement between parties',
            icon = 'legal',
            category = 'business',
            requiresSignature = true,
            baseContent = '<p>The borrower promises to repay the lender according to the terms below.</p>',
            fields = {
                { id = 'lender', label = 'Lender', type = 'text', required = true },
                { id = 'borrower', label = 'Borrower', type = 'text', required = true },
                { id = 'amount', label = 'Principal ($)', type = 'number', required = true },
                { id = 'due_date', label = 'Due date', type = 'date', required = true },
                { id = 'terms', label = 'Payment terms', type = 'textarea', required = false },
            },
        },
        {
            slug = 'service_invoice',
            name = 'Service Invoice',
            description = 'Bill for services rendered',
            icon = 'business',
            category = 'business',
            requiresSignature = false,
            baseContent = '<p>Invoice for services listed below. Payment due by the date specified.</p>',
            fields = {
                { id = 'from', label = 'From (business)', type = 'text', required = true },
                { id = 'to', label = 'Bill to', type = 'text', required = true },
                { id = 'services', label = 'Services / items', type = 'textarea', required = true },
                { id = 'total', label = 'Total due ($)', type = 'number', required = true },
                { id = 'due_date', label = 'Due date', type = 'date', required = true },
            },
        },
        {
            slug = 'treatment_consent',
            name = 'Treatment Consent',
            description = 'Consent for medical procedure',
            icon = 'medical',
            category = 'medical',
            requiresSignature = true,
            baseContent = '<p>I consent to the treatment described below and acknowledge the risks explained to me.</p>',
            fields = {
                { id = 'patient', label = 'Patient name', type = 'text', required = true },
                { id = 'procedure', label = 'Procedure', type = 'text', required = true },
                { id = 'physician', label = 'Attending physician', type = 'text', required = true },
                { id = 'consent_date', label = 'Date', type = 'date', required = true },
            },
        },
    },
}

-- Maps (Route)
Config.Maps = {
    defaultPins = {
        { id = 'pd', label = 'Mission Row PD', category = 'services', x = 441.2, y = -981.9, z = 30.7 },
        { id = 'pillbox', label = 'Pillbox Hospital', category = 'services', x = 311.2, y = -592.4, z = 43.3 },
        { id = 'legion', label = 'Legion Square', category = 'landmarks', x = 213.1, y = -921.1, z = 30.7 },
        { id = 'airport', label = 'LSIA', category = 'travel', x = -1037.5, y = -2737.6, z = 20.2 },
        { id = 'sandy', label = 'Sandy Shores', category = 'landmarks', x = 1853.2, y = 3686.9, z = 34.3 },
        { id = 'paleto', label = 'Paleto Bay', category = 'landmarks', x = -247.4, y = 6331.0, z = 32.4 },
    },
}

-- Jobs app
Config.Jobs = {
    allowDutyToggle = true,
}

-- Unified Trade app (crypto + stocks)
Config.Trading = {
    maxAlerts = 15,
    maxWatchlist = 30,
    historyTicks = 24,
    historyWeekDays = 7,
    tradeFeePercent = 0,
}

Config.Crypto = {
    enabled = true,
    label = 'Crypto',
    minTrade = 100,
    maxTrade = 50000,
    marketHours = { alwaysOpen = true },
    assets = {
        { id = 'btc', symbol = 'BTC', name = 'Bitcoin', basePrice = 95000, volatility = 0.08, color = '#F7931A' },
        { id = 'eth', symbol = 'ETH', name = 'Ethereum', basePrice = 3200, volatility = 0.10, color = '#627EEA' },
        { id = 'doge', symbol = 'DOGE', name = 'Dogecoin', basePrice = 0.35, volatility = 0.15, color = '#C2A633' },
        { id = 'srx', symbol = 'SRX', name = 'SpiderCoin', basePrice = 12.5, volatility = 0.25, color = '#FF2D55' },
    },
}

Config.StockMarket = {
    enabled = true,
    label = 'Stocks',
    minTrade = 50,
    maxTrade = 100000,
    -- In-game exchange hours (GTA world clock via GetClockHours)
    marketHours = {
        openHour = 9,
        closeHour = 17,
        tickMinutes = 5, -- new price tick every N in-game minutes while open
    },
    assets = {
        { id = 'maze', symbol = 'MAZE', name = 'Maze Bank', basePrice = 185.50, volatility = 0.05, color = '#E53935' },
        { id = 'life', symbol = 'LIFE', name = 'Lifeinvader', basePrice = 42.25, volatility = 0.08, color = '#1565C0' },
        { id = 'cluck', symbol = 'CLUCK', name = 'Cluckin Bell', basePrice = 78.00, volatility = 0.06, color = '#FFC107' },
        { id = 'lsc', symbol = 'LSC', name = 'Los Santos Customs', basePrice = 124.75, volatility = 0.07, color = '#FF5722' },
        { id = 'vapid', symbol = 'VAPD', name = 'Vapid Motors', basePrice = 56.40, volatility = 0.09, color = '#607D8B' },
        { id = 'xero', symbol = 'XERO', name = 'Xero Gas', basePrice = 33.80, volatility = 0.04, color = '#4CAF50' },
    },
}

-- LifeInvader marketplace (player buy/sell listings) + in-app job center (replaces qbx_cityhall employment)
Config.Market = {
    label = 'LifeInvader',
    categories = {
        { id = 'all', label = 'All' },
        { id = 'vehicles', label = 'Vehicles' },
        { id = 'items', label = 'Items' },
        { id = 'services', label = 'Services' },
        { id = 'misc', label = 'Misc' },
    },
    jobCenter = {
        enabled = true,
        -- Random review delay before the player is hired (minutes)
        reviewMinutes = { min = 5, max = 10 },
        -- Keep in sync with qbx_cityhall config.shared employment.jobs (Set employment.enabled = false there)
        jobs = {
            { id = 'unemployed', label = 'Unemployed', description = 'Leave your current position' },
            { id = 'trucker', label = 'Trucker', description = 'Long-haul freight across San Andreas' },
            { id = 'taxi', label = 'Taxi', description = 'City cab service' },
            { id = 'tow', label = 'Tow Truck', description = 'Vehicle recovery & roadside assist' },
            { id = 'reporter', label = 'News Reporter', description = 'Cover stories for Weazel News' },
            { id = 'garbage', label = 'Garbage Collector', description = 'Municipal waste collection routes' },
            { id = 'bus', label = 'Bus Driver', description = 'Public transit routes' },
        },
    },
}

-- Services (taxi, mechanic, etc.)
Config.Services = {
    types = {
        { id = 'taxi', label = 'Taxi', job = 'taxi', description = 'Request a city cab' },
        { id = 'mechanic', label = 'Mechanic', job = 'mechanic', description = 'Roadside repair & tow' },
        { id = 'tow', label = 'Tow Truck', job = 'tow', description = 'Vehicle recovery' },
    },
    -- NPC contracts (NoPixel-style) for on-duty taxi / mechanic / tow workers
    npcJobs = {
        enabled = true,
        -- How often to try spawning a new contract per eligible worker (seconds)
        spawnInterval = { min = 50, max = 95 },
        maxOffered = 4,
        jobExpireMinutes = 12,
        completeRadius = 40.0,
        moneyType = 'bank',
        xpPerJob = 15,
        reputationPerJob = 2,
        xpPerLevel = 100,
        maxReputation = 100,
        ranks = {
            { minXp = 0, label = 'Rookie' },
            { minXp = 100, label = 'Skilled' },
            { minXp = 300, label = 'Professional' },
            { minXp = 600, label = 'Expert' },
            { minXp = 1000, label = 'Veteran' },
        },
        customerNames = {
            'Marcus Webb', 'Elena Ruiz', 'Tyler Brooks', 'Nina Patel', 'Jordan Hale',
            'Sofia Chen', 'Derek Moss', 'Ava Sinclair', 'Chris Ortiz', 'Maya Ford',
        },
        templates = {
            taxi = {
                { title = 'Airport Run', description = 'Pickup downtown, drop at LSIA terminal', payout = { min = 85, max = 140 }, pickup = { x = 213.1, y = -921.1, z = 30.7 }, dropoff = { x = -1034.6, y = -2733.6, z = 20.1 } },
                { title = 'Nightlife Fare', description = 'VIP pickup from Vinewood to Legion', payout = { min = 45, max = 75 }, pickup = { x = 373.0, y = 252.0, z = 103.0 }, dropoff = { x = 215.8, y = -810.2, z = 30.7 } },
                { title = 'Hospital Transfer', description = 'Patient discharge ride to Grove St', payout = { min = 55, max = 90 }, pickup = { x = 311.2, y = -592.4, z = 43.3 }, dropoff = { x = -50.2, y = -1758.4, z = 29.4 } },
                { title = 'Business Commute', description = 'Executive to Maze Bank plaza', payout = { min = 40, max = 65 }, pickup = { x = -1287.4, y = -430.2, z = 35.1 }, dropoff = { x = -75.5, y = -818.9, z = 326.2 } },
                { title = 'Sandy Shores Trip', description = 'Long haul from city to Sandy', payout = { min = 120, max = 185 }, pickup = { x = 240.3, y = -880.1, z = 30.0 }, dropoff = { x = 1960.5, y = 3740.2, z = 32.3 } },
            },
            mechanic = {
                { title = 'Engine Stall', description = 'Vehicle won\'t start — battery & diagnostics', payout = { min = 95, max = 150 }, location = { x = 548.0, y = -188.5, z = 54.5 } },
                { title = 'Flat Tire', description = 'Replace tire roadside near Alta', payout = { min = 70, max = 110 }, location = { x = 292.4, y = -584.2, z = 43.2 } },
                { title = 'Oil Leak', description = 'Commercial van leaking outside depot', payout = { min = 110, max = 165 }, location = { x = 1174.8, y = -1324.5, z = 34.8 } },
                { title = 'Overheat', description = 'Radiator flush needed on Del Perro', payout = { min = 85, max = 130 }, location = { x = -1452.3, y = -396.8, z = 38.2 } },
                { title = 'Breakdown', description = 'Classic car stalled on Great Ocean Hwy', payout = { min = 130, max = 195 }, location = { x = -2550.1, y = 2316.4, z = 33.2 } },
            },
            tow = {
                { title = 'Illegal Parking', description = 'Impound vehicle blocking hydrant', payout = { min = 100, max = 155 }, location = { x = 409.2, y = -1623.1, z = 29.3 } },
                { title = 'Highway Recovery', description = 'Sedan in ditch on Senora Fwy', payout = { min = 140, max = 210 }, location = { x = 2545.6, y = 384.2, z = 108.6 } },
                { title = 'Accident Scene', description = 'Clear wreck near Pillbox approach', payout = { min = 115, max = 175 }, location = { x = 357.8, y = -551.2, z = 28.8 } },
                { title = 'Beach Tow', description = 'SUV stuck on Vespucci sand', payout = { min = 90, max = 140 }, location = { x = -1183.5, y = -1504.8, z = 4.4 } },
                { title = 'Lot Repossess', description = 'Repo pickup from Davis Ave', payout = { min = 125, max = 190 }, location = { x = 169.4, y = -1731.6, z = 29.3 } },
            },
        },
    },
}

-- 911 / Dispatch (Emergency app)
Config.Dispatch = {
    -- Use Project Sloth ps-dispatch when the resource is running (recommended)
    usePsDispatch = true,
    psDispatchResource = 'ps-dispatch',
    jobs = { 'police', 'ambulance', 'bcso', 'sasp' },
    policeNumber = '911',
    medicalNumber = '811',
    dispatchNumber = '311',
    lawyerJob = 'lawyer',
    judgeJob = 'judge',
    categories = {
        { id = 'police', label = 'Police', description = 'Crime in progress, robbery, assault' },
        { id = 'medical', label = 'Medical', description = 'Injured person, medical emergency' },
        { id = 'fire', label = 'Fire', description = 'Fire or explosion' },
        { id = 'other', label = 'Other', description = 'General emergency' },
    },
    legislation = {
        { id = 1, title = 'Penal Code §1 — Assault', summary = 'Unlawful force against another person. Misdemeanor or felony depending on injury and weapon use.' },
        { id = 2, title = 'Penal Code §2 — Robbery', summary = 'Taking property from a person by force or intimidation. Enhanced penalties for firearms.' },
        { id = 3, title = 'Penal Code §3 — Evading', summary = 'Fleeing a lawful traffic stop or police pursuit. License suspension and vehicle impound may apply.' },
        { id = 4, title = 'Traffic Code §1 — Speed Limits', summary = 'Posted limits apply citywide unless otherwise marked. Excessive speed in school zones carries extra fines.' },
        { id = 5, title = 'Traffic Code §2 — DUI', summary = 'Operating a vehicle under the influence of alcohol or controlled substances. Mandatory court appearance.' },
        { id = 6, title = 'Traffic Code §3 — Reckless Driving', summary = 'Operating a vehicle with willful disregard for safety. Includes street racing and dangerous stunts.' },
        { id = 7, title = 'Business Code §1 — Licensing', summary = 'Businesses must maintain a valid city license. Unlicensed sales or services may be shut down.' },
        { id = 8, title = 'Weapons Code §1 — Concealed Carry', summary = 'Firearms must be legally owned and carried per LSPD guidelines. Automatic weapons require special permits.' },
        { id = 9, title = 'Public Order §1 — Disturbing the Peace', summary = 'Unreasonable noise, fighting in public, or obstructing sidewalks and venues.' },
        { id = 10, title = 'Public Order §2 — Trespassing', summary = 'Entering restricted government or private property without permission after being warned.' },
    },
}
