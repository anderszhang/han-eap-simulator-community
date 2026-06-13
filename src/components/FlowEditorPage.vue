<template>
  <div class="flow-editor">
    <!-- Top Bar -->
    <div class="editor-topbar">
      <div class="topbar-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          Back
        </el-button>
        <el-divider direction="vertical" />
        <el-input
          v-model="flowName"
          class="flow-name-input"
          :style="{ width: flowNameInputWidth + 'px' }"
          size="small"
          maxlength="100"
          placeholder="Flow name"
        />
        <el-tag v-if="isTemplateMode" type="info" size="small" effect="dark">
          Template
        </el-tag>
        <el-tag v-else-if="flowId" :type="flowStatusTag.type" size="small" effect="dark">
          {{ flowStatusTag.label }}
        </el-tag>
      </div>
      <div class="topbar-center">
        <el-form inline class="topbar-form">
          <el-form-item label="Mode">
            <el-tag :type="commMode === 'passive' ? 'warning' : ''" size="small" class="mode-tag">{{ commMode === 'passive' ? 'Passive' : 'Active' }}</el-tag>
          </el-form-item>
          <el-form-item label="Interval">
            <el-input-number v-model="stepInterval" :min="0" :max="60000" :step="100" controls-position="right" size="small" style="width: 120px" />
            <span class="interval-unit">ms</span>
          </el-form-item>
        </el-form>
      </div>
      <div class="topbar-right">
        <el-tooltip v-if="!isTemplateMode" content="Open Auto SECS with this engine selected" placement="bottom">
          <span class="action-wrap">
            <el-select
              v-model="runEngineId"
              placeholder="Engine optional"
              size="small"
              style="width: 160px"
            >
              <el-option v-for="e in filteredEngines" :key="e.id" :label="e.engineName" :value="e.id" />
            </el-select>
          </span>
        </el-tooltip>
        <el-tooltip v-if="!isTemplateMode" content="Save changes before opening Auto SECS" placement="bottom" :disabled="!isDirty">
          <span class="action-wrap">
            <el-button type="success" @click="handleRun" :disabled="isDirty" size="small">
              <el-icon><VideoPlay /></el-icon>
              Open Runner
            </el-button>
          </span>
        </el-tooltip>
        <el-button
          v-if="!isTemplateMode && isPublished"
          type="success"
          size="small"
          disabled
        >
          <el-icon><CircleCheck /></el-icon>
          Published
        </el-button>
        <el-tooltip v-if="!isTemplateMode" content="Save changes before publishing" placement="bottom" :disabled="!isDirty">
          <span class="action-wrap">
            <el-button
              v-if="!isPublished"
              type="warning"
              size="small"
              :disabled="!flowId || isDirty"
              :loading="publishing"
              @click="handlePublish"
            >
              <el-icon><Upload /></el-icon>
              Publish
            </el-button>
          </span>
        </el-tooltip>
        <el-dropdown
          v-if="!isTemplateMode"
          split-button
          type="primary"
          size="small"
          trigger="click"
          :button-props="{ loading: saving }"
          @click="handleSave"
          @command="onSaveDropdownCommand"
        >
          <el-icon><Check /></el-icon>
          <span>Save</span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="saveTemplate">
                <el-icon><Plus /></el-icon>
                Save as Template
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          v-else
          type="primary"
          size="small"
          :loading="saving"
          @click="handleSave"
        >
          <el-icon><Check /></el-icon>
          Save
        </el-button>
      </div>
    </div>

    <!-- Three Panel Layout -->
    <div class="editor-body" ref="editorBodyRef">
      <!-- Left Panel: Activity Bar + Sidebar -->
      <div class="panel-left">
        <!-- Activity Bar (always visible) -->
        <div class="activity-bar">
          <el-tooltip content="Components" placement="right">
            <div
              class="activity-icon"
              :class="{ active: activeSidebarView === 'components' && sidebarExpanded }"
              @click="toggleSidebarView('components')"
            >
              <el-icon><Grid /></el-icon>
            </div>
          </el-tooltip>
          <el-tooltip content="Functions" placement="right">
            <div
              class="activity-icon"
              :class="{ active: activeSidebarView === 'functions' && sidebarExpanded }"
              @click="toggleSidebarView('functions')"
            >
              <el-icon><Tickets /></el-icon>
            </div>
          </el-tooltip>
          <el-tooltip content="Table View" placement="right">
            <div
              class="activity-icon"
              :class="{ active: activeSidebarView === 'table' && sidebarExpanded }"
              @click="toggleSidebarView('table')"
            >
              <el-icon><Setting /></el-icon>
            </div>
          </el-tooltip>
        </div>

        <!-- Sidebar Content (toggleable) -->
        <div v-show="sidebarExpanded" class="sidebar-content" :style="{ width: leftSidebarWidth + 'px' }">
          <!-- Components View -->
          <template v-if="activeSidebarView === 'components'">
            <div class="sidebar-header">
              <span class="section-title">Components</span>
              <el-icon class="collapse-btn" @click="sidebarExpanded = false"><ArrowLeft /></el-icon>
            </div>
            <div class="component-list">
              <div
                v-for="comp in stepTypes"
                :key="comp.type"
                class="component-item"
                :class="'comp-' + comp.type"
                draggable="true"
                @dragstart="(e: DragEvent) => onDragStart(e, comp.type)"
              >
                <div class="comp-icon" :style="{ backgroundColor: comp.color }">
                  <el-icon :size="16"><component :is="comp.icon" /></el-icon>
                </div>
                <div class="comp-info">
                  <span class="comp-name">{{ comp.label }}</span>
                  <span class="comp-desc">{{ comp.desc }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Functions View -->
          <template v-if="activeSidebarView === 'functions'">
            <div class="sidebar-header">
              <span class="section-title">Functions</span>
              <div class="header-actions">
                <el-button type="primary" :icon="Plus" circle size="small" @click="openFunctionDrawer()" />
                <el-icon class="collapse-btn" @click="sidebarExpanded = false"><ArrowLeft /></el-icon>
              </div>
            </div>
            <div class="function-list">
              <div v-if="flowFunctions.length === 0" class="fn-empty">
                No functions yet
              </div>
              <div
                v-for="fn in flowFunctions"
                :key="fn.id"
                class="function-item"
                @click="openFunctionDrawer(fn)"
              >
                <div class="fn-row">
                  <span class="fn-name">{{ fn.name }}</span>
                  <el-tag size="small" :type="fn.scope === 'global' ? '' : 'warning'" effect="plain">
                    {{ fn.scope === 'global' ? 'G' : 'F' }}
                  </el-tag>
                  <el-dropdown trigger="click" @command="(cmd: string) => onFnCommand(cmd, fn)" @click.stop>
                    <el-icon class="fn-more"><MoreFilled /></el-icon>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="delete"><el-icon><Delete /></el-icon> Delete</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
                <div v-if="fn.description" class="fn-desc">{{ fn.description }}</div>
              </div>
            </div>
          </template>

          <!-- Table View -->
          <template v-if="activeSidebarView === 'table'">
            <div class="sidebar-header">
              <span class="section-title">Table View</span>
              <el-icon class="collapse-btn" @click="sidebarExpanded = false"><ArrowLeft /></el-icon>
            </div>
            <div v-if="sortedNodes.length === 0" class="table-empty">
              <el-icon :size="24" color="#c0c4cc"><InfoFilled /></el-icon>
              <p class="table-empty-text">No nodes</p>
            </div>
            <el-table
              v-else
              :data="sortedNodes"
              size="small"
              stripe
              highlight-current-row
              :row-class-name="getTableRowClassName"
              @row-click="onTableRowClick"
              @row-dblclick="onTableRowDoubleClick"
              class="node-table"
            >
              <el-table-column type="index" width="32" align="center" />
              <el-table-column prop="data.name" label="Name" min-width="140" show-overflow-tooltip>
                <template #default="{ row }">
                  <span :class="{ 'unnamed-node': !row.data?.name }">
                    {{ row.data?.name || 'Unnamed' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="Type" width="48" align="center">
                <template #default="{ row }">
                  <el-tag
                    :type="getStepTagType(row.data?.stepType)"
                    size="small"
                    effect="dark"
                    style="width: 28px; padding: 0; justify-content: center"
                  >
                    {{ getStepTypeShort(row.data?.stepType) }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </div>
      </div>

      <div
        class="flow-resizer"
        :class="{ disabled: !sidebarExpanded }"
        @mousedown.left="onFlowResizerDown('left', $event)"
      ></div>

      <!-- Center Panel: Canvas -->
      <div class="panel-center" @drop="onDrop" @dragover="onDragOver" @dragleave="onDragLeave" @contextmenu.prevent :class="{ 'drag-over': isDragOver }">
        <VueFlow
          ref="vueFlowRef"
          v-model:nodes="nodes"
          v-model:edges="edges"
          :default-viewport="{ x: 50, y: 50, zoom: 0.9 }"
          :snap-to-grid="true"
          :snap-grid="[20, 20]"
          :selection-key-code="interactionMode === 'select'"
          :multi-selection-key-code="['Meta', 'Control']"
          :delete-key-code="null"
          :pan-on-drag="interactionMode === 'pan'"
          :pan-activation-key-code="null"
          :pan-on-scroll="true"
          :zoom-on-scroll="false"
          fit-view-on-init
          @node-click="onNodeClick"
          @pane-click="onPaneClick"
          @connect="onConnect"
          @edge-click="onEdgeClick"
          @node-drag-start="onNodeDragStart"
          @node-drag-stop="onNodeDragStop"
        >
          <template #node-send="props">
            <FlowNode :data="props.data" :selected="props.selected" :step-index="getNodeStepIndex(props.id)" type="send" />
          </template>
          <template #node-receive="props">
            <FlowNode :data="props.data" :selected="props.selected" :step-index="getNodeStepIndex(props.id)" type="receive" />
          </template>
          <template #node-delay="props">
            <FlowNode :data="props.data" :selected="props.selected" :step-index="getNodeStepIndex(props.id)" type="delay" />
          </template>
          <template #node-function="props">
            <FlowNode :data="props.data" :selected="props.selected" :step-index="getNodeStepIndex(props.id)" type="function" />
          </template>

          <Background :gap="20" />
          <Controls position="bottom-left">
            <template #default>
              <button
                class="vue-flow__controls-button"
                title="Undo layout or graph action (Ctrl/Cmd+Z)"
                :disabled="!canUndoGraph"
                @click="undoGraph"
              >
                <el-icon><RefreshLeft /></el-icon>
              </button>
              <button
                class="vue-flow__controls-button"
                title="Redo layout or graph action (Ctrl/Cmd+Shift+Z)"
                :disabled="!canRedoGraph"
                @click="redoGraph"
              >
                <el-icon><RefreshRight /></el-icon>
              </button>
              <el-dropdown class="layout-dropdown" trigger="click" placement="top-start" @command="onLayoutCommand">
                <button
                  class="vue-flow__controls-button"
                  title="Arrange nodes"
                >
                  <el-icon><Operation /></el-icon>
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="alignCenter" :disabled="selectedNodes.length < 2">
                      Align selected centers
                    </el-dropdown-item>
                    <el-dropdown-item command="distributeVertical" :disabled="selectedNodes.length < 2">
                      Distribute selected vertically
                    </el-dropdown-item>
                    <el-dropdown-item divided command="arrangeAll" :disabled="nodes.length < 2">
                      Arrange all nodes
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <button
                class="vue-flow__controls-button"
                :title="interactionMode === 'select' ? 'Switch to Pan' : 'Select nodes; drag or Ctrl/Cmd-click for multiple'"
                @click="interactionMode = interactionMode === 'select' ? 'pan' : 'select'"
              >
                <el-icon v-if="interactionMode === 'select'"><Rank /></el-icon>
                <el-icon v-else><Check /></el-icon>
              </button>
              <button
                v-if="nodes.length > 3"
                class="vue-flow__controls-button"
                :title="showMiniMap ? 'Hide MiniMap' : 'Show MiniMap'"
                @click="showMiniMap = !showMiniMap"
              >
                <el-icon v-if="showMiniMap"><Hide /></el-icon>
                <el-icon v-else><View /></el-icon>
              </button>
            </template>
          </Controls>
          <MiniMap v-if="showMiniMap && nodes.length > 3" position="bottom-right" />
        </VueFlow>
        <div v-if="nodes.length === 0" class="empty-canvas">
          <el-icon :size="48" color="#c0c4cc"><Connection /></el-icon>
          <p>Drag components from the left panel to start building your flow</p>
          <div class="empty-actions">
            <el-button size="small" type="success" @click="addQuickNode('send')">
              <el-icon><Promotion /></el-icon>
              Send
            </el-button>
            <el-button size="small" type="warning" @click="addQuickNode('receive')">
              <el-icon><Message /></el-icon>
              Receive
            </el-button>
            <el-button size="small" @click="addQuickNode('delay')">
              <el-icon><Clock /></el-icon>
              Delay
            </el-button>
          </div>
        </div>
      </div>

      <div
        class="flow-resizer"
        :class="{ disabled: !rightSidebarExpanded }"
        @mousedown.left="onFlowResizerDown('right', $event)"
      ></div>

      <!-- Right Panel: Properties -->
      <div class="panel-right">
        <!-- Sidebar Content (toggleable) -->
        <div v-show="rightSidebarExpanded" class="sidebar-content right-sidebar" :style="{ width: rightSidebarWidth + 'px' }">
          <div class="sidebar-header">
            <span class="section-title">Properties</span>
            <el-icon class="collapse-btn" @click="rightSidebarExpanded = false"><ArrowRight /></el-icon>
          </div>
          <div v-if="selectedNode" class="props-content">
            <!-- Send: separate layout with full-width SML -->
            <div class="send-panel" :class="{ 'panel-hidden': selectedNode.data.stepType !== 'send' }">
              <el-form label-width="80px" size="small">
                <el-form-item label="Type">
                  <el-tag type="success" size="small">SEND</el-tag>
                </el-form-item>
                <el-form-item label="Name">
                  <el-input
                    v-if="smlSource === 'custom'"
                    v-model="selectedNode.data.name"
                    placeholder="Required"
                  />
                  <el-input
                    v-else
                    :model-value="selectedNode.data.name"
                    disabled
                  />
                </el-form-item>
                <ChecklistBindingProperties
                  v-if="isTemplateMode"
                  :config="selectedNode.data.config"
                  :step-type="selectedNode.data.stepType"
                  :nodes="nodes"
                  @change="markDirty"
                />
                <el-form-item label="Source">
                  <el-radio-group v-model="smlSource" @change="onSmlSourceChange">
                    <el-radio value="saved">Saved</el-radio>
                    <el-radio value="custom">Custom</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item v-if="smlSource === 'saved'" label="Folder">
                  <el-select
                    v-model="selectedSmlFolderId"
                    placeholder="Select folder..."
                    style="width: 100%"
                    @change="onSmlFolderChange"
                  >
                    <el-option v-for="f in smlFolderOptions" :key="f.value" :label="f.label" :value="f.value" />
                  </el-select>
                </el-form-item>
                <el-form-item v-if="smlSource === 'saved' && selectedSmlFolderId" label="SML">
                  <el-tree-select
                    v-model="selectedSmlId"
                    :data="smlTreeSelectData"
                    :props="{ label: 'name', children: 'children', disabled: 'disabled' }"
                    node-key="id"
                    placeholder="Select SML..."
                    style="width: 100%"
                    clearable
                    filterable
                    :render-after-expand="false"
                    @change="onSmlSelected"
                  />
                </el-form-item>
              </el-form>
              <div ref="smlEditorRef" class="sml-editor-container"></div>
            </div>

            <!-- Non-Send nodes: standard form -->
            <div class="non-send-panel" :class="{ 'panel-hidden': selectedNode.data.stepType === 'send' }">
              <el-form label-width="80px" size="small">
                <el-form-item label="Type">
                  <el-tag :type="getStepTagType(selectedNode.data.stepType)" size="small">
                    {{ selectedNode.data.stepType.toUpperCase() }}
                  </el-tag>
                </el-form-item>

                <!-- Receive -->
                <template v-if="selectedNode.data.stepType === 'receive'">
                  <ChecklistBindingProperties
                    v-if="isTemplateMode"
                    :config="selectedNode.data.config"
                    :step-type="selectedNode.data.stepType"
                    :nodes="nodes"
                    @change="syncRuleEdges"
                  />
                  <ReceiveProperties
                    :nodeData="selectedNode.data"
                    :nodeId="selectedNode.id"
                    :flowFunctions="flowFunctions"
                    :nodes="nodes"
                    :smlList="smlTreeData"
                  />
                </template>

                <!-- Delay -->
                <template v-if="selectedNode.data.stepType === 'delay'">
                  <el-form-item label="Name">
                    <el-input v-model="selectedNode.data.name" placeholder="Step name" />
                  </el-form-item>
                  <el-form-item label="Delay(ms)">
                    <el-input-number v-model="selectedNode.data.config.milliseconds" :min="100" :max="60000" :step="100" controls-position="right" style="width: 100%" />
                  </el-form-item>
                </template>

              </el-form>
            </div>
          </div>
          <div v-else-if="isTemplateMode" class="props-content flow-props-panel">
            <div class="flow-props-section">
              <div class="variables-section-title">
                <span>Template Properties</span>
              </div>
              <el-form label-width="88px" size="small" class="template-props-form">
                <el-form-item label="Description">
                  <el-input
                    v-model="flowDescription"
                    type="textarea"
                    :rows="5"
                    maxlength="500"
                    show-word-limit
                    placeholder="Template description"
                  />
                </el-form-item>
              </el-form>
            </div>
          </div>
          <div v-else class="props-content flow-props-panel">
            <div class="flow-props-section">
              <div class="variables-section-title">
                <span>Flow Variables</span>
                <div class="header-actions">
                  <el-tag size="small" effect="plain">{{ constantVariables.length }}</el-tag>
                  <el-button type="primary" :icon="Plus" size="small" @click="addConstantVariable">Add</el-button>
                </div>
              </div>
              <div v-if="constantVariables.length === 0" class="variables-empty">
                Declare variables this flow needs before execution, such as <code>{LotID}</code>.
              </div>
              <div v-for="(v, idx) in constantVariables" :key="idx" class="constant-var-card">
                <div class="constant-var-row">
                  <el-input v-model="v.name" placeholder="Name" size="small" class="constant-var-name-input" />
                  <el-button text type="danger" :icon="Delete" size="small" @click="removeConstantVariable(idx)" />
                </div>
                <div class="constant-var-row">
                  <el-input v-model="v.defaultValue" placeholder="Default value" size="small" />
                </div>
                <div class="constant-var-row meta-row">
                  <el-checkbox v-model="v.required" size="small">Required</el-checkbox>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity Bar (always visible, on the right edge) -->
        <div class="activity-bar right-activity-bar">
          <el-tooltip content="Properties" placement="left">
            <div
              class="activity-icon"
              :class="{ active: rightSidebarExpanded }"
              @click="rightSidebarExpanded = !rightSidebarExpanded"
            >
              <el-icon><Setting /></el-icon>
            </div>
          </el-tooltip>
        </div>
      </div>
    </div>

    <!-- Save as Template Dialog -->
    <el-dialog v-model="saveTemplateVisible" title="Save as Template" width="480px" :destroy-on-close="true">
      <el-form :model="saveTemplateForm" label-width="100px">
        <el-form-item label="Name" required>
          <el-input v-model="saveTemplateForm.name" placeholder="Template name" maxlength="100" />
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="saveTemplateForm.description" type="textarea" :rows="3" placeholder="Description" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveTemplateVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saveTemplateLoading" @click="handleSaveTemplate">Save</el-button>
      </template>
    </el-dialog>

    <!-- Function Editor Dialog -->
    <el-dialog
      v-model="fnDialogVisible"
      :title="editingFnId && editingFnId !== 0 ? 'Edit Function' : 'New Function'"
      width="90vw"
      top="4vh"
      :destroy-on-close="true"
      :close-on-click-modal="false"
      @close="closeFnEditor"
    >
      <div class="fn-dialog-body">
        <div class="fn-dialog-left">
          <el-form label-width="60px" size="small" class="fn-edit-form">
            <el-form-item label="Name" required>
              <el-input v-model="editingFnForm.name" placeholder="Function name" />
            </el-form-item>
            <el-form-item label="Desc">
              <el-input v-model="editingFnForm.description" placeholder="Function description" />
            </el-form-item>
            <el-form-item label="Scope">
              <el-radio-group v-model="editingFnForm.scope">
                <el-radio value="global">Global</el-radio>
                <el-radio value="flow">Flow</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="Params">
              <div class="fn-params-editor">
                <div v-for="(_p, idx) in editingFnParams" :key="idx" class="fn-param-row">
                  <el-input v-model="editingFnParams[idx]" placeholder="param name" size="small" style="flex: 1" />
                  <el-button type="danger" :icon="Delete" circle size="small" @click="editingFnParams.splice(idx, 1)" />
                </div>
                <el-button type="primary" link size="small" @click="editingFnParams.push('')">
                  <el-icon><Plus /></el-icon> Add Param
                </el-button>
              </div>
            </el-form-item>
          </el-form>
          <div class="fn-edit-hint">
            Available: <code>main(params)</code> <code>GoUtils.parseLastRecv(path)</code> <code>GoUtils.formatDate(Date.now(), "YYYYMMDDHHmmss")</code> <code>GoUtils.log(...)</code> <code>vars.x</code> <code>params.name</code>
          </div>
          <div ref="fnEditorRef" class="fn-editor-container"></div>
        </div>
        <div class="fn-dialog-right" :class="{ collapsed: fnTestPanelCollapsed }">
          <div v-if="!fnTestPanelCollapsed" class="fn-test-panel-wrapper">
            <div class="fn-test-panel">
              <div class="fn-test-header">
                <span class="fn-test-title">Test Function</span>
                <div class="fn-test-header-actions">
                  <el-button type="primary" size="small" @click="runFunctionTest" :loading="fnTestLoading">Run</el-button>
                </div>
              </div>
              <el-form label-width="80px" size="small">
                <el-form-item label="SML Source">
                  <el-select-v2
                    v-model="selectedTestSmlId"
                    :options="smlFlatOptions"
                    placeholder="Quick select from SML library..."
                    size="small"
                    clearable
                    style="width: 100%"
                    @change="onTestSmlSelected"
                  />
                </el-form-item>
                <el-form-item label="Sample SML">
                  <el-input v-model="fnTestSampleSML" type="textarea" :rows="15" placeholder="Paste received SML here..." />
                  <div class="fn-test-hint">GoUtils.parseLastRecv() parses from the SML above (lastRecv context)</div>
                </el-form-item>
                <el-form-item label="Vars">
                  <div class="fn-test-vars">
                    <div v-for="(_key, idx) in fnTestVarKeys" :key="idx" class="fn-test-var-row">
                      <el-input v-model="fnTestVarKeys[idx]" placeholder="name" size="small" style="width: 100px" />
                      <el-input v-model="fnTestVars[fnTestVarKeys[idx]]" placeholder="value" size="small" style="flex: 1" />
                      <el-button type="danger" :icon="Delete" circle size="small" @click="fnTestVarKeys.splice(idx, 1)" />
                    </div>
                    <el-button type="primary" link size="small" @click="fnTestVarKeys.push('')">
                      <el-icon><Plus /></el-icon> Add Var
                    </el-button>
                  </div>
                </el-form-item>
              </el-form>
              <div v-if="fnTestError" class="fn-test-error">
                <el-alert :title="fnTestError" type="error" :closable="false" />
              </div>
              <div v-if="fnTestResult !== '' || fnTestLogs.length > 0" class="fn-test-result">
                <div v-if="fnTestResult !== ''" class="fn-test-result-section">
                  <div class="fn-test-label">Result:</div>
                  <pre class="result-pre">{{ formattedTestResult }}</pre>
                </div>
                <div v-if="fnTestLogs.length > 0" class="fn-test-result-section">
                  <div class="fn-test-label">Logs:</div>
                  <pre class="logs-pre">{{ fnTestLogs.join('\n') }}</pre>
                </div>
              </div>
            </div>
          </div>
          <div class="activity-bar fn-test-activity-bar">
            <el-tooltip :content="fnTestPanelCollapsed ? 'Expand Test Panel' : 'Collapse Test Panel'" placement="left">
              <div
                class="activity-icon"
                :class="{ active: !fnTestPanelCollapsed }"
                @click="fnTestPanelCollapsed = !fnTestPanelCollapsed"
              >
                <el-icon><VideoPlay /></el-icon>
              </div>
            </el-tooltip>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="closeFnEditor">Cancel</el-button>
        <el-button type="primary" :loading="fnSaving" @click="saveFlowFunction">Save</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, ArrowRight, Check, Delete, Promotion, Message, Clock,
  Connection, InfoFilled, Plus, VideoPlay, Upload, CircleCheck, MoreFilled,
  Grid, Tickets, Setting, Rank, View, Hide, RefreshLeft, RefreshRight, Operation
} from '@element-plus/icons-vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge, Connection as VFConnection, GraphNode } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import { flowApi } from '../api/flow'
import { flowTemplateApi } from '../api/flow-template'
import { engineApi } from '../api/engine'
import { smlApi } from '../api/sml'
import { flowFunctionApi } from '../api/flow-function'
import type { FlowStepConfig, FlowFunction, FlowConstantVariable } from '../types'
import FlowNode from './flow-editor/FlowNode.vue'
import ChecklistBindingProperties from './flow-editor/ChecklistBindingProperties.vue'
import ReceiveProperties from './flow-editor/ReceiveProperties.vue'
import * as monaco from 'monaco-editor'
import { registerSMLLanguage } from '../utils/smlLanguage'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  }
}

const router = useRouter()
const route = useRoute()

// ===== VueFlow =====
const {
  addNodes, addEdges, project, removeNodes, onNodesChange,
  findNode, removeSelectedElements, addSelectedNodes, setCenter, getViewport,
} = useVueFlow()
const vueFlowRef = ref()

const nodes = ref<Node<{ stepType: string; name: string; config: Record<string, any>; label: string }>[]>([])
const edges = ref<Edge[]>([])

// ===== State =====
const flowId = ref<number | null>(null)
const templateId = ref<number | null>(null)
const flowName = ref('')
const flowDescription = ref('')
const stepInterval = ref(1000)
const commMode = ref<'active' | 'passive'>('active')
const constantVariables = ref<FlowConstantVariable[]>([])
const saving = ref(false)
const publishing = ref(false)
const isDirty = ref(false)
const isPublished = ref(false)
const isLoadingFlow = ref(false)
const isHydratingFlow = ref(false)
const isDragOver = ref(false)
const interactionMode = ref<'select' | 'pan'>('pan')
const runEngineId = ref<number | null>(null)
const engines = ref<any[]>([])
const filteredEngines = computed(() => engines.value.filter((e: any) => e.mode === commMode.value))
const flowNameInputWidth = computed(() => {
  const textLength = Math.max((flowName.value || 'Flow name').length, 8)
  return Math.min(320, Math.max(96, textLength * 9 + 28))
})
const flowStatusTag = computed(() => {
  if (isDirty.value) {
    return { label: 'Unsaved', type: 'danger' as const }
  }
  if (!isPublished.value) {
    return { label: 'Unpublished', type: 'warning' as const }
  }
  return { label: 'Published', type: 'success' as const }
})
const showMiniMap = ref(true)
const editorBodyRef = ref<HTMLElement>()
const leftSidebarWidth = ref(240)
const rightSidebarWidth = ref(332)
const isDraggingNodes = ref(false)
const isTemplateMode = computed(() => route.path.startsWith('/flow-template/'))

const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_RATIO = 0.38
const LAYOUT_GRID = 20
const LAYOUT_ROW_GAP = 140
let flowResizing: 'left' | 'right' | null = null
let flowResizeStartX = 0
let flowResizeStartWidth = 0

// ===== Right Sidebar State =====
const rightSidebarExpanded = ref(true)

// ===== Sidebar State =====
const activeSidebarView = ref<'components' | 'functions' | 'table' | null>('components')
const sidebarExpanded = ref(true)

function toggleSidebarView(view: 'components' | 'functions' | 'table') {
  if (activeSidebarView.value === view && sidebarExpanded.value) {
    // Clicking the already active view: collapse sidebar
    sidebarExpanded.value = false
  } else {
    // Switch to new view or expand
    activeSidebarView.value = view
    sidebarExpanded.value = true
  }
}

function onFlowResizerDown(side: 'left' | 'right', event: MouseEvent) {
  if ((side === 'left' && !sidebarExpanded.value) || (side === 'right' && !rightSidebarExpanded.value)) return
  event.preventDefault()
  flowResizing = side
  flowResizeStartX = event.clientX
  flowResizeStartWidth = side === 'left' ? leftSidebarWidth.value : rightSidebarWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onFlowResizeMove(event: MouseEvent) {
  if (!flowResizing || !editorBodyRef.value) return
  const maxWidth = editorBodyRef.value.offsetWidth * MAX_SIDEBAR_RATIO
  if (flowResizing === 'left') {
    const delta = event.clientX - flowResizeStartX
    leftSidebarWidth.value = Math.min(maxWidth, Math.max(MIN_SIDEBAR_WIDTH, flowResizeStartWidth + delta))
  } else {
    const delta = flowResizeStartX - event.clientX
    rightSidebarWidth.value = Math.min(maxWidth, Math.max(MIN_SIDEBAR_WIDTH, flowResizeStartWidth + delta))
  }
}

function onFlowResizeUp() {
  if (!flowResizing) return
  flowResizing = null
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// ===== Save as Template =====
const saveTemplateVisible = ref(false)
const saveTemplateLoading = ref(false)
const saveTemplateForm = ref({ name: '', description: '' })

// ===== Function Library =====
const flowFunctions = ref<FlowFunction[]>([])
const fnSaving = ref(false)
const editingFnId = ref<number | null>(null)
const editingFnForm = ref({ name: '', description: '', script: '', scope: 'flow' as 'global' | 'flow' })
const editingFnParams = ref<string[]>([])
const fnEditorRef = ref<HTMLElement>()
let fnEditor: monaco.editor.IStandaloneCodeEditor | null = null
const fnDialogVisible = ref(false)

// ===== Function Test =====
const fnTestSampleSML = ref('')
const fnTestVars = ref<Record<string, string>>({})
const fnTestResult = ref('')
const fnTestLogs = ref<string[]>([])
const fnTestError = ref('')
const fnTestLoading = ref(false)
const fnTestPanelCollapsed = ref(true)
const fnTestVarKeys = ref<string[]>([])
const selectedTestSmlId = ref<number | null>(null)

function extractScriptRefs(script: string): { vars: string[]; params: string[] } {
  const vars = new Set<string>()
  const params = new Set<string>()
  const varRe = /vars\.(\w+)/g
  const paramRe = /params\.(\w+)/g
  let m: RegExpExecArray | null
  while ((m = varRe.exec(script)) !== null) vars.add(m[1])
  while ((m = paramRe.exec(script)) !== null) params.add(m[1])
  return { vars: Array.from(vars), params: Array.from(params) }
}

function getFnTestStorageKey(fnId: number | null): string {
  return `eap_fn_test_${fnId || 'draft'}`
}

function saveFnTestData(fnId: number | null) {
  const data = {
    sampleSml: fnTestSampleSML.value,
    vars: Object.fromEntries(fnTestVarKeys.value.filter(k => k.trim()).map(k => [k, fnTestVars.value[k] || ''])),
    smlId: selectedTestSmlId.value,
  }
  localStorage.setItem(getFnTestStorageKey(fnId), JSON.stringify(data))
}

function loadFnTestData(fnId: number | null, script: string) {
  const raw = localStorage.getItem(getFnTestStorageKey(fnId))
  const refs = extractScriptRefs(script)
  if (raw) {
    try {
      const data = JSON.parse(raw)
      fnTestSampleSML.value = data.sampleSml || ''
      selectedTestSmlId.value = data.smlId || null
      const savedVars: Record<string, string> = data.vars || {}
      const keys = [...new Set([...Object.keys(savedVars), ...refs.vars])]
      fnTestVarKeys.value = keys
      fnTestVars.value = Object.fromEntries(keys.map(k => [k, savedVars[k] || '']))
      return
    } catch { /* ignore */ }
  }
  fnTestSampleSML.value = ''
  selectedTestSmlId.value = null
  fnTestVarKeys.value = refs.vars
  fnTestVars.value = Object.fromEntries(refs.vars.map(k => [k, '']))
}

const formattedTestResult = computed(() => {
  const r = fnTestResult.value
  if (!r) return ''
  try {
    const obj = JSON.parse(r)
    return JSON.stringify(obj, null, 2)
  } catch {
    return r
  }
})

const smlFlatOptions = computed(() => {
  const options: { value: number; label: string }[] = []
  function walk(nodes: any[]) {
    for (const n of nodes || []) {
      if (n.type === 'sml') {
        options.push({ value: n.id, label: n.name })
      }
      if (n.children) walk(n.children)
    }
  }
  walk(smlTreeData.value)
  return options
})

// ===== SML Inline Editor =====
const smlEditorRef = ref<HTMLElement>()
let smlEditor: monaco.editor.IStandaloneCodeEditor | null = null

// ===== SML Selector =====
const smlSource = ref<'saved' | 'custom'>('saved')
const selectedSmlId = ref<number | null>(null)
const smlTreeData = ref<any[]>([])
const selectedSmlFolderId = ref<number | null>(null)

const smlFolderOptions = computed<{ value: number; label: string }[]>(() => {
  if (!smlTreeData.value) return []
  return smlTreeData.value
    .filter(item => item.type === 'folder')
    .map(item => ({ value: item.id, label: item.name }))
})

const smlTreeSelectData = computed(() => {
  if (!smlTreeData.value || !selectedSmlFolderId.value) return []
  const folder = smlTreeData.value.find((item: any) => item.id === selectedSmlFolderId.value)
  if (!folder?.children) return []

  const addDisabled = (nodes: any[]): any[] => {
    return nodes.map(node => ({
      ...node,
      disabled: node.type === 'folder',
      children: node.children && node.children.length > 0 ? addDisabled(node.children) : undefined,
    }))
  }
  return addDisabled(folder.children)
})

// ===== Step Types =====
const stepTypes = [
  { type: 'send', label: 'Send', desc: 'Send SML message', color: '#67c23a', icon: Promotion },
  { type: 'receive', label: 'Receive', desc: 'Wait for message', color: '#e6a23c', icon: Message },
  { type: 'delay', label: 'Delay', desc: 'Wait time', color: '#909399', icon: Clock },
]

function parseConstantVariables(raw: unknown): FlowConstantVariable[] {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed.map(item => ({
      name: String(item?.name || ''),
      type: ['string', 'number', 'boolean', 'json'].includes(item?.type) ? item.type : 'string',
      required: !!item?.required,
      defaultValue: String(item?.defaultValue ?? item?.value ?? ''),
      overridable: item?.overridable !== false,
      description: String(item?.description || ''),
    }))
  } catch {
    return []
  }
}

function addConstantVariable() {
  constantVariables.value.push({
    name: '',
    type: 'string',
    required: true,
    defaultValue: '',
    overridable: true,
    description: '',
  })
}

function removeConstantVariable(index: number) {
  constantVariables.value.splice(index, 1)
}

function validateConstantVariables(): boolean {
  const names = new Set<string>()
  for (const v of constantVariables.value) {
    v.name = v.name.trim()
    if (!v.name) {
      ElMessage.warning('Flow variable name is required')
      return false
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(v.name)) {
      ElMessage.warning(`Invalid variable name: ${v.name}`)
      return false
    }
    if (names.has(v.name)) {
      ElMessage.warning(`Duplicate flow variable: ${v.name}`)
      return false
    }
    names.add(v.name)
  }
  return true
}

function serializeConstantVariables(): string {
  return JSON.stringify(constantVariables.value.map(v => ({
    name: v.name.trim(),
    type: 'string',
    required: !!v.required,
    defaultValue: String(v.defaultValue ?? ''),
    overridable: true,
    description: '',
  })))
}

// ===== Selected Node =====
const selectedNode = ref<GraphNode | null>(null)
const selectedEdgeId = ref<string | null>(null)
const selectedNodes = computed(() => nodes.value.filter(n => (n as GraphNode).selected))

type GraphSnapshot = {
  nodes: Node[]
  edges: Edge[]
}

const graphHistoryIndex = ref(-1)
const graphHistory = ref<GraphSnapshot[]>([])
const canUndoGraph = computed(() => graphHistoryIndex.value > 0)
const canRedoGraph = computed(() => graphHistoryIndex.value >= 0 && graphHistoryIndex.value < graphHistory.value.length - 1)
let restoringGraphSnapshot = false
let savedEditorSignature = ''

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function getPersistedNodes(): Node[] {
  return nodes.value.map(node => ({
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: cloneValue(node.data || {}),
  }))
}

function getPersistedEdges(): Edge[] {
  return edges.value
    .filter(edge => !edge.id.startsWith('_rule_'))
    .map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: true,
      style: { stroke: '#409eff', strokeWidth: 2 },
    }))
}

