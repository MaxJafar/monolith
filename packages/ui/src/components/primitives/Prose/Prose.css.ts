import { type GlobalStyleRule, globalStyle, style } from '@vanilla-extract/css'

import { COLORS, vars } from '@/system'

export const root = style({
  fontSize: vars.fontSize.base,
  lineHeight: 1.65,
  overflowWrap: 'anywhere',
  userSelect: 'text',
  color: 'var(--monolith-prose-ink)',
  vars: {
    '--monolith-prose-ink': COLORS['bg-600'],
    '--monolith-prose-heading': COLORS['bg-800'],
    '--monolith-prose-muted': COLORS['bg-500'],
    '--monolith-prose-line': COLORS['bg-300'],
    '--monolith-prose-panel': COLORS['bg-100']
  },
  selectors: {
    '.dark &': {
      vars: {
        '--monolith-prose-ink': COLORS['bg-300'],
        '--monolith-prose-heading': COLORS['bg-50'],
        '--monolith-prose-muted': COLORS['bg-400'],
        '--monolith-prose-line': COLORS['bg-700'],
        '--monolith-prose-panel': COLORS['bg-900']
      }
    }
  }
})
const rule = (selector: string, declaration: GlobalStyleRule) =>
  globalStyle(root + ' ' + selector, declaration)

rule(':where(p, ul, ol, dl, pre, blockquote, figure, table)', {
  marginBlock: '0.9em'
})
rule(':where(h1, h2, h3, h4, h5, h6)', {
  color: 'var(--monolith-prose-heading)',
  lineHeight: 1.25,
  fontWeight: vars.fontWeight.semibold,
  marginBlock: '1.6em 0.55em',
  textWrap: 'balance'
})
for (const [heading, size] of Object.entries({
  h1: vars.fontSize['4xl'],
  h2: vars.fontSize['2xl'],
  h3: vars.fontSize.xl,
  h4: vars.fontSize.lg,
  h5: vars.fontSize.base,
  h6: vars.fontSize.sm
}))
  rule(heading, { fontSize: size })

rule('a', {
  color: COLORS['custom-500'],
  textDecoration: 'underline',
  textUnderlineOffset: '0.18em'
})
rule('a:hover', { textDecorationThickness: '2px' })
rule('a:focus-visible', {
  outline: '2px solid currentColor',
  outlineOffset: '3px',
  borderRadius: '2px'
})
rule(':where(strong, dt, th)', {
  fontWeight: vars.fontWeight.semibold,
  color: 'var(--monolith-prose-heading)'
})
rule(':where(a, h1, h2, h3, h4, h5, h6) strong', { color: 'inherit' })
rule(':where(ul, ol)', { paddingInlineStart: '1.65em' })
rule('ul', { listStyleType: 'disc' })
rule('ol', { listStyleType: 'decimal' })
rule('li', { paddingInlineStart: '0.2em', marginBlock: '0.25em' })
rule('li::marker', { color: 'var(--monolith-prose-muted)' })
rule('li :where(p, ul, ol)', { marginBlock: '0.35em' })
rule('blockquote', {
  borderInlineStart: '3px solid var(--monolith-prose-line)',
  padding: '0.6em 1em',
  background: 'var(--monolith-prose-panel)',
  borderRadius: vars.radii.sm
})
rule('blockquote > :first-child', { marginTop: 0 })
rule('blockquote > :last-child', { marginBottom: 0 })
rule(':where(code, pre, kbd)', {
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  fontSize: '0.875em'
})
rule(':where(code, kbd)', {
  background: 'var(--monolith-prose-panel)',
  padding: '0.12em 0.35em',
  borderRadius: vars.radii.sm
})
rule('kbd', {
  border: '1px solid var(--monolith-prose-line)',
  borderBottomWidth: '2px'
})
rule('pre', {
  background: 'var(--monolith-prose-panel)',
  padding: '1em 1.2em',
  border: '1px solid var(--monolith-prose-line)',
  borderRadius: vars.radii.md,
  lineHeight: 1.6,
  overflowX: 'auto',
  overflowWrap: 'normal',
  whiteSpace: 'pre'
})
rule('pre code', {
  color: 'inherit',
  fontSize: 'inherit',
  lineHeight: 'inherit',
  padding: 0,
  background: 'transparent',
  border: 0
})
rule('hr', {
  border: 0,
  borderTop: '1px solid var(--monolith-prose-line)',
  marginBlock: '1.8em'
})
rule('table', {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: vars.fontSize.sm
})
rule(':where(th, td)', {
  padding: '0.6em 0.8em',
  textAlign: 'start',
  verticalAlign: 'top',
  borderBottom: '1px solid var(--monolith-prose-line)'
})
rule('thead', { background: 'var(--monolith-prose-panel)' })
rule('tfoot', { borderTop: '2px solid var(--monolith-prose-line)' })
rule('dt', { marginBlockStart: '0.8em' })
rule('dd', { marginInlineStart: '1.5em', marginBlockStart: '0.25em' })
rule(':where(img, video)', {
  display: 'block',
  maxWidth: '100%',
  height: 'auto',
  borderRadius: vars.radii.md
})
rule('picture', { display: 'block' })
rule('figcaption', {
  marginBlockStart: '0.6em',
  fontSize: vars.fontSize.sm,
  textAlign: 'center',
  color: 'var(--monolith-prose-muted)'
})
rule('> :first-child', { marginTop: 0 })
rule('> :last-child', { marginBottom: 0 })
