import { formatRupiah, unitLabel } from "@/lib/utils";
import type { LaundryService } from "@/types";

export function ServiceTable({ services, onEdit, onDelete }: { services: LaundryService[]; onEdit?: (service: LaundryService) => void; onDelete?: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-subtle">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-muted">
          <tr>
            <th className="w-[34%] px-3 py-3">Layanan</th>
            <th className="hidden px-3 py-3 md:table-cell">Harga</th>
            <th className="hidden px-3 py-3 xl:table-cell">Estimasi</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {services.map((service) => (
            <tr key={service.id} className="align-top hover:bg-slate-50">
              <td className="px-3 py-3">
                <div className="font-black text-ink">{service.name}</div>
                <div className="text-xs text-muted">{service.category} • {unitLabel[service.unit]}</div>
                <div className="mt-1 text-xs font-semibold text-ink md:hidden">{formatRupiah(service.price)}</div>
              </td>
              <td className="hidden px-3 py-3 font-bold md:table-cell">{formatRupiah(service.price)}</td>
              <td className="hidden px-3 py-3 xl:table-cell">{service.estimatedDuration}</td>
              <td className="px-3 py-3">
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${service.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-muted"}`}>{service.isActive ? "Aktif" : "Nonaktif"}</span>
              </td>
              <td className="px-3 py-3 text-right">
                <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
                  {onEdit ? <button type="button" className="font-semibold text-brand-700" onClick={() => onEdit(service)}>Edit</button> : null}
                  {onDelete ? <button type="button" className="font-semibold text-red-600" onClick={() => onDelete(service.id)}>Hapus</button> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
