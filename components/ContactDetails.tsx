import { EmailLink, SocialLinks } from "@/components/SocialLinks";

export function ContactDetails(): React.JSX.Element {
  return (
    <section className="contact-details shell reading-width" aria-labelledby="contact-details-title">
      <div><p className="section-label">Contact</p><h2 id="contact-details-title">Start a conversation</h2><p>For a question, idea, or professional conversation, email is the simplest way to get in touch.</p><EmailLink /></div>
      <div className="contact-socials"><p className="section-label">Elsewhere</p><SocialLinks showLabels /></div>
    </section>
  );
}
