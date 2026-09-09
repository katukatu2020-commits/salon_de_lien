import fs from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { Plus, ArrowDown } = require('lucide-react')
const icons = Object.fromEntries(Object.entries({ plus:Plus, down:ArrowDown }).map(([name, component]) => [
  name, renderToStaticMarkup(React.createElement(component, { width:24, height:24, strokeWidth:1.6, 'aria-hidden':true, focusable:false })),
]))
fs.writeFileSync(fileURLToPath(new URL('./audience-icons.js', import.meta.url)), `// Generated from lucide-react by build-icons.mjs.\n'use strict'\nmodule.exports = ${JSON.stringify(icons, null, 2)}\n`)
