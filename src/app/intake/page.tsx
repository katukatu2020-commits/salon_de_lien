import { redirect } from "next/navigation";

type IntakePageProps = {
  searchParams?: { source?: string; campaign?: string; referrer?: string; referrerName?: string };
};

export default function IntakePage({ searchParams }: IntakePageProps) {
  const query = new URLSearchParams();
  if (searchParams?.source) query.set("source", searchParams.source);
  if (searchParams?.campaign) query.set("campaign", searchParams.campaign);
  if (searchParams?.referrer) query.set("referrer", searchParams.referrer);
  if (searchParams?.referrerName) query.set("referrerName", searchParams.referrerName);
  redirect(`/u/register${query.size > 0 ? `?${query.toString()}` : ""}`);
}
