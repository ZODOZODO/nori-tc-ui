const FILTER_OPERATORS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'in'] as const
const DATA_INDEX_RESERVED_KEYS = new Set(['mdf', 'message', 'messageName', 'fields'])

export type WorkflowFilterOperator = (typeof FILTER_OPERATORS)[number]
export type ModelVariableSource = 'AUTO' | 'MSG' | 'CTX'

export interface WorkflowFilterConditionDraft {
  id: string
  variableName: string
  source: ModelVariableSource
  transformsText: string
  operator: WorkflowFilterOperator
  rightValue: string
}

export interface WorkflowFilterEditorDraft {
  mode: 'structured' | 'raw'
  rawValue: string
  rows: WorkflowFilterConditionDraft[]
}

export interface ActionDataIndexFieldDraft {
  id: string
  fieldName: string
  variableName: string
  source: ModelVariableSource
  transformsText: string
  fixedValue: string
  required: boolean
}

export interface ActionDataIndexEditorDraft {
  mode: 'structured' | 'raw'
  rawValue: string
  messageName: string
  fields: ActionDataIndexFieldDraft[]
}

const createEditorRowId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const normalizeText = (value: string | null | undefined): string => value?.trim() ?? ''
const isNonNull = <T>(value: T | null): value is T => value !== null

const normalizeSource = (value: unknown): ModelVariableSource => {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (normalized === 'MSG' || normalized === 'CTX') {
    return normalized
  }
  return 'AUTO'
}

const splitTransforms = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  return []
}

const stringifyRightValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '')).join(', ')
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return JSON.stringify(value)
}

const parseRawJsonObject = (value: string): Record<string, unknown> | null => {
  const normalized = value.trim()
  if (!normalized) {
    return {}
  }

  try {
    const parsed = JSON.parse(normalized)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    return null
  }

  return null
}

export const createEmptyWorkflowFilterCondition = (): WorkflowFilterConditionDraft => ({
  id: createEditorRowId(),
  variableName: '',
  source: 'AUTO',
  transformsText: '',
  operator: 'eq',
  rightValue: '',
})

export const createEmptyActionDataIndexField = (): ActionDataIndexFieldDraft => ({
  id: createEditorRowId(),
  fieldName: '',
  variableName: '',
  source: 'AUTO',
  transformsText: '',
  fixedValue: '',
  required: true,
})

export const parseWorkflowFilterEditor = (value: string): WorkflowFilterEditorDraft => {
  const rawValue = value ?? ''
  const parsed = parseRawJsonObject(rawValue)

  if (parsed === null) {
    return {
      mode: rawValue.trim().length > 0 ? 'raw' : 'structured',
      rawValue,
      rows: [createEmptyWorkflowFilterCondition()],
    }
  }

  const candidateRows = Array.isArray(parsed.rows)
    ? parsed.rows
    : Array.isArray(parsed.conditions)
      ? parsed.conditions
      : parsed && Object.keys(parsed).length > 0
        ? [parsed]
        : []

  const rows = candidateRows
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const row = item as Record<string, unknown>
      const expression =
        row.left && typeof row.left === 'object'
          ? (row.left as Record<string, unknown>)
          : row.expr && typeof row.expr === 'object'
            ? (row.expr as Record<string, unknown>)
            : {}
      const variable =
        expression.var && typeof expression.var === 'object'
          ? (expression.var as Record<string, unknown>)
          : {}
      const operatorCandidate =
        typeof row.op === 'string'
          ? row.op
          : typeof row.operator === 'string'
            ? row.operator
            : 'eq'

      return {
        id: createEditorRowId(),
        variableName: normalizeText(typeof variable.name === 'string' ? variable.name : ''),
        source: normalizeSource(variable.source),
        transformsText: splitTransforms(expression.xform).join(', '),
        operator: FILTER_OPERATORS.includes(operatorCandidate as WorkflowFilterOperator)
          ? (operatorCandidate as WorkflowFilterOperator)
          : 'eq',
        rightValue: stringifyRightValue(row.right),
      }
    })
    .filter((item): item is WorkflowFilterConditionDraft => item !== null)

  return {
    mode: 'structured',
    rawValue,
    rows: rows.length > 0 ? rows : [createEmptyWorkflowFilterCondition()],
  }
}

export const buildWorkflowFilterValue = (draft: WorkflowFilterEditorDraft): string => {
  if (draft.mode === 'raw') {
    return draft.rawValue.trim()
  }

  const rows = draft.rows
    .map((row) => {
      const variableName = normalizeText(row.variableName)
      if (!variableName) {
        return null
      }

      const transforms = splitTransforms(row.transformsText)
      const normalizedRight = normalizeText(row.rightValue)
      const rightValue =
        row.operator === 'in'
          ? normalizedRight
              .split(',')
              .map((item) => item.trim())
              .filter((item) => item.length > 0)
          : normalizedRight

      return {
        left: {
          var: {
            name: variableName,
            ...(row.source === 'AUTO' ? {} : { source: row.source }),
          },
          ...(transforms.length > 0 ? { xform: transforms } : {}),
        },
        op: row.operator,
        ...(Array.isArray(rightValue)
          ? { right: rightValue }
          : rightValue
            ? { right: rightValue }
            : {}),
      }
    })
    .filter(isNonNull)

  if (rows.length === 0) {
    return ''
  }

  return JSON.stringify({ rows }, null, 2)
}

