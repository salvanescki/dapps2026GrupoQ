/**
 * Parser ligero y determinista de texto Prometheus en TypeScript puro
 */

export interface PrometheusSample {
  name: string;
  labels: Record<string, string>;
  value: number;
  help?: string;
  type?: string;
}

export function parsePrometheusText(rawText: string): PrometheusSample[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  const lines = rawText.split('\n');
  const samples: PrometheusSample[] = [];
  const helpMap = new Map<string, string>();
  const typeMap = new Map<string, string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('# HELP ')) {
      const parts = trimmed.substring(7).trim().split(/\s+/);
      const metricName = parts[0];
      const helpText = parts.slice(1).join(' ');
      helpMap.set(metricName, helpText);
      continue;
    }

    if (trimmed.startsWith('# TYPE ')) {
      const parts = trimmed.substring(7).trim().split(/\s+/);
      const metricName = parts[0];
      const typeText = parts[1];
      typeMap.set(metricName, typeText);
      continue;
    }

    if (trimmed.startsWith('#')) {
      continue;
    }

    // Line sample format: metric_name{label1="val1",...} 123.45
    // or: metric_name 123.45
    const match = trimmed.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+([^\s]+)(?:\s+[0-9]+)?$/);
    if (!match) {
      continue;
    }

    const [, metricName, labelString, valueString] = match;
    const value = Number.parseFloat(valueString);
    if (Number.isNaN(value)) {
      continue;
    }

    const labels: Record<string, string> = {};
    if (labelString) {
      // Parse key="value" pairs handling commas inside quotes if any
      const labelRegex = /([a-zA-Z_0-9]+)="([^"]*)"/g;
      let labelMatch;
      while ((labelMatch = labelRegex.exec(labelString)) !== null) {
        labels[labelMatch[1]] = labelMatch[2];
      }
    }

    // Base name without _bucket, _sum, _count for HELP/TYPE lookup
    const baseName = metricName.replace(/(_bucket|_sum|_count)$/, '');
    const help = helpMap.get(metricName) || helpMap.get(baseName);
    const type = typeMap.get(metricName) || typeMap.get(baseName);

    samples.push({
      name: metricName,
      labels,
      value,
      help,
      type,
    });
  }

  return samples;
}

export type LabelMatcher =
  | Record<string, string | string[]>
  | ((labels: Record<string, string>) => boolean);

export function matchLabels(
  sampleLabels: Record<string, string>,
  matcher?: LabelMatcher
): boolean {
  if (!matcher) return true;
  if (typeof matcher === 'function') {
    return matcher(sampleLabels);
  }
  return Object.entries(matcher).every(([key, allowedVals]) => {
    const sampleVal = sampleLabels[key];
    if (Array.isArray(allowedVals)) {
      return allowedVals.includes(sampleVal);
    }
    return sampleVal === allowedVals;
  });
}

export function extractSingleMetricValue(
  samples: PrometheusSample[],
  metricNameOrNames: string | string[],
  matchingLabels?: LabelMatcher,
  defaultValue = 0
): number {
  const names = Array.isArray(metricNameOrNames) ? metricNameOrNames : [metricNameOrNames];
  const match = samples.find(
    (sample) => names.includes(sample.name) && matchLabels(sample.labels, matchingLabels)
  );

  return match !== undefined ? match.value : defaultValue;
}

export function sumMetricValues(
  samples: PrometheusSample[],
  metricNameOrNames: string | string[],
  matchingLabels?: LabelMatcher
): number {
  const names = Array.isArray(metricNameOrNames) ? metricNameOrNames : [metricNameOrNames];
  return samples
    .filter((sample) => names.includes(sample.name) && matchLabels(sample.labels, matchingLabels))
    .reduce((acc, curr) => acc + curr.value, 0);
}
