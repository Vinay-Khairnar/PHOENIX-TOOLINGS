import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_SETTINGS = {
  id: 'default',
  companyName: 'Phoenix Toolings',
  address: 'A-51, MIDC Waluj, Aurangabad-431 136. (Maharashtra), India.',
  email: 'gbs@phoenixtoolings.com',
  phone: '+91 9890448625',
  gstNumber: '27AFWPG3321F1ZH',
  bankName: 'ICICI BANK',
  accountNumber: '145405004957',
  ifscCode: 'ICIC0001454',
  termsAndConditions: '',
};

export async function GET() {
  try {
    const { data: settings } = await supabase
      .from('Settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
      
    return NextResponse.json(settings || DEFAULT_SETTINGS);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { data: settings, error } = await supabase.from('Settings').upsert({
      id: 'default',
      companyName: data.companyName || DEFAULT_SETTINGS.companyName,
      address: data.address || DEFAULT_SETTINGS.address,
      email: data.email || DEFAULT_SETTINGS.email,
      phone: data.phone || DEFAULT_SETTINGS.phone,
      gstNumber: data.gstNumber || DEFAULT_SETTINGS.gstNumber,
      bankName: data.bankName || DEFAULT_SETTINGS.bankName,
      accountNumber: data.accountNumber || DEFAULT_SETTINGS.accountNumber,
      ifscCode: data.ifscCode || DEFAULT_SETTINGS.ifscCode,
      termsAndConditions: data.termsAndConditions || DEFAULT_SETTINGS.termsAndConditions,
    }, { onConflict: 'id' }).select().single();
    
    if (error) throw error;
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
