import type { Metadata } from "next";
import { PrivacyPolicy } from "../../src/components/PrivacyPolicy";
import { privacyPolicyLanguages } from "../../src/content/privacyPolicy";

export const metadata: Metadata = {
  title: "Zásady ochrany osobních údajů / Privacy policy – Chvilio",
  description: "Draft privacy policy for Chvilio",
  robots: { index: false },
};

export default function PrivacyPage() {
  return <PrivacyPolicy languages={privacyPolicyLanguages} />;
}
