import type { ModelMdfContent } from '../types/model.types'

interface XmlTagToken {
  type: 'opening' | 'closing' | 'special'
  start: number
  end: number
  tagName: string
  raw: string
  isSelfClosing: boolean
}

export interface MdfMessageOption {
  messageName: string
  sourceName: string
  xmlSnippet: string
}

const XML_FIELD_TAG_NAME = 'field'
const XML_ROOT_WRAPPER_TAG_NAMES = new Set(['mdf'])

/**
 * MDF XML에서 action_data_index가 선택할 수 있는 메시지 후보를 추출합니다.
 *
 * message[name] 구조를 우선 사용하고, 그런 구조가 없으면 root 직계 element를 메시지 후보로 간주합니다.
 * 실제 저장값은 messageName 하나이므로, 중복 이름은 첫 번째 항목만 유지합니다.
 */
export const extractMdfMessageOptions = (mdfContents: ModelMdfContent[]): MdfMessageOption[] => {
  const uniqueOptions = new Map<string, MdfMessageOption>()

  for (const mdfContent of mdfContents) {
    const extractedOptions = extractMdfMessageOptionsFromXml(mdfContent)

    for (const option of extractedOptions) {
      if (!uniqueOptions.has(option.messageName)) {
        uniqueOptions.set(option.messageName, option)
      }
    }
  }

  return [...uniqueOptions.values()]
}

const extractMdfMessageOptionsFromXml = (mdfContent: ModelMdfContent): MdfMessageOption[] => {
  const rootFragment = extractTopLevelElementFragments(mdfContent.xml)[0]
  if (!rootFragment) {
    return []
  }

  const directChildren = extractDirectChildElementFragments(rootFragment)
  const namedMessageOptions = directChildren
    .map((fragment) => toMessageOption(fragment, mdfContent.name))
    .filter(
      (option): option is MdfMessageOption =>
        option !== null && option.messageName.length > 0 && option.xmlSnippet.length > 0,
    )

  const explicitMessageOptions = namedMessageOptions.filter((option) =>
    /^<\s*message\b/i.test(option.xmlSnippet),
  )
  if (explicitMessageOptions.length > 0) {
    return explicitMessageOptions
  }

  if (namedMessageOptions.length > 0) {
    return namedMessageOptions
  }

  const rootOption = toMessageOption(rootFragment, mdfContent.name)
  return rootOption ? [rootOption] : []
}

const toMessageOption = (xmlFragment: string, sourceName: string): MdfMessageOption | null => {
  const token = readXmlTagToken(xmlFragment, xmlFragment.indexOf('<'))
  if (!token || token.type !== 'opening') {
    return null
  }

  const normalizedTagName = token.tagName.toLowerCase()
  if (normalizedTagName === XML_FIELD_TAG_NAME) {
    return null
  }

  const explicitName = readXmlAttribute(token.raw, 'name')
  const fallbackTagName = XML_ROOT_WRAPPER_TAG_NAMES.has(normalizedTagName) ? '' : token.tagName
  const messageName = (explicitName || fallbackTagName).trim()
  if (!messageName) {
    return null
  }

  return {
    messageName,
    sourceName,
    xmlSnippet: xmlFragment.trim(),
  }
}

const extractDirectChildElementFragments = (rootFragment: string): string[] => {
  const firstTagIndex = rootFragment.indexOf('<')
  const rootToken = readXmlTagToken(rootFragment, firstTagIndex)
  if (!rootToken || rootToken.type !== 'opening' || rootToken.isSelfClosing) {
    return []
  }

  const closingTagStart = rootFragment.lastIndexOf('</')
  if (closingTagStart <= rootToken.end) {
    return []
  }

  const innerXml = rootFragment.slice(rootToken.end, closingTagStart)
  return extractTopLevelElementFragments(innerXml)
}

