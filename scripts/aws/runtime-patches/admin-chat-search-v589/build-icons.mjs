import fs from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { Search, X, ChevronLeft, ChevronRight, ArrowLeft, UserRound } = require('lucide-react')
const icons = Object.fromEntries(Object.entries({search:Search,close:X,previous:ChevronLeft,next:ChevronRight,back:ArrowLeft,customer:UserRound}).map(([key,component]) => [key,renderToStaticMarkup(React.createElement(component, {width:20,height:20,strokeWidth:1.7,'aria-hidden':true,focusable:false}))]))
fs.writeFileSync(fileURLToPath(new URL('./admin-chat-icons-v589.js',import.meta.url)), '// Generated from lucide-react by build-icons.mjs.\nmodule.exports = '+JSON.stringify(icons,null,2)+'\n')
