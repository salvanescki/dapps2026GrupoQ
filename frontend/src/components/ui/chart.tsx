import React, { createContext, useContext, useId } from 'react';
import * as RechartsPrimitive from 'recharts';
import '../../styles/chart.css';

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<'light' | 'dark', string> }
  );
};

interface ChartContextProps {
  config: ChartConfig;
}

const ChartContext = createContext<ChartContextProps | null>(null);

export function useChart(): ChartContextProps {
  const context = useContext(ChartContext);
  return context ?? { config: {} };
}

export interface ChartContainerProps extends React.ComponentProps<'div'> {
  config: ChartConfig;
  children: React.ReactElement;
  altura?: number;
}

export const ChartStyle: React.FC<{ id: string; config: ChartConfig }> = ({
  id,
  config,
}) => {
  const entries = Object.entries(config).filter(
    ([, itemConfig]) => Boolean(itemConfig.theme || itemConfig.color),
  );

  if (entries.length === 0) {
    return null;
  }

  const declaracionesCss = entries
    .map(([key, itemConfig]) => {
      const color = itemConfig.theme?.dark ?? itemConfig.theme?.light ?? itemConfig.color;
      return color ? `  --color-${key}: ${color};` : null;
    })
    .filter(Boolean)
    .join('\n');

  const regla = `[data-chart="${id}"] {\n${declaracionesCss}\n}`;

  return <style dangerouslySetInnerHTML={{ __html: regla }} />;
};

export const ChartContainer: React.FC<ChartContainerProps> = ({
  id,
  className = '',
  children,
  config,
  altura = 250,
  style,
  ...rest
}) => {
  const uniqueId = useId();
  const sanitizedId = uniqueId.replace(/:/g, '');
  const chartId = `chart-${id || sanitizedId}`;
  const sinResizeObserver = typeof globalThis.ResizeObserver === 'undefined';

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={`shadcn-chart-container ${className}`.trim()}
        style={{ minHeight: `${altura}px`, ...style }}
        {...rest}
      >
        <ChartStyle id={chartId} config={config} />
        {sinResizeObserver ? (
          React.cloneElement(
            children as React.ReactElement<{ width?: number; height?: number }>,
            {
              width: 640,
              height: altura,
            },
          )
        ) : (
          <RechartsPrimitive.ResponsiveContainer width="100%" height={altura}>
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        )}
      </div>
    </ChartContext.Provider>
  );
};

export const ChartTooltip = RechartsPrimitive.Tooltip;

export interface ChartTooltipItemPayload {
  name?: string | number;
  dataKey?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipContentProps {
  active?: boolean;
  payload?: ChartTooltipItemPayload[];
  label?: string | number;
  sublabel?: React.ReactNode;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  labelFormatter?: (
    label: string | number | undefined,
    payload: ChartTooltipItemPayload[],
  ) => React.ReactNode;
  valueFormatter?: (
    value: number,
    name: string,
    item: ChartTooltipItemPayload,
  ) => React.ReactNode;
  extraFooter?: React.ReactNode;
  renderExtraFooter?: (rawPayload: Record<string, unknown>) => React.ReactNode;
}

export const ChartTooltipContent: React.FC<ChartTooltipContentProps> = ({
  active,
  payload,
  label,
  sublabel,
  hideLabel = false,
  hideIndicator = false,
  labelFormatter,
  valueFormatter,
  extraFooter,
  renderExtraFooter,
}) => {
  const { config } = useChart();

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const rawRecord = (payload[0]?.payload ?? {}) as Record<string, unknown>;
  const labelRenderizado = labelFormatter ? labelFormatter(label, payload) : label;
  const footerDinamico = renderExtraFooter ? renderExtraFooter(rawRecord) : extraFooter;

  return (
    <div className="shadcn-chart-tooltip" data-testid="chart-tooltip-box">
      {(!hideLabel || sublabel) && (
        <div className="shadcn-chart-tooltip-header">
          {!hideLabel && labelRenderizado !== undefined && (
            <span className="shadcn-chart-tooltip-label">{labelRenderizado}</span>
          )}
          {sublabel && <span className="shadcn-chart-tooltip-sublabel">{sublabel}</span>}
        </div>
      )}

      <div className="shadcn-chart-tooltip-items">
        {payload.map((item, idx) => {
          const clave = String(item.dataKey ?? item.name ?? idx);
          const itemConfig = config[clave];
          const etiquetaSerie = itemConfig?.label ?? item.name ?? clave;
          const colorIndicador =
            item.color ??
            itemConfig?.color ??
            (itemConfig && 'theme' in itemConfig ? itemConfig.theme?.dark : undefined) ??
            'var(--color-emerald-500)';
          const valorNumerico =
            typeof item.value === 'number' ? item.value : Number(item.value ?? 0);
          const valorFormateado = valueFormatter
            ? valueFormatter(valorNumerico, clave, item)
            : String(item.value ?? '');

          return (
            <div key={clave} className="shadcn-chart-tooltip-row">
              <span className="shadcn-chart-tooltip-name">
                {!hideIndicator && (
                  <span
                    className="shadcn-chart-tooltip-dot"
                    style={
                      {
                        '--tooltip-indicator-color': colorIndicador,
                      } as React.CSSProperties
                    }
                    aria-hidden="true"
                  />
                )}
                <span>{etiquetaSerie}</span>
              </span>
              <span className="shadcn-chart-tooltip-value">{valorFormateado}</span>
            </div>
          );
        })}
      </div>

      {footerDinamico && (
        <div className="shadcn-chart-tooltip-meta">{footerDinamico}</div>
      )}
    </div>
  );
};

