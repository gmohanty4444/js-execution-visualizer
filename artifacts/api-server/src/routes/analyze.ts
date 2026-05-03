import { Router, type IRouter } from "express";
import { analyzeCode } from "../interpreter";

const router: IRouter = Router();

/**
 * POST /api/analyze
 *
 * Body: { code: string }
 * Response: { steps: string[] }
 *
 * Runs the execution simulator against the submitted JS code and returns
 * an ordered list of step descriptions.
 */
router.post("/analyze", (req, res) => {
  const { code } = req.body as { code?: string };

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Request body must include a 'code' string field." });
    return;
  }

  if (code.trim().length === 0) {
    res.status(400).json({ error: "Code must not be empty." });
    return;
  }

  try {
    const steps = analyzeCode(code);
    res.json({ steps });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

export default router;
