// app/api/complete/send-email/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import sgMail from '@sendgrid/mail';

// Set SendGrid API Key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY is not set. Email sending will be disabled.');
}

const createEmailTemplate = (videoUrl: string, surveyData: any) => {
  const projectName = surveyData?.projectName || 'our project';
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Your Feedback!</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #ddd; }
        .content { padding: 20px 0; }
        .footer { text-align: center; font-size: 0.9em; color: #777; padding-top: 20px; border-top: 1px solid #ddd; }
        .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .button:hover { background-color: #0056b3; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Thank You for Your Feedback!</h2>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Thank you so much for taking the time to complete our survey and record a video testimonial for ${projectName}. Your feedback is incredibly valuable to us.</p>
          <p>You can view the video you created at the link below:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${videoUrl}" class="button">Watch Your Video</a>
          </p>
          <p>We appreciate your contribution and hope you had a great experience.</p>
          <p>Best regards,<br>The Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Endorser Survey. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export async function POST(request: Request) {
  const { email, token } = await request.json();

  if (!process.env.SENDGRID_API_KEY) {
    console.error('SendGrid API key is not configured.');
    return NextResponse.json({ success: false, message: 'Email service is not configured.' }, { status: 500 });
  }

  if (!email || !token) {
    return NextResponse.json({ success: false, message: 'Email and token are required.' }, { status: 400 });
  }

  try {
    // Fetch session data to get video URL and survey details
    const { data: sessionData, error: sessionError } = await supabase
      .from('endorser_survey_sessions')
      .select('final_video_url, survey')
      .eq('session_id', token)
      .single();

    if (sessionError || !sessionData) {
      throw new Error(sessionError?.message || 'Failed to fetch session data.');
    }

    const { final_video_url, survey } = sessionData;

    if (!final_video_url) {
      return NextResponse.json({ success: false, message: 'Video not found for this session.' }, { status: 404 });
    }

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL, // CHANGE THIS to your verified sender
      subject: `Thank You for Your Feedback on ${survey?.projectName || 'Our Project'}`,
      html: createEmailTemplate(final_video_url, survey),
    };

    await sgMail.send(msg);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error sending email:', error.response?.body || error.message);
    return NextResponse.json({ success: false, message: 'An error occurred while sending the email.' }, { status: 500 });
  }
}