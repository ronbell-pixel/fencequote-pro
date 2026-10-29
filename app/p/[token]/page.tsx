import type { Metadata } from "next";
import { headers } from "next/headers";
import { loadProposal, recordView, ESIGN_CONSENT } from "../../../lib/esign";
import SignProposal from "../../SignProposal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your fence proposal", robots: { index: false, follow: false } };

export default async function ProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const proposal = await loadProposal((await params).token);
  if (!proposal)
    return (
      <main className="esignMissing">
        <h1>This proposal link isn’t valid</h1>
        <p>Check that you opened the full link from your email or text message, or contact the company that sent it.</p>
      </main>
    );
  await recordView(proposal, (await headers()).get("user-agent") ?? "");
  return <SignProposal proposal={JSON.parse(JSON.stringify(proposal))} consent={ESIGN_CONSENT} />;
}
