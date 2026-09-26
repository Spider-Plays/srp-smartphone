fx_version 'cerulean'

game 'gta5'

lua54 'yes'

name 'sr-smartphone'

author 'SR Development'

description 'Custom smartphone for Qbox servers'

version '1.0.1'

ui_page 'web/index.html'

shared_scripts {
    'config.lua',
    'bridge/qbox.lua',
    'bridge/properties.lua',
    'shared/camera_discord.lua',
    'shared/camera_upload.lua',
}

client_scripts {
    '@ox_lib/init.lua',
    'client/main.lua',
    'client/emote.lua',
    'client/phone.lua',
    'client/network.lua',
    'client/bank.lua',
    'client/calls.lua',
    'client/nui.lua',
    'client/garage.lua',
    'client/properties.lua',
    'client/camera.lua',
    'client/apps.lua',
    'client/phone_apps.lua',
    'client/trading.lua',
    'client/dispatch.lua',
    'client/maps.lua',
    'client/weather.lua',
    'client/loans.lua',
    'client/nearby.lua',
}

server_scripts {
    '@ox_lib/init.lua',
    '@oxmysql/lib/MySQL.lua',
    'bridge/banking.lua',
    'server/utils.lua',
    'server/database.lua',
    'server/gallery.lua',
    'server/maps.lua',
    'server/dispatch.lua',
    'server/calls.lua',
    'server/properties.lua',
    'server/loans.lua',
    'server/phone_apps_extended.lua',
    'server/main.lua',
    'server/nearby.lua',
    'server/contacts.lua',
    'server/messages.lua',
    'server/garage.lua',
    'server/camera_discord.lua',
    'server/camera_fivemanage.lua',
    'server/camera.lua',
    'server/chirp.lua',
    'server/service_npc.lua',
    'server/apps_extended.lua',
    'server/mail.lua',
    'server/trading.lua',
    'server/news.lua',
    'server/documents.lua',
}

files {
    'web/index.html',
    'web/assets/**',
    'web/wallpapers/**',
    'web/maps/**',
    'web/sounds/**',
}

dependencies {
    'ox_lib',
    'oxmysql',
    'qbx_core',
}