function captureGraphSnapshot(): GraphSnapshot {
  return {
    nodes: getPersistedNodes(),
    edges: getPersistedEdges(),
  }
}

function graphSnapshotKey(snapshot: GraphSnapshot): string {
  return JSON.stringify(snapshot)
}

const editorSignature = computed(() => JSON.stringify({
  name: flowName.value,
  description: flowDescription.value,
  stepInterval: stepInterval.value,
  commMode: commMode.value,
  constantVariables: constantVariables.value,
  graph: captureGraphSnapshot(),
}))
const graphSignature = computed(() => graphSnapshotKey(captureGraphSnapshot()))

function resetGraphHistory() {
  graphHistory.value = [captureGraphSnapshot()]
  graphHistoryIndex.value = 0
}

function recordGraphHistory() {
  if (restoringGraphSnapshot || isLoadingFlow.value || isHydratingFlow.value || isDraggingNodes.value) return
  const snapshot = captureGraphSnapshot()
  const activeSnapshot = graphHistory.value[graphHistoryIndex.value]
  if (activeSnapshot && graphSnapshotKey(activeSnapshot) === graphSnapshotKey(snapshot)) return
  graphHistory.value = graphHistory.value.slice(0, graphHistoryIndex.value + 1)
  graphHistory.value.push(snapshot)
  if (graphHistory.value.length > 60) {
    graphHistory.value.shift()
  }
  graphHistoryIndex.value = graphHistory.value.length - 1
}

