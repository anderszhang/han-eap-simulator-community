<template>
  <div class="database-admin-page">
    <el-card class="page-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" @click="loadTables" :loading="tablesLoading">
            <el-icon><Refresh /></el-icon>
            Refresh
          </el-button>
          <el-tag type="info" effect="plain">Admin only</el-tag>
        </div>
        <span class="toolbar-title">Database Admin</span>
      </div>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="Tables" name="tables">
          <div class="tables-layout">
            <div class="table-list">
              <el-input
                v-model="tableSearch"
                clearable
                placeholder="Search table..."
                class="table-search"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>

              <el-table
                :data="filteredTables"
                border
                size="small"
                height="calc(100vh - 300px)"
                v-loading="tablesLoading"
                highlight-current-row
                @row-click="handleSelectTable"
                :row-class-name="getTableRowClass"
              >
                <el-table-column prop="name" label="Name" min-width="150" />
                <el-table-column prop="type" label="Type" width="90" />
                <el-table-column prop="rowCount" label="Rows" width="80" align="center" />
              </el-table>
            </div>

            <div class="table-detail">
              <template v-if="selectedTableDetail">
                <div class="detail-header">
                  <div>
                    <h3>{{ selectedTableDetail.name }}</h3>
                    <p class="detail-subtitle">{{ selectedTableDetail.type }} · {{ selectedTableDetail.rowCount }} row(s)</p>
                  </div>
                  <el-button @click="loadTableDetail(selectedTableDetail.name)" :loading="detailLoading">
                    <el-icon><Refresh /></el-icon>
                    Reload
                  </el-button>
                </div>

                <el-descriptions :column="2" size="small" border class="detail-meta">
                  <el-descriptions-item label="SQL" :span="2">
                    <pre class="sql-preview">{{ selectedTableDetail.sql || '-' }}</pre>
                  </el-descriptions-item>
                </el-descriptions>

                <div class="section">
                  <div class="section-title">Columns</div>
                  <el-table :data="selectedTableDetail.columns" border size="small" max-height="260">
                    <el-table-column prop="cid" label="#" width="60" />
                    <el-table-column prop="name" label="Name" min-width="150" />
                    <el-table-column prop="type" label="Type" min-width="120" />
                    <el-table-column prop="notNull" label="Not Null" width="90" align="center">
                      <template #default="{ row }">
                        <el-tag :type="row.notNull ? 'success' : 'info'" size="small">{{ row.notNull ? 'Yes' : 'No' }}</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="primaryKey" label="PK" width="70" align="center">
                      <template #default="{ row }">
                        <el-tag :type="row.primaryKey ? 'warning' : 'info'" size="small">{{ row.primaryKey ? 'Yes' : 'No' }}</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column label="Default" min-width="150">
                      <template #default="{ row }">
                        {{ row.defaultValue ?? '-' }}
                      </template>
                    </el-table-column>
                  </el-table>
                </div>

                <div class="section">
                  <div class="section-title">Foreign Keys</div>
                  <el-table :data="selectedTableDetail.foreignKeys" border size="small" max-height="220">
                    <el-table-column prop="table" label="Reference Table" min-width="140" />
                    <el-table-column prop="from" label="From" min-width="120" />
                    <el-table-column prop="to" label="To" min-width="120" />
                    <el-table-column prop="onUpdate" label="On Update" min-width="120" />
                    <el-table-column prop="onDelete" label="On Delete" min-width="120" />
                  </el-table>
                </div>

                <div class="section">
                  <div class="section-title">Indexes</div>
                  <el-table :data="selectedTableDetail.indexes" border size="small" max-height="220">
                    <el-table-column prop="name" label="Name" min-width="160" />
                    <el-table-column prop="unique" label="Unique" width="80" align="center">
                      <template #default="{ row }">
                        <el-tag :type="row.unique ? 'success' : 'info'" size="small">{{ row.unique ? 'Yes' : 'No' }}</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="origin" label="Origin" min-width="100" />
                    <el-table-column prop="partial" label="Partial" width="90" align="center">
                      <template #default="{ row }">
                        <el-tag :type="row.partial ? 'warning' : 'info'" size="small">{{ row.partial ? 'Yes' : 'No' }}</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="columns" label="Columns" min-width="180">
                      <template #default="{ row }">
                        {{ row.columns.join(', ') || '-' }}
                      </template>
                    </el-table-column>
                  </el-table>
                </div>

                <div class="section">
                  <div class="section-title">Sample Rows</div>
                  <el-table
                    v-if="selectedTableDetail.sampleRows.length > 0"
                    :data="selectedTableDetail.sampleRows"
                    border
                    size="small"
                    max-height="320"
                  >
                    <el-table-column
                      v-for="column in tableSampleColumns"
                      :key="column"
                      :prop="column"
                      :label="column"
                      min-width="140"
                      show-overflow-tooltip
                    />
                  </el-table>
                  <el-empty v-else description="No data preview" :image-size="60" />
                </div>
              </template>

              <el-empty v-else description="Select a table on the left" :image-size="80" />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="SQL Console" name="sql">
          <div class="sql-layout">
            <el-form :model="sqlForm" label-width="70px">
              <el-form-item label="SQL">
                <el-input
                  v-model="sqlForm.sql"
                  type="textarea"
                  :rows="10"
                  placeholder="SELECT * FROM users LIMIT 20"
                  class="sql-input"
                />
              </el-form-item>
              <el-form-item label="Limit">
                <el-input-number v-model="sqlForm.limit" :min="1" :max="500" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="queryLoading" @click="handleQuery">
                  <el-icon><Search /></el-icon>
                  Run Query
                </el-button>
                <el-button :loading="executeLoading" @click="handleExecute">
                  Execute
                </el-button>
                <el-button @click="clearSql">
                  Clear
                </el-button>
              </el-form-item>
            </el-form>

            <el-alert
              type="warning"
              :closable="false"
              title="Query supports SELECT, WITH, PRAGMA, EXPLAIN. Execute is for non-query SQL only and runs a single statement."
              class="sql-note"
            />

            <div v-if="queryResult" class="section">
              <div class="section-title">
                Query Result
                <el-tag v-if="queryResult.hasMore" type="warning" size="small">Truncated</el-tag>
              </div>
              <el-table :data="queryResult.rows" border size="small" max-height="420">
                <el-table-column
                  v-for="column in queryResult.columns"
                  :key="column"
                  :prop="column"
                  :label="column"
                  min-width="140"
                  show-overflow-tooltip
                />
              </el-table>
              <div class="result-summary">
                <span>Rows: {{ queryResult.rowCount }}</span>
                <span v-if="queryResult.hasMore">More rows were omitted to keep the console responsive.</span>
              </div>
            </div>

            <div v-if="executeResult" class="section">
              <div class="section-title">Execute Result</div>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="Rows Affected">{{ executeResult.rowsAffected }}</el-descriptions-item>
                <el-descriptions-item label="Last Insert ID">{{ executeResult.lastInsertId }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import databaseApi from '../api/database'
import type { DatabaseExecuteResult, DatabaseQueryResult, DatabaseTable, DatabaseTableDetail } from '../types'

const activeTab = ref('tables')
const tables = ref<DatabaseTable[]>([])
const tablesLoading = ref(false)
const detailLoading = ref(false)
const queryLoading = ref(false)
const executeLoading = ref(false)
const tableSearch = ref('')
const selectedTableName = ref('')
const selectedTableDetail = ref<DatabaseTableDetail | null>(null)
const queryResult = ref<DatabaseQueryResult | null>(null)
const executeResult = ref<DatabaseExecuteResult | null>(null)
const sqlForm = reactive({
  sql: 'SELECT * FROM users LIMIT 20',
  limit: 100,
})

const filteredTables = computed(() => {
  const keyword = tableSearch.value.trim().toLowerCase()
  if (!keyword) {
    return tables.value
  }
  return tables.value.filter((item) => item.name.toLowerCase().includes(keyword) || item.type.toLowerCase().includes(keyword))
})

const tableSampleColumns = computed(() => {
  if (!selectedTableDetail.value) {
    return []
  }
  if (selectedTableDetail.value.columns.length > 0) {
    return selectedTableDetail.value.columns.map((column) => column.name)
  }
  const firstRow = selectedTableDetail.value.sampleRows[0]
  return firstRow ? Object.keys(firstRow) : []
})

const loadTables = async () => {
  tablesLoading.value = true
  try {
    const response = await databaseApi.listTables()
    tables.value = response.data.data || []
    if (tables.value.length > 0) {
      const selectedExists = selectedTableName.value && tables.value.some((item) => item.name === selectedTableName.value)
      await loadTableDetail(selectedExists ? selectedTableName.value : tables.value[0].name)
    } else {
      selectedTableName.value = ''
      selectedTableDetail.value = null
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || 'Failed to load tables')
  } finally {
    tablesLoading.value = false
  }
}

const loadTableDetail = async (name: string) => {
  selectedTableName.value = name
  detailLoading.value = true
  try {
    const response = await databaseApi.getTableDetail(name, { limit: 50 })
    selectedTableDetail.value = response.data.data || null
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || 'Failed to load table detail')
  } finally {
    detailLoading.value = false
  }
}

