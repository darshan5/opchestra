import cron from 'node-cron';

let scheduled = false;

export function startCronJobs() {
  if (scheduled) return;
  scheduled = true;

  // Process task reminders every hour at :00
  cron.schedule('0 * * * *', async () => {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/cron/reminders`, { method: 'POST' });
    } catch {
      // ignore fetch errors
    }
  });
}
