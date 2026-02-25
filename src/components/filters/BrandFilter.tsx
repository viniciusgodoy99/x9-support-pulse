import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface BrandFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function BrandFilter({ value, onChange, className }: BrandFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className || "w-full sm:w-[160px]"}>
        <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
        <SelectValue placeholder="Marca" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas as Marcas</SelectItem>
        <SelectItem value="arttico">Arttico</SelectItem>
        <SelectItem value="tastto">Tastto</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function filterByBrand<T extends { group_name?: string; name?: string }>(
  items: T[],
  brand: string,
): T[] {
  if (brand === "all") return items;
  return items.filter((item) => {
    const name = (item.group_name || item.name || "").toLowerCase();
    return name.includes(brand);
  });
}
