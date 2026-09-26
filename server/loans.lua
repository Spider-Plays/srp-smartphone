SRLoans = SRLoans or {}

local cfg = function()
    return Config.Loans or {}
end

local function notifyPhone(source, title, description, nType)
    TriggerClientEvent('sr-smartphone:client:notify', source, {
        title = title,
        description = description,
        type = nType or 'inform',
        app = 'loans',
    })
end

local function clampScore(score)
    local range = cfg().scoreRange or { min = 300, max = 850 }
    return math.max(range.min, math.min(range.max, math.floor(score + 0.5)))
end

local function scoreBand(score)
    if score >= 740 then return 'excellent', 'Excellent' end
    if score >= 670 then return 'good', 'Good' end
    if score >= 580 then return 'fair', 'Fair' end
    return 'poor', 'Poor'
end

local function getProduct(productId)
    for _, product in ipairs(cfg().products or {}) do
        if product.id == productId then
            return product
        end
    end
end

local function formatDueLabel(epoch)
    if not epoch then return '—' end
    local diff = epoch - os.time()
    if diff <= 0 then return 'Due now' end
    if diff < 3600 then return ('Due in %dm'):format(math.ceil(diff / 60)) end
    if diff < 86400 then return ('Due in %dh'):format(math.ceil(diff / 3600)) end
    return ('Due in %dd'):format(math.ceil(diff / 86400))
end

function SRLoans.GetProfile(citizenid)
    if not citizenid then return nil end

    local row = MySQL.single.await('SELECT * FROM sr_phone_credit_profiles WHERE citizenid = ?', { citizenid })
    if row then return row end

    local defaultScore = cfg().defaultScore or 620
    local band = scoreBand(defaultScore)

    MySQL.insert.await([[
        INSERT INTO sr_phone_credit_profiles (citizenid, score, band)
        VALUES (?, ?, ?)
    ]], { citizenid, defaultScore, band })

    return MySQL.single.await('SELECT * FROM sr_phone_credit_profiles WHERE citizenid = ?', { citizenid })
end

function SRLoans.RecalculateScore(citizenid)
    local profile = SRLoans.GetProfile(citizenid)
    if not profile then return nil end

    local base = cfg().defaultScore or 620
    local score = base
    score = score + (tonumber(profile.on_time_payments) or 0) * (cfg().onTimePaymentBonus or 4)
    score = score - (tonumber(profile.missed_payments) or 0) * (cfg().missedPaymentPenalty or 28)
    score = score - (tonumber(profile.hard_inquiries) or 0) * (cfg().hardInquiryPenalty or 5)

    local repaid = tonumber(profile.total_repaid) or 0
    local borrowed = tonumber(profile.total_borrowed) or 0
    if borrowed > 0 then
        local ratio = math.min(1, repaid / borrowed)
        score = score + ratio * 40
    end

    local openLoans = tonumber(MySQL.scalar.await(
        "SELECT COUNT(*) FROM sr_phone_loans WHERE citizenid = ? AND status = 'active'",
        { citizenid }
    )) or 0

    if openLoans > 0 then
        local utilization = tonumber(MySQL.scalar.await(
            "SELECT COALESCE(SUM(balance), 0) FROM sr_phone_loans WHERE citizenid = ? AND status = 'active'",
            { citizenid }
        )) or 0
        if utilization > 50000 then score = score - 15
        elseif utilization > 25000 then score = score - 8
        end
    else
        score = score + 10
    end

    score = clampScore(score)
    local bandKey, bandLabel = scoreBand(score)

    MySQL.update.await([[
        UPDATE sr_phone_credit_profiles
        SET score = ?, band = ?, open_loans = ?, updated_at = CURRENT_TIMESTAMP
        WHERE citizenid = ?
    ]], { score, bandKey, openLoans, citizenid })

    return {
        score = score,
        band = bandKey,
        bandLabel = bandLabel,
        onTimePayments = profile.on_time_payments or 0,
        missedPayments = profile.missed_payments or 0,
        totalBorrowed = borrowed,
        totalRepaid = repaid,
        openLoans = openLoans,
    }
