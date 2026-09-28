<script>
/**
 * FilterableDataTable
 *
 * A DataTables.net (v2) wrapper with per-column filtering, ported from the
 * Würth Asgard frontend (`Common/DataTable.vue`) and adapted to PrimeIcons
 * and the `--p-*` theme tokens used across OpenMagnetics.
 *
 * FEATURES
 *  - Per-column filter popovers, opened from a funnel icon in each header:
 *      NUMERIC columns (every non-empty value is a number): min / max range
 *      TEXT columns: substring search + multi-select list of the unique values
 *  - Per-column ordering (DataTables native, click the header)
 *  - Active-filter tags with individual remove buttons and a "Clear all"
 *  - Summary bar with the row count ("12 of 240 rows after filtering")
 *  - Optional CSV export of the full `data`
 *  - Row click → `row-click` event with the row's data object
 *  - Column width locking so columns do not jump while filtering
 *
 * COLUMN DEFINITIONS (`columns` prop) follow DataTables' `columns` option:
 *   { data: 'effectiveArea', title: 'Eff. Area (mm²)', render?, type?,
 *     orderable?, searchable?, filterable? }
 *   - `type: 'string'` forces the text filter even if every value is numeric
 *   - `filterable: false` gives the column no funnel at all
 *   - `render(data, type, row)` may return different strings for
 *     type === 'display' / 'filter' / 'sort'. Range filters always read the
 *     RAW cell value (`column.data`), so keep numeric columns numeric.
 *
 * PROGRAMMATIC FILTERS: `setColumnFilter(dataKey, spec)` with
 *   spec = { min, max } (numeric), { values: [...] } (exact text matches),
 *   { text: '...' } (substring), or null to clear. Filters are also emitted
 *   as `filters-change` (array of { key, title, description }).
 *
 * THEMING: popovers are appended to <body> (to escape overflow clipping and
 * PrimeVue dialogs), so they cannot inherit CSS custom properties from the
 * host. The host's computed `--fdt-*` variables are copied onto each popover
 * when it is created; set them on any ancestor of this component to restyle.
 *
 * TEST HOOKS (when `dataTestLabel` is set):
 *   `${dataTestLabel}-filter-${key}`            funnel icon
 *   `${dataTestLabel}-filter-${key}-min|-max`   numeric inputs
 *   `${dataTestLabel}-filter-${key}-text`       text input
 *   `${dataTestLabel}-filter-${key}-select`     text multi-select
 *   `${dataTestLabel}-filter-count`             summary label
 *   `${dataTestLabel}-filter-clear-all`         clear-all button
 *   `${dataTestLabel}-filter-tag-${key}`        active-filter tag
 */

// The upstream datatables.net Vue wrapper, aliased so it cannot be confused
// with this component.
import DataTablesVue from 'datatables.net-vue3'
import DataTablesCore from 'datatables.net'

DataTablesVue.use(DataTablesCore)

const POPOVER_THEME_VARS = [
    '--fdt-popover-bg',
    '--fdt-popover-color',
    '--fdt-popover-muted',
    '--fdt-popover-border',
    '--fdt-popover-header-bg',
    '--fdt-input-bg',
    '--fdt-input-color',
    '--fdt-input-border',
    '--fdt-accent',
    '--fdt-accent-rgb',
]

