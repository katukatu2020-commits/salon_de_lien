import { runBrowserCheck } from './browser-check.mjs'

console.log(JSON.stringify(await runBrowserCheck({ injectClient: false, mode: 'integrated-release' })))
