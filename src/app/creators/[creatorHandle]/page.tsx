import { CreatorPage } from "@/components/creator-page";

interface CreatorRouteProps {
  params: Promise<{
    creatorHandle: string;
  }>;
}

export default async function CreatorRoute({ params }: CreatorRouteProps) {
  const resolved = await params;
  return <CreatorPage creatorHandle={resolved.creatorHandle} />;
}
