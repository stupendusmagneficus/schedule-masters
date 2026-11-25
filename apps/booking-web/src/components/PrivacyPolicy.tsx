import type {
  PrivacyPolicyLanguage,
  PrivacyPolicySection,
} from "../content/privacyPolicy";

type PrivacyPolicyProps = {
  readonly languages: readonly PrivacyPolicyLanguage[];
};

function PolicySection({ section }: { section: PrivacyPolicySection }) {
  return (
    <section className="privacy-section">
      <h3>{section.heading}</h3>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {section.items && (
        <ul>
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PrivacyPolicy({ languages }: PrivacyPolicyProps) {
  return (
    <main className="booking-page page-shell">
      <article className="booking-panel privacy-policy">
        <p className="eyebrow">Chvilio</p>
        <h1>{languages.map((language) => language.title).join(" / ")}</h1>
        <nav aria-label="Jazyk / Language" className="privacy-language-nav">
          {languages.map((language) => (
            <a href={`#${language.id}`} key={language.id} lang={language.lang}>
              {language.languageName}
            </a>
          ))}
        </nav>
        {languages.map((language) => (
          <section
            aria-labelledby={`${language.id}-title`}
            className="privacy-language"
            id={language.id}
            key={language.id}
            lang={language.lang}
          >
            <h2 className="privacy-language-title" id={`${language.id}-title`}>
              {language.title}
            </h2>
            <p className="privacy-draft-notice" role="note">
              {language.draftNotice}
            </p>
            <p className="muted-copy">{language.effectiveDate}</p>
            {language.sections.map((section) => (
              <PolicySection key={section.heading} section={section} />
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
