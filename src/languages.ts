import { KNOWN_LANGUAGES, KNOWN_LANGUAGE_CODES } from './consts';
export { KNOWN_LANGUAGES, KNOWN_LANGUAGE_CODES };

import arJson from './l8n/ar.json';
import enJson from './l8n/en.json';

const translations = {
	ar: arJson,
	en: enJson,
}

export const langPathRegex = /\/([a-z]{2}-?[A-Z]{0,2})\//;


export function getLanguageFromURL(pathname: string) {
	const langCodeMatch = pathname.match(langPathRegex);
	const langCode = langCodeMatch ? langCodeMatch[1] : 'en';
	return langCode as (typeof KNOWN_LANGUAGE_CODES)[number];
}

export function useTranslation(lang: string) {
	return translations[lang] || translations['en'];
}