export default {
    components: {
        DataTablesVue,
    },
    emits: ['row-click', 'filters-change'],
    props: {
        /** Array of row objects. */
        data: {
            type: Array,
            required: true,
        },
        /** DataTables column definitions (see header comment). */
        columns: {
            type: Array,
            required: true,
        },
        /** Extra DataTables options, merged over the computed defaults. */
        options: {
            type: Object,
            default: () => ({}),
        },
        /** Enables the per-column filter popovers. */
        columnFilters: {
            type: Boolean,
            default: true,
        },
        /** Shows the "Export CSV" button in the summary bar. */
        exportCsv: {
            type: Boolean,
            default: false,
        },
        /** Base name of the exported CSV file (a timestamp is appended). */
        exportFileName: {
            type: String,
            default: 'export',
        },
        /** Prefix for the data-cy hooks (see header comment). */
        dataTestLabel: {
            type: String,
            default: '',
        },
        /** Noun used in the summary bar ("12 of 240 shapes"). */
        rowNoun: {
            type: String,
            default: 'rows',
        },
        /**
         * Compact mode for wide tables (a dozen columns or more): a smaller type
         * scale, tighter cells, and header titles in the case they were written in
         * — an uppercased title turns a symbol like µi into "MI" and ρ into a Latin
         * P. Lets a wide table fit a 1366 px screen without a horizontal scroll.
         */
        compact: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            activeFilters: [],            // [{ colIdx, key, title, description, clearFn }]
            totalRows: 0,
            filteredRows: 0,
            lockedColumnWidths: new Map(),
            rangeFilters: new Map(),      // colIdx → { min, max }
            popovers: new Map(),          // colIdx → { popover, refresh, clear, setSpec }
            funnelElements: new Map(),    // colIdx → funnel element
            openPopover: null,
            dtApi: null,
            boundDocumentClickHandler: null,
            boundRowClickHandler: null,
            rowClickTbody: null,
            pendingFilters: [],           // setColumnFilter() calls made before init
        }
    },
    computed: {
        filterCountLabel() {
            if (this.activeFilters.length || this.filteredRows < this.totalRows)
                return `${this.filteredRows} of ${this.totalRows} ${this.rowNoun} after filtering`
            return `${this.totalRows} ${this.rowNoun}`
        },
        computedOptions() {
            const origInitComplete = this.options.initComplete
            const origDrawCallback = this.options.drawCallback
            const vm = this

            return {
                autoWidth: false,
                ...this.options,
                initComplete: function (...args) {
                    if (origInitComplete) origInitComplete.apply(this, args)
                    const api = this.api()
                    vm.dtApi = api
                    vm.attachRowClickHandler(api)
                    if (vm.columnFilters) vm.initializeColumnFilters(api)
                    vm.updateLockedColumnWidths(api)
                },
                drawCallback: function (...args) {
                    if (origDrawCallback) origDrawCallback.apply(this, args)
                    vm.updateLockedColumnWidths(this.api())
                },
            }
        },
    },
    watch: {
        columnFilters(value) {
            if (value) {
                if (this.dtApi) this.initializeColumnFilters(this.dtApi)
                return
            }
            this.unregisterSideEffects()
            this.resetFilterUi()
        },
        data() {
            // datatables.net-vue3 reloads the rows itself (clear + rows.add +
            // draw). The count and the text-filter value lists must follow.
            this.$nextTick(() => {
                if (!this.dtApi) return
                this.totalRows = this.dtApi.rows().count()
                this.filteredRows = this.dtApi.rows({ search: 'applied' }).count()
            })
        },
    },
    beforeUnmount() {
        this.detachRowClickHandler()
        this.unregisterSideEffects()
        this.resetFilterUi()
    },
    methods: {
        // ------------------------------------------------------------------
        // Utilities
        // ------------------------------------------------------------------
        isFilled(value) {
            return value !== null && value !== undefined && value !== ''
        },
        // The TEXT a cell shows, for a column whose renderer emits markup.
        // The filter lists display values so it matches what the user sees, but a
        // renderer that returns HTML (chips, badges, links) would otherwise put raw
        // markup in the list -- and a column declared `data: null` hands the filter
        // the whole row object, which stringifies to "[object Object]" and makes the
        // column unfilterable. Both become the text a reader would read off the cell.
        displayText(value) {
            if (value === null || value === undefined) return ''
            if (typeof value !== 'string') {
                // Not a string and not renderable as one (a row object, an array):
                // there is no honest text for it, so it is left out of the list
                // rather than shown as "[object Object]".
                return typeof value === 'number' || typeof value === 'boolean' ? String(value) : ''
            }
            if (!value.includes('<')) return value
            // Tags become SPACES, not nothing: adjacent chips (<span>MAS</span><span>Meas</span>)
            // would otherwise collapse into "MASMeas". Entities are decoded by the DOM after.
            // A <template> is the decoder, not a <div>: its content is inert, so a fragment
            // the regex cannot strip (an unterminated tag) never loads or runs anything.
            const host = document.createElement('template')
            host.innerHTML = value.replace(/<[^>]*>/g, ' ')
            return (host.content.textContent || '').replace(/\s+/g, ' ').trim()
        },
        isNumericValue(value) {
            if (typeof value === 'number') return Number.isFinite(value)
            if (typeof value !== 'string') return false
            return value.trim() !== '' && !Number.isNaN(Number(value))
        },
        isNumericColumn(values) {
            return values.length > 0 && values.every((value) => this.isNumericValue(value))
        },
        escapeRegex(value) {
            return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        },
        columnKey(colIdx) {
            const def = this.columns[colIdx]
            if (def && typeof def.data === 'string') return def.data
            return String(colIdx)
        },
        cy(suffix) {
            return this.dataTestLabel ? `${this.dataTestLabel}-${suffix}` : null
        },
        setCy(element, suffix) {
            const value = this.cy(suffix)
            if (value) element.setAttribute('data-cy', value)
        },

        // ------------------------------------------------------------------
        // Column width locking
        // ------------------------------------------------------------------
        updateLockedColumnWidths(api) {
            if (!api) return
            const vm = this
            api.columns().every(function () {
                const colIdx = this.index()
                const headerCell = this.header()
                if (!headerCell) return
                const measuredWidth = Math.ceil(headerCell.getBoundingClientRect().width)
                if (!measuredWidth) return
                const lockedWidth = Math.max(vm.lockedColumnWidths.get(colIdx) ?? 0, measuredWidth)
                vm.lockedColumnWidths.set(colIdx, lockedWidth)
                headerCell.style.minWidth = `${lockedWidth}px`
            })
        },

        // ------------------------------------------------------------------
        // Row click
        // ------------------------------------------------------------------
        attachRowClickHandler(api) {
            if (!api) return
            this.detachRowClickHandler()
            const tableNode = api.table().node()
            const tbody = tableNode ? tableNode.querySelector('tbody') : null
            if (!tbody) return

            this.rowClickTbody = tbody
            this.boundRowClickHandler = (event) => {
                const rowElement = event.target.closest('tr')
                if (!rowElement) return
                if (event.target.closest('a, input, select, textarea')) return
                const rowApi = api.row(rowElement)
                if (!rowApi || (typeof rowApi.any === 'function' && !rowApi.any())) return
                const rowData = rowApi.data()
                if (!rowData) return
                this.$emit('row-click', rowData)
            }
            tbody.addEventListener('click', this.boundRowClickHandler)
        },
        detachRowClickHandler() {
            if (this.rowClickTbody && this.boundRowClickHandler) {
                this.rowClickTbody.removeEventListener('click', this.boundRowClickHandler)
            }
            this.boundRowClickHandler = null
            this.rowClickTbody = null
        },

        // ------------------------------------------------------------------
        // Filter state
        // ------------------------------------------------------------------
        updateFilterEntry(colIdx, colTitle, description, clearFn) {
            const existingIndex = this.activeFilters.findIndex((filter) => filter.colIdx === colIdx)
            const key = this.columnKey(colIdx)

            if (description) {
                const nextEntry = { colIdx, key, title: colTitle, description, clearFn }
                if (existingIndex >= 0) {
                    this.activeFilters.splice(existingIndex, 1, nextEntry)
                } else {
                    this.activeFilters.push(nextEntry)
                }
            } else if (existingIndex >= 0) {
                this.activeFilters.splice(existingIndex, 1)
            }

            const funnel = this.funnelElements.get(colIdx)
            if (funnel) {
                funnel.classList.toggle('filter-active', Boolean(description))
            }
            this.$emit('filters-change', this.activeFilters.map(({ key: k, title, description: d }) => ({ key: k, title, description: d })))
        },
        removeFilter(filter) {
            if (filter.clearFn) filter.clearFn()
        },
        clearAllFilters() {
            const snapshot = [...this.activeFilters]
            snapshot.forEach((filter) => {
                if (filter.clearFn) filter.clearFn()
            })
        },

        /**
         * Programmatic filter. `dataKey` is the column's `data` key; `spec` is
         * { min, max } | { values } | { text } | null. Calls made before the
         * table has initialised are replayed on init.
         */
        setColumnFilter(dataKey, spec) {
            const colIdx = this.columns.findIndex((column) => column.data === dataKey)
            if (colIdx < 0) {
                throw new Error(`FilterableDataTable: no column with data key "${dataKey}"`)
            }
            const entry = this.popovers.get(colIdx)
            if (!entry) {
                this.pendingFilters.push([dataKey, spec])
                return
            }
            entry.setSpec(spec)
        },

        // ------------------------------------------------------------------
        // Popovers
        // ------------------------------------------------------------------
        closeOpenPopover() {
            if (!this.openPopover) return
            this.openPopover.style.display = 'none'
            this.openPopover = null
        },
        handleDocumentClick(event) {
            if (!this.openPopover) return
            if (this.openPopover.contains(event.target)) return
            if (event.target.closest('.column-filter-funnel')) return
            this.closeOpenPopover()
        },
        createPopoverElements(colTitle) {
            const popover = document.createElement('div')
            popover.classList.add('column-filter-popover')
            popover.style.display = 'none'
            popover.dataset.fdtInstance = String(this.$.uid)

            // Popovers live under <body>, so hand them the host's theme vars.
            const hostStyle = getComputedStyle(this.$el)
            for (const name of POPOVER_THEME_VARS) {
                const value = hostStyle.getPropertyValue(name).trim()
                if (value) popover.style.setProperty(name, value)
            }

            const popHeader = document.createElement('div')
            popHeader.classList.add('filter-popover-header')

            const titleSpan = document.createElement('span')
            titleSpan.classList.add('filter-popover-title')
            titleSpan.textContent = colTitle
            popHeader.appendChild(titleSpan)

            const countSpan = document.createElement('span')
            countSpan.classList.add('filter-popover-count')
            popHeader.appendChild(countSpan)

            const closeBtn = document.createElement('button')
            closeBtn.classList.add('filter-popover-close')
            closeBtn.type = 'button'
            closeBtn.title = 'Close'
            closeBtn.innerHTML = '<i class="pi pi-times"></i>'
            popHeader.appendChild(closeBtn)

            const popBody = document.createElement('div')
            popBody.classList.add('filter-popover-body')

            popover.appendChild(popHeader)
            popover.appendChild(popBody)

            return { popover, popBody, countSpan, closeBtn }
        },
        positionPopover(popover, headerCell) {
            const rect = headerCell.getBoundingClientRect()
            popover.style.position = 'fixed'
            popover.style.top = `${rect.bottom + 4}px`
            popover.style.display = 'block'
            popover.style.zIndex = '10000'
            // Keep it inside the viewport horizontally.
            const width = popover.getBoundingClientRect().width
            const left = Math.max(4, Math.min(rect.left, window.innerWidth - width - 4))
            popover.style.left = `${left}px`
        },

        // ------------------------------------------------------------------
        // Numeric range filter
        // ------------------------------------------------------------------
        setupNumericFilter({ api, colIdx, colTitle, key, popBody, countSpan }) {
            const rangeWrapper = document.createElement('div')
            rangeWrapper.classList.add('filter-popover-range')

            const makeGroup = (labelText, suffix) => {
                const group = document.createElement('div')
                group.classList.add('filter-range-group')
                const label = document.createElement('label')
                label.textContent = labelText
                label.classList.add('filter-range-label')
                const input = document.createElement('input')
                input.type = 'number'
                input.step = 'any'
                input.classList.add('fdt-filter-input')
                this.setCy(input, `filter-${key}-${suffix}`)
                group.appendChild(label)
                group.appendChild(input)
                rangeWrapper.appendChild(group)
                return input
            }
            const minInput = makeGroup('Min', 'min')
            const maxInput = makeGroup('Max', 'max')
            popBody.appendChild(rangeWrapper)

            const clear = () => {
                minInput.value = ''
                maxInput.value = ''
                this.rangeFilters.delete(colIdx)
                this.updateFilterEntry(colIdx, colTitle, null, null)
                api.draw()
            }

            const applyRange = () => {
                const minVal = minInput.value !== '' ? Number.parseFloat(minInput.value) : null
                const maxVal = maxInput.value !== '' ? Number.parseFloat(maxInput.value) : null

                if (minVal !== null || maxVal !== null) {
                    this.rangeFilters.set(colIdx, { min: minVal, max: maxVal })
                    const description =
                        minVal !== null && maxVal !== null
                            ? `${minVal} – ${maxVal}`
                            : minVal !== null
                              ? `≥ ${minVal}`
                              : `≤ ${maxVal}`
                    this.updateFilterEntry(colIdx, colTitle, description, clear)
                } else {
                    this.rangeFilters.delete(colIdx)
                    this.updateFilterEntry(colIdx, colTitle, null, null)
                }
                api.draw()
            }

            minInput.addEventListener('input', applyRange)
            maxInput.addEventListener('input', applyRange)

            const refresh = () => {
                const values = api.column(colIdx).data().toArray().filter((v) => this.isFilled(v))
                if (values.length) {
                    const min = Math.min(...values)
                    const max = Math.max(...values)
                    countSpan.textContent = `${values.length} · ${this.formatBound(min)} to ${this.formatBound(max)}`
                    minInput.placeholder = this.formatBound(min)
                    maxInput.placeholder = this.formatBound(max)
                } else {
                    countSpan.textContent = ''
                }
            }

            const setSpec = (spec) => {
                if (spec === null || spec === undefined) {
                    clear()
                    return
                }
                if (!('min' in spec) && !('max' in spec)) {
                    throw new Error(`FilterableDataTable: column "${key}" is numeric; spec must be { min, max } or null`)
                }
                minInput.value = spec.min !== null && spec.min !== undefined ? String(spec.min) : ''
                maxInput.value = spec.max !== null && spec.max !== undefined ? String(spec.max) : ''
                applyRange()
            }

            return { refresh, clear, setSpec, focusTarget: minInput }
        },
        formatBound(value) {
            return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(4)))
        },

        // ------------------------------------------------------------------
        // Text filter (substring search + multi-select of unique values)
        // ------------------------------------------------------------------
        setupTextFilter({ api, column, colIdx, colTitle, key, popBody, countSpan }) {
            const input = document.createElement('input')
            input.type = 'text'
            input.placeholder = 'Search…'
            input.classList.add('fdt-filter-input')
            this.setCy(input, `filter-${key}-text`)

            const select = document.createElement('select')
            select.classList.add('fdt-filter-select', 'filter-dropdown')
            select.size = 8
            select.multiple = true
            this.setCy(select, `filter-${key}-select`)

            let uniqueValues = []

            const populateSelect = (filterText, keepSelected = true) => {
                const prevSelected = keepSelected
                    ? new Set(Array.from(select.selectedOptions).map((o) => o.value))
                    : new Set()
                select.innerHTML = ''
                const filtered = filterText
                    ? uniqueValues.filter((v) => v.toLowerCase().includes(filterText.toLowerCase()))
                    : uniqueValues
                filtered.forEach((value) => {
                    const option = document.createElement('option')
                    option.value = value
                    option.textContent = value
                    option.selected = prevSelected.has(value)
                    select.appendChild(option)
                })
            }

            const refresh = () => {
                // Unique values of the column as it is SEARCHED, not as it is painted.
                // `column().search()` below matches against the filter value, so a list built
                // from anything else offers entries that select nothing. For an ordinary column
                // DataTables returns the same string for both; for a type-aware renderer this
                // is the difference between "MAS Meas" and a span full of markup.
                const raw = api.column(colIdx).render('filter').toArray()
                uniqueValues = [...new Set(raw.map((v) => this.displayText(v)).filter((v) => this.isFilled(v)))]
                    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                countSpan.textContent = `${uniqueValues.length} distinct`
                populateSelect(input.value.trim())
            }

            const clear = () => {
                input.value = ''
                populateSelect('', false)
                column.search('', false, false).draw()
                this.updateFilterEntry(colIdx, colTitle, null, null)
            }

            const applyText = (value) => {
                input.value = value
                populateSelect(value, false)
                if (!value) {
                    column.search('', false, false).draw()
                    this.updateFilterEntry(colIdx, colTitle, null, null)
                    return
                }
                column.search(value, false, true).draw()
                this.updateFilterEntry(colIdx, colTitle, `contains "${value}"`, clear)
            }

            const applyValues = (selectedValues) => {
                if (selectedValues.length === 0) {
                    column.search('', false, false).draw()
                    this.updateFilterEntry(colIdx, colTitle, null, null)
                    return
                }
                input.value = ''
                const regex = selectedValues.map((v) => `^${this.escapeRegex(v)}$`).join('|')
                column.search(regex, true, false).draw()
                const description = selectedValues.length === 1
                    ? selectedValues[0]
                    : `${selectedValues.length} selected`
                this.updateFilterEntry(colIdx, colTitle, description, clear)
            }

            input.addEventListener('input', () => applyText(input.value.trim()))
            select.addEventListener('change', () => {
                applyValues(Array.from(select.selectedOptions).map((o) => o.value))
            })

            const setSpec = (spec) => {
                if (spec === null || spec === undefined) {
                    clear()
                    return
                }
                refresh()
                if (Array.isArray(spec.values)) {
                    const wanted = new Set(spec.values.map((v) => String(v)))
                    populateSelect('', false)
                    Array.from(select.options).forEach((o) => { o.selected = wanted.has(o.value) })
                    applyValues(Array.from(select.selectedOptions).map((o) => o.value))
                    return
                }
                if (typeof spec.text === 'string') {
                    applyText(spec.text.trim())
                    return
                }
                throw new Error(`FilterableDataTable: column "${key}" is text; spec must be { values } , { text } or null`)
            }

            popBody.appendChild(input)
            popBody.appendChild(select)

            return { refresh, clear, setSpec, focusTarget: input }
        },

        // ------------------------------------------------------------------
        // Per-column orchestration
        // ------------------------------------------------------------------
        setupColumnFilter(column, api) {
            const colIdx = column.index()
            const colDef = this.columns[colIdx] ?? {}
            if (colDef.filterable === false) return

            const headerCell = column.header()
            const colTitle = colDef.title ?? headerCell.textContent.trim()
            const key = this.columnKey(colIdx)
            const colData = column.data().toArray()
            const nonEmptyValues = colData.filter((value) => this.isFilled(value))
            const numericColumn = colDef.type !== 'string' && this.isNumericColumn(nonEmptyValues)

            const funnel = document.createElement('span')
            funnel.classList.add('column-filter-funnel')
            funnel.title = `Filter by ${colTitle}`
            funnel.innerHTML = '<i class="pi pi-filter"></i>'
            this.setCy(funnel, `filter-${key}`)
            this.funnelElements.set(colIdx, funnel)

            const { popover, popBody, countSpan, closeBtn } = this.createPopoverElements(colTitle)

            const controls = numericColumn
                ? this.setupNumericFilter({ api, colIdx, colTitle, key, popBody, countSpan })
                : this.setupTextFilter({ api, column, colIdx, colTitle, key, popBody, countSpan })

            closeBtn.addEventListener('click', (event) => {
                event.stopPropagation()
                this.closeOpenPopover()
            })
            popover.addEventListener('mousedown', (event) => event.stopPropagation())
            popover.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    event.stopPropagation()
                    this.closeOpenPopover()
                }
            })
            document.body.appendChild(popover)
            this.popovers.set(colIdx, { popover, ...controls })

            funnel.addEventListener('click', (event) => {
                event.stopPropagation()
                event.preventDefault()
                if (this.openPopover === popover) {
                    this.closeOpenPopover()
                    return
                }
                this.closeOpenPopover()
                controls.refresh()
                this.positionPopover(popover, headerCell)
                this.openPopover = popover
                controls.focusTarget.focus()
            })

            const headerContent = headerCell.querySelector('.dt-column-header') || headerCell
            headerContent.appendChild(funnel)
        },
        resetFilterUi() {
            this.closeOpenPopover()
            this.popovers.forEach(({ popover }) => popover.remove())
            this.popovers.clear()
            if (typeof document !== 'undefined' && this.$ && this.$.uid != null) {
                document.querySelectorAll(`[data-fdt-instance="${this.$.uid}"]`).forEach((el) => el.remove())
            }
            this.funnelElements.forEach((funnel) => funnel.remove())
            this.funnelElements.clear()
            this.rangeFilters.clear()
            this.activeFilters = []
        },
        initializeColumnFilters(api) {
            this.registerSideEffects()
            this.totalRows = api.rows().count()
            this.filteredRows = this.totalRows

            // Range filtering as a per-table fixed search on THIS table's API,
            // never via the global DataTablesCore.ext.search (which would leak
            // into every other table on the page).
            api.search.fixed('fdtRange', (_filterRow, _rowData, rowIdx) => {
                if (this.rangeFilters.size === 0) return true
                for (const [colIdx, bounds] of this.rangeFilters.entries()) {
                    const value = Number.parseFloat(api.cell(rowIdx, colIdx).data())
                    if (Number.isNaN(value)) return false
                    if (bounds.min !== null && value < bounds.min) return false
                    if (bounds.max !== null && value > bounds.max) return false
                }
                return true
            })

            api.on('draw', () => {
                this.totalRows = api.rows().count()
                this.filteredRows = api.rows({ search: 'applied' }).count()
            })

            this.resetFilterUi()
            const vm = this
            api.columns().every(function () {
                vm.setupColumnFilter(this, api)
            })

            const pending = this.pendingFilters
            this.pendingFilters = []
            pending.forEach(([dataKey, spec]) => this.setColumnFilter(dataKey, spec))
        },

        // ------------------------------------------------------------------
        // Global side effects
        // ------------------------------------------------------------------
        registerSideEffects() {
            if (this.boundDocumentClickHandler) return
            this.boundDocumentClickHandler = (event) => this.handleDocumentClick(event)
            document.addEventListener('mousedown', this.boundDocumentClickHandler, true)
        },
        unregisterSideEffects() {
            if (!this.boundDocumentClickHandler) return
            document.removeEventListener('mousedown', this.boundDocumentClickHandler, true)
            this.boundDocumentClickHandler = null
        },

        // ------------------------------------------------------------------
        // CSV export
        // ------------------------------------------------------------------
        resolveColumnValue(row, column) {
            if (typeof column.data === 'function') return column.data(row)
            if (typeof column.data === 'string') {
                return column.data.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), row)
            }
            return undefined
        },
        csvEscape(value) {
            if (value === null || value === undefined) return ''
            const text = String(value)
            if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
            return text
        },
        /** Exports every row of `data` (not only the filtered page). */
        exportToCsv() {
            if (!this.data.length) return
            const exportable = this.columns.filter((column) => column.exportable !== false && column.data)
            const header = exportable.map((column) => this.csvEscape(column.title ?? column.data))
            const lines = this.data.map((row) =>
                exportable.map((column) => this.csvEscape(this.resolveColumnValue(row, column))).join(',')
            )
            const csvContent = [header.join(','), ...lines].join('\r\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${this.exportFileName}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        },
    },
}
</script>

