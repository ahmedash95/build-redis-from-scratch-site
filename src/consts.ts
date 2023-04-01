export const SITE = {
	title: 'بناء Redis من الصفر',
	description: 'بناء Redis من الصفر باستخدام Go وبدون اي مكتبات خارجية',
	defaultLanguage: 'ar',
	dir: 'rtl',
} as const;

export const OPEN_GRAPH = {
	image: {
		src: 'https://github.com/withastro/astro/blob/main/.github/assets/banner.png?raw=true',
		alt:
			'astro logo on a starry expanse of space,' +
			' with a purple saturn-like planet floating in the right foreground',
	},
	twitter: 'astrodotbuild',
};

export const KNOWN_LANGUAGES = {
	English: 'en',
	Arabic: 'ar',
} as const;

export const KNOWN_LANGUAGE_CODES = Object.values(KNOWN_LANGUAGES);

export const GITHUB_EDIT_URL = `https://github.com/withastro/astro/tree/main/examples/docs`;

export const COMMUNITY_INVITE_URL = '';

// See "Algolia" section of the README for more information.
export const ALGOLIA = {
	indexName: 'XXXXXXXXXX',
	appId: 'XXXXXXXXXX',
	apiKey: 'XXXXXXXXXX',
};

export type Sidebar = Record<
	(typeof KNOWN_LANGUAGE_CODES)[number],
	Record<string, { text: string; link: string }[]>
>;
export const SIDEBAR: Sidebar = {
	en: {

	},
	ar: {
		'الفهرس': [
			{ text: 'مقدمة', link: 'ar/introduction' },
			{ text: 'بناء الخادم', link: 'ar/writing-server' },
			{ text: 'القراءة من RESP', link: 'ar/resp-reader' },
			{ text: 'الكتابة الي RESP', link: 'ar/resp-writer' },
			{ text: 'كتابة الاوامر', link: 'ar/implementing-commands' },
			{ text: 'تخزين البيانات', link: 'ar/aof' },
		],
		// 'Another Section': [{ text: 'Page 4', link: 'en/page-4' }],
	},
};
