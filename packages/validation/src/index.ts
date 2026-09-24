import { z } from "zod";

export const supportedLocaleSchema = z.enum(["ru", "cz", "en"]);
export type SupportedLocale = z.infer<typeof supportedLocaleSchema>;

export const masterAuthCredentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export type MasterAuthCredentials = z.infer<typeof masterAuthCredentialsSchema>;
