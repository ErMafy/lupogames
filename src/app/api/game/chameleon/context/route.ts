import { NextRequest, NextResponse } from 'next/server';
import { getChameleonRoundContextForPlayer } from '@/lib/chameleon';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')?.toUpperCase();
    const playerId = request.nextUrl.searchParams.get('playerId') || '';
    if (!code) {
      return NextResponse.json({ success: false, error: 'Codice mancante' }, { status: 400 });
    }
    const data = await getChameleonRoundContextForPlayer(code, playerId);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Nessun round camaleonte attivo' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Errore';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
