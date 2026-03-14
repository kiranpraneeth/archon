# MCP Servers Configuration Guide

This guide covers the Model Context Protocol (MCP) servers configured for Archon to enable AI agents to interact with external services and tools.

## What is MCP?

The Model Context Protocol (MCP) is an open protocol that enables AI models to securely interact with local and remote resources through standardized server implementations. MCP servers expose tools, resources, and prompts that AI assistants like Claude can use.

## Configured MCP Servers

We have configured 16 MCP servers covering productivity, development, databases, and AI capabilities:

### Productivity & Collaboration

#### 1. **GitHub** - Code repository management
- **Package:** `@modelcontextprotocol/server-github`
- **Capabilities:** Manage repositories, issues, PRs, code search, workflows
- **Setup:** Requires `GITHUB_PERSONAL_ACCESS_TOKEN`
- **Docs:** https://github.com/github/github-mcp-server

#### 2. **Slack** - Team communication
- **Package:** `@modelcontextprotocol/server-slack`
- **Capabilities:** Search channels, send messages, read threads
- **Setup:** Requires `SLACK_BOT_TOKEN` and `SLACK_TEAM_ID`
- **Docs:** https://slack.com/help/articles/48855576908307

#### 3. **Notion** - Knowledge management
- **Package:** `@notionhq/client`
- **Capabilities:** Manage pages, databases, content
- **Setup:** Requires `NOTION_API_KEY`
- **Docs:** https://github.com/makenotion/notion-mcp-server

#### 4. **Google Workspace** - Docs, Sheets, Drive, Gmail, Calendar
- **Package:** `google-workspace-mcp-server`
- **Capabilities:** Read/write docs, manage sheets, send emails, calendar events
- **Setup:** Requires OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`)
- **Docs:** https://fastmcp.me/mcp/details/1899/google-workspace

#### 5. **Atlassian (Jira & Confluence)** - Project management
- **Package:** `mcp-atlassian`
- **Capabilities:** Manage issues, search Confluence, project metadata
- **Setup:** Requires `ATLASSIAN_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`
- **Docs:** https://github.com/sooperset/mcp-atlassian

### Development Tools

#### 6. **Filesystem** - Local file operations
- **Package:** `@modelcontextprotocol/server-filesystem`
- **Capabilities:** Secure file read/write with access controls
- **Setup:** Configured for `/Users/kirangamini/workspace`
- **Docs:** https://github.com/modelcontextprotocol/servers

#### 7. **Git** - Repository operations
- **Package:** `@modelcontextprotocol/server-git`
- **Capabilities:** Read, search, manipulate Git repos
- **Setup:** Configured for `/Users/kirangamini/workspace`
- **Docs:** https://github.com/modelcontextprotocol/servers

### Databases

#### 8. **PostgreSQL** - Database management
- **Package:** `@modelcontextprotocol/server-postgres`
- **Capabilities:** Query and manage Postgres databases
- **Setup:** Requires `POSTGRES_CONNECTION_STRING`
- **Docs:** https://github.com/modelcontextprotocol/servers

#### 9. **Supabase** - Backend as a Service
- **Package:** `@supabase-community/supabase-mcp`
- **Capabilities:** Database, auth, edge functions
- **Setup:** Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **Docs:** https://github.com/supabase-community/supabase-mcp

### Infrastructure & Services

#### 10. **Cloudflare** - Edge platform
- **Package:** `@cloudflare/mcp-server-cloudflare`
- **Capabilities:** Deploy Workers, manage KV, R2, D1
- **Setup:** Requires `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- **Docs:** https://github.com/cloudflare/mcp-server-cloudflare

#### 11. **Stripe** - Payment processing
- **Package:** `@stripe/agent-toolkit`
- **Capabilities:** Interact with Stripe API, manage payments
- **Setup:** Requires `STRIPE_API_KEY`
- **Docs:** https://github.com/stripe/agent-toolkit

#### 12. **Linear** - Issue tracking
- **Package:** `linear-mcp-server`
- **Capabilities:** Manage issues, projects, cycles
- **Setup:** Requires `LINEAR_API_KEY`

### AI Enhancement

#### 13. **Memory** - Persistent knowledge graph
- **Package:** `@modelcontextprotocol/server-memory`
- **Capabilities:** Store and retrieve context across sessions
- **Setup:** No configuration required

#### 14. **Sequential Thinking** - Problem solving
- **Package:** `@modelcontextprotocol/server-sequential-thinking`
- **Capabilities:** Dynamic, reflective reasoning
- **Setup:** No configuration required

#### 15. **Time** - Timezone conversions
- **Package:** `@modelcontextprotocol/server-time`
- **Capabilities:** Time and timezone operations
- **Setup:** No configuration required

#### 16. **Fetch** - Web content retrieval
- **Package:** `@modelcontextprotocol/server-fetch`
- **Capabilities:** Fetch and convert web content for LLMs
- **Setup:** No configuration required

## Configuration File

MCP servers are configured in:
```
~/.claude/claude_desktop_config.json
```

Or on macOS:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