<template>
    <div class="fdt" :class="{ 'column-filters-enabled': columnFilters, 'fdt-compact': compact }">
        <div v-if="columnFilters" class="filter-summary-bar">
            <div class="filter-count-row">
                <div class="filter-count" :data-cy="cy('filter-count')">
                    <i class="pi pi-filter" aria-hidden="true"></i>
                    <span>{{ filterCountLabel }}</span>
                    <span class="filter-hint">Click a column's funnel to filter it, its title to sort.</span>
                </div>
                <button
                    v-if="exportCsv"
                    type="button"
                    class="fdt-btn"
                    :data-cy="cy('export-csv')"
                    @click="exportToCsv"
                >
                    <i class="pi pi-download" aria-hidden="true"></i> Export CSV
                </button>
            </div>
            <div v-if="activeFilters.length" class="active-filters-row">
                <span
                    v-for="filter in activeFilters"
                    :key="filter.colIdx"
                    class="active-filter-tag"
                    :data-cy="cy('filter-tag-' + filter.key)"
                >
                    {{ filter.title }}: {{ filter.description }}
                    <button
                        type="button"
                        class="active-filter-remove"
                        :aria-label="'Remove filter on ' + filter.title"
                        @click="removeFilter(filter)"
                    >
                        <i class="pi pi-times" aria-hidden="true"></i>
                    </button>
                </span>
                <button
                    type="button"
                    class="fdt-btn fdt-btn-link"
                    :data-cy="cy('filter-clear-all')"
                    @click="clearAllFilters"
                >
                    Clear all
                </button>
            </div>
        </div>

        <div class="dt-scroll-wrapper">
            <DataTablesVue
                class="fdt-table"
                :data="data"
                :columns="columns"
                :options="computedOptions"
                width="100%"
                ref="table"
            />
        </div>
    </div>
