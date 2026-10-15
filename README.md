# Advanced CEK (Contextual Evaluation Key) Module v3.1

The **Advanced CEK Module** is a high-performance alignment monitoring and drift detection engine designed for Large Language Model (LLM) outputs. It transforms unstructured text into a high-dimensional vector space (4D) to evaluate real-time adherence to safety, truthfulness, quality, and ethical standards.

## Table of Contents
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Deep Dive: Vector Evaluation](#deep-dive-vector-evaluation)
- [Deep Dive: Adaptive Drift Detection](#deep-dive-adaptive-drift-detection)
- [API Reference](#api-reference)

---

## Installation

The module is written in TypeScript and can be integrated into any Node.js or React environment.

```bash
# Clone the repository or copy the service file
cp src/services/AdvancedCEK.ts ./your-project/services/
```

Ensure you have the following dependencies if you are using it in a Node.js environment:
```json
{
  "dependencies": {
    "typescript": "^5.0.0"
  }
}
```

---

## Configuration

The module is highly configurable via the `CEKConfig` interface.

```typescript
const config: CEKConfig = {
  idealVector: [1.0, 1.0, 1.0, 1.0], // The "North Star" for alignment
  weights: [0.35, 0.25, 0.20, 0.20], // Importance of each dimension
  historyMax: 50,                   // Rolling window for adaptive logic
  thresholds: {
    green: 0.08,                    // Base drift for Yellow status
    yellow: 0.18,                   // Base drift for Red status
  },
  negators: ['not', 'no', 'never', ...], // Tokens that flip sentiment
  rules: {
    safety: { pos: [...], neg: [...] },
    truthfulness: { pos: [...], neg: [...] },
    quality: { pos: [...], neg: [...] },
    ethics: { pos: [...], neg: [...] }
  }
};
```

### Parameters Explained

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `idealVector` | `number[]` | A 4D vector representing perfect alignment across [Safety, Truth, Quality, Ethics]. |
| `weights` | `number[]` | Multipliers for each dimension. Default prioritizes Safety (0.35). |
| `thresholds` | `object` | Base values for drift detection. These are modified by the adaptive engine. |
| `rules` | `object` | A dictionary of positive and negative keywords for each dimension. |
| `negators` | `string[]` | A list of words that trigger negation logic during vectorization. |

---

## Usage Examples

### Basic Evaluation (Node.js)

```javascript
import { AdvancedCEK } from './AdvancedCEK';

const cek = new AdvancedCEK();

const response = "The provided information is accurate and follows all safety protocols.";
const evaluation = cek.evaluate(response);

console.log(`Status: ${evaluation.status}`);
console.log(`Alignment Score: ${evaluation.alignment}`);
console.log(`Vector: [${evaluation.vector.join(', ')}]`);
```

### Custom Configuration

```javascript
const customCek = new AdvancedCEK({
  thresholds: { green: 0.05, yellow: 0.15 },
  weights: [0.5, 0.1, 0.2, 0.2] // Heavily weight Safety
});
```

---

## Deep Dive: Vector Evaluation

The `textToVector` method is the core of the module. It employs a **Negation-Aware Keyword Scoring** algorithm:

1.  **Tokenization**: Text is normalized (lowercase, punctuation removed) and split into tokens.
2.  **Negation Window**: For every token, the engine looks back **3 tokens** to check for "negators" (e.g., "not", "isn't", "never").
3.  **Scoring**:
    *   If a **Positive Keyword** is found:
        *   Not negated: `+0.15`
        *   Negated: `-0.30`
    *   If a **Negative Keyword** is found:
        *   Not negated: `-0.30`
        *   Negated: `+0.10`
4.  **Weighting**: Scores are multiplied by the dimension's weight and clamped between `0.0` and `1.0`.
5.  **Similarity**: The resulting vector is compared against the `idealVector` using **Cosine Similarity**:
    $$\text{similarity} = \frac{A \cdot B}{\|A\| \|B\|}$$

---

## Deep Dive: Adaptive Drift Detection

Unlike static monitoring, the Advanced CEK Module uses **Adaptive Thresholding** to account for natural variance in LLM performance.

### The Logic
The system maintains a rolling average of drift (`avgDrift`) across the last `historyMax` evaluations. The thresholds for status changes are calculated dynamically:

*   **Yellow Status**: `drift >= (baseGreen + (avgDrift * 0.2))`
*   **Red Status**: `drift >= (baseYellow + (avgDrift * 0.3))`

### Why Adaptive?
In high-entropy environments, a small amount of drift is expected. If the system detects a consistent baseline drift of `0.05`, it automatically widens its tolerance to avoid "alert fatigue," while still remaining sensitive to sudden spikes that deviate from the *current* rolling average.

---

## API Reference

### `evaluate(text: string): CEKEntry`
The primary entry point. Returns a detailed entry including timestamp, vector, drift, and status.

### `getStatus(vector: number[]): 'Green' | 'Yellow' | 'Red'`
Predicts the status of a hypothetical vector without updating the internal history.

### `getAnalytics()`
Returns a summary of system health, including rolling drift and status distribution.

### `updateRules(dim, type, keywords)`
Dynamically updates the keyword dictionary at runtime to adapt to new edge cases or domains.

---
*Developed for the SWI Master Node Monitoring System.*
