import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function JoinCodePage({ params }: Props) {
  const { code } = await params;
  redirect(`/join?code=${encodeURIComponent(code.toUpperCase())}`);
}
