import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('./OrimiaPosBridge.cs', import.meta.url), 'utf8')
const installer = fs.readFileSync(new URL('./install-orimia-pos-bridge.ps1', import.meta.url), 'utf8')

for (const required of [
  'public const float TargetDpi = 203f;',
  'public const float RollWidthMm = 80f;',
  'public const float PrintableWidthMm = 72.1f;',
  'private const float BottomFeed = 40f;',
  'scratch.SetResolution(TargetDpi, TargetDpi);',
  'bitmap.SetResolution(TargetDpi, TargetDpi);',
  'pixels * 25.4f / TargetDpi',
  'resolution.X != (int)ReceiptRenderer.TargetDpi',
  'resolution.Y != (int)ReceiptRenderer.TargetDpi',
  'new PaperSize(',
  'document.Print();',
  'private const string Version = "v583";',
]) assert.ok(source.includes(required), `bridge calibration invariant missing: ${required}`)

assert.ok(!source.includes('pixels * 25.4f / 203f'), 'a hard-coded conversion bypasses the calibrated dpi')
assert.ok(installer.includes("$status.version -eq 'v583'"), 'installer does not require the calibrated bridge')

console.log(JSON.stringify({ release:'receipt-pos-height-calibration-v583', calibratedDpi:203, rollWidthMm:80, cutterFeedMm:5 }))
