// Project identity and publishing targets. Safe to import anywhere, the
// browser included.
//
// Two identities are kept separate on purpose:
//   - UPSTREAM is the official Xiryn repository we continuously merge from.
//   - PRODUCT is the downstream brand (Chuck Bot) and its own release channel.
// Never point PRODUCT at the upstream repository: the update checker and
// release pipeline must target the fork so we control what gets shipped.

// The official upstream project this fork tracks.
export const UPSTREAM_REPOSITORY = "SouravBeraAkaSpeed/xiryn"
export const UPSTREAM_REPOSITORY_URL = `https://github.com/${UPSTREAM_REPOSITORY}`

// The downstream product. This is the fork, its brand and its update channel.
export const PRODUCT_NAME = "Chuck Bot"
// Lowercase slug used for the wordmark and any all-lowercase brand rendering.
export const PRODUCT_SLUG = "chuckbot"
export const PRODUCT_REPOSITORY = "tm7209519-glitch/chuck-bot"
export const PRODUCT_REPOSITORY_URL = `https://github.com/${PRODUCT_REPOSITORY}`

// Where the shipped app asks GitHub for updates and star counts.
export const REPOSITORY = PRODUCT_REPOSITORY
export const REPOSITORY_URL = PRODUCT_REPOSITORY_URL
// The README section that walks through updating
export const UPDATE_GUIDE_URL = `${REPOSITORY_URL}#updating`

// Stars are shown once there are enough to be worth showing
export const STARS_SHOWN_FROM = 21
