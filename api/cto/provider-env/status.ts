import { getCtoProviderSecret } from "../../../lib/ctoProviderVault.mjs";
import { ctoProviderEnvMap } from "../../../lib/ctoEnvKeys.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, status: "method_not_allowed" });
  }

  const providers = Object.keys(ctoProviderEnvMap).reduce((acc: Record<string, unknown>, provider) => {
    const resolved = getCtoProviderSecret(provider);
    acc[provider] = {
      resolved: resolved.ok,
      source: resolved.ok ? resolved.source : "",
      alias: resolved.ok ? resolved.alias : "",
      env_name: ctoProviderEnvMap[provider].primary,
      error_message: resolved.ok ? null : resolved.error
    };
    return acc;
  }, {});

  return res.status(200).json({
    ok: true,
    status: "checked",
    providers
  });
}
