// User related types
export interface User {
  id: number
  username: string
  password?: string
  roleId: number
  roleName: string
  status?: string
  passwordChangeRequired?: boolean
}

export interface LoginForm {
  username: string
  password: string
}

export interface LoginResponse {
  message: string
  user: User
}

// Engine related types
export interface Engine {
  id: number
  mode: 'active' | 'passive'
  engineName: string
  ip: string
  port: number
  t3: number
  t5: number
  t6: number
  t7: number
  t8: number
  deviceId: number
  description: string
  checklistId: number | null
  checklistName: string
  userId: number
  username: string
  createTime: string
  status: 'stopped' | 'starting' | 'running' | 'error'
}

export interface EngineRequest {
  id?: number
  mode: 'active' | 'passive'
  engineName: string
  ip: string
  port: number
  t3: number
  t5: number
  t6: number
  t7: number
  t8: number
  deviceId: number
  description: string
  checklistId?: number | null
}

export interface EngineQuery {
  page?: number
  pageSize?: number
  mode?: string
  engineName?: string
  ip?: string
  deviceId?: number | null
}

export interface EngineListResponse {
  data: Engine[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Role related types
export interface Role {
  id: number
  name: string
  description: string
  createTime: string
}

export interface RoleUser {
  id: number
  userId: number
  roleId: number
}

// SML related types
export interface SMLNode {
  id: number
  type: 'folder' | 'sml'
  name: string
  parentId?: number
  content?: string
  nodeType?: string
  template?: boolean
  isProtected?: boolean
  userId: number
  username: string
  createTime: string
  updateTime: string
  children?: SMLNode[]
}

export interface SMLNodeRequest {
  type: 'folder' | 'sml'
  name: string
  parentId?: number
  content?: string
  nodeType?: string
}

// AutoReply related types
export interface AutoReply {
  id: number
  sxFy: string
  match: string
  engineId: number | null
  engineName: string
  variables: string
  smlId: number | null
  smlName: string
  reply: string
  userId: number
  username: string
  createTime: string
  updateTime: string
}

export interface AutoReplyRequest {
  sxFy: string
  match?: string
  engineId?: number | null
  variables?: string
  smlId?: number | null
  reply?: string
}

export interface AutoReplyQuery {
  page?: number
  pageSize?: number
  sxFy?: string
  engineId?: number | null
  username?: string
}

export interface AutoReplyListResponse {
  data: AutoReply[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// API response types
export interface ApiResponse<T = any> {
  message: string
  data: T
}

export interface PaginatedResponse<T = any> {
  message: string
  data: {
    data: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

// Form validation rules
export interface FormRule {
  required?: boolean
  message?: string
  trigger?: string | string[]
  min?: number
  max?: number
}

export interface FormRules {
  [key: string]: FormRule[]
}

// Pagination
export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export interface Flow {
  id: number
  name: string
  description: string
  stepInterval: number
  commMode: 'active' | 'passive'
  published: boolean
  edges?: string
  constantVariables?: string
  userId: number
  username: string
  createTime: string
  updateTime: string
  steps?: FlowStep[]
}

export interface FlowTemplate {
  id: number
  name: string
  description: string
  commMode: 'active' | 'passive'
  stepInterval: number
  edges: string
  steps: string
  userId: number
  username: string
  createTime: string
  updateTime: string
}

export interface FlowStep {
  id?: number
  flowId?: number
  order?: number
  type: 'send' | 'receive' | 'delay' | 'function'
  name: string
  config: string
}

export interface FlowMatchRule {
  operator: 'contains' | 'equals' | 'not_equals'
  variable: string
  value: string
  targetStepIdx: number
}

export interface FlowVariable {
  name: string
  indexPath: string
}

export interface FlowStepConfig {
  sml?: string
  smlId?: number | null
  smlName?: string
  matchSxFy?: string
  timeout?: number
  milliseconds?: number
  rules?: FlowMatchRule[]
  defaultStepIdx?: number
  flowVariables?: FlowVariable[]
  nodeVariables?: FlowVariable[]
  script?: string
  computedVariables?: ComputedVariable[]
}

export interface ComputedVariable {
  name: string
  functionId: number
  params?: Record<string, string>
}

export interface FlowConstantVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'json'
  required: boolean
  defaultValue: string
  value?: string
  overridable: boolean
  description?: string
}

export interface VariableDef {
  name: string
  function: string
  params: string[]
}

export interface FlowRequest {
  name: string
  description: string
  stepInterval: number
  commMode: 'active' | 'passive'
  edges?: string
  constantVariables?: string
  steps: { type: string; name: string; config: string }[]
}

export interface FlowRunRequest {
  engineId: number
  startStepId?: string
  initialVariables?: Record<string, string>
}

export interface FlowRunStatus {
  flowId: number
  engineId: number
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped'
  currentIdx: number
  startStepIdx?: number
  stepName: string
  message?: string
}

export interface FlowQuery {
  page?: number
  pageSize?: number
  name?: string
  published?: boolean
}

export interface FlowFunction {
  id: number
  name: string
  description: string
  params: string
  script: string
  scriptJs: string
  scope: 'global' | 'flow'
  flowId: number | null
  userId: number
  username: string
  createTime: string
  updateTime: string
}

export interface FlowFunctionRequest {
  name: string
  description: string
  params: string
  script: string
  scriptJs: string
  scope: 'global' | 'flow'
  flowId?: number | null
}

// Checklist types

export interface Checklist {
  id: number
  name: string
  vendorId?: number | null
  vendor: string
  model: string
  description: string
  modelDesc: string
  dataIdType: string
  vidType: string
  rptidType: string
  ceidType: string
  ecidType: string
  alidType: string
  rsdcType: string
  userId: number
  username: string
  createTime: string
  updateTime: string
  vidCount: number
  ceidCount: number
}

export interface ChecklistRequest {
  name: string
  vendorId?: number | null
  vendor: string
  model: string
  description: string
}

export interface ChecklistQuery {
  page?: number
  pageSize?: number
  name?: string
  vendor?: string
  model?: string
}

export interface ChecklistVID {
  id: number
  checklistId: number
  vid: number
  name: string
  value: string
  format: string
  require: boolean
  description: string
  sortOrder: number
}

export interface ChecklistVIDRequest {
  vid: number
  name: string
  value?: string
  format?: string
  require?: boolean
  description?: string
}

export interface ChecklistRPTID {
  id: number
  checklistId: number
  rptid: number
  name: string
  links: string
  require: boolean
  description: string
  sortOrder: number
}

export interface ChecklistRPTIDRequest {
  rptid: number
  name: string
  links?: string
  require?: boolean
  description?: string
}

export interface ChecklistCEID {
  id: number
  checklistId: number
  ceid: number
  name: string
  links: string
  handler: string
  require: boolean
  description: string
  sortOrder: number
}

export interface ChecklistCEIDRequest {
  ceid: number
  name: string
  links?: string
  handler?: string
  require?: boolean
  description?: string
}

export interface ChecklistValueMap {
  id: number
  checklistId: number
  vidName: string
  key: string
  value: string
  sortOrder: number
}

export interface ChecklistValueMapRequest {
  vidName: string
  key: string
  value: string
}

export interface Vendor {
  id: number
  name: string
  englishName: string
  fullName: string
  country: string
  website: string
  description: string
  userId: number
  username: string
  createTime: string
  updateTime: string
  modelCount: number
}

export interface VendorRequest {
  name: string
  englishName?: string
  fullName?: string
  country?: string
  website?: string
  description?: string
}

export interface VendorQuery {
  page?: number
  pageSize?: number
  name?: string
  country?: string
}

export interface VendorMergeRequest {
  sourceVendorId: number
  targetVendorId: number
}

export interface VendorMergeResult {
  sourceVendorId: number
  targetVendorId: number
  movedModels: number
  renamedModels: number
}

export interface VendorMergePreviewItem {
  modelId: number
  oldName: string
  newName: string
}

export interface VendorMergePreviewResult {
  sourceVendorId: number
  targetVendorId: number
  sourceVendorName: string
  targetVendorName: string
  movedModels: number
  renamedModels: number
  renamedItems: VendorMergePreviewItem[]
}

export interface EquipmentModel {
  id: number
  vendorId: number
  vendorName: string
  name: string
  category: string
  description: string
  userId: number
  username: string
  createTime: string
  updateTime: string
}

export interface EquipmentModelRequest {
  vendorId: number
  name: string
  category: string
  description?: string
}

export interface EquipmentModelQuery {
  page?: number
  pageSize?: number
  name?: string
  vendorId?: number
  category?: string
}

// Database admin types
export interface DatabaseTable {
  name: string
  type: 'table' | 'view' | string
  sql: string
  rootPage: number
  rowCount: number
}

export interface DatabaseColumn {
  cid: number
  name: string
  type: string
  notNull: boolean
  defaultValue?: string | null
  primaryKey: boolean
}

export interface DatabaseForeignKey {
  id: number
  seq: number
  table: string
  from: string
  to: string
  onUpdate: string
  onDelete: string
  match: string
}

export interface DatabaseIndex {
  seq: number
  name: string
  unique: boolean
  origin: string
  partial: boolean
  columns: string[]
}

export interface DatabaseTableDetail {
  name: string
  type: string
  sql: string
  rowCount: number
  columns: DatabaseColumn[]
  foreignKeys: DatabaseForeignKey[]
  indexes: DatabaseIndex[]
  sampleRows: Record<string, any>[]
}

export interface DatabaseQueryRequest {
  sql: string
  limit?: number
}

export interface DatabaseExecuteRequest {
  sql: string
}

export interface DatabaseQueryResult {
  columns: string[]
  rows: Record<string, any>[]
  rowCount: number
  hasMore: boolean
}

export interface DatabaseExecuteResult {
  rowsAffected: number
  lastInsertId: number
}
