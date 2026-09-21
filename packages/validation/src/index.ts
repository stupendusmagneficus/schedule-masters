import { z } from "zod";

export const supportedLocaleSchema = z.enum(["ru", "cz", "en"]);
export type SupportedLocale = z.infer<typeof supportedLocaleSchema>;
