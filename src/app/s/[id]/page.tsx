import { ShortShareClient } from "./ShortShareClient";

export default async function ShortSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShortShareClient id={id} />;
}
