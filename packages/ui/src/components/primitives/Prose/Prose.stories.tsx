// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Prose } from './index'

const meta = { title: 'Primitives/Prose', component: Prose } satisfies Meta<
  typeof Prose
>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  render: () => (
    <Prose>
      <h1>From an idea to a shared plan</h1>
      <p>
        A good project page explains <strong>what matters</strong>, who is
        involved and the next small step. Keep it readable on every screen.
      </p>
      <h2>Decisions</h2>
      <blockquote>
        Write down why a decision was made while the context is still fresh.
      </blockquote>
      <ul>
        <li>Collect research in one place.</li>
        <li>
          Connect actions to the project.
          <ul>
            <li>Assign an owner.</li>
            <li>Pick a useful date.</li>
          </ul>
        </li>
      </ul>
      <h3>Working agreement</h3>
      <ol>
        <li>Share a draft.</li>
        <li>Review together.</li>
        <li>Publish the result.</li>
      </ol>
      <p>
        Use <kbd>Ctrl</kbd> + <kbd>K</kbd> to find another page. An inline{' '}
        <code>projectId</code> connects related records.
      </p>
      <pre>
        <code>
          {'const nextAction = actions.find(action => !action.complete)'}
        </code>
      </pre>
      <table>
        <thead>
          <tr>
            <th>Milestone</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Outline</td>
            <td>Complete</td>
          </tr>
          <tr>
            <td>Review</td>
            <td>In progress</td>
          </tr>
        </tbody>
      </table>
      <hr />
      <h4>References</h4>
      <p>
        <a href="#project">Return to the project</a> or leave an{' '}
        <em>open question</em> for the next review.
      </p>
    </Prose>
  )
}
