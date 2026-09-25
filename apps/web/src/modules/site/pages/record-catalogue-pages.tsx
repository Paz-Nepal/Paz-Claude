import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { publicMediaUrl } from "../api/use-site";
import {
  useRecordAccessions,
  useRecordHousePapers,
  useRecordParts,
  useRecordWithdrawn,
  type RecordAccession,
} from "../api/use-place";
import { pickLang, useLanguage } from "../language";
import { useWording, type WordingKey } from "../wording";
import { DocumentHead } from "../components/document-head";
import { PageHero } from "../components/paz-editorial";
import { useEraDate } from "../components/wall-parts";

const KIND: Record<string, WordingKey> = {
  voice: "catalogue.kind-voice",
  photographs: "catalogue.kind-photographs",
  papers: "catalogue.kind-papers",
  the_present: "catalogue.kind-the-present",
  other: "catalogue.kind-other",
};

const TIER: Record<string, WordingKey> = {
  online: "catalogue.tier-online",
  in_house_works: "catalogue.tier-in-house-works",
  anyone_in_house: "catalogue.tier-anyone-in-house",
  people_of_house: "catalogue.tier-people-of-house",
  family_only: "catalogue.tier-family-only",
  no_one: "catalogue.tier-no-one",
};

const LEVEL: Record<string, WordingKey> = {
  none: "catalogue.level-none",
  subjects: "catalogue.level-subjects",
  account: "catalogue.level-account",
};

const COPY: Record<string, WordingKey> = {
  held: "catalogue.copy-held",
  not_yet: "catalogue.copy-not-yet",
  lost: "catalogue.copy-lost",
};

/**
 * The catalogue: the open layer of what was given in to the Record. Each
 * entry shows its number, dates, the listening tier it was given under, what
 * consent stands, what would open it and where the three copies are. No
 * account of the content appears until a holding opens. A giver who has
 * withdrawn leaves a numbered gap and nothing else. The closed layer is not
 * in the public database at all.
 */
