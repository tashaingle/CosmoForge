import { DebriefShareClient } from "./DebriefShareClient";

export default async function DebriefSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <DebriefShareClient token={token} />;
}
