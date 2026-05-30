// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";

function env(k: string) {
  return process.env[k]?.trim() || "";
}

function getSupabase() {
  const url =
    env("SUPABASE_URL") ||
    env("NEXT_PUBLIC_SUPABASE_URL") ||
    env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const config = { api: { bodyParser: true } };

export default async function handler(req: any, res: any) {
  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ ok: false, error: "Supabase not configured" });
  }

  // GET — list tasks
  if (req.method === "GET") {
    const { status, agent } = req.query || {};

    let query = supabase
      .from("tasks")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .order("created_at", { ascending: false })
      .limit(50);

    if (status) query = query.eq("status", status);
    if (agent) query = query.eq("assigned_agent", agent);

    const { data, error } = await query.catch(() => ({ data: [], error: null }));

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, tasks: data ?? [] });
  }

  // POST — create task
  if (req.method === "POST") {
    const { title, description, assigned_agent, priority, due_date } =
      req.body || {};

    if (!title) {
      return res.status(400).json({ ok: false, error: "title is required" });
    }

    const { data: task, error: insertError } = await supabase
      .from("tasks")
      .insert({
        tenant_id: TENANT_ID,
        title,
        description: description ?? null,
        assigned_agent: assigned_agent ?? null,
        priority: priority ?? "Medium",
        due_date: due_date ?? null,
        status: "Pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
      .catch(() => ({ data: null, error: { message: "Insert failed" } }));

    if (insertError) {
      return res.status(500).json({ ok: false, error: insertError.message });
    }

    // Log agent decision
    await supabase
      .from("agent_decisions")
      .insert({
        tenant_id: TENANT_ID,
        agent: "COO",
        action: "create_task",
        reference_id: task?.id ?? null,
        notes: `Task created: ${title}`,
        created_at: new Date().toISOString(),
      })
      .catch(() => null);

    return res.status(201).json({ ok: true, task });
  }

  // PUT — update task
  if (req.method === "PUT") {
    const { id, status, notes } = req.body || {};

    if (!id) {
      return res.status(400).json({ ok: false, error: "id is required" });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const { data: task, error: updateError } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", TENANT_ID)
      .select()
      .single()
      .catch(() => ({ data: null, error: { message: "Update failed" } }));

    if (updateError) {
      return res.status(500).json({ ok: false, error: updateError.message });
    }

    return res.status(200).json({ ok: true, task });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