async function restoreGraphSnapshot(snapshot: GraphSnapshot) {
  restoringGraphSnapshot = true
  selectedNode.value = null
  selectedEdgeId.value = null
  nodes.value = cloneValue(snapshot.nodes)
  edges.value = cloneValue(snapshot.edges)
  await nextTick()
  syncRuleEdges()
  restoringGraphSnapshot = false
  updateDirtyState()
}

async function undoGraph() {
  if (!canUndoGraph.value) return
  graphHistoryIndex.value -= 1
  await restoreGraphSnapshot(graphHistory.value[graphHistoryIndex.value])
}

async function redoGraph() {
  if (!canRedoGraph.value) return
  graphHistoryIndex.value += 1
  await restoreGraphSnapshot(graphHistory.value[graphHistoryIndex.value])
}

// Sync selectedNode from VueFlow's internal selection changes.
// This catches cases where @node-click doesn't fire (e.g., rapid clicks, programmatic selection).
onNodesChange((changes) => {
  for (const change of changes) {
    if (change.type === 'select') {
      const node = nodes.value.find(n => n.id === change.id)
      if (change.selected && node) {
        selectedNode.value = node as GraphNode
        clearSelectedEdge()
        rightSidebarExpanded.value = true
      } else if (selectedNode.value?.id === change.id) {
        selectedNode.value = null
      }
    }
  }
})

