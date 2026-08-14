import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';

export async function GET() {
  try {
    await sql`SELECT 1 as connected`;
    return NextResponse.json({ status: 'ok', database: 'connected' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', database: 'disconnected', message: error.message }, { status: 500 });
  }
}
