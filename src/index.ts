import "reflect-metadata";
import 'dotenv/config';
import { DaemoBuilder, DaemoHostedConnection } from 'daemo-engine';
import { GmailService } from './services/MyFunctions';

async function main() {
  // Check for required environment variables
  const requiredEnvVars = [
    'DAEMO_AGENT_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(`❌ Error: Missing required environment variables: ${missingVars.join(', ')}`);
    console.error(`Please check your .env file.`);
    process.exit(1);
  }

  const gmailService = new GmailService(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REFRESH_TOKEN!
  );

  const sessionData = new DaemoBuilder()
    .withServiceName("GmailAssistant")
    .registerService(gmailService)
    .build();

  const connection = new DaemoHostedConnection(
    { 
      agentApiKey: process.env.DAEMO_AGENT_API_KEY!, 
      daemoGatewayUrl: "https://engine.daemo.ai:50052/"
    },
    sessionData
  );

  await connection.start();
  console.log("🚀 Gmail Assistant Agent online!");
  console.log("📧 Ready to draft replies, summarize threads, and categorize emails.");
}

main().catch(console.error);