function stepOrderFromNodeId(id: string): number {
  const match = /^step_(\d+)$/.exec(id)
  return match ? Number(match[1]) - 1 : Number.MAX_SAFE_INTEGER
}

function nodeFlowOrder(node: Node, sourceNodes: Node[]): number {
  const fromId = stepOrderFromNodeId(node.id)
  if (fromId !== Number.MAX_SAFE_INTEGER) return fromId
  const idx = sourceNodes.findIndex(n => n.id === node.id)
  return idx >= 0 ? idx : Number.MAX_SAFE_INTEGER
}

function getFlowOrderedNodes(sourceNodes: Node[] = nodes.value): Node[] {
  return [...sourceNodes].sort((a, b) => nodeFlowOrder(a, sourceNodes) - nodeFlowOrder(b, sourceNodes))
}

const sortedNodes = computed(() => getFlowOrderedNodes())

function getNodeStepIndex(nodeId: string): number {
  const idx = sortedNodes.value.findIndex(n => n.id === nodeId)
  return idx >= 0 ? idx + 1 : 0
}

type PersistedFlowLayout = {
  edges?: Array<{ id?: string; source: string; target: string }>
  positions?: Record<string, { x: number; y: number }>
}

function stepNodeId(idx: number): string {
  return `step_${idx + 1}`
}

function isCanonicalLayout(layout: PersistedFlowLayout, stepCount: number): boolean {
  const positions = layout.positions || {}
  const keys = Object.keys(positions)
  if (keys.length !== stepCount) return false
  for (let idx = 0; idx < stepCount; idx++) {
    if (!positions[stepNodeId(idx)]) return false
  }
  return true
}

function normalizeSavedLayout(layout: PersistedFlowLayout, stepCount: number): PersistedFlowLayout {
  if (isCanonicalLayout(layout, stepCount)) return layout

  const entries = Object.entries(layout.positions || {})
  if (entries.length !== stepCount) return layout

  const remap = new Map<string, string>()
  const positions: Record<string, { x: number; y: number }> = {}
  entries
    .sort(([, a], [, b]) => a.y - b.y || a.x - b.x)
    .forEach(([oldId, pos], idx) => {
      const newId = stepNodeId(idx)
      remap.set(oldId, newId)
      positions[newId] = pos
    })

  const edges = (layout.edges || [])
    .map(e => {
      const source = remap.get(e.source)
      const target = remap.get(e.target)
      if (!source || !target) return null
      return {
        id: `e-${source}-${target}`,
        source,
        target,
      }
    })
    .filter((e): e is { id: string; source: string; target: string } => !!e)

  return { edges, positions }
}

function canonicalizeFlowGraph(sorted: Node[]) {
  const idMap = new Map<string, string>()
  sorted.forEach((node, idx) => idMap.set(node.id, stepNodeId(idx)))

  const canonicalNodes = sorted.map((node, idx) => ({
    ...node,
    id: stepNodeId(idx),
  }))

  const validNodeIds = new Set(canonicalNodes.map(n => n.id))
  const canonicalEdges = edges.value
    .filter(e => !e.id.startsWith('_rule_'))
    .map(e => {
      const source = idMap.get(e.source)
      const target = idMap.get(e.target)
      if (!source || !target || !validNodeIds.has(source) || !validNodeIds.has(target)) return null
      return {
        ...e,
        id: `e-${source}-${target}`,
        source,
        target,
      }
    })
    .filter((e): e is Edge => !!e)

  return { canonicalNodes, canonicalEdges }
}

// Provide syncRuleEdges to ReceiveProperties child
provide('onRuleConfigChange', () => nextTick(() => syncRuleEdges()))

