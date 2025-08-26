# ColorVerse - Free AI-Generated Coloring Pages

ColorVerse is a web application that provides free, AI-generated coloring pages. Users can browse categories, view daily picks, and download or print high-quality coloring pages.

## Quick Start - Local Development

### Prerequisites
- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)

### Step-by-Step Setup

1. **Clone or download the project** to your local machine

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Access the application**:
   - **Local URL**: http://localhost:3000
   - **Network URL**: http://192.168.8.196:3000 (your local IP may vary)

### Verification Steps

After starting the server, you should see:
```
   ┌──────────────────────────────────────────────┐
   │                                              │
   │   Serving!                                   │
   │                                              │
   │   - Local:    http://localhost:3000          │
   │   - Network:  http://192.168.8.196:3000      │
   │                                              │
   └──────────────────────────────────────────────┘
```

### Testing with Puppeteer

If you're using Puppeteer for automated testing or screenshots:

1. **Ensure the server is running** (see steps above)

2. **Use the correct URL format**:
   - ✅ **Correct**: `http://localhost:3000`
   - ❌ **Avoid**: `http://127.0.0.1:3000` (may cause connection issues in containers)

3. **Example Puppeteer usage**:
puppeteer_navigate
Navigate to a URL
{
  "url": "http://host.docker.internal:3000",
  "allowDangerous": true
}

### Troubleshooting

**If you see "Connection refused" errors:**
- Ensure the server is running (`npm start`)
- Check that port 3000 is not already in use
- Try refreshing the page after a few seconds

**If images don't load:**
- Check your internet connection (AI images require external API calls)
- Clear browser cache and refresh
- Check browser console for any CORS or network errors

## Features

- **AI-Powered Image Generation:** Utilizes the Pollinations AI API to create unique coloring pages from text prompts.
- **Diverse Categories:** Offers a wide range of categories such as animals, fantasy, mandalas, nature, and more.
- **Seasonal Themes:** Adapts to different seasons with themed content and color schemes.
- **Theme Switching:**  Supports light, dark, and colorful themes for user preference.
- **Daily Picks:** Features a new, hand-selected coloring page each day.
- **Lazy Loading:** Images are loaded efficiently as users scroll, improving performance.
- **Caching:** Site data and image URLs are cached to ensure fast loading times and reduce API calls.
- **Download & Print:** Users can easily download images in JPG format or print directly from the browser.
- **Share Functionality:** Allows users to share coloring pages with others.
- **Responsive Design:**  Works seamlessly on various devices.

## Technologies Used

- HTML, CSS, JavaScript
- Tailwind CSS for styling
- Font Awesome for icons
- Pollinations AI API for image generation

## Development Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start development server on localhost:3000 |
| `npm test` | Run unit tests with Node's test runner |
| `npm install` | Install dependencies |

## Project Structure

```
colorverse/
├── index.html          # Main HTML file
├── app.js             # Main application logic
├── package.json       # Project configuration
├── README.md         # This file
└── assets/           # Static assets (if any)
```

## Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) – codebase overview and testing notes
- [POLLINATIONS_INTEGRATION.md](POLLINATIONS_INTEGRATION.md) – Pollinations API usage guide
- [AI-APIDOCS.md](AI-APIDOCS.md) – detailed API reference

## Testing

Run all unit tests with:

```bash
npm test
```

The suite covers API fallbacks, theme handling, caching helpers, and more. Test files reside in the `test/` directory.

## Credits

This project leverages the following AI models:

- Gemini 2.5
- Claude Sonnet 3.7

## Claude Code Action Integration

This project can be extended to use the modified Claude Code Action with OAuth for GitHub Actions, allowing Claude Max subscribers to leverage their subscription for automated code assistance.

### OAuth Setup for Claude Max Subscribers

To set up Claude Code Action with OAuth:

1.  **Install the Claude GitHub app** to your repository: [`https://github.com/apps/claude`](https://github.com/apps/claude)
2.  **Get your OAuth credentials** from your Claude Max subscription:
    *   Make sure you are logged in with your Claude Max in Claude with `/login`.
    *   Find your `access token`, `refresh token`, and `expires at` in `~/.claude/.credentials.json` (Ubuntu) or by searching "claude -> show password" in KeyChain (macOS).
3.  **Add the following secrets to your repository**:
    *   `CLAUDE_ACCESS_TOKEN`: Your Claude OAuth access token
    *   `CLAUDE_REFRESH_TOKEN`: Your Claude OAuth refresh token
    *   `CLAUDE_EXPIRES_AT`: The token expiration timestamp
4.  **Create a workflow file** (e.g., `.github/workflows/claude.yml`) with the OAuth configuration:

    ```yaml
    name: Claude PR Assistant

    on:
      issue_comment:
        types: [created]
      pull_request_review_comment:
        types: [created]
      issues:
        types: [opened, assigned]
      pull_request_review:
        types: [submitted]

    jobs:
      claude-code-action:
        if: |
          (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
          (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
          (github.event_name == 'pull_request_review' && contains(github.event.review.body, '@claude')) ||
          (github.event_name == 'issues' && contains(github.event.issue.body, '@claude'))
        runs-on: ubuntu-latest
        permissions:
          contents: read
          pull-requests: read
          issues: read
          id-token: write
        steps:
          - name: Checkout repository
            uses: actions/checkout@v4
            with:
              fetch-depth: 1

          - name: Run Claude PR Action
            uses: grll/claude-code-action@beta
            with:
              use_oauth: true
              claude_access_token: ${{ secrets.CLAUDE_ACCESS_TOKEN }}
              claude_refresh_token: ${{ secrets.CLAUDE_REFRESH_TOKEN }}
              claude_expires_at: ${{ secrets.CLAUDE_EXPIRES_AT }}

              timeout_minutes: "60"
              # Optional: add custom trigger phrase (default: @claude)
              # trigger_phrase: "/claude"
              # Optional: add assignee trigger for issues
              # assignee_trigger: "claude"
              # Optional: add custom environment variables (YAML format)
              # claude_env: |
              #   NODE_ENV: test
              #   DEBUG: true
              #   API_URL: https://api.example.com
              # Optional: limit the number of conversation turns
              # max_turns: "5"
    ```

## License

**Strict Non-Commercial Use License**

This code is strictly for personal and educational purposes only. Commercial use, including but not limited to selling, distributing, or incorporating this code into commercial products, is explicitly prohibited.

---

**Note:** This project is for educational and personal use. Please respect the terms of service of the Pollinations AI API and any included resources.