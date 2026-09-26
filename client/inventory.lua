--[[ ox_inventory: client.export = 'sr-smartphone.usePhone' on the phone item ]]

exports('usePhone', function(_data, _slot)
    if PhoneOpen then
        ClosePhone()
    else
        OpenPhone()
    end
end)
