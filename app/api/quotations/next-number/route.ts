import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed (0 = Jan, 3 = Apr)

    // Calculate Financial Year
    // Indian FY runs from April 1 to March 31
    let fyStart, fyEnd;
    if (month < 3) {
      // Jan, Feb, Mar belong to previous year's FY
      fyStart = year - 1;
      fyEnd = year;
    } else {
      // Apr-Dec belong to current year's FY
      fyStart = year;
      fyEnd = year + 1;
    }
    
    const fyString = `${fyStart.toString().slice(-2)}-${fyEnd.toString().slice(-2)}`;
    const prefix = `PT/${fyString}/`;

    // First, try to get it from QuoteSequence table
    const { data: seqData, error: seqError } = await supabase
      .from('QuoteSequence')
      .select('last_value')
      .eq('prefix', prefix)
      .maybeSingle();

    let maxSeq = 0;

    if (seqData) {
      maxSeq = seqData.last_value;
    } else {
      // Fallback: Query all quotes that start with this prefix to initialize
      const { data: quotes, error } = await supabase
        .from('Quote')
        .select('quoteNumber')
        .like('quoteNumber', `${prefix}%`);

      if (!error && quotes && quotes.length > 0) {
        for (const quote of quotes) {
          const parts = quote.quoteNumber.split('/');
          if (parts.length >= 3) {
            const seqStr = parts[2];
            const seq = parseInt(seqStr, 10);
            if (!isNaN(seq) && seq > maxSeq) {
              maxSeq = seq;
            }
          }
        }
      }
    }

    // Fetch starting quote number from Settings
    const { data: settings } = await supabase.from('Settings').select('startingQuoteNumber').eq('id', 'default').maybeSingle();
    const startingNum = settings?.startingQuoteNumber || 1;

    // Use Math.max to ensure we jump to the startingNum if the maxSeq is lower
    let nextSeq = Math.max(maxSeq + 1, startingNum);

    // Format with leading zero if less than 10
    const nextSeqFormatted = nextSeq.toString().padStart(2, '0');
    
    return NextResponse.json({ quoteNumber: `${prefix}${nextSeqFormatted}` });
  } catch (error) {
    console.error('Sequence generation error:', error);
    return NextResponse.json({ error: 'Failed to generate quote number' }, { status: 500 });
  }
}
