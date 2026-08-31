import { useQuery } from "@tanstack/react-query";
import { getCompanySettingsFn } from "@/routes/api/company-settings";

export function useCompanySettings() {
  return useQuery({
    queryKey: ["company-settings"],
    queryFn: () => getCompanySettingsFn({ data: {} }),
    staleTime: 60_000,
  });
}
