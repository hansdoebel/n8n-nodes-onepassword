import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { ItemFieldType } from '@1password/sdk';
import { buildClient, searchItems, searchVaults } from './helpers';

const VAULT_ID_REGEX = '^[a-z0-9]{20,}$';
const VAULT_ID_ERROR = 'Must be a lowercase alphanumeric 1Password ID';

export class OnePassword implements INodeType {
	description: INodeTypeDescription = {
		displayName: '1Password',
		name: 'onePassword',
		icon: {
			light: 'file:../../icons/onepassword.svg',
			dark: 'file:../../icons/onepassword.dark.svg',
		},
		group: ['input'],
		version: [1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Fetch secrets and items from 1Password using a Service Account',
		defaults: { name: '1Password' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'onePasswordServiceAccountApi',
				required: true,
				testedBy: 'onePasswordServiceAccountTest',
			},
		],
		sensitiveOutputFields: ['value'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Item', value: 'item' },
					{ name: 'Secret', value: 'secret' },
					{ name: 'Vault', value: 'vault' },
				],
				default: 'secret',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['secret'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Resolve an op:// reference to its value',
						action: 'Resolve a secret reference',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['item'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get an item by vault and item ID',
						action: 'Get an item',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List items in a vault',
						action: 'List items in a vault',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['vault'] } },
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'List vaults the service account can access',
						action: 'List vaults',
					},
				],
				default: 'list',
			},
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'op://Vault/Item/field',
				description:
					'A 1Password secret reference. See https://developer.1password.com/docs/cli/secret-reference-syntax/.',
				displayOptions: { show: { resource: ['secret'], operation: ['get'] } },
			},
			{
				displayName: 'Vault',
				name: 'vaultId',
				type: 'resourceLocator',
				required: true,
				default: { mode: 'list', value: '' },
				description: 'The vault to operate on',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchVaults',
							searchable: true,
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. abc123def456ghi789jkl012',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: VAULT_ID_REGEX,
									errorMessage: VAULT_ID_ERROR,
								},
							},
						],
					},
				],
				displayOptions: { show: { resource: ['item'] } },
			},
			{
				displayName: 'Item',
				name: 'itemId',
				type: 'resourceLocator',
				required: true,
				default: { mode: 'list', value: '' },
				description: 'The item to fetch. The list is populated for the selected vault.',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchItems',
							searchable: true,
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. abc123def456ghi789jkl012',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: VAULT_ID_REGEX,
									errorMessage: VAULT_ID_ERROR,
								},
							},
						],
					},
				],
				displayOptions: { show: { resource: ['item'], operation: ['get'] } },
			},
		],
	};

	methods = {
		credentialTest: {
			onePasswordServiceAccountTest: async function (
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const token = credential.data?.token as string | undefined;
				if (!token) {
					return { status: 'Error', message: 'Missing service account token' };
				}
				try {
					const client = await buildClient(token);
					await client.vaults.list();
					return { status: 'OK', message: 'Connection successful' };
				} catch (error) {
					return { status: 'Error', message: (error as Error).message };
				}
			},
		},
		listSearch: {
			searchVaults,
			searchItems,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('onePasswordServiceAccountApi');
		const token = credentials.token as string;

		const client = await buildClient(token);

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				if (resource === 'secret' && operation === 'get') {
					const raw = this.getNodeParameter('reference', itemIndex) as string;
					const reference = raw.trim().replace(/^(["'])(.*)\1$/, '$2');
					const value = await client.secrets.resolve(reference);
					returnData.push({
						json: { reference, value },
						pairedItem: itemIndex,
					});
				} else if (resource === 'item' && operation === 'get') {
					const vaultId = this.getNodeParameter('vaultId', itemIndex, undefined, {
						extractValue: true,
					}) as string;
					const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
						extractValue: true,
					}) as string;
					const item = await client.items.get(vaultId, itemId);

					const concealed: Record<string, string> = {};
					const fields: Record<string, string> = {};
					for (const field of item.fields) {
						const key = field.title || field.id;
						if (field.fieldType === ItemFieldType.Concealed) {
							concealed[key] = field.value;
						} else {
							fields[key] = field.value;
						}
					}

					returnData.push({
						json: {
							id: item.id,
							title: item.title,
							category: item.category,
							vaultId: item.vaultId,
							tags: item.tags,
							websites: item.websites,
							notes: item.notes,
							version: item.version,
							fields,
							value: concealed,
							createdAt: item.createdAt,
							updatedAt: item.updatedAt,
						},
						pairedItem: itemIndex,
					});
				} else if (resource === 'item' && operation === 'list') {
					const vaultId = this.getNodeParameter('vaultId', itemIndex, undefined, {
						extractValue: true,
					}) as string;
					const overviews = await client.items.list(vaultId);
					for (const overview of overviews) {
						returnData.push({
							json: {
								id: overview.id,
								title: overview.title,
								category: overview.category,
								vaultId: overview.vaultId,
								tags: overview.tags,
								websites: overview.websites,
								state: overview.state,
								createdAt: overview.createdAt,
								updatedAt: overview.updatedAt,
							},
							pairedItem: itemIndex,
						});
					}
				} else if (resource === 'vault' && operation === 'list') {
					const overviews = await client.vaults.list();
					for (const vault of overviews) {
						returnData.push({
							json: {
								id: vault.id,
								title: vault.title,
								description: vault.description,
								vaultType: vault.vaultType,
								activeItemCount: vault.activeItemCount,
								createdAt: vault.createdAt,
								updatedAt: vault.updatedAt,
							},
							pairedItem: itemIndex,
						});
					}
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported resource/operation: ${resource}/${operation}`,
						{ itemIndex },
					);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: items[itemIndex].json,
						error: error as NodeOperationError,
						pairedItem: itemIndex,
					});
					continue;
				}
				if ((error as { context?: { itemIndex?: number } }).context) {
					(error as { context: { itemIndex?: number } }).context.itemIndex = itemIndex;
					throw error;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [returnData];
	}
}