const extractTopLevelElementFragments = (xml: string): string[] => {
  const fragments: string[] = []
  let depth = 0
  let fragmentStart: number | null = null
  let cursor = 0

  while (cursor < xml.length) {
    const tagStart = xml.indexOf('<', cursor)
    if (tagStart < 0) {
      break
    }

    const token = readXmlTagToken(xml, tagStart)
    if (!token) {
      cursor = tagStart + 1
      continue
    }

    cursor = token.end

    if (token.type === 'special') {
      continue
    }

    if (token.type === 'opening') {
      if (depth === 0) {
        fragmentStart = token.start
      }

      if (token.isSelfClosing) {
        if (depth === 0 && fragmentStart !== null) {
          fragments.push(xml.slice(fragmentStart, token.end).trim())
          fragmentStart = null
        }
        continue
      }

      depth += 1
      continue
    }

    if (depth > 0) {
      depth -= 1
    }

    if (depth === 0 && fragmentStart !== null) {
      fragments.push(xml.slice(fragmentStart, token.end).trim())
      fragmentStart = null
    }
  }

  return fragments.filter((fragment) => fragment.length > 0)
}

const readXmlTagToken = (xml: string, startIndex: number): XmlTagToken | null => {
  if (startIndex < 0 || startIndex >= xml.length || xml[startIndex] !== '<') {
    return null
  }

  const specialToken = readSpecialXmlToken(xml, startIndex)
  if (specialToken) {
    return specialToken
  }

  const tagEnd = findTagEnd(xml, startIndex)
  if (tagEnd < 0) {
    return null
  }

  const raw = xml.slice(startIndex, tagEnd)

  if (raw.startsWith('</')) {
    const closingTagNameMatch = raw.match(/^<\s*\/\s*([^\s>]+)/)
    if (!closingTagNameMatch) {
      return null
    }

    return {
      type: 'closing',
      start: startIndex,
      end: tagEnd,
      tagName: closingTagNameMatch[1] ?? '',
      raw,
      isSelfClosing: false,
    }
  }

  const openingTagNameMatch = raw.match(/^<\s*([^\s/>]+)/)
  if (!openingTagNameMatch) {
    return null
  }

  return {
    type: 'opening',
    start: startIndex,
    end: tagEnd,
    tagName: openingTagNameMatch[1] ?? '',
    raw,
    isSelfClosing: /\/\s*>$/.test(raw),
  }
}

const readSpecialXmlToken = (xml: string, startIndex: number): XmlTagToken | null => {
  const specialTokenPatterns = [
    { prefix: '<!--', suffix: '-->' },
    { prefix: '<?', suffix: '?>' },
    { prefix: '<![CDATA[', suffix: ']]>' },
    { prefix: '<!DOCTYPE', suffix: '>' },
  ]

  for (const pattern of specialTokenPatterns) {
    if (!xml.startsWith(pattern.prefix, startIndex)) {
      continue
    }

    const endIndex = xml.indexOf(pattern.suffix, startIndex + pattern.prefix.length)
    if (endIndex < 0) {
      return null
    }

    return {
      type: 'special',
      start: startIndex,
      end: endIndex + pattern.suffix.length,
      tagName: '',
      raw: xml.slice(startIndex, endIndex + pattern.suffix.length),
      isSelfClosing: false,
    }
  }

  return null
}

const findTagEnd = (xml: string, startIndex: number): number => {
  let quoteChar: '"' | "'" | null = null

  for (let index = startIndex + 1; index < xml.length; index += 1) {
    const currentChar = xml[index]

    if (quoteChar) {
      if (currentChar === quoteChar) {
        quoteChar = null
      }
      continue
    }

    if (currentChar === '"' || currentChar === "'") {
      quoteChar = currentChar
      continue
    }

    if (currentChar === '>') {
      return index + 1
    }
  }

  return -1
}

const readXmlAttribute = (rawTag: string, attributeName: string): string => {
  const attributePattern = new RegExp(
    `\\b${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
    'i',
  )
  const attributeMatch = rawTag.match(attributePattern)
  return attributeMatch?.[1] ?? attributeMatch?.[2] ?? ''
}
