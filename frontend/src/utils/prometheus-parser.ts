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

function procesarLineaComentario(
  trimmed: string,
  helpMap: Map<string, string>,
  typeMap: Map<string, string>
): void {
  if (trimmed.startsWith('# HELP ')) {
    const parts = trimmed.substring(7).trim().split(/\s+/);
    helpMap.set(parts[0], parts.slice(1).join(' '));
    return;
  }

  if (trimmed.startsWith('# TYPE ')) {
    const parts = trimmed.substring(7).trim().split(/\s+/);
    typeMap.set(parts[0], parts[1]);
  }
}

const REGEX_CLAVE_LABEL_PROMETHEUS = /^\w+$/;

export function parsearLabelsPrometheus(labelString: string): Record<string, string> {
  const labels: Record<string, string> = {};
  let pos = 0;

  while (pos < labelString.length) {
    const eqQuoteIdx = labelString.indexOf('="', pos);
    if (eqQuoteIdx === -1) {
      break;
    }

    const valueStart = eqQuoteIdx + 2;
    const valueEnd = labelString.indexOf('"', valueStart);
    if (valueEnd === -1) {
      break;
    }

    const rawKey = labelString.slice(pos, eqQuoteIdx).trim();
    const commaIdx = rawKey.lastIndexOf(',');
    const key = (commaIdx === -1 ? rawKey : rawKey.slice(commaIdx + 1)).trim();

    if (REGEX_CLAVE_LABEL_PROMETHEUS.test(key)) {
      labels[key] = labelString.slice(valueStart, valueEnd);
    }

    pos = valueEnd + 1;
  }

  return labels;
}

const REGEX_LINEA_MUESTRA = /^([a-zA-Z_:][\w:]*)(?:\{([^}]*)\})?\s+(\S+)(?:\s+\d+)?$/;

function parsearLineaMuestra(
  trimmed: string,
  helpMap: Map<string, string>,
  typeMap: Map<string, string>
): PrometheusSample | null {
  // Line sample format: metric_name{label1="val1",...} 123.45
  // or: metric_name 123.45
  const match = REGEX_LINEA_MUESTRA.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, metricName, labelString, valueString] = match;
  const value = Number.parseFloat(valueString);
  if (Number.isNaN(value)) {
    return null;
  }

  const labels = labelString ? parsearLabelsPrometheus(labelString) : {};

  // Base name without _bucket, _sum, _count for HELP/TYPE lookup
  const baseName = metricName.replace(/(_bucket|_sum|_count)$/, '');
  const help = helpMap.get(metricName) || helpMap.get(baseName);
  const type = typeMap.get(metricName) || typeMap.get(baseName);

  return {
    name: metricName,
    labels,
    value,
    help,
    type,
  };
}

export function parsePrometheusText(rawText: string): PrometheusSample[] {
  if (!rawText?.trim()) {
    return [];
  }

  const lines = rawText.split('\n');
  const samples: PrometheusSample[] = [];
  const helpMap = new Map<string, string>();
  const typeMap = new Map<string, string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#')) {
      procesarLineaComentario(trimmed, helpMap, typeMap);
      continue;
    }

    const sample = parsearLineaMuestra(trimmed, helpMap, typeMap);
    if (sample) {
      samples.push(sample);
    }
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
