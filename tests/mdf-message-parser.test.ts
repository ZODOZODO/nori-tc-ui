import test from 'node:test'
import assert from 'node:assert/strict'
import { extractMdfMessageOptions } from '../src/features/model/lib/mdf-message-parser.ts'

test('message name 속성이 있는 MDF XML은 message name 기준 dropdown option을 추출합니다', () => {
  const options = extractMdfMessageOptions([
    {
      id: 'mdf-1',
      name: 'MAIN_MDF',
      xml: `
        <mdf>
          <message name="TOOL_CONDITION_REPLY_MES">EQPID={EQPID}</message>
          <message name="TOOL_CONDITION_REPLY_EQP">STATUS={STATUS}</message>
        </mdf>
      `,
    },
  ])

  assert.deepEqual(
    options.map((option) => option.messageName),
    ['TOOL_CONDITION_REPLY_MES', 'TOOL_CONDITION_REPLY_EQP'],
  )
  assert.match(options[0]?.xmlSnippet ?? '', /^<message name="TOOL_CONDITION_REPLY_MES">/)
})

test('태그 이름 자체가 메시지인 XML도 dropdown option과 preview 조각을 추출합니다', () => {
  const options = extractMdfMessageOptions([
    {
      id: 'mdf-2',
      name: 'TAG_STYLE_MDF',
      xml: `
        <ROOT>
          <TEST>CMD=TEST EQPID=[EQPID]</TEST>
          <PING>CMD=PING</PING>
        </ROOT>
      `,
    },
  ])

  assert.deepEqual(
    options.map((option) => option.messageName),
    ['TEST', 'PING'],
  )
  assert.equal(
    options[0]?.xmlSnippet.trim(),
    '<TEST>CMD=TEST EQPID=[EQPID]</TEST>',
  )
})