## Setup Instructions

### 1. GitHub Token

Create a personal access token at https://github.com/settings/tokens

Required scopes: `repo`, `read:org`, `read:user`, `workflow`

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_xxxxx"
```

### 2. Slack Bot Token

Create a Slack app at https://api.slack.com/apps

Required scopes: `channels:read`, `channels:history`, `chat:write`, `users:read`

```bash
export SLACK_BOT_TOKEN="xoxb-xxxxx"
export SLACK_TEAM_ID="T01XXXXX"
```

### 3. Notion Integration

Create integration at https://www.notion.so/my-integrations

```bash
export NOTION_API_KEY="secret_xxxxx"
```

### 4. Google Workspace

Set up OAuth 2.0 at https://console.cloud.google.com/apis/credentials

Enable APIs: Gmail, Calendar, Drive, Docs, Sheets

```bash
export GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="xxxxx"
export GOOGLE_REFRESH_TOKEN="xxxxx"
```

### 5. Atlassian (Jira/Confluence)

Create API token at https://id.atlassian.com/manage-profile/security/api-tokens

```bash
export ATLASSIAN_URL="https://your-domain.atlassian.net"
export ATLASSIAN_EMAIL="your@email.com"
export ATLASSIAN_API_TOKEN="xxxxx"
```

### 6. Database Connections

**PostgreSQL:**
```bash
export POSTGRES_CONNECTION_STRING="postgresql://user:pass@localhost:5432/db"
```

**Supabase:**
```bash
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="xxxxx"
```

### 7. Infrastructure Services

**Cloudflare:**
```bash
export CLOUDFLARE_API_TOKEN="xxxxx"
export CLOUDFLARE_ACCOUNT_ID="xxxxx"
```

**Stripe:**
```bash
export STRIPE_API_KEY="sk_test_xxxxx"
```

**Linear:**
```bash
export LINEAR_API_KEY="lin_api_xxxxx"
```

## Environment Variables Management

### Option 1: System Environment
Add to `~/.zshrc` or `~/.bashrc`:

```bash
# MCP Server Tokens
export GITHUB_PERSONAL_ACCESS_TOKEN="..."
export SLACK_BOT_TOKEN="..."
# ... etc
```

### Option 2: .env File
Create `.env` in Archon root:

```bash
# Do NOT commit this file to git
GITHUB_PERSONAL_ACCESS_TOKEN=...
SLACK_BOT_TOKEN=...
SLACK_TEAM_ID=...
NOTION_API_KEY=...
# ... etc
```

Add to `.gitignore`:
```
.env
.env.local
```

### Option 3: Direct in config.json
Replace `<your-token>` placeholders directly in `claude_desktop_config.json` (not recommended for security).

## Using MCP Servers

Once configured and Claude Desktop is restarted, AI agents can:

- **Code Review:** "Check GitHub PRs for security issues"
- **Team Communication:** "Summarize #engineering channel from last week"
- **Documentation:** "Update Confluence page with latest API changes"
- **Project Management:** "Create Jira ticket for bug found in code review"
- **Knowledge Management:** "Add this pattern to Notion playbook"
- **Database Operations:** "Query Postgres for user signup metrics"
- **Deployment:** "Deploy updated API to Cloudflare Workers"
- **Monitoring:** "Check Stripe payment failures from yesterday"

## Security Best Practices

1. **Least Privilege:** Only grant minimum required scopes/permissions
2. **Token Rotation:** Regularly rotate API tokens and keys
3. **Environment Isolation:** Use separate tokens for dev/staging/prod
4. **Secret Management:** Never commit tokens to version control
5. **Audit Logs:** Enable audit logging for all integrated services
6. **MCP Permissions:** Review Claude's MCP server permissions regularly

## Troubleshooting

### MCP Server Not Loading
1. Check `claude_desktop_config.json` syntax (valid JSON)
2. Restart Claude Desktop
3. Check token validity
4. Review Claude Desktop logs: `~/Library/Logs/Claude/`

### Permission Denied Errors
1. Verify token scopes match requirements
2. Check service-specific permissions (Slack workspace admin, etc.)
3. Ensure tokens are active (not expired/revoked)

### Connection Timeouts
1. Check network connectivity
2. Verify service endpoints are accessible
3. Check for rate limiting

## Additional Resources

- **MCP Registry:** https://registry.modelcontextprotocol.io/
- **Official Docs:** https://modelcontextprotocol.io/
- **Awesome MCP Servers:** https://github.com/wong2/awesome-mcp-servers
- **GitHub Registry:** https://github.blog/ai-and-ml/generative-ai/how-to-find-install-and-manage-mcp-servers-with-the-github-mcp-registry/

## Contributing

To add new MCP servers:

1. Find server in MCP Registry or Awesome MCP Servers list
2. Add configuration to `claude_desktop_config.json`
3. Document setup instructions in this file
4. Update Archon agent contexts to use new capabilities
5. Test with example use cases
6. Commit documentation changes (NOT tokens!)

---

**Last Updated:** 2026-03-14
**Maintained By:** Archon Team