</template>

<style scoped>
.fdt {
    --_fdt-accent: var(--fdt-accent, var(--p-primary));
    --_fdt-accent-rgb: var(--fdt-accent-rgb, var(--p-primary-rgb));
    --_fdt-muted: var(--fdt-popover-muted, var(--p-gray-500));
    --_fdt-color: var(--fdt-popover-color, var(--p-body-color));
    --_fdt-border: var(--fdt-popover-border, var(--p-secondary));
    --_fdt-header-bg: var(--fdt-popover-header-bg, var(--p-gray-800));
}

.dt-scroll-wrapper {
    overflow-x: auto;
    width: 100%;
}

/* Compact mode: see the `compact` prop. */
.fdt-compact :deep(.dataTable) {
    font-size: 0.8rem;
}
.fdt-compact :deep(.dataTable thead > tr > th),
.fdt-compact :deep(.dataTable tbody > tr > td) {
    padding-left: 0.3rem;
    padding-right: 0.3rem;
}
.fdt-compact :deep(.dataTable thead > tr > th) {
    text-transform: none;
}

.fdt-table {
    width: 100%;
}

/* Header layout: title, order arrows, funnel — on one line. */
.fdt :deep(.dataTable thead > tr > th div.dt-column-header),
.fdt :deep(.dataTable thead > tr > td div.dt-column-header) {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 0.25rem;
}
.fdt :deep(.dataTable thead > tr > th span.dt-column-title) {
    order: 1;
    flex: 1 1 auto;
    min-width: 0;
}
.fdt :deep(.dataTable thead > tr > th span.dt-column-order) {
    order: 2;
    flex: 0 0 auto;
    position: static;
    margin-left: 0.2rem;
    display: inline-flex;
    flex-direction: column;
    line-height: 0.55;
    font-size: 0.6em;
    opacity: 0.35;
}
/* Order arrows (the datatables.net-dt stylesheet is not loaded; draw our own). */
.fdt :deep(.dataTable thead > tr > th.dt-orderable-asc span.dt-column-order::before) {
    content: '▲';
}
.fdt :deep(.dataTable thead > tr > th.dt-orderable-desc span.dt-column-order::after) {
    content: '▼';
}
.fdt :deep(.dataTable thead > tr > th.dt-ordering-asc span.dt-column-order),
.fdt :deep(.dataTable thead > tr > th.dt-ordering-desc span.dt-column-order) {
    opacity: 1;
    color: var(--_fdt-accent);
}
.fdt :deep(.dataTable thead > tr > th.dt-ordering-asc span.dt-column-order::after),
.fdt :deep(.dataTable thead > tr > th.dt-ordering-desc span.dt-column-order::before) {
    opacity: 0.3;
}
.fdt :deep(.dataTable thead > tr > th.dt-orderable-asc),
.fdt :deep(.dataTable thead > tr > th.dt-orderable-desc) {
    cursor: pointer;
    user-select: none;
}
.fdt :deep(.column-filter-funnel) {
    display: inline-flex;
    align-items: center;
    order: 3;
    flex: 0 0 auto;
    cursor: pointer;
    opacity: 0.35;
    font-size: 0.75em;
    padding: 0.1rem 0.15rem;
    border-radius: var(--p-border-radius);
    transition: opacity 0.15s, color 0.15s;
}
.fdt :deep(.column-filter-funnel:hover) {
    opacity: 0.9;
}
.fdt :deep(.column-filter-funnel.filter-active) {
    opacity: 1;
    color: var(--_fdt-accent);
}
.fdt :deep(tbody tr) {
    cursor: pointer;
}

