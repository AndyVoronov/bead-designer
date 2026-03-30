import DesignLoader from "@/components/editor/DesignLoader";

/**
 * Server Component for the /design/[code] share route.
 *
 * Extracts the URL parameter and delegates to the DesignLoader client
 * boundary, which handles decoding, store loading, and error states.
 *
 * Next.js 16: params is a Promise that must be awaited.
 */
export default async function DesignSharePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <DesignLoader code={code} />;
}
