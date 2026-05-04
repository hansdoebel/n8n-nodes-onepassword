<h1 align="center">
  <br>
  n8n-nodes-onepassword
  <br>
</h1>

<p align="center">
	<img alt="NPM Version" src="https://img.shields.io/npm/v/n8n-nodes-onepassword">
	<img alt="GitHub License" src="https://img.shields.io/github/license/hansdoebel/n8n-nodes-onepassword">
	<img alt="NPM Downloads" src="https://img.shields.io/npm/dm/n8n-nodes-onepassword">
	<img alt="NPM Last Update" src="https://img.shields.io/npm/last-update/n8n-nodes-onepassword">
	<img alt="Static Badge" src="https://img.shields.io/badge/n8n-2.18.0-EA4B71?logo=n8n">
</p>

<p align="center">
  <a href="#installation">Installation</a> |
  <a href="#credentials">Credentials</a> |
  <a href="#resources--operations">Resources</a> |
  <a href="#usage">Usage</a> |
  <a href="#security">Security</a> |
  <a href="#development">Development</a> |
  <a href="#license">License</a>
</p>

---

A community node for [n8n](https://n8n.io/) that fetches secrets and items from [1Password](https://1password.com/) using a [Service Account](https://developer.1password.com/docs/service-accounts).

Use it to keep secrets out of n8n credentials: store API keys, passwords, and tokens in 1Password, then resolve them at workflow runtime and pass them into downstream nodes via expressions.

## API Coverage

The package ships a single action node backed by the official [`@1password/sdk`](https://www.npmjs.com/package/@1password/sdk), covering read-only access to vaults, items, and secret references.

<details>
<summary><strong>View resources</strong></summary>

| Resource | Operations |
| --- | --- |
| Secret | Get |
| Item | Get, List |
| Vault | List |

</details>

## Installation

1. Create a new workflow or open an existing one
2. Open the nodes panel by selecting **+** or pressing **N**
3. Search for **1Password**
4. Select **Install** to install the node for your instance

Alternatively, follow the [community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) and install `n8n-nodes-onepassword`.

## Credentials

The node uses a **1Password Service Account API** credential with one field:

- **Service Account Token** — an `OP_SERVICE_ACCOUNT_TOKEN`. Create one at [my.1password.com → Developer Tools → Service Accounts](https://my.1password.com/developer-tools/infrastructure-secrets/serviceaccount/) and grant it read access to the vaults you need.

The token is sent only to 1Password's SDK; the node makes no other outbound calls.

## Resources & Operations

See the collapsible table above under [API Coverage](#api-coverage) for the full list.

### Secret → Get

Resolves an `op://Vault/Item/field` reference to a single string. Output: `{ reference, value }`.

### Item → Get

Fetches a full item by vault ID and item ID. Output flattens fields into two buckets:

- `value` — concealed (password-type) fields, keyed by field title.
- `fields` — non-concealed fields, keyed by field title.

### Item → List

Lists active items in a vault. Output: one row per item with overview metadata (no field values).

### Vault → List

Lists vaults the service account can access. Output: one row per vault with overview metadata.

## Usage

### Pattern: feed a 1Password secret into another n8n credential

n8n evaluates expressions in credential fields at runtime, so a 1Password node placed early in the workflow can supply secrets to any downstream credential.

1. Add a **1Password** node, connect a Service Account credential, set Resource = `Secret`, Operation = `Get`, and Reference = `op://Production/SlackBot/token`.
2. Add a **Slack** node downstream. Edit its credential, switch the Bot User OAuth Token field to **Expression mode**, and enter:

   ```
   {{ $('1Password').item.json.value }}
   ```

3. Run the workflow. The Slack call is made with the token resolved from 1Password — nothing is hardcoded in n8n.

This mirrors n8n's official ["Set credentials dynamically"](https://n8n.io/workflows/2223) template. It works reliably for API key, bearer, basic-auth, and header-auth credential types. **OAuth2 flows are unreliable** because token exchange happens out-of-band — don't try to feed an OAuth2 client secret this way.

## Security

**Read this before using the node in production.**

By design, the value resolved by `Secret → Get` lives in the upstream node's runData so that downstream expression references can resolve it. On free / community editions of n8n, the secret value is therefore visible in the editor's execution-data panel during runs.

Mitigations, in order of strength:

1. **Disable execution data persistence** in workflow settings → Save Data Successful/Failed/Manual Executions → "Do not save". Prevents the secret from being written to the n8n database. Manual editor view during a test run still shows it; production runs do not persist.
2. **`sensitiveOutputFields: ['value']`** is declared on this node. On n8n Enterprise this triggers automatic redaction of the `value` field in execution data. On free editions it's a no-op (forward-compatible).
3. **Use n8n's built-in [External Secrets](https://docs.n8n.io/external-secrets/onepassword/)** instead of this node if you have n8n Enterprise + a 1Password Connect Server. That's the only fully transparent path — secrets never enter runData. This community node fills the gap for users without Enterprise.

Notes (a free-form item field) is **not** covered by the redaction declaration. If you store secrets in notes, treat the `Get Item` output as fully sensitive.

## Development

```bash
git clone https://github.com/hansdoebel/n8n-nodes-onepassword.git
cd n8n-nodes-onepassword
bun install
bun run build
bun run lint
```

The node depends on [`@1password/sdk`](https://www.npmjs.com/package/@1password/sdk), which provides the official Service Account client used for all API calls.

## Resources

- [1Password Service Accounts](https://developer.1password.com/docs/service-accounts)
- [1Password Secret Reference Syntax](https://developer.1password.com/docs/cli/secret-reference-syntax/)
- [n8n Community Nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [@1password/sdk on npm](https://www.npmjs.com/package/@1password/sdk)

## License

[MIT](LICENSE)

<p align="center">
  <a href="https://github.com/hansdoebel/n8n-nodes-onepassword">GitHub</a> |
  <a href="https://github.com/hansdoebel/n8n-nodes-onepassword/issues">Issues</a> |
  <a href="https://developer.1password.com/docs/sdks/">1Password SDK Docs</a>
</p>
