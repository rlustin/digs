import { I18n } from "i18n-js";
import { getLocales } from "expo-localization";
import en from "@/locales/en.json";

const i18n = new I18n({ en });
i18n.locale = getLocales()[0]?.languageCode ?? "en";
i18n.defaultLocale = "en";
i18n.enableFallback = true;

export const t = i18n.t.bind(i18n);

export function useTranslation() {
  return { t };
}