export const parseActionDataIndexEditor = (value: string): ActionDataIndexEditorDraft => {
  const rawValue = value ?? ''
  const parsed = parseRawJsonObject(rawValue)

  if (parsed === null) {
    const normalizedRawValue = normalizeText(rawValue)
    return {
      mode: 'structured',
      rawValue,
      messageName: normalizedRawValue,
      fields: [createEmptyActionDataIndexField()],
    }
  }

  const fieldsSource =
    parsed.fields && typeof parsed.fields === 'object' && !Array.isArray(parsed.fields)
      ? (parsed.fields as Record<string, unknown>)
      : parsed

  const fields = Object.entries(fieldsSource)
    .filter(([fieldName]) => !DATA_INDEX_RESERVED_KEYS.has(fieldName))
    .map(([fieldName, fieldValue]) => {
      if (typeof fieldValue === 'string') {
        return {
          id: createEditorRowId(),
          fieldName,
          variableName: fieldValue,
          source: 'AUTO' as ModelVariableSource,
          transformsText: '',
          fixedValue: '',
          required: true,
        }
      }

      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        const fieldObject = fieldValue as Record<string, unknown>
        return {
          id: createEditorRowId(),
          fieldName,
          variableName: normalizeText(typeof fieldObject.var === 'string' ? fieldObject.var : ''),
          source: normalizeSource(fieldObject.source),
          transformsText: splitTransforms(fieldObject.xform).join(', '),
          fixedValue: normalizeText(typeof fieldObject.fixed === 'string' ? fieldObject.fixed : ''),
          required:
            typeof fieldObject.required === 'boolean' ? fieldObject.required : true,
        }
      }

      return {
        id: createEditorRowId(),
        fieldName,
        variableName: '',
        source: 'AUTO' as ModelVariableSource,
        transformsText: '',
        fixedValue: '',
        required: true,
      }
    })

  return {
    mode: 'structured',
    rawValue,
    messageName: normalizeText(
      typeof parsed.mdf === 'string'
        ? parsed.mdf
        : typeof parsed.messageName === 'string'
          ? parsed.messageName
          : typeof parsed.message === 'string'
            ? parsed.message
            : '',
    ),
    fields: fields.length > 0 ? fields : [createEmptyActionDataIndexField()],
  }
}

export const buildActionDataIndexValue = (draft: ActionDataIndexEditorDraft): string => {
  if (draft.mode === 'raw') {
    return draft.rawValue.trim()
  }

  const fields = draft.fields.reduce<Record<string, unknown>>((accumulator, field) => {
    const fieldName = normalizeText(field.fieldName)
    if (!fieldName) {
      return accumulator
    }

    const fixedValue = normalizeText(field.fixedValue)
    if (fixedValue) {
      accumulator[fieldName] = { fixed: fixedValue }
      return accumulator
    }

    const variableName = normalizeText(field.variableName)
    if (!variableName) {
      return accumulator
    }

    const transforms = splitTransforms(field.transformsText)
    accumulator[fieldName] = {
      var: variableName,
      ...(field.source === 'AUTO' ? {} : { source: field.source }),
      ...(transforms.length > 0 ? { xform: transforms } : {}),
      ...(field.required ? {} : { required: false }),
    }
    return accumulator
  }, {})

  if (Object.keys(fields).length === 0 && !normalizeText(draft.messageName)) {
    return ''
  }

  if (Object.keys(fields).length === 0 && normalizeText(draft.messageName)) {
    return normalizeText(draft.messageName)
  }

  return JSON.stringify(
    {
      ...(normalizeText(draft.messageName) ? { mdf: normalizeText(draft.messageName) } : {}),
      fields,
    },
    null,
    2,
  )
}

export const summarizeWorkflowFilterValue = (value: string): string => {
  const normalized = value.trim()
  if (!normalized) {
    return ''
  }

  const parsed = parseRawJsonObject(normalized)
  if (parsed === null) {
    return normalized.split(/\r?\n/, 1)[0] ?? ''
  }

  const editor = parseWorkflowFilterEditor(normalized)
  const firstRow = editor.rows.find((row) => normalizeText(row.variableName))
  if (!firstRow) {
    return normalized.split(/\r?\n/, 1)[0] ?? ''
  }

  const transforms = splitTransforms(firstRow.transformsText)
  const transformText = transforms.length > 0 ? ` | ${transforms.join(' | ')}` : ''
  const rightText = normalizeText(firstRow.rightValue)
  return `${firstRow.variableName}[${firstRow.source}]${transformText} ${firstRow.operator}${rightText ? ` ${rightText}` : ''}`
}

export const summarizeActionDataIndexValue = (value: string): string => {
  const normalized = value.trim()
  if (!normalized) {
    return ''
  }

  const parsed = parseRawJsonObject(normalized)
  if (parsed === null) {
    return normalized.split(/\r?\n/, 1)[0] ?? ''
  }

  const editor = parseActionDataIndexEditor(normalized)
  const firstField = editor.fields.find((field) => normalizeText(field.fieldName))
  if (!firstField) {
    return normalizeText(editor.messageName)
  }

  const transforms = splitTransforms(firstField.transformsText)
  const transformText = transforms.length > 0 ? ` | ${transforms.join(' | ')}` : ''
  const sourceText = firstField.source === 'AUTO' ? '[AUTO]' : `[${firstField.source}]`
  const messageText = normalizeText(editor.messageName)

  if (normalizeText(firstField.fixedValue)) {
    return `${messageText ? `${messageText} / ` : ''}${firstField.fieldName} = ${firstField.fixedValue}`
  }

  return `${messageText ? `${messageText} / ` : ''}${firstField.fieldName} <- ${firstField.variableName}${sourceText}${transformText}${firstField.required ? '' : ' | optional'}`
}
