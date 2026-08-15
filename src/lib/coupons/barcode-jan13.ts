export type BarcodeRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type Jan13Barcode = {
  payload: string;
  modules: boolean[];
};

const LEFT_ODD: Record<string, string> = {
  "0": "0001101",
  "1": "0011001",
  "2": "0010011",
  "3": "0111101",
  "4": "0100011",
  "5": "0110001",
  "6": "0101111",
  "7": "0111011",
  "8": "0110111",
  "9": "0001011"
};

const LEFT_EVEN: Record<string, string> = {
  "0": "0100111",
  "1": "0110011",
  "2": "0011011",
  "3": "0100001",
  "4": "0011101",
  "5": "0111001",
  "6": "0000101",
  "7": "0010001",
  "8": "0001001",
  "9": "0010111"
};

const RIGHT: Record<string, string> = {
  "0": "1110010",
  "1": "1100110",
  "2": "1101100",
  "3": "1000010",
  "4": "1011100",
  "5": "1001110",
  "6": "1010000",
  "7": "1000100",
  "8": "1001000",
  "9": "1110100"
};

const PARITY: Record<string, Array<"odd" | "even">> = {
  "0": ["odd", "odd", "odd", "odd", "odd", "odd"],
  "1": ["odd", "odd", "even", "odd", "even", "even"],
  "2": ["odd", "odd", "even", "even", "odd", "even"],
  "3": ["odd", "odd", "even", "even", "even", "odd"],
  "4": ["odd", "even", "odd", "odd", "even", "even"],
  "5": ["odd", "even", "even", "odd", "odd", "even"],
  "6": ["odd", "even", "even", "even", "odd", "odd"],
  "7": ["odd", "even", "odd", "even", "odd", "even"],
  "8": ["odd", "even", "odd", "even", "even", "odd"],
  "9": ["odd", "even", "even", "odd", "even", "odd"]
};

const JAN_FALLBACK_PREFIX = "45";

export function calculateJan13CheckDigit(first12Digits: string) {
  if (!/^\d{12}$/.test(first12Digits)) {
    throw new Error("JANコードは先頭12桁の数字からチェックデジットを計算します。");
  }

  const sum = first12Digits
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);

  return String((10 - (sum % 10)) % 10);
}

export function completeJan13(first12Digits: string) {
  return `${first12Digits}${calculateJan13CheckDigit(first12Digits)}`;
}

export function isValidJan13(value: string) {
  const digits = value.replace(/\D/g, "");

  return digits.length === 13 && completeJan13(digits.slice(0, 12)) === digits;
}

export function normalizeJan13Payload(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 13 && isValidJan13(digits)) {
    return digits;
  }

  if (digits.length === 12) {
    return completeJan13(digits);
  }

  return createDeterministicJan13(value);
}

export function createJan13Barcode(value: string): Jan13Barcode {
  const payload = normalizeJan13Payload(value);
  const firstDigit = payload[0];
  const leftDigits = payload.slice(1, 7).split("");
  const rightDigits = payload.slice(7).split("");
  const leftModules = leftDigits.flatMap((digit, index) => {
    const table = PARITY[firstDigit][index] === "odd" ? LEFT_ODD : LEFT_EVEN;
    return bitStringToModules(table[digit]);
  });
  const rightModules = rightDigits.flatMap((digit) => bitStringToModules(RIGHT[digit]));

  return {
    payload,
    modules: [
      ...bitStringToModules("101"),
      ...leftModules,
      ...bitStringToModules("01010"),
      ...rightModules,
      ...bitStringToModules("101")
    ]
  };
}

export function barcodeToRects(barcode: Jan13Barcode, rect: BarcodeRect, quietZoneModules = 11) {
  const totalModules = barcode.modules.length + quietZoneModules * 2;
  const moduleWidth = rect.w / totalModules;
  const darkRects: BarcodeRect[] = [];
  let runStart: number | null = null;

  barcode.modules.forEach((dark, index) => {
    if (dark && runStart === null) {
      runStart = index;
    }

    if ((!dark || index === barcode.modules.length - 1) && runStart !== null) {
      const endIndex = dark && index === barcode.modules.length - 1 ? index + 1 : index;
      darkRects.push({
        x: rect.x + (runStart + quietZoneModules) * moduleWidth,
        y: rect.y,
        w: (endIndex - runStart) * moduleWidth,
        h: rect.h
      });
      runStart = null;
    }
  });

  return {
    background: rect,
    darkRects
  };
}

function createDeterministicJan13(value: string) {
  const seed = value.trim().toUpperCase() || "SALON-DE-LIEN";
  const first12Digits = `${JAN_FALLBACK_PREFIX}${stableDigits(seed, 10)}`;

  return completeJan13(first12Digits);
}

function stableDigits(value: string, length: number) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  let state = hash || 1;
  let digits = "";

  while (digits.length < length) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    digits += String(state % 10);
  }

  return digits.slice(0, length);
}

function bitStringToModules(bits: string) {
  return bits.split("").map((bit) => bit === "1");
}
