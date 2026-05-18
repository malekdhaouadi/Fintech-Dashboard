declare module 'react-plotly.js' {
  import { ComponentType } from 'react'

  type PlotProps = {
    data?: unknown[]
    layout?: Record<string, unknown>
    config?: Record<string, unknown>
    style?: Record<string, unknown>
    useResizeHandler?: boolean
    className?: string
  }

  const Plot: ComponentType<PlotProps>
  export default Plot
}

declare module 'react-plotly.js/factory' {
  import { ComponentType } from 'react'

  type PlotlyLike = {
    newPlot: (...args: unknown[]) => unknown
    purge?: (...args: unknown[]) => unknown
    react?: (...args: unknown[]) => unknown
    toImage?: (...args: unknown[]) => unknown
  }

  type PlotProps = {
    data?: unknown[]
    layout?: Record<string, unknown>
    config?: Record<string, unknown>
    style?: Record<string, unknown>
    useResizeHandler?: boolean
    className?: string
  }

  export default function createPlotlyComponent(plotly: PlotlyLike): ComponentType<PlotProps>
}

declare module 'plotly.js' {
  const Plotly: {
    newPlot: (...args: unknown[]) => unknown
    purge: (...args: unknown[]) => unknown
    react: (...args: unknown[]) => unknown
    toImage: (...args: unknown[]) => unknown
  }

  export default Plotly
}
