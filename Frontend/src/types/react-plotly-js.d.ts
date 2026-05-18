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
