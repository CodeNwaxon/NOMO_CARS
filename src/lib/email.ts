import { Resend } from "resend";

// Initialize Resend with the API key from environment variables
// It will throw a warning if the key is missing but we'll use a placeholder for now
const resendApiKey = process.env.RESEND_API_KEY || "re_123456789";
const resend = new Resend(resendApiKey);

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const data = await resend.emails.send({
      from: "Nomo Cars <noreply@nomocars.com>",
      to: [to],
      subject: subject,
      html: html,
    });
    console.log("Email sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
};
