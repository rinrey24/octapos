import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { Cart } from "@/components/pos/Cart";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { ModifierModal } from "@/components/pos/ModifierModal";
import { CustomerSearchModal } from "@/components/pos/CustomerSearchModal";
import { ParkedCartsModal } from "@/components/pos/ParkedCartsModal";
import { useParkedStore } from "@/stores/parked.store";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth.store";
import { useCartStore } from "@/stores/cart.store";
import { getProducts } from "@/lib/repositories/product.repo";
import { getCategories } from "@/lib/repositories/category.repo";
import { getProductModifiers } from "@/lib/repositories/modifier.repo";
import { saveTransaction, type SplitPaymentEntry } from "@/lib/repositories/transaction.repo";
import { calculateCartTotals } from "@octapos/shared-utils";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import type { Transaction, TransactionItem, ProductWithCategory } from "@octapos/shared-types";

export default function POSPage() {
  const { session } = useAuthStore();
  const { items, discountTotal, clearCart, addItem, subtotal, customerId, setCustomer } = useCartStore();

  const { openModal: openParkedSignal, setOpenModal: clearParkedSignal } = useParkedStore();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);

  // Open parked carts modal when triggered from AppShell "Ditahan" button
  useEffect(() => {
    if (openParkedSignal) {
      setHoldOpen(true);
      clearParkedSignal(false);
    }
  }, [openParkedSignal, clearParkedSignal]);
  const [modifierProduct, setModifierProduct] = useState<ProductWithCategory | null>(null);
  const [receipt, setReceipt] = useState<{
    transaction: Transaction;
    items: TransactionItem[];
  } | null>(null);

  const tenantId = session?.tenant.id ?? "";
  const outletId = session?.outlet.id ?? "";

  const { data: products = [] } = useQuery({
    queryKey: ["products", tenantId],
    queryFn: () => getProducts(tenantId),
    enabled: !!tenantId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", tenantId],
    queryFn: () => getCategories(tenantId),
    enabled: !!tenantId,
  });

  const sub = subtotal();
  const totals = calculateCartTotals(sub, discountTotal, 0);

  async function handleProductTap(p: ProductWithCategory) {
    if (!session) return;
    try {
      const mods = await getProductModifiers(p.id);
      if (mods.length > 0) {
        setModifierProduct(p);
      } else {
        addItem({
          product_id: p.id,
          variant_id: null,
          product_name_snapshot: p.name,
          sku_snapshot: p.sku ?? null,
          price_snapshot: p.price,
          modifiers: [],
        });
      }
    } catch {
      addItem({
        product_id: p.id,
        variant_id: null,
        product_name_snapshot: p.name,
        sku_snapshot: p.sku ?? null,
        price_snapshot: p.price,
        modifiers: [],
      });
    }
  }

  async function handleConfirmPayment(
    method: Transaction["payment_method"],
    paidAmount: number,
    splitPayments?: SplitPaymentEntry[]
  ) {
    if (!session) return;

    try {
      const tx = await saveTransaction({
        tenantId: session.tenant.id,
        outletId: session.outlet.id,
        outletCode: session.outlet.name.slice(0, 4),
        cashierId: session.user.id,
        customerId: customerId ?? null,
        cartItems: items,
        paidAmount,
        paymentMethod: method,
        ...(splitPayments ? { splitPayments } : {}),
        taxRate: 0,
        discountTotal,
        deductStock: true,
      });

      const receiptItems: TransactionItem[] = items.map((item, i) => ({
        id: `item-${i}`,
        transaction_id: tx.id,
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        product_name_snapshot: item.product_name_snapshot,
        sku_snapshot: item.sku_snapshot ?? null,
        price_snapshot: item.price_snapshot,
        quantity: item.quantity,
        discount: item.discount,
        subtotal: item.price_snapshot * item.quantity - item.discount,
        notes: item.notes ?? null,
      }));

      setPaymentOpen(false);
      setReceipt({ transaction: tx, items: receiptItems });
      clearCart();

      toast({ title: "Transaksi berhasil!", description: `Invoice: ${tx.invoice_no}` });
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menyimpan transaksi", description: String(e) });
      throw e;
    }
  }

  return (
    <AppShell>
      <div className="flex h-full">
        {/* Left: Product grid */}
        <div className="flex-1 overflow-hidden border-r">
          <ProductGrid
            products={products}
            categories={categories}
            onProductTap={(p) => { void handleProductTap(p); }}
          />
        </div>

        <Separator orientation="vertical" />

        {/* Right: Cart */}
        <div className="w-[38%] min-w-[320px] overflow-hidden">
          <Cart
            taxRate={0}
            onCheckout={() => setPaymentOpen(true)}
            onCustomerClick={() => setCustomerOpen(true)}
            onHold={() => setHoldOpen(true)}
          />
        </div>
      </div>

      <PaymentModal
        open={paymentOpen}
        total={totals.total}
        onConfirm={handleConfirmPayment}
        onClose={() => setPaymentOpen(false)}
      />

      <CustomerSearchModal
        open={customerOpen}
        currentCustomerId={customerId}
        onSelect={(id, name) => setCustomer(id, name)}
        onClear={() => setCustomer(null, null)}
        onClose={() => setCustomerOpen(false)}
      />

      <ModifierModal
        open={!!modifierProduct}
        product={modifierProduct}
        basePrice={modifierProduct?.price ?? 0}
        onConfirm={(modifiers) => {
          if (!modifierProduct) return;
          addItem({
            product_id: modifierProduct.id,
            variant_id: null,
            product_name_snapshot: modifierProduct.name,
            sku_snapshot: modifierProduct.sku ?? null,
            price_snapshot: modifierProduct.price,
            modifiers,
          });
          setModifierProduct(null);
        }}
        onClose={() => setModifierProduct(null)}
      />

      <ParkedCartsModal open={holdOpen} onClose={() => setHoldOpen(false)} />

      {receipt && (
        <ReceiptModal
          open={!!receipt}
          transaction={receipt.transaction}
          items={receipt.items}
          outletName={session?.outlet.name ?? ""}
          cashierName={session?.user.full_name ?? ""}
          onClose={() => setReceipt(null)}
        />
      )}

      <Toaster />
    </AppShell>
  );
}
