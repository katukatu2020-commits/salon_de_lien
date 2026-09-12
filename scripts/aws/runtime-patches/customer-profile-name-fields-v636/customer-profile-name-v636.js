'use strict'

const fs = require('node:fs')
const path = require('node:path')

function runtimeDependency(runtimePath, repositoryPath) {
  return require(fs.existsSync(runtimePath) ? runtimePath : path.join(__dirname, repositoryPath))
}

const { parseCustomerRegistrationNameV633 } = runtimeDependency(
  '/app/customer-registration-name-v633.js',
  '../customer-registration-name-fields-v633/customer-registration-name-v633.js',
)
const { displayBookingConfirmationNameV635 } = runtimeDependency(
  '/app/booking-confirmation-name-v635.js',
  '../booking-confirmation-name-v635/booking-confirmation-name-v635.js',
)

function normalizePart(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeKana(value) {
  return normalizePart(value).replace(/[ぁ-ゖ]/g, character =>
    String.fromCharCode(character.charCodeAt(0) + 0x60),
  )
}

function resolveCustomerProfileNameV636(row, fallbackName) {
  const legacyParts = normalizePart(displayBookingConfirmationNameV635(fallbackName)).split(' ').filter(Boolean)
  const fallbackLastName = legacyParts.shift() || ''
  const fallbackFirstName = legacyParts.join(' ')

  return {
    lastName: normalizePart(row?.lastName) || fallbackLastName,
    firstName: normalizePart(row?.firstName) || fallbackFirstName,
    lastNameKana: normalizeKana(row?.lastNameKana),
    firstNameKana: normalizeKana(row?.firstNameKana),
  }
}

async function loadCustomerProfileNameV636(prisma, customerId, fallbackName) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT "lastName","firstName","lastNameKana","firstNameKana" FROM "Customer" WHERE "id"=$1 LIMIT 1',
    customerId,
  )
  return resolveCustomerProfileNameV636(rows[0], fallbackName)
}

function parseCustomerProfileNameV636(input) {
  return parseCustomerRegistrationNameV633(input)
}

async function persistCustomerProfileNameV636(prisma, customerId, name) {
  await prisma.$executeRawUnsafe(
    'UPDATE "Customer" SET "lastName"=$2,"firstName"=$3,"lastNameKana"=$4,"firstNameKana"=$5,"updatedAt"=NOW() WHERE "id"=$1',
    customerId,
    name.lastName,
    name.firstName,
    name.lastNameKana,
    name.firstNameKana,
  )
}

module.exports = {
  loadCustomerProfileNameV636,
  parseCustomerProfileNameV636,
  persistCustomerProfileNameV636,
  resolveCustomerProfileNameV636,
}