function syncRuleEdges() {
  if (isLoadingFlow.value) return
  const sorted = sortedNodes.value

  edges.value = edges.value.filter(e => !e.id.startsWith('_rule_'))

  for (const node of nodes.value) {
    const cfg = node.data?.config
    if (node.data?.stepType !== 'receive') continue

    const addRuleEdge = (idx: number | undefined, label: string, suffix: string, color: string) => {
      if (idx === undefined || idx === null) return
      const targetId = sorted[idx]?.id
      if (!targetId || targetId === node.id) return
      edges.value.push({
        id: `_rule_${node.id}_${suffix}`,
        source: node.id,
        target: targetId,
        label,
        animated: false,
        style: { stroke: color, strokeWidth: 1.5, strokeDasharray: '5 3' },
        labelStyle: { fontSize: '11px', fontWeight: '600' },
        labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
      })
    }

    if (cfg?.rules?.length) {
      for (let ri = 0; ri < cfg.rules.length; ri++) {
        const rule = cfg.rules[ri]
        const varName = rule.variable || '?'
        const val = rule.value || '?'
        const operatorLabel = rule.operator === 'equals' ? '=' : rule.operator === 'not_equals' ? '!=' : '∋'
        addRuleEdge(rule.targetStepIdx, `${varName} ${operatorLabel} ${val}`, `r${ri}`, '#e6a23c')
      }
    }

    if (cfg?.defaultStepIdx !== undefined && cfg?.defaultStepIdx !== null) {
      addRuleEdge(cfg.defaultStepIdx, 'default', 'def', '#909399')
    }
  }
}

function buildPersistPayload() {
  const sorted = getFlowOrderedNodes()
  const { canonicalNodes, canonicalEdges } = canonicalizeFlowGraph(sorted)
  const selectedIndex = selectedNode.value ? sorted.findIndex(n => n.id === selectedNode.value?.id) : -1
  nodes.value = canonicalNodes
  edges.value = canonicalEdges
  syncRuleEdges()
  selectedNode.value = selectedIndex >= 0 ? (nodes.value[selectedIndex] as GraphNode) : null

  const steps = nodes.value.map(n => {
    const d = n.data as { stepType: string; name: string; config: Record<string, unknown> }
    return {
      type: d.stepType,
      name: d.name || d.stepType,
      config: JSON.stringify(d.config || {}),
    }
  })

  return {
    name: flowName.value,
    description: flowDescription.value,
    stepInterval: stepInterval.value,
    commMode: commMode.value,
    edges: JSON.stringify({
      edges: canonicalEdges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
      positions: Object.fromEntries(nodes.value.map(n => [
        n.id, { x: n.position.x, y: n.position.y },
      ])),
    }),
    constantVariables: serializeConstantVariables(),
    steps,
  }
}

async function finishFlowHydration() {
  await nextTick()
  await new Promise<void>(resolve => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      resolve()
      return
    }
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
  })
  savedEditorSignature = editorSignature.value
  resetGraphHistory()
  isDirty.value = false
  isHydratingFlow.value = false
}

watch(editorSignature, () => updateDirtyState())
watch(graphSignature, () => recordGraphHistory())

watch(commMode, () => {
  if (runEngineId.value && !filteredEngines.value.some((e: any) => e.id === runEngineId.value)) {
    runEngineId.value = null
  }
})

// ===== Function Inline Editor =====
watch(fnDialogVisible, async (visible) => {
  if (fnEditor) { fnEditor.dispose(); fnEditor = null }
  if (!visible) return
  await nextTick()
  if (!fnEditorRef.value) return

  const tsModule = (monaco.languages as any).typescript
  if (tsModule && tsModule.typescriptDefaults) {
    tsModule.typescriptDefaults.addExtraLib(
      `declare const vars: { [key: string]: string };\n` +
      `declare const params: { [key: string]: string };\n` +
      `declare interface SecsNode {\n` +
      `  type: string;\n` +
      `  size: number;\n` +
      `  value: string;\n` +
      `  children?: SecsNode[];\n` +
      `}\n` +
      `declare interface SecsContext {\n` +
      `  sxFy: string;\n` +
      `  summary: string;\n` +
      `  raw: string;\n` +
      `  node: SecsNode | null;\n` +
      `}\n` +
      `declare namespace GoUtils {\n` +
      `  /** 解析 lastRecv（最后收到的 SECS 报文）中指定索引路径的节点 */\n` +
      `  export function parseLastRecv(path: string): SecsNode | null;\n` +
      `  /** 获取当前脚本执行的上下文信息（lastRecv 的 SxFy 和摘要） */\n` +
      `  export function getContext(): SecsContext;\n` +
      `  /** 格式化日期时间 */\n` +
      `  export function formatDate(timestamp: number | string, template: string): string;\n` +
      `  export function log(...args: any[]): void;\n` +
      `}\n`,
      'file:///flow-function.d.ts'
    )
    tsModule.typescriptDefaults.setCompilerOptions({
      allowNonTsExtensions: true,
      target: tsModule.ScriptTarget?.ES2015 || 2,
      noEmit: false,
      lib: ['es2015'],
    })
    console.log('[Monaco] TypeScript extra lib added')
  } else {
    console.warn('[Monaco] TypeScript module not available')
  }

  fnEditor = monaco.editor.create(fnEditorRef.value, {
    value: editingFnForm.value.script,
    language: 'typescript',
    theme: 'vs',
    fontSize: 12,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    lineNumbers: 'on',
    automaticLayout: true,
    tabSize: 2,
    quickSuggestions: true,
    suggestOnTriggerCharacters: true,
  })
  fnEditor!.onDidChangeModelContent(() => {
    editingFnForm.value.script = fnEditor?.getValue() || ''
  })
  fnEditor!.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    runFunctionTest()
  })
})

const getStepTagType = (type: string) => {
  switch (type) {
    case 'send': return 'success'
    case 'receive': return 'warning'
    case 'function': return '' as const
    case 'delay': return 'info'
    default: return 'info'
  }
}

const getStepTypeShort = (type: string) => {
  switch (type) {
    case 'send': return 'S'
    case 'receive': return 'R'
    case 'function': return 'F'
    case 'delay': return 'D'
    default: return '?'
  }
}

function onTableRowClick(row: any) {
  const node = nodes.value.find(n => n.id === row.id)
  if (node) {
    selectedNode.value = node as GraphNode
  }
}

async function onTableRowDoubleClick(row: any) {
  const node = nodes.value.find(n => n.id === row.id)
  if (!node) return

  selectedNode.value = node as GraphNode
  clearSelectedEdge()

  const graphNode = findNode(node.id)
  if (graphNode) {
    removeSelectedElements()
    addSelectedNodes([graphNode])
  }

  const width = graphNode?.dimensions.width || 180
  const height = graphNode?.dimensions.height || 92
  const zoom = Math.max(getViewport().zoom, 0.9)
  await setCenter(
    node.position.x + width / 2,
    node.position.y + height / 2,
    { zoom, duration: 260 },
  )
}

function getTableRowClassName({ row }: { row: any }) {
  if (selectedNode.value?.id === row.id) return 'current-row'
  return ''
}

// ===== DnD =====
let nodeIdCounter = 0
function nextId() {
  return `step_${++nodeIdCounter}`
}

function onDragStart(event: DragEvent, type: string) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('application/vueflow', type)
  event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(event: DragEvent) {
  isDragOver.value = false
  const type = event.dataTransfer?.getData('application/vueflow')
  if (!type) return

  const bounds = vueFlowRef.value?.$el?.getBoundingClientRect()
  if (!bounds) return

  const position = project({
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  })

  addStepNode(type, position)
}

function addStepNode(type: string, position: { x: number; y: number }) {
  const config = makeDefaultConfig(type)
  const name = makeDefaultName(type)
  const node: Node = {
    id: nextId(),
    type,
    position,
    data: {
      stepType: type,
      name,
      config,
      label: name,
    },
  }

  addNodes(node)
  selectedNode.value = node as GraphNode
  rightSidebarExpanded.value = true
  markDirty()
  nextTick(() => recordGraphHistory())
}

function addQuickNode(type: string) {
  const bounds = vueFlowRef.value?.$el?.getBoundingClientRect()
  const position = bounds
    ? project({ x: bounds.width / 2, y: bounds.height / 2 })
    : { x: 260, y: 80 }
  addStepNode(type, position)
}

function makeDefaultName(type: string): string {
  const existing = nodes.value.filter(n => n.data?.stepType === type).length
  const seq = existing + 1
  const prefix = type.charAt(0).toUpperCase() + type.slice(1)
  return `${prefix} ${seq}`
}

function makeDefaultConfig(type: string): FlowStepConfig {
  switch (type) {
    case 'send': return { sml: '' }
    case 'receive': return { matchSxFy: '', timeout: 30, rules: [], defaultStepIdx: undefined, nodeVariables: [], flowVariables: [], computedVariables: [] }
    case 'delay': return { milliseconds: 1000 }
    default: return {}
  }
}

// ===== Node Events =====
function onNodeClick({ node }: { node: GraphNode }) {
  // Use the node from our reactive nodes array to keep reference identity.
  // This ensures onSmlSelected mutations are visible when switching back.
  const target = nodes.value.find(n => n.id === node.id)
  selectedNode.value = target ? (target as GraphNode) : (node as GraphNode)
  clearSelectedEdge()
  rightSidebarExpanded.value = true
  // Close function editor when selecting a node
  if (editingFnId.value !== null) {
    closeFnEditor()
  }
  if (selectedNode.value.data?.stepType === 'send') {
    if (selectedNode.value.data?.config?.smlId) {
      smlSource.value = 'saved'
      selectedSmlId.value = selectedNode.value.data.config.smlId
      restoreSmlFolder(selectedNode.value.data.config.smlId)
    } else {
      smlSource.value = 'saved'
      selectedSmlId.value = null
    }
  }
}

function restoreSmlFolder(smlId: number) {
  if (!smlTreeData.value) return
  function containsSml(nodes: any[]): boolean {
    for (const node of nodes) {
      if (node.id === smlId) return true
      if (node.children && containsSml(node.children)) return true
    }
    return false
  }
  for (const folder of smlTreeData.value) {
    if (folder.type === 'folder' && folder.children && containsSml(folder.children)) {
      selectedSmlFolderId.value = folder.id
      return
    }
  }
}

function onPaneClick() {
  selectedNode.value = null
  rightSidebarExpanded.value = true
  clearSelectedEdge()
}

function onNodeDragStart() {
  isDraggingNodes.value = true
}

function onNodeDragStop() {
  isDraggingNodes.value = false
  recordGraphHistory()
}

function onConnect(params: VFConnection) {
  clearSelectedEdge()
  addEdges([{
    id: `e-${params.source}-${params.target}`,
    source: params.source,
    target: params.target,
    animated: true,
    style: { stroke: '#409eff', strokeWidth: 2 },
  }])
  nextTick(() => recordGraphHistory())
}

function onEdgeClick({ edge }: { edge: Edge }) {
  if (edge.id.startsWith('_rule_')) {
    clearSelectedEdge()
    ElMessage.info('Rule edges are controlled by Receive match rules')
    return
  }
  selectedNode.value = null
  selectedEdgeId.value = edge.id
  edges.value = edges.value.map(e => ({
    ...e,
    selected: e.id === edge.id,
    style: e.id === edge.id
      ? { ...(e.style || {}), stroke: '#f56c6c', strokeWidth: 3 }
      : getEdgeDefaultStyle(e),
  }))
}

function clearSelectedEdge() {
  if (!selectedEdgeId.value) return
  selectedEdgeId.value = null
  edges.value = edges.value.map(e => ({
    ...e,
    selected: false,
    style: getEdgeDefaultStyle(e),
  }))
}

function getEdgeDefaultStyle(edge: Edge) {
  if (edge.id.startsWith('_rule_')) {
    return edge.style
  }
  return { stroke: '#409eff', strokeWidth: 2 }
}

