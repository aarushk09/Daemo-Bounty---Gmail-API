<<<<<<< HEAD
# Daemo-Bounty---Gmail-API
=======
# Daemo-Bounty - Gmail Assistant Agent

Aarush K's submission for the Daemo Bounty (Gmail API).

An AI email assistant that drafts replies, categorizes inboxes, and summarizes threads without exposing raw emails, using the Gmail API and Daemo SDK.

## Project Structure

```
.
├── src/
│   ├── services/
│   │   └── MyFunctions.ts    # Contains Daemo tools/functions (Gmail integration)
│   ├── env.example           # Template for environment variables
│   └── index.ts              # Entry point connecting to Daemo
├── package.json
└── README.md
```

## Daemo Functions

This agent exposes the following tools to the Daemo AI:

1.  **`listUnreadEmails`**:
    *   **Description**: Retrieves a simplified summary of recent unread emails from the inbox.
    *   **Use Case**: Checking what needs attention.

2.  **`getThreadContent`**:
    *   **Description**: Fetches the full content of an email thread, sanitizing HTML to plain text.
    *   **Use Case**: Reading an email to understand context before summarizing or replying.

3.  **`draftReply`**:
    *   **Description**: Creates a draft reply in Gmail (does NOT send automatically).
    *   **Use Case**: Generating a response for the user to review.

4.  **`categorizeThread`**:
    *   **Description**: Applies labels (e.g., "Work", "Personal", "Urgent") to an email thread.
    *   **Use Case**: Organizing the inbox.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory based on the template in `src/env.example`.

```bash
# Copy template to root .env
cp src/env.example .env
```

### 3. Google API Setup (Important)

To use the Gmail API, you need Google Cloud credentials.

1.  **Create a Project** in the [Google Cloud Console](https://console.cloud.google.com/).
2.  **Enable the Gmail API** for your project.
3.  **Configure OAuth Consent Screen**:
    *   User Type: External
    *   Publishing Status: Testing (Add your email as a Test User).
4.  **Create Credentials**:
    *   Create **OAuth Client ID**.
    *   Application Type: **Web application**.
    *   **Authorized redirect URIs**: Add `https://developers.google.com/oauthplayground`.
    *   Copy the **Client ID** and **Client Secret**.
5.  **Get a Refresh Token**:
    *   Go to the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
    *   Click the **Gear icon** (top right) -> Check **"Use your own OAuth credentials"** -> Paste your Client ID and Client Secret.
    *   **CRITICAL STEP**: In the "Input your own scopes" box, paste **ONLY** this URL:
        ```
        https://www.googleapis.com/auth/gmail.modify
        ```
        *(Do NOT select multiple scopes from the list. Just use this one.)*
    *   Click **Authorize APIs** and allow access.
    *   Click **Exchange authorization code for tokens**.
    *   Copy the **Refresh Token**.

### 4. Update .env
Fill in your details in the `.env` file:
```
DAEMO_AGENT_API_KEY=daemo_live_...
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
```

### 5. Run the Agent
```bash
npm start
```

## Common Errors & Solutions

### 1. `Metadata scope does not support 'q' parameter`
*   **Cause**: The OAuth token was generated with the `gmail.metadata` scope, which is too restrictive for searching emails (e.g., `q='is:unread'`).
*   **Solution**: Re-generate your Refresh Token using **only** the `https://www.googleapis.com/auth/gmail.modify` scope. Do not combine it with other scopes.

### 2. `redirect_uri_mismatch` in OAuth Playground
*   **Cause**: The "Authorized redirect URIs" setting in your Google Cloud Console is missing the playground URL.
*   **Solution**: Edit your OAuth Client ID credentials in Google Cloud Console. Ensure **Application Type** is "Web application" and add `https://developers.google.com/oauthplayground` to the **Authorized redirect URIs**.

### 3. `Error: No refresh token is set.`
*   **Cause**: The `.env` file is missing or the `GOOGLE_REFRESH_TOKEN` variable is empty.
*   **Solution**: Ensure your `.env` file exists in the root directory and contains a valid refresh token.

## Privacy & Security

*   **Raw Emails**: The agent is designed to process email content for summarization but avoids displaying raw JSON dumps.
*   **Draft Mode**: Replies are only *drafted*, never sent automatically, giving you full control.
>>>>>>> d6c7123 (done)
