export const CUSTOMER_GENDER_OPTIONS = ["女性", "男性", "その他", "未回答"] as const;
export const HAIR_THICKNESS_OPTIONS = ["細い", "普通", "太い"] as const;
export const HAIR_VOLUME_OPTIONS = ["少ない", "普通", "多い"] as const;
export const HAIR_TEXTURE_OPTIONS = ["柔らかい", "普通", "硬い"] as const;
export const HAIR_CURL_OPTIONS = ["なし（直毛）", "少しある", "強い"] as const;
export const SERVICE_PREFERENCE_OPTIONS = ["静かに過ごしたい", "適度に会話したい"] as const;

export function isProfileOption<T extends readonly string[]>(options: T, value: string | null): value is T[number] {
  return value !== null && options.includes(value as T[number]);
}