/* Summary bar */
.filter-summary-bar {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.45rem 0.65rem;
    margin-bottom: 0.5rem;
    background-color: var(--_fdt-header-bg);
    border: 1px solid var(--_fdt-border);
    border-radius: var(--p-border-radius);
}
.filter-count-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
}
.filter-count {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: var(--_fdt-color);
    flex-wrap: wrap;
}
.filter-count i {
    color: var(--_fdt-muted);
    flex-shrink: 0;
}
.filter-hint {
    color: var(--_fdt-muted);
    font-size: 0.75rem;
}
.active-filters-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
}
.active-filter-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background-color: rgba(var(--_fdt-accent-rgb), 0.15);
    color: var(--_fdt-color);
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.15rem 0.6rem;
    border-radius: 1rem;
    border: 1px solid rgba(var(--_fdt-accent-rgb), 0.5);
    white-space: nowrap;
}
.active-filter-remove {
    background: none;
    border: none;
    color: var(--_fdt-muted);
    line-height: 1;
    padding: 0 0 0 0.1rem;
    cursor: pointer;
}
.active-filter-remove:hover {
    color: var(--p-danger);
}
.active-filter-remove i {
    font-size: 0.6rem;
}
.fdt-btn {
    background-color: transparent;
    color: var(--_fdt-color);
    border: 1px solid var(--_fdt-border);
    border-radius: var(--p-border-radius);
    padding: 0.2rem 0.6rem;
    font-size: 0.75rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    transition: background-color 0.15s, border-color 0.15s;
}
.fdt-btn:hover {
    border-color: var(--_fdt-accent);
    background-color: rgba(var(--_fdt-accent-rgb), 0.12);
}
.fdt-btn-link {
    border-color: transparent;
    color: var(--_fdt-muted);
    text-decoration: underline;
}
.fdt-btn-link:hover {
    color: var(--p-danger);
    background: none;
}
</style>