end

local function getAmountLimitMultiplier(creditScore)
    local tiers = cfg().amountLimitMultipliers or {
        { minScore = 740, multiplier = 1.0 },
        { minScore = 670, multiplier = 0.85 },
        { minScore = 580, multiplier = 0.65 },
        { minScore = 0, multiplier = 0.45 },
    }

    table.sort(tiers, function(a, b)
        return a.minScore > b.minScore
    end)

    creditScore = creditScore or cfg().defaultScore or 620
    for i = 1, #tiers do
        if creditScore >= tiers[i].minScore then
            return tiers[i].multiplier
        end
    end

    return 0.45
end

function SRLoans.GetMaxAmount(product, creditScore)
    if not product then return 0 end

    local multiplier = getAmountLimitMultiplier(creditScore)
    local capped = math.floor((product.maxAmount or 0) * multiplier)
    return math.max(product.minAmount or 0, capped)
end

function SRLoans.CalculateQuote(productId, amount, termDays, creditScore)
    local product = getProduct(productId)
    if not product then return nil, 'invalid_product' end

    amount = math.floor(tonumber(amount) or 0)
    termDays = math.floor(tonumber(termDays) or 0)
    creditScore = creditScore or cfg().defaultScore or 620
    local maxAllowed = SRLoans.GetMaxAmount(product, creditScore)
    if amount < product.minAmount or amount > maxAllowed then return nil, 'invalid_amount' end
    if termDays < product.minTermDays or termDays > product.maxTermDays then return nil, 'invalid_term' end

    local apr = product.baseApr or 0.18
    if creditScore >= 740 then
        apr = apr * 0.85
    elseif creditScore >= 670 then
        apr = apr * 0.92
    elseif creditScore < 580 then
        apr = apr * 1.15
    end

    local originationFee = math.floor(amount * (product.originationFee or 0))
    local totalInterest = math.floor(amount * apr * (termDays / 365))
    local totalRepay = amount + originationFee + totalInterest

    local intervalHours = cfg().paymentIntervalHours or 24
    local paymentsTotal = math.max(1, math.ceil((termDays * 24) / intervalHours))
    local paymentAmount = math.ceil(totalRepay / paymentsTotal)

    return {
        productId = product.id,
        productLabel = product.label,
        amount = amount,
        termDays = termDays,
        apr = apr,
        aprPercent = math.floor(apr * 1000) / 10,
        originationFee = originationFee,
        totalInterest = totalInterest,
        totalRepay = totalRepay,
        paymentAmount = paymentAmount,
        paymentsTotal = paymentsTotal,
        paymentIntervalHours = intervalHours,
        maxAmount = maxAllowed,
        maxAmountCap = product.maxAmount,
    }
end

local function countOpenLoans(citizenid, productId)
    if productId then
        return tonumber(MySQL.scalar.await(
            "SELECT COUNT(*) FROM sr_phone_loans WHERE citizenid = ? AND product_id = ? AND status = 'active'",
            { citizenid, productId }
        )) or 0
    end
    return tonumber(MySQL.scalar.await(
        "SELECT COUNT(*) FROM sr_phone_loans WHERE citizenid = ? AND status = 'active'",
        { citizenid }
    )) or 0
end

local function createPaymentSchedule(loanId, paymentsTotal, paymentAmount, startEpoch)
    local interval = (cfg().paymentIntervalHours or 24) * 3600
    for i = 1, paymentsTotal do
        MySQL.insert.await([[
            INSERT INTO sr_phone_loan_payments (loan_id, installment, amount_due, due_at, status)
            VALUES (?, ?, ?, ?, 'pending')
        ]], { loanId, i, paymentAmount, startEpoch + (i * interval) })
    end
end

