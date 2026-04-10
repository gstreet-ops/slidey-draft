import { redirect } from "next/navigation";

type Params = Promise<{ code: string }>;

export default async function JoinRedirectPage({ params }: { params: Params }) {
  const { code } = await params;
  redirect(`/pools/join/${code}`);
}
