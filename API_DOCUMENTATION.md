# Scrala API Documentation

## POST /scrape

Extract structured data from any webpage including titles, meta tags, headings, links, images, and PDFs.

### Endpoint

```
POST http://localhost:8000/scrape
```

### Request Headers

```http
Content-Type: application/json
Accept: application/json
```

### Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string (URL) | Yes | - | The URL to scrape. Must be a valid HTTP/HTTPS URL |
| `include_images` | boolean | No | `false` | Include image URLs in the response |
| `include_links` | boolean | No | `true` | Include all hyperlinks found on the page |
| `max_text_length` | integer | No | `5000` | Maximum length of text content to return |

#### Request Schema

```json
{
  "url": "https://example.com",
  "include_images": false,
  "include_links": true,
  "max_text_length": 5000
}
```

### Response

#### Success Response (200 OK)

```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "meta_description": "Page meta description content",
  "meta_keywords": "keyword1, keyword2, keyword3",
  "headings": {
    "h1": ["Main Heading"],
    "h2": ["Subheading 1", "Subheading 2"],
    "h3": ["Section Title 1", "Section Title 2"]
  },
  "links": [
    {
      "text": "Link Text",
      "href": "https://example.com/page"
    }
  ],
  "images": [
    {
      "src": "https://example.com/image.jpg",
      "alt": "Image description"
    }
  ],
  "pdfs": [
    {
      "url": "https://example.com/docs/report.pdf",
      "text": "Download Annual Report",
      "title": "2024 Annual Report"
    }
  ],
  "text_content": "Full text content from the page...",
  "status_code": 200,
  "content_type": "text/html; charset=utf-8"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | The URL that was scraped |
| `title` | string \| null | Page title from `<title>` tag |
| `meta_description` | string \| null | Content from `<meta name="description">` |
| `meta_keywords` | string \| null | Content from `<meta name="keywords">` |
| `headings` | object | Object with h1-h6 keys containing arrays of heading texts |
| `links` | array | Array of link objects (limited to 100) |
| `images` | array | Array of image objects (limited to 50) |
| `pdfs` | array | Array of PDF link objects (limited to 50) |
| `text_content` | string | Extracted text content (truncated to `max_text_length`) |
| `status_code` | integer | HTTP status code from the scraped URL |
| `content_type` | string | Content-Type header from the scraped URL |

#### Error Responses

**400 Bad Request** - Invalid URL or non-HTML content
```json
{
  "detail": "URL does not return HTML content. Content-Type: application/json"
}
```

**404 Not Found** - URL not found
```json
{
  "detail": "HTTP error occurred: 404 Not Found"
}
```

**500 Internal Server Error** - Network or server error
```json
{
  "detail": "Request error occurred: Connection timeout"
}
```

### Example Requests

#### Basic Request (Minimal)

```bash
curl -X POST "http://localhost:8000/scrape" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com"
  }'
```

#### Full Request (All Options)

```bash
curl -X POST "http://localhost:8000/scrape" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://arxiv.org/abs/1711.11279",
    "include_images": true,
    "include_links": true,
    "max_text_length": 10000
  }'
```

#### Python Example

```python
import requests
import json

url = "http://localhost:8000/scrape"
payload = {
    "url": "https://example.com",
    "include_images": True,
    "include_links": True,
    "max_text_length": 5000
}
headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

if response.status_code == 200:
    data = response.json()
    print(f"Title: {data['title']}")
    print(f"PDFs found: {len(data['pdfs'])}")
    for pdf in data['pdfs']:
        print(f"  - {pdf['text']}: {pdf['url']}")
else:
    print(f"Error: {response.json()['detail']}")
```

#### JavaScript (Fetch API) Example

```javascript
const scrapePage = async (targetUrl) => {
  const response = await fetch('http://localhost:8000/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: targetUrl,
      include_images: true,
      include_links: true,
      max_text_length: 5000
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  const data = await response.json();
  return data;
};

// Usage
scrapePage('https://example.com')
  .then(data => {
    console.log('Title:', data.title);
    console.log('PDFs:', data.pdfs);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

### PDF Detection

The API automatically detects PDF links using multiple methods:

1. **File Extension**: Links ending with `.pdf` (case-insensitive)
2. **Path Pattern**: URLs containing `/pdf/` (e.g., `arxiv.org/pdf/12345`)
3. **MIME Type**: Links with `type="application/pdf"` attribute
4. **Link Text**: Links with text containing "PDF" (e.g., "View PDF", "Download PDF")

#### PDF URL Resolution

All PDF URLs are automatically resolved to absolute URLs:

- **Absolute**: `https://example.com/file.pdf` → kept as-is
- **Root-relative**: `/docs/file.pdf` → `https://example.com/docs/file.pdf`
- **Path-relative**: `docs/file.pdf` → resolved from current page path
- **Protocol-relative**: `//cdn.example.com/file.pdf` → adds `https:`

Duplicate PDF URLs are automatically removed.

### Rate Limiting & Performance

- **Timeout**: 30 seconds per request
- **Redirects**: Automatically follows redirects
- **Async**: Uses async HTTP client for optimal performance
- **Limits**:
  - Links: 100 maximum
  - Images: 50 maximum
  - PDFs: 50 maximum

### Best Practices

1. **Always handle errors**: Check HTTP status codes and handle error responses
2. **Validate URLs**: Ensure the target URL is valid before making requests
3. **Set appropriate max_text_length**: Use smaller values if you only need snippets
4. **Disable images/links if not needed**: Set `include_images: false` to reduce response size
5. **Respect robots.txt**: Check the target site's robots.txt before scraping

### Interactive Documentation

For interactive API testing, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Additional Notes

- Only HTML content is supported (checked via Content-Type header)
- The API uses BeautifulSoup4 with lxml parser for fast, accurate parsing
- All text content is extracted with whitespace normalization
- Meta tags are extracted from standard HTML meta elements
- Headings (h1-h6) are organized by level in the response
