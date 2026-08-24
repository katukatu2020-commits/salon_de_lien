import assert from 'node:assert/strict'
import fs from 'node:fs'

const storeProfile = fs.readFileSync('/app/store-profile.js', 'utf8')
assert.ok(!storeProfile.includes('previousOpenMinutes'))
assert.ok(!storeProfile.includes('UPDATE "OrganizationDailySchedule" SET "openMinutes"=$2,"closeMinutes"=$3'))
assert.ok(storeProfile.includes('UPDATE "StaffBookingSetting" SET "workStartMinutes"=$2,"workEndMinutes"=$3'))

const tenant = fs.readFileSync('/app/tenant-setup.js', 'utf8')
assert.ok(tenant.includes("require('./booking-availability-v430')"))
assert.ok(tenant.includes('dailyCapacity: Number(daySchedule.capacity || defaultCapacity || 0)'))
assert.ok(tenant.includes('dailyCapacity: Number(currentSchedule.capacity || 0)'))

const tenantClient = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')
assert.ok(tenantClient.includes("if (event.detail.overridden === undefined) state.dailyScheduleDate = ''"))

const shiftClient = fs.readFileSync('/app/.next/static/chunks/app/admin/appointments/page-shift-staff-drop-v394.js', 'utf8')
assert.ok(shiftClient.includes('e.profile?.businessSchedule||e.businessSchedule||e'))
assert.ok(shiftClient.includes('.finally(()=>{if(!__cancelled)__setShiftHydrated(true)})'))

console.log('Business hours and staff availability v431 verified.')