function deleteSelectedEdge() {
  if (!selectedEdgeId.value) return false
  edges.value = edges.value.filter(e => e.id !== selectedEdgeId.value)
  selectedEdgeId.value = null
  markDirty()
  recordGraphHistory()
  return true
}

async function deleteSelectedNode() {
  const targets = selectedNodes.value.length > 0
    ? selectedNodes.value
    : selectedNode.value ? [selectedNode.value] : []
  if (targets.length === 0) return
  const nodeIds = new Set(targets.map(node => node.id))
  const name = targets.length === 1
    ? `"${targets[0].data?.name || targets[0].data?.stepType || 'selected node'}"`
    : `${targets.length} selected nodes`
  try {
    await ElMessageBox.confirm(
      `Delete ${name} and connected edges?`,
      targets.length === 1 ? 'Delete Node' : 'Delete Nodes',
      { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning', confirmButtonClass: 'el-button--danger' }
    )
  } catch {
    return
  }
  edges.value = edges.value.filter(e => !nodeIds.has(e.source) && !nodeIds.has(e.target))
  removeNodes([...nodeIds])
  selectedNode.value = null
  markDirty()
  await nextTick()
  recordGraphHistory()
}

function snapLayoutValue(value: number): number {
  return Math.round(value / LAYOUT_GRID) * LAYOUT_GRID
}

function getNodeWidth(node: Node): number {
  return (node as GraphNode).dimensions?.width || 180
}

function getStepOrder(sourceNodes: Node[]): string[] {
  return [...sourceNodes]
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
    .map(node => node.id)
}

function applyLayoutPositions(positionById: Map<string, { x: number; y: number }>, actionLabel: string) {
  const originalOrder = getStepOrder(nodes.value).join('|')
  const arrangedNodes = nodes.value.map(node => {
    const position = positionById.get(node.id)
    return position ? { ...node, position } : node
  })
  if (getStepOrder(arrangedNodes).join('|') !== originalOrder) {
    ElMessage.warning(`${actionLabel} would change step order and was not applied`)
    return
  }
  nodes.value = arrangedNodes
  recordGraphHistory()
}

function alignSelectedCenters() {
  if (selectedNodes.value.length < 2) return
  const centerX = selectedNodes.value.reduce((sum, node) => (
    sum + node.position.x + getNodeWidth(node) / 2
  ), 0) / selectedNodes.value.length
  const positions = new Map<string, { x: number; y: number }>()
  selectedNodes.value.forEach(node => {
    positions.set(node.id, {
      x: snapLayoutValue(centerX - getNodeWidth(node) / 2),
      y: node.position.y,
    })
  })
  applyLayoutPositions(positions, 'Center alignment')
}

function distributeSelectedVertically() {
  if (selectedNodes.value.length < 2) return
  const selected = [...selectedNodes.value].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
  const startY = snapLayoutValue(selected[0].position.y)
  const positions = new Map<string, { x: number; y: number }>()
  selected.forEach((node, idx) => {
    positions.set(node.id, {
      x: node.position.x,
      y: startY + idx * LAYOUT_ROW_GAP,
    })
  })
  applyLayoutPositions(positions, 'Vertical distribution')
}

function arrangeAllNodes() {
  if (nodes.value.length < 2) return
  const arranged = [...nodes.value].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
  const averageCenter = arranged.reduce((sum, node) => (
    sum + node.position.x + getNodeWidth(node) / 2
  ), 0) / arranged.length
  const startY = snapLayoutValue(arranged[0].position.y)
  const positions = new Map<string, { x: number; y: number }>()
  arranged.forEach((node, idx) => {
    positions.set(node.id, {
      x: snapLayoutValue(averageCenter - getNodeWidth(node) / 2),
      y: startY + idx * LAYOUT_ROW_GAP,
    })
  })
  applyLayoutPositions(positions, 'Arrange all')
}

function onLayoutCommand(command: string) {
  if (command === 'alignCenter') alignSelectedCenters()
  if (command === 'distributeVertical') distributeSelectedVertically()
  if (command === 'arrangeAll') arrangeAllNodes()
}

// ===== Function Library =====
async function loadFlowFunctions() {
  try {
    const fid = flowId.value || undefined
    const resp = await flowFunctionApi.list(fid)
    flowFunctions.value = resp.data?.data || resp.data || []
  } catch { flowFunctions.value = [] }
}

function openFunctionDrawer(fn?: FlowFunction) {
  if (fn) {
    editingFnId.value = fn.id
    editingFnForm.value = { name: fn.name, description: fn.description || '', script: fn.script, scope: fn.scope }
    try {
      const parsed = JSON.parse(fn.params || '[]')
      editingFnParams.value = Array.isArray(parsed) ? parsed : []
    } catch { editingFnParams.value = [] }
    loadFnTestData(fn.id, fn.script)
  } else {
    editingFnId.value = 0
    editingFnForm.value = {
      name: '',
      description: '',
      script: 'function main(params) {\n  \n}',
      scope: flowId.value ? 'flow' : 'global'
    }
    editingFnParams.value = []
    loadFnTestData(null, editingFnForm.value.script)
  }
  fnDialogVisible.value = true
}

function closeFnEditor() {
  saveFnTestData(editingFnId.value)
  fnDialogVisible.value = false
  editingFnId.value = null
  if (fnEditor) { fnEditor.dispose(); fnEditor = null }
}

async function compileScript(): Promise<string> {
  const code = fnEditor?.getValue() || editingFnForm.value.script
  // Quick path: no obvious TypeScript syntax, return as-is
  if (!/:\s*(string|number|boolean|any|void|SecsNode|SecsContext|Record|Map|Array)\b/.test(code)) {
    return code
  }
  // Try Monaco TypeScript worker
  const model = fnEditor?.getModel()
  if (model) {
    try {
      const tsModule = monaco.languages.typescript as any
      const worker = await tsModule.getTypeScriptWorker()
      const client = await worker(model.uri)
      const result = await client.getEmitOutput(model.uri.toString())
      if (result.outputFiles && result.outputFiles.length > 0 && result.outputFiles[0].text) {
        const compiled = result.outputFiles[0].text.trim()
        // Verify: compiled code should not contain TS annotations
        if (!/:\s*(string|number|boolean|any|void|SecsNode|SecsContext)\b/.test(compiled)) {
          return compiled
        }
      }
    } catch (e) {
      console.warn('[Monaco] getEmitOutput failed:', e)
    }
  }
  throw new Error('TypeScript compilation failed. Please remove type annotations (e.g. :string, :SecsNode) or check syntax.')
}

async function runFunctionTest() {
  if (!editingFnForm.value.script.trim()) {
    ElMessage.warning('Script is empty')
    return
  }
  fnTestLoading.value = true
  fnTestError.value = ''
  fnTestResult.value = ''
  fnTestLogs.value = []
  saveFnTestData(editingFnId.value)
  try {
    const vars: Record<string, string> = {}
    for (const key of fnTestVarKeys.value) {
      if (key.trim()) vars[key.trim()] = fnTestVars.value[key] || ''
    }
    const params: Record<string, string> = {}
    for (let i = 0; i < editingFnParams.value.length; i++) {
      const p = editingFnParams.value[i]
      if (p.trim()) params[p.trim()] = ''
    }
    let jsScript: string
    try {
      jsScript = await compileScript()
    } catch (compileErr: any) {
      fnTestError.value = compileErr.message
      fnTestLoading.value = false
      return
    }
    const resp = await flowFunctionApi.test({
      script: jsScript,
      params,
      sampleSml: fnTestSampleSML.value,
      vars,
    })
    const data = resp.data?.data || resp.data
    fnTestResult.value = data.result || ''
    fnTestLogs.value = data.logs || []
    if (data.error) {
      fnTestError.value = data.error
    }
  } catch (e: any) {
    fnTestError.value = e.response?.data?.error || e.message || 'Test failed'
  } finally {
    fnTestLoading.value = false
  }
}

async function saveFlowFunction() {
  if (!editingFnForm.value.name.trim()) {
    ElMessage.warning('Function name is required')
    return
  }
  fnSaving.value = true
  try {
    let jsScript: string
    try {
      jsScript = await compileScript()
    } catch (compileErr: any) {
      ElMessage.error(compileErr.message)
      fnSaving.value = false
      return
    }
    const payload: any = {
      name: editingFnForm.value.name,
      description: editingFnForm.value.description,
      params: JSON.stringify(editingFnParams.value.filter(p => p.trim())),
      script: editingFnForm.value.script,
      scriptJs: jsScript,
      scope: editingFnForm.value.scope,
    }
    if (editingFnForm.value.scope === 'flow' && flowId.value) {
      payload.flowId = flowId.value
    }
    if (editingFnId.value && editingFnId.value !== 0) {
      await flowFunctionApi.update(editingFnId.value, payload)
    } else {
      await flowFunctionApi.create(payload)
    }
    ElMessage.success('Saved')
    closeFnEditor()
    await loadFlowFunctions()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed'
    ElMessage.error(msg)
  } finally {
    fnSaving.value = false
  }
}

function getFunctionUsageCount(id: number): number {
  let count = 0
  for (const node of nodes.value) {
    const computedVariables = node.data?.config?.computedVariables
    if (!Array.isArray(computedVariables)) continue
    count += computedVariables.filter((v: Record<string, any>) => Number(v.functionId) === id).length
  }
  return count
}

async function deleteFlowFunction(fn: FlowFunction) {
  const usageCount = getFunctionUsageCount(fn.id)
  const detail = usageCount > 0
    ? ` It is used by ${usageCount} computed variable${usageCount > 1 ? 's' : ''}.`
    : ''
  try {
    await ElMessageBox.confirm(
      `Delete function "${fn.name}"?${detail}`,
      'Delete Function',
      { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: usageCount > 0 ? 'warning' : 'info', confirmButtonClass: 'el-button--danger' }
    )
  } catch {
    return
  }
  try {
    await flowFunctionApi.delete(fn.id)
    ElMessage.success('Deleted')
    await loadFlowFunctions()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Delete failed'
    ElMessage.error(msg)
  }
}

function onFnCommand(cmd: string, fn: FlowFunction) {
  if (cmd === 'delete') deleteFlowFunction(fn)
}

// ===== SML Inline Editor =====
// Create Monaco once, reuse via setValue(). Never dispose during session.
let smlEditorReady = false
let smlSyncing = false  // Guard: suppress change handler during setValue

watch(selectedNode, async (node) => {
  if (!node || node.data.stepType !== 'send') {
    // Dispose editor when Send panel is hidden/destroyed (e.g. click blank area)
    if (smlEditor) {
      smlEditor.dispose()
      smlEditor = null
      smlEditorReady = false
    }
    return
  }

  if (!smlEditorReady || !smlEditor) {
    // First time: create the editor
    await nextTick()
    await nextTick()
    if (!smlEditorRef.value) return
    const el = smlEditorRef.value
    if (el.offsetWidth === 0 || el.offsetHeight === 0) return
    registerSMLLanguage()
    smlEditor = monaco.editor.create(el, {
      value: node.data.config?.sml || '',
      language: 'sml',
      theme: 'sml-light',
      fontSize: 13,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      automaticLayout: true,
      tabSize: 2,
    })
    smlEditorReady = true
    smlEditor.onDidChangeModelContent(() => {
      if (smlSyncing) return
      if (selectedNode.value) {
        selectedNode.value.data.config.sml = smlEditor?.getValue() || ''
        markDirty()
      }
    })
  } else {
    // Always update content when switching to a (possibly different) Send node
    const newVal = node.data.config?.sml || ''
    smlSyncing = true
    smlEditor.setValue(newVal)
    smlSyncing = false
    smlEditor.layout()
  }
}, { immediate: true })

// ===== SML Selector =====
function onSmlSourceChange() {
  if (smlSource.value === 'saved') loadSmlTree()
}

function onSmlFolderChange() {
  selectedSmlId.value = null
}

async function loadSmlTree() {
  try {
    const resp = await smlApi.getTree()
    smlTreeData.value = resp.data?.data || resp.data || []
  } catch { smlTreeData.value = [] }
}

async function onTestSmlSelected(id: number | string) {
  if (!id) {
    fnTestSampleSML.value = ''
    return
  }
  try {
    const resp = await smlApi.getNode(Number(id))
    const node = resp.data?.data || resp.data
    if (node?.content) {
      fnTestSampleSML.value = node.content
    }
  } catch { /* ignore */ }
}

async function onSmlSelected(id: number) {
  if (!id || !selectedNode.value) return
  try {
    const resp = await smlApi.getNode(id)
    const node = resp.data?.data || resp.data
    if (node?.content) {
      const target = nodes.value.find(n => n.id === selectedNode.value!.id)
      if (target && target.data) {
        target.data.config = {
          ...target.data.config,
          sml: node.content,
          smlId: id,
          smlName: node.name,
        }
        target.data.name = node.name
        target.data.label = node.name
        // Update Monaco editor content directly since watcher won't fire (same node)
        if (smlEditor) {
          smlSyncing = true
          smlEditor.setValue(node.content)
          smlSyncing = false
        }
      }
    }
  } catch (e) {
    console.error('Failed to load SML:', e)
    ElMessage.error('Failed to load SML content')
  }
}

// ===== Data =====
async function loadFlow(id: number) {
  try {
    isLoadingFlow.value = true
    isHydratingFlow.value = true
    const resp = await flowApi.getByID(id)
    const flow = resp.data?.data || resp.data
    if (!flow) { ElMessage.error('Flow not found'); return }

    flowId.value = flow.id
    flowName.value = flow.name
    flowDescription.value = flow.description || ''
    stepInterval.value = flow.stepInterval || 0
    commMode.value = flow.commMode || 'active'
    constantVariables.value = parseConstantVariables(flow.constantVariables)
    isPublished.value = !!flow.published
    isDirty.value = false

    // Convert steps to nodes
    const steps = flow.steps || []
    nodeIdCounter = 0
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Restore persisted layout, or fall back to defaults
    let savedLayout: PersistedFlowLayout = {}
    if (flow.edges) {
      try {
        const parsed = typeof flow.edges === 'string' ? JSON.parse(flow.edges) : flow.edges
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          savedLayout = parsed
        } else if (Array.isArray(parsed)) {
          // Legacy format: just an edges array
          savedLayout = { edges: parsed }
        }
      } catch { /* fall through */ }
    }
    savedLayout = normalizeSavedLayout(savedLayout, steps.length)

    steps.forEach((step: any, idx: number) => {
      let config: Record<string, any> = {}
      try {
        const raw = typeof step.config === 'string' ? JSON.parse(step.config) : step.config
        config = typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch { config = {} }
      const nodeId = stepNodeId(idx)
      const pos = savedLayout.positions?.[nodeId] || { x: 300, y: idx * 120 + 50 }
      const node: Node = {
        id: nodeId,
        type: step.type,
        position: { x: pos.x, y: pos.y },
        data: {
          stepType: step.type,
          name: step.name,
          config,
          label: step.name,
        },
      }
      newNodes.push(node)
    })

    // Restore persisted edges (skip edges referencing deleted nodes)
    if (savedLayout.edges?.length) {
      const validNodeIds = new Set(newNodes.map(n => n.id))
      savedLayout.edges.forEach((e: any) => {
        if (!validNodeIds.has(e.source) || !validNodeIds.has(e.target)) return
        newEdges.push({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: '#409eff', strokeWidth: 2 },
        })
      })
    }
    // Fallback: auto-connect sequential steps for flows saved without edges
    if (newEdges.length === 0 && newNodes.length > 1) {
      for (let idx = 1; idx < newNodes.length; idx++) {
        newEdges.push({
          id: `e-${newNodes[idx - 1].id}-${newNodes[idx].id}`,
          source: newNodes[idx - 1].id,
          target: newNodes[idx].id,
          animated: true,
          style: { stroke: '#409eff', strokeWidth: 2 },
        })
      }
    }

    nodeIdCounter = steps.length
    nodes.value = newNodes
    edges.value = newEdges
    await nextTick()
    isLoadingFlow.value = false
    syncRuleEdges()
    await finishFlowHydration()
  } catch (e) {
    ElMessage.error('Failed to load flow')
    isHydratingFlow.value = false
  } finally {
    isLoadingFlow.value = false
  }
}