const handleSelectTable = (row: DatabaseTable) => {
  if (row.name !== selectedTableName.value) {
    loadTableDetail(row.name)
  }
}

const getTableRowClass = ({ row }: { row: DatabaseTable }) => {
  return row.name === selectedTableName.value ? 'current-table-row' : ''
}

const handleQuery = async () => {
  queryLoading.value = true
  executeResult.value = null
  try {
    const response = await databaseApi.query({
      sql: sqlForm.sql,
      limit: sqlForm.limit,
    })
    queryResult.value = response.data.data || null
    activeTab.value = 'sql'
  } catch (error: any) {
    queryResult.value = null
    ElMessage.error(error.response?.data?.error || 'Failed to run query')
  } finally {
    queryLoading.value = false
  }
}

const handleExecute = async () => {
  try {
    await ElMessageBox.confirm(
      'Execute the SQL statement? This action may modify database data.',
      'Confirm Execution',
      { type: 'warning' }
    )
  } catch {
    return
  }

  executeLoading.value = true
  queryResult.value = null
  try {
    const response = await databaseApi.execute({
      sql: sqlForm.sql,
    })
    executeResult.value = response.data.data || null
    activeTab.value = 'sql'
    ElMessage.success('SQL executed')
    await loadTables()
  } catch (error: any) {
    executeResult.value = null
    ElMessage.error(error.response?.data?.error || 'Failed to execute SQL')
  } finally {
    executeLoading.value = false
  }
}

const clearSql = () => {
  sqlForm.sql = ''
  queryResult.value = null
  executeResult.value = null
}

onMounted(() => {
  loadTables()
})
</script>

<style scoped>
.database-admin-page {
  padding: 4px 4px 16px 4px;
  height: calc(100vh - 85px);
  min-height: 400px;
  box-sizing: border-box;
}

.page-card {
  height: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.toolbar-left {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.toolbar-title {
  font-weight: 600;
}

.tables-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  min-height: calc(100vh - 220px);
}

.table-list {
  min-width: 0;
}

.table-search {
  margin-bottom: 12px;
}

.table-detail {
  min-width: 0;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-header h3 {
  margin: 0;
}

.detail-subtitle {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.detail-meta {
  margin-bottom: 16px;
}

.sql-preview {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--el-font-family-monospace);
  font-size: 12px;
}

.section {
  margin-top: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 8px;
}

.sql-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sql-input :deep(textarea) {
  font-family: var(--el-font-family-monospace);
}

.sql-note {
  margin-bottom: 4px;
}

.result-summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

:deep(.current-table-row) {
  --el-table-tr-bg-color: var(--el-color-primary-light-9);
}

:deep(.el-tabs__content) {
  overflow: visible;
}
</style>
