export const SITE = {
	title: 'بناء Redis من الصفر',
	description: 'بناء Redis من الصفر باستخدام Go وبدون اي مكتبات خارجية',
	defaultLanguage: 'en',
	dir: 'ltr',
} as const;

export const OPEN_GRAPH = {
	image: {
		src: 'https://www.build-redis-from-scratch.dev/images/thumb.png',
		alt:
			'build redis clone from scratch in go',
	},
	twitter: 'ahmedash95',
};

export const KNOWN_LANGUAGES = {
	"English": 'en',
	"العربية": 'ar',
} as const;

export const KNOWN_LANGUAGE_CODES = Object.values(KNOWN_LANGUAGES);

export const GITHUB_EDIT_URL = `https://github.com/ahmedash95/build-redis-from-scratch-site/tree/main`;

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
		'index' : [
			{ text: 'Introduction', link: 'en/introduction' },
			{ text: 'First steps', link: 'en/first-steps' },
			{ text: 'Building Server', link: 'en/writing-server' },
			{ text: 'Reading RESP', link: 'en/resp-reader' },
			{ text: 'Writing RESP', link: 'en/resp-writer' },
			{ text: 'Redis Commands', link: 'en/implementing-commands' },
			{ text: 'Data Persistence', link: 'en/aof' },
			{ text: 'Whats Next', link: 'en/next' },
		],
		'': [{ text: 'Author', link: 'en/author' }],
	},
	ar: {
		'الفهرس': [
			{ text: 'مقدمة', link: 'ar/introduction' },
			{ text: 'الخطوات الاولي', link: 'ar/first-steps' },
			{ text: 'بناء الخادم', link: 'ar/writing-server' },
			{ text: 'القراءة من RESP', link: 'ar/resp-reader' },
			{ text: 'الكتابة الي RESP', link: 'ar/resp-writer' },
			{ text: 'كتابة الاوامر', link: 'ar/implementing-commands' },
			{ text: 'تخزين البيانات', link: 'ar/aof' },
			{ text: 'الملخص', link: 'ar/next' },
		],
		'': [{ text: 'عن الكاتب', link: 'ar/author' }],
	},
};
