import { describe, it, expect } from 'vitest';
import { default as cronParser } from 'cron-parser';

function calculateNextRunAt(cronExpression: string): Date {
  // @ts-ignore: cron-parser ESM types are problematic in Vitest/Next builds
  const interval = cronParser.parseExpression(cronExpression, { utc: true });
  return interval.next().toDate();
}

describe('Scheduler Cron Calculation', () => {
  it('should calculate the next run for a daily cron correctly', () => {
    // "0 6 * * *" = every day at 6 AM
    const cron = '0 6 * * *';
    const nextRun = calculateNextRunAt(cron);
    
    // It should be exactly 6 AM UTC
    expect(nextRun.getUTCHours()).toBe(6);
    expect(nextRun.getUTCMinutes()).toBe(0);
    
    // It should be in the future
    expect(nextRun.getTime()).toBeGreaterThan(Date.now());
  });

  it('should compute every minute properly', () => {
    // "* * * * *" = every minute
    const cron = '* * * * *';
    const nextRun = calculateNextRunAt(cron);
    
    const diffSeconds = (nextRun.getTime() - Date.now()) / 1000;
    // Should be at most 60 seconds from now
    expect(diffSeconds).toBeLessThanOrEqual(60);
    expect(diffSeconds).toBeGreaterThan(0);
  });
});
