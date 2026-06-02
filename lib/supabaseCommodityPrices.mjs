function missingSchemaColumn(error) {
  const message = String(error?.message || "");
  const match = message.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i);
  return match?.[2] === "commodity_prices" ? match[1] : "";
}

function stripColumn(rows, column) {
  return rows.map((row) => {
    const next = { ...row };
    delete next[column];
    return next;
  });
}

export async function upsertCommodityPriceRows(client, rows, { select = false } = {}) {
  let currentRows = Array.isArray(rows) ? rows : [rows];
  const removedColumns = [];
  let lastError = null;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const query = client
      .from("commodity_prices")
      .upsert(currentRows, { onConflict: "tenant_id,product_key" });
    const result = select ? await query.select("*") : await query;

    if (!result.error) {
      return { ...result, removedColumns, attemptedRows: currentRows };
    }

    lastError = result.error;
    const missing = missingSchemaColumn(result.error);
    if (!missing || removedColumns.includes(missing) || !currentRows.some((row) => Object.prototype.hasOwnProperty.call(row, missing))) {
      return { ...result, removedColumns, attemptedRows: currentRows };
    }

    removedColumns.push(missing);
    currentRows = stripColumn(currentRows, missing);
  }

  return {
    data: null,
    error: lastError || new Error("commodity_prices upsert failed after schema fallback attempts"),
    removedColumns,
    attemptedRows: currentRows,
  };
}
