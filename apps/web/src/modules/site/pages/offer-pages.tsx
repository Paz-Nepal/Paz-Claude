import { Link } from "react-router-dom";
import { formatMoney } from "@paz/utils";
import { useSiteInfo } from "../api/use-site";
import { useSattalReaders } from "../api/use-wall";
import { settingNumber } from "../api/use-place";
import { useLocalizedPath } from "../language";
import { useWording } from "../wording";
import { DocumentHead } from "../components/document-head";
import { PageHero } from "../components/paz-editorial";
import { OfferForm } from "../components/offer-form";
import { ShellPage } from "./house-pages";

/** Show the house your work: an offer of kind painter. Nothing is uploaded; a link is enough. */
export function WallOfferPage() {
  const w = useWording();
  return (
    <div>
      <DocumentHead title={w("title.wall-offer")} path="/wall/offer" />
      <PageHero title={w("title.wall-offer")} />
      <div className="w-reading flex flex-col gap-8 py-12">
        <p className="type-body">{w("offer.painter-intro")}</p>
        <OfferForm
          kind="painter"
          asks={[
            { key: "ref.link", label: "offer.painter-link", required: true },
            { key: "subject", label: "offer.painter-kind" },
            { key: "note", label: "offer.painter-note", type: "textarea" },
          ]}
        />
      </div>
    </div>
  );
}

/**
 * Writing for the Sattal. The house's words come from its own page; here the
 * structure the charter promises: the rate once it is set, whether an
 * outside reader is named, and a way to propose.
 */
export function SattalWritingPage() {
  const info = useSiteInfo();
  const readers = useSattalReaders();
  const localize = useLocalizedPath();
  const w = useWording();
  const rate = settingNumber(info.data?.["sattal.rate_minor"]);
  return (
    <ShellPage slug="sattal-writing" path="/sattal/writing" title={w("title.sattal-writing")}>
      <div className="w-reading border-border flex flex-col gap-10 border-t py-10">
        <section aria-labelledby="sattal-rate">
          <h2 id="sattal-rate" className="type-h3">
            {w("sattal.rate-heading")}
          </h2>
          <p className="type-body mt-3">
            {rate != null
              ? w("sattal.rate-line", { rate: formatMoney(rate) })
              : w("sattal.rate-not-set")}
          </p>
        </section>
        <section aria-labelledby="sattal-reader">
          <h2 id="sattal-reader" className="type-h3">
            {w("sattal.reader-heading")}
          </h2>
          <p className="type-body mt-3">
            {(readers.data ?? []).length > 0
              ? w("sattal.reader-named", {
                  names: (readers.data ?? []).map((r) => r.name).join(", "),
                })
              : w("empty.sattal-no-reader")}
          </p>
        </section>
        <section aria-labelledby="sattal-propose">
          <h2 id="sattal-propose" className="type-h3">
            {w("sattal.propose-heading")}
          </h2>
          <p className="type-body mb-6 mt-3">{w("sattal.propose-note")}</p>
          <OfferForm
            kind="sattal"
            asks={[
              {
                key: "ref.form",
                label: "sattal.propose-form",
                type: "select",
                required: true,
                options: [
                  { value: "study", label: "sattal.form-study" },
                  { value: "review", label: "sattal.form-review" },
                  { value: "account", label: "sattal.form-account" },
                ],
              },
              { key: "subject", label: "sattal.propose-subject", required: true },
              { key: "ref.relation", label: "sattal.propose-relation" },
              { key: "note", label: "sattal.propose-paragraph", type: "textarea" },
            ]}
          />
        </section>
        <p className="type-small">
          <Link to={localize("/terms/writers")} className="link-underline">
            {w("sattal.writers-terms")}
          </Link>
        </p>
      </div>
    </ShellPage>
  );
}

/** A Table kept elsewhere: the meal shared, the welcome given, the remembering done. */
export function TableElsewherePage() {
  const w = useWording();
  return (
    <ShellPage slug="a-table-elsewhere" path="/table/elsewhere" title={w("title.table-elsewhere")}>
      <div className="w-reading border-border flex flex-col gap-6 border-t py-10">
        <h2 className="type-h3">{w("offer.table-heading")}</h2>
        <p className="type-body">{w("offer.table-note")}</p>
        <OfferForm
          kind="table"
          asks={[
            { key: "ref.held_on", label: "offer.table-date", type: "date", required: true },
            { key: "subject", label: "offer.table-place", required: true },
            { key: "note", label: "offer.table-line", type: "textarea" },
          ]}
        />
      </div>
    </ShellPage>
  );
}

/** How to leave. Every route named here exists. */
export function LeavingPage() {
  const localize = useLocalizedPath();
  const w = useWording();
  return (
    <ShellPage slug="leaving" title={w("title.leaving")}>
      <div className="w-reading border-border flex flex-col gap-8 border-t py-10">
        <p className="type-body">
          <Link to={localize("/brief/unsubscribe")} className="link-underline">
            {w("leaving.brief")}
          </Link>
        </p>
        <section aria-labelledby="leaving-form">
          <h2 id="leaving-form" className="type-h3">
            {w("leaving.form-heading")}
          </h2>
          <p className="type-body mb-6 mt-3">{w("leaving.form-note")}</p>
          <OfferForm
            kind="leaving"
            asks={[
              {
                key: "ref.what",
                label: "leaving.what",
                type: "select",
                required: true,
                options: [
                  { value: "friend", label: "leaving.what-friend" },
                  { value: "details", label: "leaving.what-details" },
                  { value: "offer", label: "leaving.what-offer" },
                  { value: "other", label: "leaving.what-other" },
                ],
              },
              { key: "note", label: "leaving.note", type: "textarea" },
            ]}
          />
        </section>
      </div>
    </ShellPage>
  );
}
