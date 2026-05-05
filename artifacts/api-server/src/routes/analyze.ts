import { Router, type IRouter } from "express";
import { analyzeCode } from "../interpreter";
import { compareOutputs } from "../diffEngine";
import { detectConcepts } from "../conceptDetector";
import { parse } from "@babel/parser";

const router: IRouter = Router();

/**
 * POST /api/analyze
 *
 * Body: { code: string, predictedOutput?: string[] }
 *
 * Response (no prediction):
 *   { steps, actualOutput, queues }
 *
 * Response (with prediction):
 *   { steps, actualOutput, queues, predictedOutput, isCorrect, diff, concepts }
 */
router.post("/analyze", (req, res) => {
  const { code, predictedOutput } = req.body as {
    code?: string;
    predictedOutput?: string[];
  };

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Request body must include a 'code' string field." });
    return;
  }

  if (code.trim().length === 0) {
    res.status(400).json({ error: "Code must not be empty." });
    return;
  }

  try {
    const result = analyzeCode(code);

    if (!predictedOutput || !Array.isArray(predictedOutput)) {
      res.json(result);
      return;
    }

    // Comparison mode
    const { isCorrect, diff } = compareOutputs(result.actualOutput, predictedOutput);

    let concepts: string[] = [];
    try {
      const ast = parse(code, { sourceType: "script" });
      concepts = detectConcepts(ast);
    } catch {
      concepts = [];
    }

    res.json({
      ...result,
      predictedOutput,
      isCorrect,
      diff,
      concepts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

export default router;
