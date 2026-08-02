import { MissionPageClient } from "./MissionPageClient";

export default async function MissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MissionPageClient craftId={id} />;
}
