// @types/react-syntax-highlighter only ships typings for the package root —
// the individual language and style modules under dist/esm/* (needed to keep
// the bundle small by registering only the languages/themes we use) have no
// upstream declarations, so they're declared here as loosely-typed modules.

declare module 'react-syntax-highlighter/dist/esm/languages/prism/*' {
  const language: unknown
  export default language
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism/*' {
  import type { CSSProperties } from 'react'
  const style: { [key: string]: CSSProperties }
  export default style
}
