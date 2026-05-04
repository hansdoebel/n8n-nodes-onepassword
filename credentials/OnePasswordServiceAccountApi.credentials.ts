import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class OnePasswordServiceAccountApi implements ICredentialType {
	name = 'onePasswordServiceAccountApi';

	displayName = '1Password Service Account API';

	documentationUrl = 'https://developer.1password.com/docs/service-accounts/get-started';

	icon: Icon = {
		light: 'file:../icons/onepassword.svg',
		dark: 'file:../icons/onepassword.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Service Account Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'OP_SERVICE_ACCOUNT_TOKEN for a 1Password Service Account. Create one at https://my.1password.com/developer-tools/infrastructure-secrets/serviceaccount/.',
		},
	];
}
