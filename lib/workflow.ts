import { Client as WorkflowClient } from "@upstash/workflow";
import config from "@/lib/config";

interface Props {
  email: string;
  subject: string;
  message: string;
}

export const workflowClient = new WorkflowClient({
  baseUrl: config.env.upstash.qstashUrl,
  token: config.env.upstash.qstashToken,
});

export const sendEmail = async ({ email, subject, message }: Props) => {};