export function CataloguePage() {
  const accessions = useRecordAccessions();
  const parts = useRecordParts();
  const withdrawn = useRecordWithdrawn();
  const { lang } = useLanguage();
  const eraDate = useEraDate();
  const w = useWording();

  const partsOf = (number: string | null) => (parts.data ?? []).filter((p) => p.number === number);
  const dates = (a: RecordAccession) =>
    a.dates_from
      ? a.dates_to && a.dates_to !== a.dates_from
        ? `${eraDate(a.dates_from)} to ${eraDate(a.dates_to)}`
        : eraDate(a.dates_from)
      : null;

  return (
    <div>
      <DocumentHead title={w("title.catalogue")} path="/record/catalogue" />
      <PageHero title={w("title.catalogue")} />
      <section className="w-standard py-12" aria-label={w("title.catalogue")}>
        {accessions.isPending && (
          <p role="status" className="type-small">
            {w("common.loading")}
          </p>
        )}
        {accessions.isError && (
          <StatePanel
            title={w("common.load-error")}
            description={toAppError(accessions.error).message}
          />
        )}
        {accessions.data && accessions.data.length === 0 && (withdrawn.data ?? []).length === 0 && (
          <p className="type-body">{w("empty.catalogue")}</p>
        )}
        <ol className="flex flex-col gap-12">
          {(accessions.data ?? []).map((a) => (
            <li key={a.number} id={a.number ?? undefined} className="border-border border-t pt-6">
              <h2 className="type-h3">{a.number}</h2>
              <p className="type-small">
                {KIND[a.kind ?? ""] ? w(KIND[a.kind ?? ""] as WordingKey) : a.kind}
                {dates(a) ? ` · ${dates(a)}` : ""}
              </p>
              <dl className="type-body mt-4 flex flex-col gap-2">
                <div>
                  <dt className="font-semibold">{w("catalogue.listening")}</dt>
                  <dd>
                    {TIER[a.listening_tier ?? ""]
                      ? w(TIER[a.listening_tier ?? ""] as WordingKey)
                      : a.listening_tier}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">{w("catalogue.description")}</dt>
                  <dd>
                    {LEVEL[a.description_level ?? ""]
                      ? w(LEVEL[a.description_level ?? ""] as WordingKey)
                      : a.description_level}
                  </dd>
                </div>
                {a.consent_now && (
                  <div>
                    <dt className="font-semibold">{w("catalogue.consent")}</dt>
                    <dd>{a.consent_now}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-semibold">{w("catalogue.opens")}</dt>
                  <dd>
                    {a.listening_tier === "online"
                      ? w("catalogue.open-from-start")
                      : a.opens_on
                        ? a.is_open
                          ? w("catalogue.opened-on", { date: eraDate(a.opens_on) })
                          : w("catalogue.opens-on", { date: eraDate(a.opens_on) })
                        : w("catalogue.no-date")}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">{w("catalogue.copies")}</dt>
                  <dd>
                    {w("catalogue.copies-line", {
                      first: COPY[a.copy_first ?? ""]
                        ? w(COPY[a.copy_first ?? ""] as WordingKey)
                        : "",
                      second: COPY[a.copy_second ?? ""]
                        ? w(COPY[a.copy_second ?? ""] as WordingKey)
                        : "",
                      third: COPY[a.copy_third ?? ""]
                        ? w(COPY[a.copy_third ?? ""] as WordingKey)
                        : "",
                    })}
                  </dd>
                </div>
                {typeof a.listenings === "number" && a.listenings > 0 && (
                  <div>
                    <dt className="font-semibold">{w("catalogue.heard")}</dt>
                    <dd>{w("catalogue.heard-count", { count: a.listenings })}</dd>
                  </div>
                )}
              </dl>
              {a.description && (
                <p className="type-body mt-4">{pickLang(a.description, a.description_ne, lang)}</p>
              )}
              {a.kin_note && <p className="type-small mt-3">{a.kin_note}</p>}
              {partsOf(a.number).length > 0 && (
                <ul className="type-small mt-4 flex flex-col gap-1">
                  {partsOf(a.number).map((p) => (
                    <li key={p.part_label}>
                      <span className="font-semibold">{p.part_label}</span> {p.label}
                      {p.online_path && (
                        <>
                          {" · "}
                          <a href={publicMediaUrl(p.online_path)} className="link-underline">
                            {w("catalogue.open-file")}
                          </a>
                        </>
                      )}
                      {p.sha256 && (
                        <span className="block break-all font-mono">
                          {w("catalogue.fingerprint", { hash: p.sha256 })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          {(withdrawn.data ?? []).map((g) => (
            <li key={g.number} className="border-border border-t pt-6">
              <h2 className="type-h3">{g.number}</h2>
              <p className="type-body">{w("catalogue.gap")}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/** The house's own papers: its deeds, minutes and correspondence, numbered on their own. */
export function HousePapersPage() {
  const papers = useRecordHousePapers();
  const { lang } = useLanguage();
  const eraDate = useEraDate();
  const w = useWording();
  return (
    <div>
      <DocumentHead title={w("title.house-papers")} path="/record/papers" />
      <PageHero title={w("title.house-papers")} />
      <section className="w-reading py-12" aria-label={w("title.house-papers")}>
        {papers.isPending && (
          <p role="status" className="type-small">
            {w("common.loading")}
          </p>
        )}
        {papers.isError && (
          <StatePanel
            title={w("common.load-error")}
            description={toAppError(papers.error).message}
          />
        )}
        {papers.data && papers.data.length === 0 && (
          <p className="type-body">{w("empty.house-papers")}</p>
        )}
        <ol className="flex flex-col gap-6">
          {(papers.data ?? []).map((p) => (
            <li key={p.reference}>
              <p className="type-small">
                <span className="font-semibold">{p.reference}</span>
                {p.kind ? ` · ${p.kind}` : ""}
                {p.dated_on ? ` · ${eraDate(p.dated_on)}` : ""}
              </p>
              <p className="font-serif text-xl">{pickLang(p.title as string, p.title_ne, lang)}</p>
              {p.note && <p className="type-body">{pickLang(p.note, p.note_ne, lang)}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
