import { defineComponent, reactive, watch, inject, onBeforeUnmount } from 'vue'
import {
  useProps,
  booleanProp,
  sizeProp,
  createSizeProp,
  classProp,
  styleProp
} from '@vexip-ui/config'
import { isNull } from '@vexip-ui/utils'
import { TABLE_ACTION } from './symbol'

import type { PropType } from 'vue'
import type {
  Data,
  TableColumnType,
  FilterOptions,
  SorterOptions,
  ColumnRenderFn,
  HeadRenderFn,
  RowState,
  ColumnWithKey
} from './symbol'

const columnProps = {
  idKey: [Number, String],
  name: String,
  accessor: Function as PropType<(row: any, index: number) => any>,
  fixed: {
    type: [Boolean, String] as PropType<boolean | 'left' | 'right'>,
    default: null
  },
  className: classProp,
  style: styleProp,
  attrs: Object,
  type: String as PropType<TableColumnType>,
  width: Number,
  filter: Object as PropType<FilterOptions<any, any>>,
  sorter: {
    type: [Boolean, Object] as PropType<boolean | SorterOptions<any>>,
    default: null
  },
  renderer: Function as PropType<ColumnRenderFn>,
  headRenderer: Function as PropType<HeadRenderFn>,
  order: Number,
  noEllipsis: booleanProp,
  checkboxSize: sizeProp,
  disableRow: Function as PropType<(data: Data) => boolean>,
  truthIndex: booleanProp,
  orderLabel: Function as PropType<(index: number) => string | number>,
  metaData: Object as PropType<Data>
}

type ColumnPropKey = keyof typeof columnProps

const propKeys = Object.keys(columnProps) as ColumnPropKey[]
const aliases: Partial<Record<ColumnPropKey, string>> = {
  idKey: 'key'
}
const deepProps: ColumnPropKey[] = ['className', 'style', 'attrs', 'filter', 'sorter', 'metaData']
const columnTypes: TableColumnType[] = ['order', 'selection', 'expand']

export default defineComponent({
  name: 'TableColumn',
  functional: true,
  props: columnProps,
  setup(_props, { slots }) {
    const props = useProps('tableColumn', _props, {
      idKey: {
        default: null,
        validator: (value: number | string) => !isNull(value),
        static: true
      },
      name: '',
      accessor: {
        default: null,
        isFunc: true
      },
      fixed: {
        default: false,
        static: true
      },
      className: null,
      style: null,
      attrs: null,
      type: {
        default: null,
        validator: (value: TableColumnType) => columnTypes.includes(value),
        static: true
      },
      width: null,
      filter: () => ({} as FilterOptions),
      sorter: false,
      renderer: {
        default: null,
        isFunc: true
      },
      headRenderer: {
        default: null,
        isFunc: true
      },
      order: {
        default: 0,
        isFunc: true
      },
      noEllipsis: false,
      checkboxSize: createSizeProp(),
      disableRow: {
        default: null,
        isFunc: true
      },
      truthIndex: false,
      orderLabel: {
        default: null,
        isFunc: true
      },
      metaData: {
        default: () => ({}),
        validator: (value: Data) => !isNull(value)
      }
    })

    const tableAction = inject(TABLE_ACTION, null)
    const options = reactive({}) as ColumnWithKey

    for (const key of propKeys) {
      if (key === 'renderer' || key === 'headRenderer') continue

      const aliasKey = (aliases[key] || key) as keyof ColumnWithKey

      ;(options[aliasKey] as any) = props[key]

      if (key === 'idKey') {
        watch(
          () => props[key],
          value => {
            if (isNull(value) && props.type) {
              (options[aliasKey] as any) = value = `__vxp_${props.type}`
            } else {
              (options[aliasKey] as any) = value
            }
          }
        )
      } else {
        watch(
          () => props[key],
          value => {
            (options[aliasKey] as any) = value
          },
          { deep: deepProps.includes(key) }
        )
      }
    }

    watch(() => slots.default, setRenderer)
    watch(() => props.renderer, setRenderer)
    watch(() => slots.head, setHeadRenderer)
    watch(() => props.headRenderer, setHeadRenderer)

    setRenderer()
    setHeadRenderer()

    tableAction?.increaseColumn(options)

    onBeforeUnmount(() => {
      tableAction?.decreaseColumn(options)
    })

    function setRenderer() {
      options.renderer = (data: any) => {
        if (typeof slots.default === 'function') {
          return slots.default(data)
        }

        if (typeof props.renderer === 'function') {
          return props.renderer(data)
        }

        const row = data.row
        const rowIndex = data.rowIndex as number

        if (typeof props.accessor === 'function') {
          const result = props.accessor(row as Data, rowIndex)

          return isNull(result) ? '' : String(result)
        }

        const result = (row as RowState)[options.key as unknown as keyof RowState]

        return isNull(result) ? '' : String(result)
      }
    }

    function setHeadRenderer() {
      options.headRenderer = (data: any) => {
        if (typeof slots.head === 'function') {
          return slots.head(data)
        }

        if (typeof props.headRenderer === 'function') {
          return props.headRenderer(data)
        }

        return props.name
      }
    }

    return () => null
  }
})
