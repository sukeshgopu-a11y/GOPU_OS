import { getVercelStatus } from "../../../lib/vercelStatus.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({
      id: "vercel",
      service_name: "Vercel",
      status: "error",
      message: "Method not allowed"
    });
    return;
  }

  const status = await getVercelStatus();
  res.status(200).json(status);
}