async function loadTemplate(id: number) {
  try {
    isLoadingFlow.value = true
    isHydratingFlow.value = true
    const resp = await flowTemplateApi.getByID(id)
    const template = resp.data?.data || resp.data
    if (!template) { ElMessage.error('Template not found'); return }

    templateId.value = template.id
    flowName.value = template.name
    flowDescription.value = template.description || ''
    stepInterval.value = template.stepInterval || 0
    commMode.value = template.commMode || 'active'
    constantVariables.value = []
    isPublished.value = false
    isDirty.value = false

    let steps: any[] = []
    try {
      const parsed = typeof template.steps === 'string' ? JSON.parse(template.steps || '[]') : template.steps
      steps = Array.isArray(parsed) ? parsed : []
    } catch {
      steps = []
    }

    nodeIdCounter = 0
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    let savedLayout: PersistedFlowLayout = {}
    if (template.edges) {
      try {
        const parsed = typeof template.edges === 'string' ? JSON.parse(template.edges) : template.edges
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          savedLayout = parsed
        } else if (Array.isArray(parsed)) {
          savedLayout = { edges: parsed }
        }
      } catch { /* fall through */ }
    }
    savedLayout = normalizeSavedLayout(savedLayout, steps.length)

    steps.forEach((step: any, idx: number) => {
      let config: Record<string, any> = {}
      try {
        const raw = typeof step.config === 'string' ? JSON.parse(step.config) : step.config
        config = typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch { config = {} }
      const nodeId = stepNodeId(idx)
      const pos = savedLayout.positions?.[nodeId] || { x: 300, y: idx * 120 + 50 }
      newNodes.push({
        id: nodeId,
        type: step.type,
        position: { x: pos.x, y: pos.y },
        data: {
          stepType: step.type,
          name: step.name,
          config,
          label: step.name,
        },
      })
    })

    if (savedLayout.edges?.length) {
      const validNodeIds = new Set(newNodes.map(n => n.id))
      savedLayout.edges.forEach((e: any) => {
        if (!validNodeIds.has(e.source) || !validNodeIds.has(e.target)) return
        newEdges.push({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: '#409eff', strokeWidth: 2 },
        })
      })
    }
    if (newEdges.length === 0 && newNodes.length > 1) {
      for (let idx = 1; idx < newNodes.length; idx++) {
        newEdges.push({
          id: `e-${newNodes[idx - 1].id}-${newNodes[idx].id}`,
          source: newNodes[idx - 1].id,
          target: newNodes[idx].id,
          animated: true,
          style: { stroke: '#409eff', strokeWidth: 2 },
        })
      }
    }

    nodeIdCounter = steps.length
    nodes.value = newNodes
    edges.value = newEdges
    await nextTick()
    isLoadingFlow.value = false
    syncRuleEdges()
    await finishFlowHydration()
  } catch {
    ElMessage.error('Failed to load template')
    isHydratingFlow.value = false
  } finally {
    isLoadingFlow.value = false
  }
}

async function loadEngines() {
  try {
    const resp = await engineApi.getEngines({ page: 1, pageSize: 100 })
    engines.value = resp.data?.data || []
  } catch { /* ignore */ }
}

async function handleRun() {
  if (isDirty.value) {
    ElMessage.warning('Save changes before opening Auto SECS')
    return
  }
  if (!flowId.value) {
    ElMessage.warning('Save the flow first')
    return
  }
  const query: Record<string, string> = { flowId: String(flowId.value) }
  if (runEngineId.value) {
    query.engineId = String(runEngineId.value)
  }
  router.push({ path: '/auto-secs', query })
}

async function handleSave() {
  if (!flowName.value.trim()) {
    ElMessage.warning(isTemplateMode.value ? 'Template name is required' : 'Flow name is required')
    return
  }
  if (nodes.value.length === 0) {
    ElMessage.warning('Add at least one step')
    return
  }
  if (!isTemplateMode.value && !validateConstantVariables()) {
    return
  }

  const names = nodes.value.map(n => (n.data?.name || '').trim()).filter(Boolean)
  const dupes = names.filter((n, i) => names.indexOf(n) !== i)
  if (dupes.length > 0) {
    ElMessage.warning(`Duplicate step names: ${[...new Set(dupes)].join(', ')}`)
    return
  }

  const unnamedSend = nodes.value.find(n => n.data?.stepType === 'send' && !n.data?.name?.trim())
  if (unnamedSend) {
    ElMessage.warning('Every Send step must have a name')
    return
  }

  saving.value = true
  try {
    const payload = buildPersistPayload()

    if (isTemplateMode.value) {
      if (!templateId.value) {
        ElMessage.warning('Template ID is missing')
        return
      }
      await flowTemplateApi.update(templateId.value, {
        name: payload.name,
        description: payload.description,
        stepInterval: payload.stepInterval,
        commMode: payload.commMode,
        edges: payload.edges,
        steps: payload.steps,
      })
      ElMessage.success('Template saved')
      savedEditorSignature = editorSignature.value
      recordGraphHistory()
      isDirty.value = false
      return
    }

    if (flowId.value && isPublished.value) {
      try { await flowApi.unpublish(flowId.value) } catch { /* continue */ }
      isPublished.value = false
    }

    if (flowId.value) {
      await flowApi.update(flowId.value, payload)
      ElMessage.success('Saved')
    } else {
      const resp = await flowApi.create(payload)
      const newId = resp.data?.data?.id
      if (newId) flowId.value = newId
      ElMessage.success('Created')
    }
    savedEditorSignature = editorSignature.value
    recordGraphHistory()
    isDirty.value = false
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed'
    ElMessage.error(msg)
  } finally {
    saving.value = false
  }
}

function openSaveTemplateDialog() {
  saveTemplateForm.value.name = flowName.value + ' Template'
  saveTemplateForm.value.description = flowDescription.value
  saveTemplateVisible.value = true
}

function onSaveDropdownCommand(command: string) {
  if (command === 'saveTemplate') {
    openSaveTemplateDialog()
  }
}

