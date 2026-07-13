import { create } from 'zustand';

export interface QuoteBuilderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  articleNumber: string | null;
}

interface QuoteBuilderState {
  // Customer (inline)
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  contactPerson: string;

  // Quote details
  quoteDate: string;
  quoteNumber: string;
  refNumber: string;
  refDate: string;

  // Tax
  cgst: number;
  sgst: number;
  igst: number;

  // Items
  items: QuoteBuilderItem[];
  discount: number;

  // Actions
  setCustomerName: (name: string) => void;
  setCustomerEmail: (email: string) => void;
  setCustomerPhone: (phone: string) => void;
  setCustomerAddress: (address: string) => void;
  setContactPerson: (person: string) => void;
  setQuoteDate: (date: string) => void;
  setQuoteNumber: (num: string) => void;
  setRefNumber: (ref: string) => void;
  setRefDate: (date: string) => void;
  setCgst: (val: number) => void;
  setSgst: (val: number) => void;
  setIgst: (val: number) => void;
  addItem: (item: QuoteBuilderItem) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  updateItemDiscount: (productId: string, discount: number) => void;
  removeItem: (productId: string) => void;
  setDiscount: (discount: number) => void;
  fillCustomer: (customer: { name: string; email?: string | null; phone?: string | null; address?: string | null }) => void;
  reset: () => void;
}

const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const useQuoteBuilder = create<QuoteBuilderState>((set) => ({
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAddress: '',
  contactPerson: '',
  quoteDate: getTodayDate(),
  quoteNumber: '',
  refNumber: '',
  refDate: '',
  cgst: 9,
  sgst: 9,
  igst: 0,
  items: [],
  discount: 0,

  setCustomerName: (name) => set({ customerName: name }),
  setCustomerEmail: (email) => set({ customerEmail: email }),
  setCustomerPhone: (phone) => set({ customerPhone: phone }),
  setCustomerAddress: (address) => set({ customerAddress: address }),
  setContactPerson: (person) => set({ contactPerson: person }),
  setQuoteDate: (date) => set({ quoteDate: date }),
  setQuoteNumber: (num) => set({ quoteNumber: num }),
  setRefNumber: (ref) => set({ refNumber: ref }),
  setRefDate: (date) => set({ refDate: date }),
  setCgst: (val) => set({ cgst: val }),
  setSgst: (val) => set({ sgst: val }),
  setIgst: (val) => set({ igst: val }),
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, item] };
    }),
  updateItemQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      ),
    })),
  updateItemDiscount: (productId, discount) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, discount } : i
      ),
    })),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),
  setDiscount: (discount) => set({ discount }),
  fillCustomer: (customer) => set({
    customerName: customer.name,
    customerEmail: customer.email || '',
    customerPhone: customer.phone || '',
    customerAddress: customer.address || '',
  }),
  reset: () => set({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    contactPerson: '',
    quoteDate: getTodayDate(),
    quoteNumber: '',
    refNumber: '',
    refDate: '',
    cgst: 9,
    sgst: 9,
    igst: 0,
    items: [],
    discount: 0,
  }),
}));
