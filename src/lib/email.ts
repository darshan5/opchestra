import { Resend } from 'resend';

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Opchestra <noreply@opchestra.com>';

export async function sendVerificationEmail(email: string, token: string) {
  const r = getResend();
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;

  if (!r) {
    // eslint-disable-next-line no-console
    console.log(`[DEV] Verification email for ${email}: ${verifyUrl}`);
    return;
  }

  await r.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: 'Verify your email - Opchestra',
    html: `
      <h2>Welcome to Opchestra</h2>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const r = getResend();
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  if (!r) {
    // eslint-disable-next-line no-console
    console.log(`[DEV] Password reset email for ${email}: ${resetUrl}`);
    return;
  }

  await r.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: 'Reset your password - Opchestra',
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
    `,
  });
}

export async function sendInviteEmail(email: string, token: string, workspaceName: string) {
  const r = getResend();
  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite?token=${token}`;

  if (!r) {
    // eslint-disable-next-line no-console
    console.log(`[DEV] Invite email for ${email} to ${workspaceName}: ${inviteUrl}`);
    return;
  }

  await r.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: `You've been invited to ${workspaceName} on Opchestra`,
    html: `
      <h2>You're invited!</h2>
      <p>You've been invited to join <strong>${workspaceName}</strong> on Opchestra.</p>
      <p><a href="${inviteUrl}">Accept Invitation</a></p>
      <p>This invitation expires in 7 days.</p>
    `,
  });
}
