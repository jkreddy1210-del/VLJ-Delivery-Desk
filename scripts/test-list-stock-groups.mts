import "dotenv/config";
import { listStockGroups } from "../src/server/stock-groups.ts";

try {
  const result = await listStockGroups({
    search: "",
    status: "ACTIVE",
    page: 1,
    pageSize: 10,
  });
  console.log("OK total=", result.total, "rows=", result.rows.length);
  console.log(
    result.rows.map((r) => ({
      id: r.id,
      groupName: r.groupName,
      status: r.status,
      parent: r.parentGroup?.groupName ?? null,
    })),
  );
} catch (e) {
  console.error("FAIL", e);
  process.exitCode = 1;
}
