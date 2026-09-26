# SR Smartphone

Custom FiveM phone resource for **Qbox** servers. Built with React, Vite, and Framer Motion for smooth UI transitions.

## Features

- Lock screen with tap-to-unlock
- Home screen with app grid
- **Messages** — conversations and chat
- **Phone** — contacts, keypad, call history, incoming/outgoing calls
- **Contacts** — add, edit, delete with notes
- **Bank** — balance overview, player ID transfers, history ([Renewed-Banking](https://github.com/Renewed-Scripts/Renewed-Banking))
- **Chirp** — social feed (Twitter-style), profiles, search; phone notifications for new posts (all online), likes, and replies on your posts
- **Gallery** — photo grid with fullscreen preview
- **Garage** — vehicle list, details, GPS tracking ([qb-garages](https://github.com/qbcore-framework/qb-garages))
- **Settings** — wallpaper, profile info, toggles
- **Maps** — GPS waypoints, saved pins, share location via Messages
- **Jobs** — duty toggle, job alerts
- **Mail** — official notices (server-sent)
- **LifeInvader** — player marketplace with photos, categories, seller messaging, and in-app **Job Center** (delayed applications, 5–10 min review, phone popup on accept; replaces `qbx_cityhall` employment)
- **Services** — taxi, mechanic, tow requests; per-job shift page with NPC contracts (NoPixel-style), XP, and market reputation for on-duty workers
- **911** — emergency dispatch to on-duty jobs
- **Notes** — personal memos
- **Invoices** — send & pay bills (uses Bank)
- **Documents** — templates, inbox, signatures, and document notifications
- **Calculator** — basic arithmetic (+, −, ×, ÷, %, ±)

## Requirements

- [qbx_core](https://github.com/Qbox-project/qbx_core)
- [ox_lib](https://github.com/overextended/ox_lib)
- [oxmysql](https://github.com/overextended/oxmysql)
- [ox_inventory](https://github.com/overextended/ox_inventory) (optional phone item)
- [Renewed-Banking](https://github.com/Renewed-Scripts/Renewed-Banking) (bank app)
- [qb-garages](https://github.com/qbcore-framework/qb-garages) or `qb-garage` (garage app; requires `qb-core` bridge on Qbox)

## Installation

1. Copy `sr-smartphone` into your server `resources` folder.
2. Import `sql/install.sql` into your database (tables also auto-create on start).
3. Add to `server.cfg`:

```cfg
ensure oxmysql
ensure ox_lib
ensure qbx_core
ensure ox_inventory
ensure Renewed-Banking
ensure qb-garage
ensure sr-smartphone
```

4. Ensure the `phone` item exists in ox_inventory (or set `Config.RequireItem = false`).

5. Match integration settings in `config.lua` to your resource folder names:

```lua
Config.Bank.provider = 'renewed'
Config.Bank.resource = 'Renewed-Banking'

Config.Garage.provider = 'qb-garages'
Config.Garage.resource = 'qb-garage'      -- folder name in resources/
Config.Garage.eventPrefix = 'qb-garages'  -- event prefix inside the garage script
```

## Building the UI

The NUI lives in `ui/` and builds into `web/`:

```bash
cd ui
npm install
npm run build
```

Preview locally in browser (dev toolbar included):

```bash
npm run dev
```

## Configuration

Edit `config.lua`:

| Option | Default | Description |
|--------|---------|-------------|
| `Config.RequireItem` | `true` | Require phone item to open |
| `Config.PhoneItem` | `phone` | ox_inventory item name |
| `Config.OpenKey` | `M` | Keybind to open phone |
| `Config.OpenCommand` | `phone` | Chat command |

## Usage

- Press **M** or type `/phone` to open
- Click home bar at bottom to close
- **ESC** also closes the phone

## Exports

```lua
-- Get a player's phone number
exports['sr-smartphone']:GetPlayerPhone(source)

-- Send a notification-style message to a phone number
exports['sr-smartphone']:SendMessageToPhone('555-0101', 'Hello!', 'System')

-- Client exports
exports['sr-smartphone']:OpenPhone()
exports['sr-smartphone']:ClosePhone()
exports['sr-smartphone']:IsPhoneOpen()

-- Send official mail to a citizenid (inbox; notifies if online)
exports['sr-smartphone']:SendMail('ABC12345', 'City Hall', 'Tax notice', 'Your payment is due.')

-- Players email each other at `{phone-digits}@spider.mail` (domain in Config.Mail)
-- Example: phone 555-0101 → 5550101@spider.mail

-- Push a job notification
exports['sr-smartphone']:SendJobNotification('ABC12345', 'Shift reminder', 'Briefing in 10 minutes.')
```

## License

Custom resource — modify freely for your server.
