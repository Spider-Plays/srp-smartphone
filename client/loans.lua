local function loanCb(name, ...)
    local ok, result = pcall(lib.callback.await, ('sr-smartphone:server:%s'):format(name), false, ...)
    if ok then return result end
    return { ok = false, error = 'unavailable' }
end

RegisterNUICallback('getLoansData', function(_, cb)
    cb(loanCb('getLoansData') or { ok = false })
end)

RegisterNUICallback('previewLoan', function(data, cb)
    cb(loanCb('previewLoan', data) or { ok = false })
end)

RegisterNUICallback('applyLoan', function(data, cb)
    cb(loanCb('applyLoan', data) or { ok = false })
end)

RegisterNUICallback('payLoan', function(data, cb)
    cb(loanCb('payLoan', data) or { ok = false })
end)

RegisterNUICallback('setLoanAutopay', function(data, cb)
    cb(loanCb('setLoanAutopay', data) or { ok = false })
end)

RegisterNUICallback('getLoanDetail', function(data, cb)
    cb(loanCb('getLoanDetail', data.loanId or data.id) or { ok = false })
end)
