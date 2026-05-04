import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { createClient, type Client } from '@1password/sdk';
import { name, version } from '../../package.json';

export const INTEGRATION_NAME = name;
export const INTEGRATION_VERSION = version;

export async function buildClient(token: string): Promise<Client> {
	return createClient({
		auth: token,
		integrationName: INTEGRATION_NAME,
		integrationVersion: INTEGRATION_VERSION,
	});
}

export async function searchVaults(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const { token } = (await this.getCredentials('onePasswordServiceAccountApi')) as {
		token: string;
	};
	const client = await buildClient(token);
	const vaults = await client.vaults.list();

	const term = filter?.toLowerCase().trim();
	const results = vaults
		.filter((v) => !term || v.title.toLowerCase().includes(term))
		.map((v) => ({ name: v.title, value: v.id }));

	return { results };
}

export async function searchItems(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const vaultIdParam = this.getCurrentNodeParameter('vaultId', { extractValue: true }) as
		| string
		| undefined;
	if (!vaultIdParam) {
		return { results: [] };
	}

	const { token } = (await this.getCredentials('onePasswordServiceAccountApi')) as {
		token: string;
	};
	const client = await buildClient(token);
	const items = await client.items.list(vaultIdParam);

	const term = filter?.toLowerCase().trim();
	const results = items
		.filter((i) => !term || i.title.toLowerCase().includes(term))
		.map((i) => ({ name: i.title, value: i.id }));

	return { results };
}