local function mapLoanRow(row)
    if not row then return nil end
    return {
        id = row.id,
        productId = row.product_id,
        productLabel = (getProduct(row.product_id) or {}).label or row.product_id,
        status = row.status,
        principal = tonumber(row.principal) or 0,
        balance = tonumber(row.balance) or 0,
        apr = tonumber(row.apr) or 0,
        aprPercent = math.floor((tonumber(row.apr) or 0) * 1000) / 10,
        termDays = tonumber(row.term_days) or 0,
        paymentAmount = tonumber(row.payment_amount) or 0,
        paymentsTotal = tonumber(row.payments_total) or 0,
        paymentsMade = tonumber(row.payments_made) or 0,
        missedCount = tonumber(row.missed_count) or 0,
        nextDueAt = tonumber(row.next_due_at),
        nextDueLabel = formatDueLabel(tonumber(row.next_due_at)),
        autopay = row.autopay == 1,
        createdAt = row.created_at,
        closedAt = row.closed_at,
    }
end

function SRLoans.GetDashboard(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return nil end

    local credit = SRLoans.RecalculateScore(citizenid)
    local products = {}

    for _, product in ipairs(cfg().products or {}) do
        local openForProduct = countOpenLoans(citizenid, product.id)
        local eligible = credit.score >= (product.minCreditScore or 0)
            and openForProduct < (product.maxOpenLoans or 1)

        local maxAmount = SRLoans.GetMaxAmount(product, credit.score)

        products[#products + 1] = {
            id = product.id,
            label = product.label,
            description = product.description,
            minAmount = product.minAmount,
            maxAmount = maxAmount,
            maxAmountCap = product.maxAmount,
            minTermDays = product.minTermDays,
            maxTermDays = product.maxTermDays,
            baseApr = product.baseApr,
            aprPercent = math.floor((product.baseApr or 0) * 1000) / 10,
            minCreditScore = product.minCreditScore,
            eligible = eligible,
            icon = product.icon,
        }
    end

    local loanRows = MySQL.query.await(
        "SELECT * FROM sr_phone_loans WHERE citizenid = ? ORDER BY FIELD(status, 'active', 'paid', 'defaulted'), id DESC LIMIT 50",
        { citizenid }
    ) or {}

    local loans = {}
    for i = 1, #loanRows do
        loans[#loans + 1] = mapLoanRow(loanRows[i])
    end

    local profile = SRLoans.GetProfile(citizenid)
    local blacklisted = profile and profile.blacklisted_until and tonumber(profile.blacklisted_until) > os.time()

    return {
        lenderName = cfg().lenderName or 'Maze Bank',
        credit = credit,
        blacklisted = blacklisted,
        products = products,
        loans = loans,
        bank = SRBanking.GetBalance(source),
    }
end

function SRLoans.GetLoanDetail(source, loanId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return nil end

    loanId = tonumber(loanId)
    local row = MySQL.single.await(
        'SELECT * FROM sr_phone_loans WHERE id = ? AND citizenid = ?',
        { loanId, citizenid }
    )
    if not row then return nil end

    local payments = MySQL.query.await(
        'SELECT * FROM sr_phone_loan_payments WHERE loan_id = ? ORDER BY installment ASC',
        { loanId }
    ) or {}

    local paymentList = {}
    for i = 1, #payments do
        local p = payments[i]
        paymentList[#paymentList + 1] = {
            id = p.id,
            installment = tonumber(p.installment) or i,
            amountDue = (tonumber(p.amount_due) or 0) + (tonumber(p.late_fee) or 0),
            amountPaid = tonumber(p.amount_paid) or 0,
            status = p.status,
            dueAt = tonumber(p.due_at),
            dueLabel = p.status == 'paid' and 'Paid' or formatDueLabel(tonumber(p.due_at)),
            paidAt = tonumber(p.paid_at),
        }
    end

    return {
        loan = mapLoanRow(row),
        payments = paymentList,
        bank = SRBanking.GetBalance(source),
    }
end

function SRLoans.Apply(source, productId, amount, termDays)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false, error = 'no_player' } end

    local profile = SRLoans.GetProfile(citizenid)
    if profile.blacklisted_until and tonumber(profile.blacklisted_until) > os.time() then
        return { ok = false, error = 'blacklisted' }
    end

    local product = getProduct(productId)
    if not product then return { ok = false, error = 'invalid_product' } end

    local credit = SRLoans.RecalculateScore(citizenid)
    if credit.score < (product.minCreditScore or 0) then
        return { ok = false, error = 'low_credit', score = credit.score, required = product.minCreditScore }
    end

    if countOpenLoans(citizenid, productId) >= (product.maxOpenLoans or 1) then
        return { ok = false, error = 'max_loans' }
    end

    local quote, quoteErr = SRLoans.CalculateQuote(productId, amount, termDays, credit.score)
    if not quote then return { ok = false, error = quoteErr } end

    MySQL.update.await(
        'UPDATE sr_phone_credit_profiles SET hard_inquiries = hard_inquiries + 1 WHERE citizenid = ?',
        { citizenid }
    )
    SRLoans.RecalculateScore(citizenid)

    local now = os.time()
    local firstDue = now + ((cfg().paymentIntervalHours or 24) * 3600)

    local loanId = MySQL.insert.await([[
        INSERT INTO sr_phone_loans
        (citizenid, product_id, status, principal, balance, apr, term_days, origination_fee, total_interest,
         payment_amount, payments_total, payments_made, next_due_at)
        VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    ]], {
        citizenid,
        productId,
        quote.amount,
        quote.totalRepay,
        quote.apr,
        quote.termDays,
        quote.originationFee,
        quote.totalInterest,
        quote.paymentAmount,
        quote.paymentsTotal,
        firstDue,
    })

    createPaymentSchedule(loanId, quote.paymentsTotal, quote.paymentAmount, now)

    SRBridge.AddMoney(source, 'bank', quote.amount, 'loan-disbursement')
    if SRBanking.UseRenewed() then
        local name = SRBridge.GetDisplayName(source)
        pcall(function()
            exports[Config.Bank.resource]:handleTransaction(
                citizenid,
                ('Personal Account / %s'):format(citizenid),
                quote.amount,
                ('Loan disbursement · %s'):format(product.label),
                cfg().lenderName or 'Maze Bank',
                name,
                'deposit'
            )
        end)
    end

    MySQL.update.await([[
        UPDATE sr_phone_credit_profiles
        SET total_borrowed = total_borrowed + ?, open_loans = open_loans + 1
        WHERE citizenid = ?
    ]], { quote.amount, citizenid })

    notifyPhone(source, cfg().lenderName or 'Maze Bank', ('Loan approved — $%s deposited'):format(quote.amount), 'success')
    TriggerClientEvent('sr-smartphone:client:bankTransaction', source, { bank = SRBanking.GetBalance(source) })

    return {
        ok = true,
        loanId = loanId,
        quote = quote,
        dashboard = SRLoans.GetDashboard(source),
    }
end

local function applyPayment(source, loanId, paymentRow)
    local citizenid = SRBridge.GetCitizenId(source)
    local amountDue = (tonumber(paymentRow.amount_due) or 0) + (tonumber(paymentRow.late_fee) or 0)

    if SRBanking.GetBalance(source) < amountDue then
        return { ok = false, error = 'insufficient' }
    end

    if not SRBridge.RemoveMoney(source, 'bank', amountDue, 'loan-payment') then
        return { ok = false, error = 'remove_failed' }
    end

    local now = os.time()
    local onTime = now <= (paymentRow.due_at + ((cfg().gracePeriodHours or 6) * 3600))

    MySQL.update.await([[
        UPDATE sr_phone_loan_payments
        SET amount_paid = ?, status = 'paid', paid_at = ?
        WHERE id = ?
    ]], { amountDue, now, paymentRow.id })

    local loan = MySQL.single.await('SELECT * FROM sr_phone_loans WHERE id = ? AND citizenid = ?', { loanId, citizenid })
    local newBalance = math.max(0, (tonumber(loan.balance) or 0) - amountDue)
    local paymentsMade = (tonumber(loan.payments_made) or 0) + 1
    local status = loan.status
    local closedAt = nil

    local nextPayment = MySQL.single.await(
        "SELECT * FROM sr_phone_loan_payments WHERE loan_id = ? AND status IN ('pending', 'late') ORDER BY installment ASC LIMIT 1",
        { loanId }
    )

    local nextDue = nextPayment and nextPayment.due_at or nil

    if paymentsMade >= (tonumber(loan.payments_total) or 0) or newBalance <= 0 or not nextPayment then
        status = 'paid'
        newBalance = 0
        closedAt = os.date('%Y-%m-%d %H:%M:%S', now)
        MySQL.update.await(
            "UPDATE sr_phone_loan_payments SET status = 'paid' WHERE loan_id = ? AND status IN ('pending', 'late')",
            { loanId }
        )
        MySQL.update.await(
            'UPDATE sr_phone_credit_profiles SET on_time_payments = on_time_payments + 1 WHERE citizenid = ?',
            { citizenid }
        )
        local bonus = cfg().earlyPayoffBonus or 12
        MySQL.update.await(
            'UPDATE sr_phone_credit_profiles SET score = LEAST(850, score + ?) WHERE citizenid = ?',
            { bonus, citizenid }
        )
        notifyPhone(source, 'Loan Paid Off', 'Congratulations — your loan is fully repaid.', 'success')
    else
        if onTime then
            MySQL.update.await(
                'UPDATE sr_phone_credit_profiles SET on_time_payments = on_time_payments + 1 WHERE citizenid = ?',
                { citizenid }
            )
        end
    end

    MySQL.update.await([[
        UPDATE sr_phone_loans
        SET balance = ?, payments_made = ?, status = ?, next_due_at = ?, closed_at = COALESCE(?, closed_at)
        WHERE id = ?
    ]], { newBalance, paymentsMade, status, nextDue, closedAt, loanId })

    MySQL.update.await(
        'UPDATE sr_phone_credit_profiles SET total_repaid = total_repaid + ? WHERE citizenid = ?',
        { amountDue, citizenid }
    )

    if status == 'paid' then
        MySQL.update.await(
            'UPDATE sr_phone_credit_profiles SET open_loans = GREATEST(0, open_loans - 1) WHERE citizenid = ?',
            { citizenid }
        )
    end

    SRLoans.RecalculateScore(citizenid)
    TriggerClientEvent('sr-smartphone:client:bankTransaction', source, {
        bank = SRBanking.GetBalance(source),
        cash = SRBridge.GetMoney(source, 'cash'),
    })

    return {
        ok = true,
        bank = SRBanking.GetBalance(source),
        detail = SRLoans.GetLoanDetail(source, loanId),
    }
end

function SRLoans.PayNext(source, loanId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false, error = 'no_player' } end

    loanId = tonumber(loanId)
    local loan = MySQL.single.await(
        "SELECT * FROM sr_phone_loans WHERE id = ? AND citizenid = ? AND status = 'active'",
        { loanId, citizenid }
    )
    if not loan then return { ok = false, error = 'not_found' } end

    local payment = MySQL.single.await(
        "SELECT * FROM sr_phone_loan_payments WHERE loan_id = ? AND status IN ('pending', 'late') ORDER BY installment ASC LIMIT 1",
        { loanId }
    )
    if not payment then return { ok = false, error = 'no_payment_due' } end

    return applyPayment(source, loanId, payment)
end

function SRLoans.SetAutopay(source, loanId, enabled)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    local affected = MySQL.update.await(
        "UPDATE sr_phone_loans SET autopay = ? WHERE id = ? AND citizenid = ? AND status = 'active'",
        { enabled and 1 or 0, tonumber(loanId), citizenid }
    )
    return { ok = affected and affected > 0, detail = SRLoans.GetLoanDetail(source, loanId) }
end

local function processOverdue()
    local now = os.time()
    local grace = (cfg().gracePeriodHours or 6) * 3600
    local lateFeeRate = cfg().lateFeePercent or 0.05

    local overdue = MySQL.query.await(
        "SELECT p.*, l.citizenid, l.id AS loan_id, l.missed_count, l.autopay FROM sr_phone_loan_payments p JOIN sr_phone_loans l ON l.id = p.loan_id WHERE l.status = 'active' AND p.status = 'pending' AND p.due_at < ?",
        { now - grace }
    ) or {}

    for i = 1, #overdue do
        local row = overdue[i]
        local lateFee = math.floor(row.amount_due * lateFeeRate)
        MySQL.update.await(
            "UPDATE sr_phone_loan_payments SET status = 'late', late_fee = ? WHERE id = ?",
            { lateFee, row.id }
        )

        if row.autopay == 1 then
            local player = exports.qbx_core:GetPlayerByCitizenId(row.citizenid)
            if player then
                local payResult = applyPayment(player.PlayerData.source, row.loan_id, {
                    id = row.id,
                    amount_due = row.amount_due,
                    late_fee = lateFee,
                    due_at = row.due_at,
                })
                if payResult.ok then goto continue end
            end
        end

        if now - row.due_at > grace * 2 then
            MySQL.update.await(
                "UPDATE sr_phone_loan_payments SET status = 'missed' WHERE id = ? AND status = 'late'",
                { row.id }
            )
            local missed = (row.missed_count or 0) + 1
            MySQL.update.await('UPDATE sr_phone_loans SET missed_count = ? WHERE id = ?', { missed, row.loan_id })
            MySQL.update.await(
                'UPDATE sr_phone_credit_profiles SET missed_payments = missed_payments + 1 WHERE citizenid = ?',
                { row.citizenid }
            )
            SRLoans.RecalculateScore(row.citizenid)

            if missed >= (cfg().maxMissedBeforeDefault or 3) then
                MySQL.update.await(
                    "UPDATE sr_phone_loans SET status = 'defaulted', closed_at = CURRENT_TIMESTAMP WHERE id = ?",
                    { row.loan_id }
                )
                MySQL.update.await(
                    'UPDATE sr_phone_credit_profiles SET open_loans = GREATEST(0, open_loans - 1), blacklisted_until = ? WHERE citizenid = ?',
                    { now + (7 * 86400), row.citizenid }
                )
                local player = exports.qbx_core:GetPlayerByCitizenId(row.citizenid)
                if player then
                    notifyPhone(player.PlayerData.source, 'Loan Default', 'Your loan has defaulted. Lending is restricted for 7 days.', 'error')
                end
            end
        end

        ::continue::
    end
end

CreateThread(function()
    SRPhoneAwaitDb()
    while true do
        Wait(15 * 60 * 1000)
        pcall(processOverdue)
    end
end)

lib.callback.register('sr-smartphone:server:getLoansData', function(source)
    if not SRCheckRate(source, 'loans', Config.RateLimit.loans or 10) then
        return { ok = false, error = 'rate_limit' }
    end
    return { ok = true, data = SRLoans.GetDashboard(source) }
end)

lib.callback.register('sr-smartphone:server:previewLoan', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end
    local profile = SRLoans.GetProfile(citizenid)
    local quote, err = SRLoans.CalculateQuote(data.productId, data.amount, data.termDays, profile.score)
    if not quote then return { ok = false, error = err } end
    return { ok = true, quote = quote }
end)

lib.callback.register('sr-smartphone:server:applyLoan', function(source, data)
    if not SRCheckRate(source, 'loans', 5) then return { ok = false, error = 'rate_limit' } end
    return SRLoans.Apply(source, data.productId, data.amount, data.termDays)
end)

lib.callback.register('sr-smartphone:server:payLoan', function(source, data)
    if not SRCheckRate(source, 'loans', Config.RateLimit.loans or 10) then
        return { ok = false, error = 'rate_limit' }
    end
    return SRLoans.PayNext(source, data.loanId)
end)

lib.callback.register('sr-smartphone:server:setLoanAutopay', function(source, data)
    return SRLoans.SetAutopay(source, data.loanId, data.enabled)
end)

lib.callback.register('sr-smartphone:server:getLoanDetail', function(source, loanId)
    return { ok = true, data = SRLoans.GetLoanDetail(source, loanId) }
end)
