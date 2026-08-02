import { LaunchClient } from "@/components/launch/LaunchClient";

export default async function LaunchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LaunchClient craftId={id} />;
}
