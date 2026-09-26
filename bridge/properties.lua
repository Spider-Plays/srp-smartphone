---@class SRProperties
SRProperties = SRProperties or {}

local isServer = IsDuplicityVersion()

local function resourceStarted(name)
    return name and GetResourceState(name):find('start') ~= nil
end

if isServer then
    function SRProperties.TryEnter(source, propertyId, provider)
        propertyId = tonumber(propertyId)
        if not propertyId then
            return false, 'Invalid property'
        end

        local property = SRProperties.FindProperty and SRProperties.FindProperty(source, propertyId, provider)
        provider = provider or (property and property.provider) or nil

        if provider == 'srp-apartment' or (not provider and property and property.category == 'apartment') then
            if not SRProperties.PlayerHasProperty(source, propertyId, 'srp-apartment') then
                return false, 'You do not own this apartment'
            end

            if resourceStarted('srp-apartment') then
                local ok, success, reason = pcall(function()
                    return exports['srp-apartment']:TryEnterPlayerApartment(source, propertyId)
                end)

                if ok then
                    if success then
                        return true
                    end

                    if reason == 'too_far' then
                        return false, 'You must be near the building entrance'
                    end
                    if reason == 'not_owner' then
                        return false, 'You do not own this apartment'
                    end
                    if reason == 'not_found' then
                        return false, 'Apartment not found'
                    end

                    return false, 'Unable to enter apartment'
                end
            end

            return false, 'Apartment entry is not available'
        end

        if provider == 'nolag_properties' or (not provider and property and property.category == 'house') then
            if not SRProperties.PlayerHasProperty(source, propertyId, 'nolag_properties') then
                return false, 'You do not have access to this house'
            end

            if resourceStarted('nolag_properties') then
                TriggerClientEvent('sr-smartphone:client:enterNolagProperty', source, propertyId)
                return true
            end

            return false, 'House entry is not available'
        end

        return false, 'Property entry is not available'
    end

    function SRProperties.TryManage(source, propertyId, provider)
        propertyId = tonumber(propertyId)
        if not propertyId then
            return false, 'Invalid property'
        end

        local property = SRProperties.FindProperty and SRProperties.FindProperty(source, propertyId, provider)
        provider = provider or (property and property.provider) or nil

        if provider ~= 'nolag_properties' and not (property and property.category == 'house') then
            return false, 'Only houses can be managed from the phone'
        end

        if not SRProperties.PlayerHasProperty(source, propertyId, 'nolag_properties') then
            return false, 'You do not have access to this house'
        end

        if not resourceStarted('nolag_properties') then
            return false, 'House management is not available'
        end

        TriggerClientEvent('sr-smartphone:client:manageNolagProperty', source, propertyId)
        return true
    end
end
