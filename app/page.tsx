import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";
import FenceQuoteApp from "./FenceQuoteApp";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function Home() {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("host") ?? "").split(":")[0];
  const user =
    (await getChatGPTUser()) ??
    (process.env.NODE_ENV === "development" &&
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)
      ? {
          userId: "local-super-admin",
          email: "admin@fencequote.local",
          displayName: "Jordan Ellis",
          fullName: "Jordan Ellis",
        }
      : null);
  if (!user)
    return (
      <main className="signInPage">
        <section className="signInHero">
          <div className="signInBrand">
            <span>FQ</span>
            <strong>
              FenceQuote <i>PRO</i>
            </strong>
          </div>
          <p>FIELD-READY ESTIMATING</p>
          <h1>
            Measure the yard.
            <br />
            Price the fence.
            <br />
            <em>Win the job.</em>
          </h1>
          <div className="signInBenefits">
            <span>Measure fence runs from satellite imagery</span>
            <span>See your margin on every quote as you build it</span>
            <span>Send branded proposals customers can e-sign</span>
          </div>
          <a
            className="signInButton"
            href={chatGPTSignInPath("/")}
            target="_top"
          >
            Sign in with ChatGPT
          </a>
          <small>Use the same email address your company owner invited.</small>
        </section>
        <aside className="signInVisual">
          <div className="aerialCard">
            <div className="aerialGrid" />
            <div className="aerialQuote">
              <span>Satellite yard quoting</span>
              <strong>Trace. Measure. Price.</strong>
              <small>USGS aerial imagery · field verification built in</small>
            </div>
          </div>
        </aside>
      </main>
    );
  return <FenceQuoteApp userName={user.displayName} />;
}