async function handleSaveTemplate() {
  if (!saveTemplateForm.value.name.trim()) {
    ElMessage.warning('Template name is required')
    return
  }
  if (nodes.value.length === 0) {
    ElMessage.warning('Add at least one step')
    return
  }

  saveTemplateLoading.value = true
  try {
    const payload = buildPersistPayload()
    await flowTemplateApi.create({
      name: saveTemplateForm.value.name,
      description: saveTemplateForm.value.description,
      commMode: payload.commMode,
      stepInterval: payload.stepInterval,
      edges: payload.edges,
      steps: payload.steps,
    })
    recordGraphHistory()
    saveTemplateVisible.value = false
    ElMessage.success('Template saved')
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save template failed'
    ElMessage.error(msg)
  } finally {
    saveTemplateLoading.value = false
  }
}

async function goBack() {
  if (isDirty.value) {
    try {
      await ElMessageBox.confirm(
        'You have unsaved changes. Leave without saving?',
        'Unsaved Changes',
        { confirmButtonText: 'Leave', cancelButtonText: 'Stay', type: 'warning' }
      )
    } catch {
      return
    }
  }
  router.push('/flow')
}

function markDirty() {
  updateDirtyState()
}

function updateDirtyState() {
  if ((!flowId.value && !templateId.value) || isLoadingFlow.value || isHydratingFlow.value) return
  isDirty.value = editorSignature.value !== savedEditorSignature
}

async function handlePublish() {
  if (!flowId.value) return
  if (isDirty.value) {
    ElMessage.warning('Save changes before publishing')
    return
  }
  publishing.value = true
  try {
    await flowApi.publish(flowId.value)
    isPublished.value = true
    ElMessage.success('Published')
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Publish failed'
    ElMessage.error(msg)
  } finally {
    publishing.value = false
  }
}

// ===== Keyboard Shortcuts =====
function onKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  const isEditingText = target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    target?.tagName === 'SELECT' ||
    target?.isContentEditable ||
    !!target?.closest?.('.monaco-editor')
  const modifier = e.ctrlKey || e.metaKey
  if (modifier && e.key.toLowerCase() === 'z' && !isEditingText) {
    e.preventDefault()
    if (e.shiftKey) {
      redoGraph()
    } else {
      undoGraph()
    }
    return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // Don't delete if user is typing in an input/textarea
    if (isEditingText) return
    if (deleteSelectedEdge()) return
    deleteSelectedNode()
  }
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!isDirty.value) return
  e.preventDefault()
  e.returnValue = ''
}

// ===== Lifecycle =====
onMounted(async () => {
  loadEngines()
  const id = route.params.id as string
  if (isTemplateMode.value && id && id !== 'new') {
    await loadTemplate(Number(id))
  } else if (id && id !== 'new') {
    await loadFlow(Number(id))
  } else {
    flowName.value = isTemplateMode.value ? 'New Template' : 'New Flow'
    constantVariables.value = []
    nodes.value = []
    resetGraphHistory()
  }
  loadSmlTree()
  loadFlowFunctions()
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('mousemove', onFlowResizeMove)
  document.addEventListener('mouseup', onFlowResizeUp)
  window.addEventListener('beforeunload', onBeforeUnload)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('mousemove', onFlowResizeMove)
  document.removeEventListener('mouseup', onFlowResizeUp)
  window.removeEventListener('beforeunload', onBeforeUnload)
  onFlowResizeUp()
  if (smlEditor) { smlEditor.dispose(); smlEditor = null; smlEditorReady = false }
  if (fnEditor) { fnEditor.dispose(); fnEditor = null }
})
</script>

<style scoped>
.flow-editor {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 85px);
  background: #f0f2f5;
}

/* ===== Top Bar ===== */
.editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flow-name-input :deep(.el-input__wrapper) {
  box-shadow: none;
  padding-left: 4px;
  padding-right: 4px;
}

.flow-name-input :deep(.el-input__inner) {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.topbar-center {
  display: flex;
  align-items: center;
}

.topbar-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.interval-unit {
  margin-left: 4px;
  color: #909399;
  font-size: 13px;
}

.mode-tag {
  font-size: 12px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-wrap {
  display: inline-flex;
}

/* ===== Three Panels ===== */
.editor-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ===== Left Panel: Activity Bar + Sidebar ===== */
.panel-left {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  overflow: hidden;
  height: 100%;
}

/* Activity Bar */
.activity-bar {
  width: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 4px;
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.activity-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  color: #606266;
  font-size: 20px;
  transition: all 0.2s;
  position: relative;
}

.activity-icon:hover {
  background: #e4e7ed;
  color: #409eff;
}

.activity-icon.active {
  color: #409eff;
  background: #ecf5ff;
}

.activity-icon.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: #409eff;
  border-radius: 0 2px 2px 0;
}

/* Sidebar Content */
.sidebar-content {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  overflow: hidden;
}

.flow-resizer {
  width: 6px;
  flex-shrink: 0;
  background: #f5f7fa;
  cursor: col-resize;
  transition: background-color 0.15s;
}

.flow-resizer:hover {
  background: #dcdfe6;
}

.flow-resizer.disabled {
  cursor: default;
}

.flow-resizer.disabled:hover {
  background: #f5f7fa;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.sidebar-header .section-title {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar-header .header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.collapse-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #909399;
  font-size: 12px;
  border-radius: 4px;
  transition: all 0.2s;
}

.collapse-btn:hover {
  color: #409eff;
  background: #f5f7fa;
}

/* Node Table */
.node-table :deep(.el-table__row) {
  cursor: pointer;
}

.node-table :deep(.current-row) {
  background-color: #ecf5ff !important;
}

.node-table :deep(.el-table__cell) {
  padding: 3px 0 !important;
}

.unnamed-node {
  color: #c0c4cc;
  font-style: italic;
}

.table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 8px;
  color: #c0c4cc;
  text-align: center;
}

.table-empty-text {
  font-size: 12px;
  margin-top: 4px;
}

/* ===== Right Panel: Activity Bar + Sidebar ===== */
.panel-right {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  overflow: hidden;
  height: 100%;
}

.right-activity-bar {
  border-right: none;
  border-left: 1px solid #e4e7ed;
}

.right-activity-bar .activity-icon.active::before {
  left: auto;
  right: 0;
  border-radius: 2px 0 0 2px;
}

.right-sidebar {
  border-right: none;
  border-left: 1px solid #e4e7ed;
}

.component-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.variables-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
}

.variables-section-title .header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flow-props-section {
  margin-bottom: 18px;
}

.flow-props-panel .variables-section-title {
  align-items: flex-start;
  gap: 8px;
}

.flow-props-panel .variables-section-title .header-actions {
  flex-shrink: 0;
}

.variables-empty {
  padding: 10px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
  background: #fafafa;
}

.constant-var-card {
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
}

.constant-var-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.constant-var-row:last-child {
  margin-bottom: 0;
}

.constant-var-row.meta-row {
  align-items: center;
}

.constant-var-row.meta-row :deep(.el-checkbox) {
  flex-shrink: 0;
  margin-right: 0;
}

.constant-var-name-input {
  flex: 1;
  min-width: 0;
}

.component-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  cursor: grab;
  transition: all 0.2s;
  background: #fff;
}

.component-item:hover {
  border-color: #c0c4cc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.component-item:active {
  cursor: grabbing;
  transform: translateY(0);
}

.comp-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.comp-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.comp-name {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.comp-desc {
  font-size: 11px;
  color: #909399;
}

/* Center Panel */
.panel-center {
  flex: 1;
  min-width: 0;
  position: relative;
  background: #fafbfc;
}

.panel-center.drag-over {
  background: #f0f7ff;
}

.panel-center :deep(.vue-flow) {
  width: 100%;
  height: 100%;
}

.panel-center :deep(.vue-flow__controls-button:disabled) {
  cursor: not-allowed;
  color: #c0c4cc;
  background: #f5f7fa;
}

.panel-center :deep(.layout-dropdown) {
  display: flex;
}

.empty-canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #c0c4cc;
  pointer-events: none;
}

.empty-canvas p {
  margin-top: 12px;
  font-size: 14px;
}

.empty-actions {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  justify-content: center;
  pointer-events: auto;
}

.props-content {
  padding: 12px 16px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.props-content :deep(.el-form-item) {
  margin-bottom: 12px;
  position: relative;
}

.props-content :deep(.el-form-item__label) {
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
}

/* Send panel: avoid display:none to prevent Monaco DOM destroy.
   Use position:absolute + opacity:0 to hide without reflow */
.send-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.send-panel.panel-hidden,
.non-send-panel.panel-hidden {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.sml-editor-container {
  flex: 1;
  min-height: 320px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.function-list {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fn-empty {
  font-size: 12px;
  color: #c0c4cc;
  text-align: center;
  padding: 12px 0;
}

.function-item {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
}

.function-item:hover {
  border-color: #c0c4cc;
  background: #f5f7fa;
}

.fn-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.fn-name {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.fn-more {
  cursor: pointer;
  color: #c0c4cc;
  font-size: 14px;
  flex-shrink: 0;
  transform: rotate(90deg);
}

.fn-more:hover {
  color: #409eff;
}

.fn-desc {
  font-size: 11px;
  color: #909399;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fn-params-editor {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fn-param-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

/* ===== Function Dialog ===== */
.fn-dialog-body {
  display: flex;
  gap: 16px;
  height: min(680px, 72vh);
}

.fn-dialog-left {
  flex: 1.2;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.fn-dialog-right {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-width: 0;
  overflow: hidden;
}

.fn-dialog-right.collapsed {
  flex: 0 0 48px;
}

.fn-test-panel-wrapper {
  flex: 1;
  min-width: 0;
  padding: 12px 16px;
  overflow: auto;
}

.fn-test-activity-bar {
  border-right: none;
  border-left: 1px solid #e4e7ed;
}

.fn-test-activity-bar .activity-icon.active::before {
  left: auto;
  right: 0;
  border-radius: 2px 0 0 2px;
}

.fn-test-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.fn-edit-form :deep(.el-form-item) {
  margin-bottom: 8px;
}

.fn-edit-hint {
  font-size: 11px;
  color: #909399;
  margin-bottom: 6px;
  line-height: 1.4;
  flex-shrink: 0;
}

.fn-edit-hint code {
  background: #f5f7fa;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
  color: #409eff;
}

.fn-editor-container {
  flex: 1;
  min-height: 200px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.fn-test-panel {
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: #f5f7fa;
}

.fn-test-hint {
  font-size: 11px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.fn-test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.fn-test-title {
  font-weight: 600;
  font-size: 13px;
  color: #303133;
}

.fn-test-vars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fn-test-var-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.fn-test-error {
  margin-top: 10px;
}

.fn-test-result {
  margin-top: 10px;
}

.fn-test-result-section {
  margin-bottom: 8px;
}

.fn-test-result-section pre {
  margin: 4px 0 0 0;
  padding: 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 150px;
  overflow-y: auto;
}

.result-pre {
  background: #f0f9ff;
  border-color: #91caff;
  color: #0958d9;
}

.logs-pre {
  background: #f6ffed;
  border-color: #b7eb8f;
  color: #389e0d;
}

.fn-test-label {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
}
</style>
