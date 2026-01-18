import { DaemoFunction } from 'daemo-engine';
import { z } from 'zod';
import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import "reflect-metadata";

export class GmailService {
  private gmail: gmail_v1.Gmail;
  private auth: OAuth2Client;

  constructor(clientId: string, clientSecret: string, refreshToken: string) {
    this.auth = new google.auth.OAuth2(clientId, clientSecret);
    this.auth.setCredentials({ refresh_token: refreshToken });
    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
  }

  private getHeader(headers: any[], name: string): string {
    const header = headers.find(h => h.name === name);
    return header ? header.value : '';
  }

  @DaemoFunction({
    description: "List recent unread emails from the inbox to see what needs attention. Returns a simplified summary of emails.",
    inputSchema: z.object({
      limit: z.number().optional().describe("Number of emails to retrieve (default 10, max 20)")
    }) as any,
    outputSchema: z.object({
      emails: z.array(z.object({
        id: z.string(),
        threadId: z.string(),
        subject: z.string(),
        from: z.string(),
        snippet: z.string().describe("Short preview of the email content"),
        date: z.string()
      }))
    }) as any
  })
  async listUnreadEmails(args: { limit?: number }) {
    try {
      const limit = Math.min(args.limit || 10, 20);
      const res = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: limit
      });

      const messages = res.data.messages || [];
      const emailSummaries = [];

      for (const msg of messages) {
        if (!msg.id) continue;
        const details = await this.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        });

        const headers = details.data.payload?.headers || [];
        emailSummaries.push({
          id: msg.id,
          threadId: msg.threadId!,
          subject: this.getHeader(headers, 'Subject') || '(No Subject)',
          from: this.getHeader(headers, 'From') || 'Unknown',
          snippet: details.data.snippet || '',
          date: this.getHeader(headers, 'Date') || ''
        });
      }

      return { emails: emailSummaries };
    } catch (error: any) {
      console.error("Error listing emails:", error);
      return { emails: [] };
    }
  }

  @DaemoFunction({
    description: "Get the full content of an email thread to understand the context and summarize it. Sanitizes HTML.",
    inputSchema: z.object({
      threadId: z.string().describe("The ID of the thread to retrieve")
    }) as any,
    outputSchema: z.object({
      messages: z.array(z.object({
        from: z.string(),
        body: z.string().describe("The text content of the email"),
        date: z.string()
      }))
    }) as any
  })
  async getThreadContent(args: { threadId: string }) {
    try {
      const res = await this.gmail.users.threads.get({
        userId: 'me',
        id: args.threadId
      });

      const messages = res.data.messages || [];
      const threadContent = messages.map((msg: gmail_v1.Schema$Message) => {
        const headers = msg.payload?.headers || [];
        let body = msg.snippet || ''; // Fallback to snippet if body parsing fails
        
        // Simple body extraction (preferring plain text)
        if (msg.payload?.body?.data) {
          body = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
        } else if (msg.payload?.parts) {
          const textPart = msg.payload.parts.find((p: gmail_v1.Schema$MessagePart) => p.mimeType === 'text/plain');
          if (textPart && textPart.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        }

        return {
          from: this.getHeader(headers, 'From'),
          body: body.substring(0, 2000), // Truncate for safety/token limits
          date: this.getHeader(headers, 'Date')
        };
      });

      return { messages: threadContent };
    } catch (error) {
      console.error("Error getting thread:", error);
      return { messages: [] };
    }
  }

  @DaemoFunction({
    description: "Draft a reply to a specific email thread. Does NOT send the email, only creates a draft.",
    inputSchema: z.object({
      threadId: z.string().describe("The ID of the thread to reply to"),
      messageId: z.string().optional().describe("The ID of the specific message being replied to (optional, defaults to last in thread)"),
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Subject of the reply"),
      body: z.string().describe("The content of the reply")
    }) as any,
    outputSchema: z.object({
      draftId: z.string().optional(),
      success: z.boolean()
    }) as any
  })
  async draftReply(args: { threadId: string, messageId?: string, to: string, subject: string, body: string }) {
    try {
      // Construct a simple RFC 822 email message
      const emailLines = [
        `To: ${args.to}`,
        `Subject: ${args.subject}`,
        `In-Reply-To: ${args.messageId || ''}`,
        `References: ${args.messageId || ''}`,
        '',
        args.body
      ];
      const email = emailLines.join('\r\n');
      const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const res = await this.gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedEmail,
            threadId: args.threadId
          }
        }
      });

      return { draftId: res.data.id || undefined, success: true };
    } catch (error) {
      console.error("Error drafting reply:", error);
      return { success: false };
    }
  }

  @DaemoFunction({
    description: "Categorize an email thread by adding a label (e.g., 'Work', 'Personal', 'Urgent').",
    inputSchema: z.object({
      threadId: z.string().describe("The ID of the thread to categorize"),
      labelName: z.string().describe("The name of the label to add (must ensure it exists or use standard ones like STARRED, IMPORTANT)")
    }) as any,
    outputSchema: z.object({
      success: z.boolean()
    }) as any
  })
  async categorizeThread(args: { threadId: string, labelName: string }) {
    try {
      // First, we need to find the ID of the labelName. 
      // For simplicity, we'll try to use it directly if it's a system label (UNREAD, STARRED, IMPORTANT, TRASH, SPAM)
      // or fetch the list for custom labels.
      
      let labelId = args.labelName;
      
      // Basic check for system labels which don't need lookup if passed correctly
      const systemLabels = ['INBOX', 'SPAM', 'TRASH', 'UNREAD', 'STARRED', 'IMPORTANT'];
      if (!systemLabels.includes(args.labelName.toUpperCase())) {
         const labelsRes = await this.gmail.users.labels.list({ userId: 'me' });
         const label = labelsRes.data.labels?.find((l: gmail_v1.Schema$Label) => l.name?.toLowerCase() === args.labelName.toLowerCase());
         if (label && label.id) {
             labelId = label.id;
         } else {
             console.log(`Label ${args.labelName} not found.`);
             // Optionally create it? For now, just fail or log.
             return { success: false };
         }
      } else {
          labelId = args.labelName.toUpperCase();
      }

      await this.gmail.users.threads.modify({
        userId: 'me',
        id: args.threadId,
        requestBody: {
          addLabelIds: [labelId]
        }
      });

      return { success: true };
    } catch (error) {
      console.error("Error categorizing thread:", error);
      return { success: false };
    }
  }
}

