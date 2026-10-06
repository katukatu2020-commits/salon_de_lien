export type ReservationMenuDetails = {
  menu: string | null;
  estimatedPrice: number | null;
  menuFieldPresent: boolean;
  priceFieldPresent: boolean;
  menuNeedsReview: boolean;
  priceNeedsReview: boolean;
  priceAmbiguous: boolean;
  reviewReason: string | null;
};
export function parseReservationMenu(text: string): ReservationMenuDetails;
export function mergeImportedMenu(parsed: Pick<ReservationMenuDetails, "menu" | "estimatedPrice"> & Partial<ReservationMenuDetails>, existing?: { menu: string | null; estimatedPrice: number | null } | null): { menu: string | null; estimatedPrice: number | null };
