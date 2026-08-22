import fs from 'node:fs'

const files = [
  '/app/.next/server/chunks/2616.js',
  '/app/.next/static/chunks/6012-e16edeb2a61e1c80.js',
]

const required = [
  'flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl bg-[#fbf7f0] px-3 py-2.5 text-sm sm:grid sm:grid-cols-2 sm:gap-2 sm:p-3',
  'mt-3 flex items-center gap-3 border-b border-[#eee4da] pb-3 sm:mt-4 sm:pb-4',
  'mt-3 flex items-end gap-2 sm:mt-4',
]

const rejected = [
  'grid gap-2 rounded-2xl bg-[#fbf7f0] p-3 text-sm sm:grid-cols-2',
  'mt-4 flex items-center gap-3 border-b border-[#eee4da] pb-4',
]

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  for (const text of required) {
    if (!source.includes(text)) throw new Error(`${file}: mobile spacing patch is missing: ${text}`)
  }
  for (const text of rejected) {
    if (source.includes(text)) throw new Error(`${file}: legacy mobile spacing remains: ${text}`)
  }
}

