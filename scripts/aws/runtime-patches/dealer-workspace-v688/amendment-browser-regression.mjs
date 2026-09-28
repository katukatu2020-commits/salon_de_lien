import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
// Run the existing workflow unchanged except for opening the new settings disclosure.
const require=createRequire(import.meta.url)
process.env.SMOKE_DEPENDENCIES_PACKAGE ||= require.resolve('playwright-core/package.json')
let source=fs.readFileSync(path.resolve('scripts/aws/runtime-patches/order-amendment-cutoff-v687/browser-regression.mjs'),'utf8')
source=source.replace("await sales.goto(base+'/dealer/orders');await sales.locator('.oa-settings').waitFor()","await sales.goto(base+'/dealer/orders');await sales.locator('.dw-cutoff>summary').click();await sales.locator('.oa-settings').waitFor()")
source=source.replace("await staffPage.goto(base+'/dealer/orders');await staffPage.locator('.oa-settings').waitFor()","await staffPage.goto(base+'/dealer/orders');await staffPage.locator('.dw-cutoff>summary').click();await staffPage.locator('.oa-settings').waitFor()")
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