<style>
/* Popovers are appended to <body>: global rules, themed through the
 * --fdt-* variables copied from the host (see POPOVER_THEME_VARS). */
.column-filter-popover {
    background: var(--fdt-popover-bg, var(--p-body-bg));
    color: var(--fdt-popover-color, var(--p-body-color));
    border: 1px solid var(--fdt-popover-border, var(--p-secondary));
    border-radius: var(--p-border-radius);
    box-shadow: 0 8px 24px rgba(var(--p-black-rgb), 0.35);
    min-width: 200px;
    max-width: 300px;
    font-size: 0.85rem;
}
.column-filter-popover .filter-popover-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.75rem;
    border-bottom: 1px solid var(--fdt-popover-border, var(--p-secondary));
    background: var(--fdt-popover-header-bg, var(--p-gray-800));
    border-radius: var(--p-border-radius) var(--p-border-radius) 0 0;
}
.column-filter-popover .filter-popover-title {
    font-weight: 600;
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
}
.column-filter-popover .filter-popover-count {
    font-size: 0.7rem;
    color: var(--fdt-popover-muted, var(--p-gray-500));
    flex-shrink: 0;
}
.column-filter-popover .filter-popover-close {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--fdt-popover-muted, var(--p-gray-500));
    cursor: pointer;
    padding: 0.1rem;
    border-radius: var(--p-border-radius);
    display: flex;
    align-items: center;
    flex-shrink: 0;
}
.column-filter-popover .filter-popover-close:hover {
    color: var(--p-danger);
}
.column-filter-popover .filter-popover-close i {
    font-size: 0.7rem;
}
.column-filter-popover .filter-popover-body {
    padding: 0.6rem 0.75rem;
}
.column-filter-popover .filter-popover-range {
    display: flex;
    gap: 0.6rem;
}
.column-filter-popover .filter-range-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
}
.column-filter-popover .filter-range-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--fdt-popover-muted, var(--p-gray-500));
    text-transform: uppercase;
    letter-spacing: 0.02em;
}
.column-filter-popover .fdt-filter-input,
.column-filter-popover .fdt-filter-select {
    display: block;
    width: 100%;
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
    line-height: 1.4;
    color: var(--fdt-input-color, var(--p-body-color));
    background-color: var(--fdt-input-bg, var(--p-body-bg));
    border: 1px solid var(--fdt-input-border, var(--p-secondary));
    border-radius: var(--p-border-radius);
    box-sizing: border-box;
    outline: none;
}
.column-filter-popover .fdt-filter-input:focus,
.column-filter-popover .fdt-filter-select:focus {
    border-color: var(--fdt-accent, var(--p-primary));
    box-shadow: 0 0 0 0.15rem rgba(var(--fdt-accent-rgb, var(--p-primary-rgb)), 0.25);
}
.column-filter-popover .filter-dropdown {
    margin-top: 0.4rem;
    max-height: 200px;
    overflow-y: auto;
}
.column-filter-popover .filter-dropdown option {
    padding: 0.15rem 0.4rem;
    border-radius: var(--p-border-radius);
}
.column-filter-popover .filter-dropdown option:checked {
    background: var(--fdt-accent, var(--p-primary));
    color: var(--p-white);
}
</style>
