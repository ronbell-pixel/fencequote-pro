import { headers } from "next/headers";
import { getAccessUser } from "../lib/auth";
import FenceQuoteApp from "./FenceQuoteApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  const requestHeaders = await headers();
  const user = await getAccessUser(
    requestHeaders,
    requestHeaders.get("host") ?? "",
  );
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
          <a className="signInButton" href="/" target="_top">
            Sign in
          </a>
          <small>
            Use the email address your company owner added. If this page keeps
            coming back, Cloudflare Access isn’t set up for this site yet.
          </small>
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
  return <FenceQuoteApp userName={user.name} />;
}
