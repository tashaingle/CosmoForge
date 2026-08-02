import { DesignClient } from "@/components/design/DesignClient";

export default async function DesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DesignClient craftId={id} />;
}
