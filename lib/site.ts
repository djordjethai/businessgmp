export const CONTACT_EMAIL = "info@georgemposi.com";

export type SocialLink = {
  name: "Facebook" | "LinkedIn" | "YouTube";
  href: string;
};

// These are the profile URLs present in the published legacy site content.
export const SOCIAL_LINKS: SocialLink[] = [
  { name: "Facebook", href: "https://www.facebook.com/djordje.medakovic/" },
  { name: "LinkedIn", href: "https://www.linkedin.com/in/djordje-medakovic-11b51b21/" },
  { name: "YouTube", href: "https://www.youtube.com/channel/UCmffykN4Iq8TY_1yyUWdoeA" },
];
