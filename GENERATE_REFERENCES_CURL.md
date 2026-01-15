# Generate References API - cURL Examples

## Endpoint

`POST /api/write/generate-references`

## Request Body

```json
{
  "projectId": "string (required)",
  "citationStyle": "APA | MLA | HARVARD | CHICAGO | IEEE (optional)",
  "userId": "string (optional - if provided, bypasses auth check)"
}
```

## Examples

### 1. With Authentication (uses authenticated user's ID)

```bash
curl -X POST http://localhost:3000/api/write/generate-references \
  -H "Content-Type: application/json" \
  -H "Cookie: your-supabase-auth-cookie" \
  -d '{
    "projectId": "ca59c2a2-17e4-46b0-8dc9-2f77542cb8dd",
    "citationStyle": "APA"
  }'
```

### 2. With userId Parameter (bypasses auth, uses provided userId)

**Note:** Requires `SUPABASE_SERVICE_ROLE_KEY` to be set in environment variables. This bypasses RLS policies.

```bash
curl -X POST http://localhost:3000/api/write/generate-references \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "ca59c2a2-17e4-46b0-8dc9-2f77542cb8dd",
    "userId": "0965e7ca-6d34-4c1e-89ce-4b73e5165489",
    "citationStyle": "MLA"
  }'
```

### 3. Minimal Request (only projectId)

```bash
curl -X POST http://localhost:3000/api/write/generate-references \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "ca59c2a2-17e4-46b0-8dc9-2f77542cb8dd",
    "userId": "0965e7ca-6d34-4c1e-89ce-4b73e5165489"
  }'
```

### 4. Production Example

```bash
curl -X POST https://your-domain.com/api/write/generate-references \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "ca59c2a2-17e4-46b0-8dc9-2f77542cb8dd",
    "userId": "0965e7ca-6d34-4c1e-89ce-4b73e5165489",
    "citationStyle": "IEEE"
  }'
```

## Response

### Success (200)

```json
{
  "projectId": "ca59c2a2-17e4-46b0-8dc9-2f77542cb8dd",
  "citationStyle": "APA",
  "sourcesCount": 5,
  "references": "Reference list in requested format..."
}
```

### Error (404)

```json
{
  "error": "Project not found",
  "details": "No project found with the given ID"
}
```

### Error (400)

```json
{
  "error": "projectId is required"
}
```
