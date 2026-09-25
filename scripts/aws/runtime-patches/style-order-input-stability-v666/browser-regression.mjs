import { runBrowserCheck } from './browser-check.mjs'

console.log(JSON.stringify(await runBrowserCheck({ injectClient: true, mode: 'reviewed-parent' })))
