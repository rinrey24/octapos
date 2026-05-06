import type { TopProduct } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  data: TopProduct[];
}

export default function TopProducts({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Top Produk (7 Hari)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <p className="px-6 pb-4 text-sm text-muted-foreground">Belum ada data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-6 py-2 text-left font-medium">Produk</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-6 py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.product_id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-6 py-2.5 font-medium truncate max-w-[160px]">{p.name}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{p.quantity}</td>
                  <td className="px-6 py-2.5 text-right font-mono font-medium">{p.revenueFormatted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
