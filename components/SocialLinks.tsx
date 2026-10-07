import { CONTACT_EMAIL, SOCIAL_LINKS, type SocialLink } from "@/lib/site";

function SocialIcon({ name }: { name: SocialLink["name"] }): React.JSX.Element {
  if (name === "Facebook") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.4 8.5V6.8c0-.8.5-1 1-1h2.5V2.1L14.5 2C11.1 2 10 4.1 10 6.4v2.1H7v4.1h3V22h4.4v-9.4h3.2l.5-4.1h-3.7Z" /></svg>;
  }
  if (name === "LinkedIn") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 8.2H2.7V21h3.9V8.2ZM4.6 2A2.3 2.3 0 1 0 4.6 6.6 2.3 2.3 0 0 0 4.6 2ZM21.3 13.7c0-3.8-2-5.6-4.8-5.6a4.2 4.2 0 0 0-3.8 2.1v-2h-3.8V21h3.9v-6.3c0-1.7.3-3.3 2.4-3.3 2 0 2.1 1.9 2.1 3.4V21h4v-7.3Z" /></svg>;
  }
  if (name === "YouTube") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M21.6 7.1a3 3 0 0 0-2.1-2.2C17.6 4.4 12 4.4 12 4.4s-5.6 0-7.5.5a3 3 0 0 0-2.1 2.2A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.9 3 3 0 0 0 2.1 2.2c1.9.5 7.5.5 7.5.5s5.6 0 7.5-.5a3 3 0 0 0 2.1-2.2A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.9ZM10 15.3V8.7l5.8 3.3-5.8 3.3Z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm2.9 10.6-4.1 2.6c-.5.3-.8.1-.8-.5V9.3c0-.6.3-.8.8-.5l4.1 2.6c.5.3.5.9 0 1.2Z" /></svg>;
}

export function SocialLinks({ showLabels = false }: { showLabels?: boolean }): React.JSX.Element {
  return (
    <div className={`social-links${showLabels ? " social-links-labeled" : ""}`} aria-label="Business Online Mastery online">
      {SOCIAL_LINKS.map((link) => (
        <a href={link.href} key={link.name} target="_blank" rel="noreferrer" aria-label={`${link.name} — opens in a new tab`}>
          <SocialIcon name={link.name} />
          {showLabels ? <span>{link.name}</span> : null}
        </a>
      ))}
    </div>
  );
}

export function EmailLink({ showIcon = true }: { showIcon?: boolean }): React.JSX.Element {
  return (
    <a className="email-link" href={`mailto:${CONTACT_EMAIL}`}>
      {showIcon ? <svg viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v.3l9 6.2 9-6.2V6H3Zm18 12V8.7l-8.4 5.8a1 1 0 0 1-1.2 0L3 8.7V18h18Z" /></svg> : null}
      <span>{CONTACT_EMAIL}</span>
    </a>
  );
}

