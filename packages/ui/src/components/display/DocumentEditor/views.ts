import { BlockComponent, BlockViewExtension } from '@blocksuite/affine/std'
import type { BlockModel, ExtensionType } from '@blocksuite/store'
import { html } from 'lit'
import { literal } from 'lit/static-html.js'

export type EmbedMount = {
  id: string
  container: HTMLElement
  flavour: string
  props: Record<string, unknown>
}

class ColumnsBlock extends BlockComponent<BlockModel<{ count: number }>> {
  override renderBlock() {
    this.dataset.columns = String(this.model.props.count)
    return html`${this.renderChildren(this.model)}`
  }
}

class ColumnBlock extends BlockComponent {
  override renderBlock() {
    return html`${this.renderChildren(this.model)}`
  }
}

class GroupBlock extends BlockComponent<
  BlockModel<{ kind: string; title: string }>
> {
  override renderBlock() {
    this.dataset.groupKind = this.model.props.kind
    return html`${this.renderChildren(this.model)}`
  }
}

const embedContainers = new WeakMap<HTMLElement, Map<string, HTMLElement>>()

class ApplicationBlock extends BlockComponent {
  private container!: HTMLElement

  override connectedCallback() {
    super.connectedCallback()
    let containers = embedContainers.get(this.host)
    if (!containers) {
      containers = new Map()
      embedContainers.set(this.host, containers)
    }
    this.container =
      containers.get(this.model.id) ?? document.createElement('div')
    containers.set(this.model.id, this.container)
    this.container.contentEditable = 'false'
    this.container.dataset.monolithEmbed = 'true'
    // Application widgets own native input/cell selection, including WebKit's
    // input shadow selection. Exclude it through BlockSuite's range boundary API.
    this.dataset.rangeSyncExclude = 'true'
  }

  override updated() {
    this.dispatchEvent(
      new CustomEvent<EmbedMount>('monolith-embed', {
        bubbles: true,
        composed: true,
        detail: {
          id: this.model.id,
          container: this.container,
          flavour: this.model.flavour,
          props: this.model.props
        }
      })
    )
  }

  override disconnectedCallback() {
    // Moving a block may replace its Lit element. Preserve the React portal and
    // cell state while it is detached; only remove it after a real deletion.
    const host = this.host
    const id = this.model.id
    const store = this.store
    queueMicrotask(() => {
      if (!store.hasBlock(id)) {
        embedContainers.get(host)?.delete(id)
        host.dispatchEvent(
          new CustomEvent('monolith-embed-remove', { detail: { id } })
        )
      }
    })
    super.disconnectedCallback()
  }

  override renderBlock() {
    return html`${this.container}`
  }
}

export function applicationViews(): ExtensionType[] {
  if (!customElements.get('monolith-columns'))
    customElements.define('monolith-columns', ColumnsBlock)
  if (!customElements.get('monolith-column'))
    customElements.define('monolith-column', ColumnBlock)
  if (!customElements.get('monolith-group'))
    customElements.define('monolith-group', GroupBlock)
  if (!customElements.get('monolith-application-block'))
    customElements.define('monolith-application-block', ApplicationBlock)
  return [
    BlockViewExtension('monolith:columns', literal`monolith-columns`),
    BlockViewExtension('monolith:column', literal`monolith-column`),
    BlockViewExtension('monolith:group', literal`monolith-group`),
    BlockViewExtension(
      'monolith:linked-database',
      literal`monolith-application-block`
    ),
    BlockViewExtension('monolith:module', literal`monolith-application-block`)
  ]
}
