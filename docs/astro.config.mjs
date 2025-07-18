// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import markdoc from '@astrojs/markdoc';

// https://astro.build/config
export default defineConfig({
	site: 'https://svallory.github.io',
	base: '/hypergen',
	integrations: [
		markdoc(),
		starlight({
			title: 'Hypergen V8',
			description: 'Advanced template composition and workflow orchestration for modern development.',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/svallory/hypergen' },
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Overview', slug: '' },
						{ label: 'Getting Started', slug: 'getting-started' },
						{ label: 'V8 Features', slug: 'v8-features' },
					],
				},
				{
					label: 'Advanced Features',
					items: [
						{ label: 'Advanced Composition', slug: 'advanced-composition' },
						{ label: 'Template Inheritance', link: '/hypergen/advanced-composition#template-inheritance-and-composition' },
						{ label: 'Conditional Templates', link: '/hypergen/advanced-composition#conditional-template-inclusion' },
						{ label: 'Action Pipelines', link: '/hypergen/advanced-composition#action-pipelines-and-workflows' },
					],
				},
				{
					label: 'Development',
					items: [
						{ label: 'V8 Roadmap', slug: 'v8-roadmap' },
					],
				},
			],
		}),
	],
});
