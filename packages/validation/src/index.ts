import { z } from "zod";

export const supportedLocaleSchema = z.enum(["ru", "cz", "en"]);
export type SupportedLocale = z.infer<typeof supportedLocaleSchema>;

export const masterEmailSchema = z.string().trim().email();
export const masterPasswordSchema = z.string().min(8);

export const masterAuthCredentialsSchema = z.object({
  email: masterEmailSchema,
  password: masterPasswordSchema,
});

export type MasterAuthCredentials = z.infer<typeof masterAuthCredentialsSchema>;
