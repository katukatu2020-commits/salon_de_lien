export const CUSTOMER_GENDER_OPTIONS = ["女性", "男性", "その他", "未回答"] as const;
export const HAIR_THICKNESS_OPTIONS = ["細い", "普通", "太い"] as const;
export const HAIR_VOLUME_OPTIONS = ["少ない", "普通", "多い"] as const;
export const HAIR_TEXTURE_OPTIONS = ["柔らかい", "普通", "硬い"] as const;
export const HAIR_CURL_OPTIONS = ["なし（直毛）", "少しある", "強い"] as const;
export const SERVICE_PREFERENCE_OPTIONS = ["静かに過ごしたい", "適度に会話したい"] as const;

const PROFILE_OPTION_ALIASES: Readonly<Record<string, string>> = {
  female: "女性",
  male: "男性",
  other: "その他",
  unknown: "未回答",
  回答しない: "未回答",
  少なめ: "少ない",
  多め: "多い",
  標準: "普通",
  やわらかい: "柔らかい",
  かたい: "硬い",
  細め: "細い",
  太め: "太い",
  なし: "なし（直毛）",
  直毛: "なし（直毛）",
  ややあり: "少しある",
  静かにしたい: "静かに過ごしたい",
  会話したい: "適度に会話したい"
};

function profileOptionKey(value: string) {
  return value.normalize("NFKC").replace(/[\s\u3000]+/g, "").toLowerCase();
}

export function isProfileOption<T extends readonly string[]>(options: T, value: string | null): value is T[number] {
  return value !== null && options.includes(value as T[number]);
}

export function normalizeProfileOption<T extends readonly string[]>(options: T, value: string | null): T[number] | null {
  if (!value) return null;

  const inputKey = profileOptionKey(value);
  const aliasedValue = PROFILE_OPTION_ALIASES[inputKey] ?? value;
  const canonicalKey = profileOptionKey(aliasedValue);
  return options.find((option) => profileOptionKey(option) === canonicalKey) ?? null;
}
