<template>
  <div class="checklist-detail">
    <el-card>
      <div class="detail-header">
        <div class="header-left">
          <el-button @click="goBack" text>
            <el-icon><ArrowLeft /></el-icon>
            Back
          </el-button>
          <span class="header-title">{{ checklist.name || 'Loading...' }}</span>
          <el-tag v-if="checklist.vendor" size="small" type="info">{{ checklist.vendor }}</el-tag>
          <el-tag v-if="checklist.model" size="small" type="success">EQP: {{ checklist.model }}</el-tag>
          <el-tag v-if="checklist.modelDesc" size="small" effect="plain">{{ checklist.modelDesc }}</el-tag>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="handleOpenGenerateFlow">
            <el-icon><DocumentAdd /></el-icon>
            Generate Flow
          </el-button>
          <el-button @click="handleOpenGenerateSML">
            <el-icon><DocumentAdd /></el-icon>
            Generate SML
          </el-button>
          <el-button @click="handleImport">
            <el-icon><Upload /></el-icon>
            Import Excel
          </el-button>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="detail-tabs" @tab-change="handleTabChange">
        <!-- ==================== TAB 1: CEID (Relation View) ==================== -->
        <el-tab-pane name="ceid">
          <template #label>
            <span>CEID <el-badge :value="ceids.length" type="info" class="tab-badge" /></span>
          </template>
          <div class="ceid-layout" ref="ceidLayoutRef">
            <div class="ceid-list-panel" :style="{ width: ceidPanelWidth + 'px' }">
              <div class="panel-toolbar">
                <el-input v-model="ceidSearch" placeholder="Search CEID..." clearable size="small" />
                <el-button type="primary" size="small" @click="handleAddCEID" style="margin-left: 8px">
                  <el-icon><Plus /></el-icon>
                </el-button>
              </div>
              <div class="ceid-list" v-loading="ceidLoading">
                <div
                  v-for="c in filteredCEIDs" :key="c.id"
                  class="ceid-item"
                  :class="{ active: selectedCEID?.id === c.id }"
                  @click="selectCEID(c)"
                >
                  <span class="ceid-id">{{ c.ceid }}</span>
                  <span class="ceid-name">{{ c.name }}</span>
                  <el-button size="small" text type="danger" @click.stop="handleDeleteCEID(c)" class="ceid-del">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <div v-if="filteredCEIDs.length === 0" class="empty-hint">No CEIDs</div>
              </div>
            </div>
            <div class="ceid-resizer" @mousedown.left="onCeidResizerDown">
              <div class="ceid-resizer-handle"></div>
            </div>
            <div class="ceid-detail-panel">
              <template v-if="selectedCEID">
                <div class="ceid-header-row">
                  <div class="ceid-field"><span class="field-label">CEID</span><span class="field-value">{{ selectedCEID.ceid }}</span></div>
                  <div class="ceid-field"><span class="field-label">Name</span><span class="field-value">{{ selectedCEID.name }}</span></div>
                  <div class="ceid-field"><span class="field-label">Handler</span><span class="field-value">{{ selectedCEID.handler || '-' }}</span></div>
                  <div class="ceid-field"><span class="field-label">Require</span><el-tag :type="selectedCEID.require ? 'success' : 'info'" size="small">{{ selectedCEID.require ? 'Y' : 'N' }}</el-tag></div>
                  <el-button size="small" type="primary" @click="handleEditCEID(selectedCEID)">Edit CEID</el-button>
                </div>
                <div v-if="selectedCEID.description" class="ceid-desc">{{ selectedCEID.description }}</div>
                <el-divider content-position="left">Reports</el-divider>
                <div v-for="rpt in selectedCEIDReports" :key="rpt.rptid" class="report-card">
                  <div class="report-header">
                    <el-tag type="warning" size="small">RPTID {{ rpt.rptid }}</el-tag>
                    <span class="report-name">{{ rpt.name }}</span>
                  </div>
                  <table class="vid-table">
                    <thead><tr><th style="width:40px">#</th><th style="width:70px">VID</th><th>Name</th><th style="width:60px">Format</th><th>ValueMap</th></tr></thead>
                    <tbody>
                      <tr v-for="(vid, vi) in getReportVIDs(rpt)" :key="vi">
                        <td>{{ vi + 1 }}</td>
                        <td>{{ vid.vid }}</td>
                        <td>{{ vid.name }}</td>
                        <td>{{ vid.format }}</td>
                        <td class="vm-cell">
                          <template v-if="getVIDValueMapSummary(vid.name)">
                            <el-tag v-for="(vm, ki) in getVIDValueMapSummary(vid.name)" :key="ki" size="small" type="" style="margin:1px">{{ vm }}</el-tag>
                          </template>
                          <span v-else>-</span>
                        </td>
                      </tr>
                      <tr v-if="getReportVIDs(rpt).length === 0"><td colspan="5" style="color:#909399">No linked VIDs</td></tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="selectedCEIDReports.length === 0" class="empty-hint">No reports linked</div>
              </template>
              <div v-else class="empty-hint" style="padding-top:80px">Select a CEID from the left</div>
            </div>
          </div>
        </el-tab-pane>

        <!-- ==================== TAB 2: RPTID (Definition View) ==================== -->
        <el-tab-pane name="rptid">
          <template #label>
            <span>RPTID <el-badge :value="rptids.length" type="info" class="tab-badge" /></span>
          </template>
          <div class="tab-toolbar">
            <el-button type="primary" size="small" @click="handleAddRPTID"><el-icon><Plus /></el-icon> Add RPTID</el-button>
            <el-input v-model="rptidSearch" placeholder="Search RPTID..." clearable style="width: 200px" size="small" />
          </div>
          <el-table border :data="filteredRPTIDs" size="small" v-loading="rptidLoading" max-height="calc(100vh - 260px)" row-key="id">
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="rptid-vid-expand">
                  <div class="vm-header">
                    <span>VIDs in report</span>
                  </div>
                  <table v-if="row._vidItems && row._vidItems.length > 0" class="vm-inner-table">
                    <thead><tr><th style="width:40px">#</th><th style="width:70px">VID</th><th>Name</th><th style="width:60px">Format</th><th style="width:50px"></th></tr></thead>
                    <tbody>
                      <tr v-for="(vn, vi) in row._vidItems" :key="vi">
                        <td>{{ vi + 1 }}</td>
                        <td>{{ getVIDByName(vn)?.vid || '-' }}</td>
                        <td>{{ vn }}</td>
                        <td>{{ getVIDByName(vn)?.format || '-' }}</td>
                        <td><el-button size="small" type="danger" text @click="removeVIDFromRPTID(row, vi)"><el-icon><Delete /></el-icon></el-button></td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-else class="empty-hint">No linked VIDs</div>
                  <div style="margin-top:8px">
                    <el-select v-model="row._addVIDName" filterable allow-create default-first-option size="small" placeholder="Add VID..." style="width:200px" @change="addVIDToRPTID(row)">
                      <el-option v-for="v in availableVIDsForRPTID(row)" :key="v.name" :label="v.name" :value="v.name" />
                    </el-select>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="rptid" label="RPTID" width="90">
              <template #default="{ row }">
                <el-input v-if="editingRPTIDId === row.id" v-model.number="editingRPTIDData.rptid" size="small" type="number" @blur="saveInlineRPTID(row)" @keyup.enter="saveInlineRPTID(row)" />
                <span v-else class="editable-cell" @dblclick="startInlineRPTID(row)">{{ row.rptid }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="Name" width="200">
              <template #default="{ row }">
                <el-input v-if="editingRPTIDId === row.id" v-model="editingRPTIDData.name" size="small" @blur="saveInlineRPTID(row)" @keyup.enter="saveInlineRPTID(row)" />
                <span v-else class="editable-cell" @dblclick="startInlineRPTID(row)">{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column label="VIDs" min-width="250">
              <template #default="{ row }">
                <el-tag v-for="(vn, i) in getRPTIDVIDNames(row)" :key="i" size="small" style="margin:1px">{{ vn }}</el-tag>
                <span v-if="!row.links" style="color:#909399">-</span>
              </template>
            </el-table-column>
            <el-table-column label="Req" width="55" align="center">
              <template #default="{ row }">
                <el-checkbox :model-value="row.require" @change="toggleRPTIDRequire(row)" size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="description" label="Description" width="150" show-overflow-tooltip />
            <el-table-column label="" width="70" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="danger" @click="handleDeleteRPTID(row)" circle title="Delete"><el-icon><Delete /></el-icon></el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- ==================== TAB 3: VID (Definition View) ==================== -->
        <el-tab-pane name="vid">
          <template #label>
            <span>VID <el-badge :value="vids.length" type="info" class="tab-badge" /></span>
          </template>
          <div class="tab-toolbar">
            <el-button type="primary" size="small" @click="handleAddVID"><el-icon><Plus /></el-icon> Add VID</el-button>
            <el-button size="small" @click="showBatchVIDDialog = true"><el-icon><DocumentAdd /></el-icon> Batch Add</el-button>
            <el-input v-model="vidSearch" placeholder="Search VID..." clearable style="width: 200px" size="small" />
          </div>
          <el-table border :data="filteredVIDs" size="small" v-loading="vidLoading" max-height="calc(100vh - 260px)" row-key="id" :expand-row-keys="expandedVIDRows" @expand-change="handleVIDExpand">
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="vm-expand-panel">
                  <div class="vm-header">
                    <span>ValueMap for <b>{{ row.name }}</b></span>
                    <el-button size="small" type="primary" @click="handleAddValueMap(row.name)">+ Add</el-button>
                  </div>
                  <table v-if="getVIDValueMaps(row.name).length > 0" class="vm-inner-table">
                    <thead><tr><th>Key</th><th>Value</th><th style="width:80px"></th></tr></thead>
                    <tbody>
                      <tr v-for="vm in getVIDValueMaps(row.name)" :key="vm.id">
                        <td><el-input v-model="vm.key" size="small" style="width:100px" @change="handleUpdateValueMap(vm)" /></td>
                        <td><el-input v-model="vm.value" size="small" @change="handleUpdateValueMap(vm)" /></td>
                        <td><el-button size="small" type="danger" text @click="handleDeleteValueMap(vm)"><el-icon><Delete /></el-icon></el-button></td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-else class="empty-hint">No ValueMap defined. Click + Add to create.</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="vid" label="VID" width="90">
              <template #default="{ row }">
                <el-input v-if="editingVIDId === row.id" v-model.number="editingVIDData.vid" size="small" type="number" @blur="saveInlineVID(row)" @keyup.enter="saveInlineVID(row)" />
                <span v-else class="editable-cell" @dblclick="startInlineVID(row, 'vid')">{{ row.vid }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="Name" width="180">
              <template #default="{ row }">
                <el-input v-if="editingVIDId === row.id" v-model="editingVIDData.name" size="small" @blur="saveInlineVID(row)" @keyup.enter="saveInlineVID(row)" />
                <span v-else class="editable-cell" @dblclick="startInlineVID(row, 'name')">{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="format" label="Format" width="80">
              <template #default="{ row }">
                <el-select v-if="editingVIDId === row.id" v-model="editingVIDData.format" size="small" style="width:70px" @change="saveInlineVID(row)">
                  <el-option v-for="f in ['U1','U2','U4','I4','A','L:U1','B']" :key="f" :label="f" :value="f" />
                </el-select>
                <span v-else class="editable-cell" @dblclick="startInlineVID(row, 'format')">{{ row.format }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="value" label="Value" width="140" show-overflow-tooltip>
              <template #default="{ row }">
                <el-input v-if="editingVIDId === row.id" v-model="editingVIDData.value" size="small" @blur="saveInlineVID(row)" @keyup.enter="saveInlineVID(row)" />
                <span v-else class="editable-cell" @dblclick="startInlineVID(row, 'value')">{{ row.value || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Req" width="55" align="center">
              <template #default="{ row }">
                <el-checkbox :model-value="row.require" @change="toggleVIDRequire(row)" size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="description" label="Description" min-width="150" show-overflow-tooltip />
            <el-table-column label="" width="70" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="danger" @click="handleDeleteVID(row)" circle title="Delete"><el-icon><Delete /></el-icon></el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane name="dataformat">
          <template #label>
            <span>DataFormat</span>
          </template>
          <div class="dataformat-panel">
            <el-descriptions :column="2" size="small" border>
              <el-descriptions-item label="DATAID Type">
                <el-select v-model="dfForm.dataIdType" size="small" style="width: 120px" @change="saveDataFormat">
                  <el-option v-for="t in dataFormatTypes" :key="t" :label="t" :value="t" />
                </el-select>
              </el-descriptions-item>
              <el-descriptions-item label="VID Type">
                <el-select v-model="dfForm.vidType" size="small" style="width: 120px" @change="saveDataFormat">
                  <el-option v-for="t in dataFormatTypes" :key="t" :label="t" :value="t" />
                </el-select>
              </el-descriptions-item>
              <el-descriptions-item label="RPTID Type">
                <el-select v-model="dfForm.rptidType" size="small" style="width: 120px" @change="saveDataFormat">
                  <el-option v-for="t in dataFormatTypes" :key="t" :label="t" :value="t" />
                </el-select>
              </el-descriptions-item>
              <el-descriptions-item label="CEID Type">
                <el-select v-model="dfForm.ceidType" size="small" style="width: 120px" @change="saveDataFormat">
                  <el-option v-for="t in dataFormatTypes" :key="t" :label="t" :value="t" />
                </el-select>
              </el-descriptions-item>
              <el-descriptions-item label="ECID Type">
                <el-select v-model="dfForm.ecidType" size="small" style="width: 120px" @change="saveDataFormat">
                  <el-option v-for="t in dataFormatTypes" :key="t" :label="t" :value="t" />
                </el-select>
              </el-descriptions-item>
              <el-descriptions-item label="ALID Type">
                <el-select v-model="dfForm.alidType" size="small" style="width: 120px" @change="saveDataFormat">
                  <el-option v-for="t in dataFormatTypes" :key="t" :label="t" :value="t" />
                </el-select>
              </el-descriptions-item>
              <el-descriptions-item label="RSDC Type">
                <el-select v-model="dfForm.rsdcType" size="small" style="width: 120px" @change="saveDataFormat">
                  <el-option v-for="t in dataFormatTypes" :key="t" :label="t" :value="t" />
                </el-select>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="smlDialogVisible" title="Generate SML Files" width="460px" :destroy-on-close="true">
      <el-form label-width="120px">
        <el-form-item label="Checklist">
          <el-input :model-value="checklist.name" readonly />
        </el-form-item>
        <el-form-item label="Source Folder">
          <el-select v-model="smlSourceFolder" filterable placeholder="Select source folder" style="width: 100%">
            <el-option v-for="s in smlRootFolders" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="Target Folder">
          <el-input v-model="smlFolderName" placeholder="New folder name" maxlength="100" />
        </el-form-item>
        <el-form-item label="Node Type">
          <el-tag>HOST</el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="smlDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleGenerateSML" :loading="smlGenerating">Generate</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="flowDialogVisible" title="Generate Flow from Checklist" width="560px" :destroy-on-close="true">
      <el-form label-width="130px">
        <el-form-item label="Checklist">
          <el-input :model-value="checklist.name" readonly />
        </el-form-item>
        <el-form-item label="Flow Template">
          <el-select v-model="flowTemplateId" filterable placeholder="Select template" style="width: 100%" :loading="flowTemplateLoading">
            <el-option v-for="t in flowTemplates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Flow Name">
          <el-input v-model="flowName" placeholder="Generated flow name" maxlength="100" />
        </el-form-item>
        <el-form-item label="Source Folder">
          <el-select v-model="flowSourceFolder" filterable placeholder="Select source folder" style="width: 100%">
            <el-option v-for="s in smlRootFolders" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="SML Folder">
          <el-input v-model="flowFolderName" placeholder="Generated SML folder name" maxlength="100" />
        </el-form-item>
        <el-form-item label="Options">
          <el-checkbox v-model="flowForce">Overwrite SML folder</el-checkbox>
          <el-checkbox v-model="flowPublish">Publish flow after generation</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="flowDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleGenerateFlow" :loading="flowGenerating">Generate</el-button>
      </template>
    </el-dialog>

    <!-- Import Dialog -->
    <el-dialog v-model="showImportDialog" title="Import Excel" width="480px" :destroy-on-close="true">
      <el-upload ref="importUploadRef" :auto-upload="false" :limit="1" accept=".xlsx,.xlsm" :on-change="handleImportFileChange" :on-remove="() => importFile = null" drag>
        <el-icon style="font-size: 40px; color: #909399"><Upload /></el-icon>
        <div>Drop .xlsm/.xlsx file here, or click to select</div>
      </el-upload>
      <template #footer>
        <el-button @click="showImportDialog = false">Cancel</el-button>
        <el-button type="primary" @click="handleDoImport" :loading="importing">Import</el-button>
      </template>
    </el-dialog>

    <!-- Batch VID Dialog -->
    <el-dialog v-model="showBatchVIDDialog" title="Batch Add VIDs" width="560px" :destroy-on-close="true">
      <div style="margin-bottom:8px;color:#909399;font-size:12px">One VID per line: VID,Name,Format,Value (Value optional)</div>
      <el-input v-model="batchVIDText" type="textarea" :rows="10" placeholder="2002,Clock,A&#10;10000,ControlState,U1,5" />
      <template #footer>
        <el-button @click="showBatchVIDDialog = false">Cancel</el-button>
        <el-button type="primary" @click="handleBatchCreateVIDs" :loading="batchLoading">Create</el-button>
      </template>
    </el-dialog>

    <!-- CEID Edit Drawer -->
    <el-drawer v-model="ceidDrawerVisible" :title="ceidDrawerIsEdit ? 'Edit CEID' : 'Add CEID'" size="420px" :destroy-on-close="true">
      <el-form ref="ceidFormRef" :model="ceidFormData" :rules="ceidFormRules" label-width="100px">
        <el-form-item label="CEID" prop="ceid">
          <el-input-number v-model="ceidFormData.ceid" :min="0" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Name" prop="name">
          <el-input v-model="ceidFormData.name" />
        </el-form-item>
        <el-form-item label="Links (RPTIDs)">
          <el-select v-model="ceidFormData.linkItems" multiple filterable allow-create default-first-option style="width: 100%" placeholder="Select or type RPTID names">
            <el-option v-for="r in rptids" :key="r.id" :label="r.name" :value="r.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="Handler">
          <el-input v-model="ceidFormData.handler" />
        </el-form-item>
        <el-form-item label="Require">
          <el-switch v-model="ceidFormData.require" />
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="ceidFormData.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ceidDrawerVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleCEIDSubmit">Save</el-button>
      </template>
    </el-drawer>

    <!-- VID Add Drawer -->
    <el-drawer v-model="vidDrawerVisible" title="Add VID" size="420px" :destroy-on-close="true">
      <el-form ref="vidFormRef" :model="vidFormData" :rules="vidFormRules" label-width="100px">
        <el-form-item label="VID" prop="vid">
          <el-input-number v-model="vidFormData.vid" :min="0" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Name" prop="name">
          <el-input v-model="vidFormData.name" />
        </el-form-item>
        <el-form-item label="Format">
          <el-select v-model="vidFormData.format" clearable style="width: 100%">
            <el-option v-for="f in ['U1','U2','U4','I4','A','L:U1','B']" :key="f" :label="f" :value="f" />
          </el-select>
        </el-form-item>
        <el-form-item label="Value">
          <el-input v-model="vidFormData.value" />
        </el-form-item>
        <el-form-item label="Require">
          <el-switch v-model="vidFormData.require" />
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="vidFormData.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="vidDrawerVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleVIDSubmit">Save</el-button>
      </template>
    </el-drawer>

    <!-- RPTID Add Drawer -->
    <el-drawer v-model="rptidDrawerVisible" title="Add RPTID" size="420px" :destroy-on-close="true">
      <el-form ref="rptidFormRef" :model="rptidFormData" :rules="rptidFormRules" label-width="100px">
        <el-form-item label="RPTID" prop="rptid">
          <el-input-number v-model="rptidFormData.rptid" :min="0" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Name" prop="name">
          <el-input v-model="rptidFormData.name" />
        </el-form-item>
        <el-form-item label="Links (VIDs)">
          <el-select v-model="rptidFormData.linkItems" multiple filterable allow-create default-first-option style="width: 100%" placeholder="Select or type VID names">
            <el-option v-for="v in vids" :key="v.id" :label="v.name" :value="v.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="Require">
          <el-switch v-model="rptidFormData.require" />
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="rptidFormData.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rptidDrawerVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleRPTIDSubmit">Save</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Delete, Upload, DocumentAdd } from '@element-plus/icons-vue'
import { checklistApi } from '../api/checklist'
import { smlApi } from '../api/sml'
import { flowTemplateApi } from '../api/flow-template'
import type { Checklist, ChecklistVID, ChecklistRPTID, ChecklistCEID, ChecklistValueMap, FlowTemplate } from '../types'
import type { UploadFile } from 'element-plus'

const route = useRoute()
const router = useRouter()
const checklistId = parseInt(route.params.id as string)

// CEID panel resize
const ceidLayoutRef = ref<HTMLElement>()
const ceidPanelWidth = ref(320)
const CEID_PANEL_MIN = 200
let ceidResizing = false
let ceidResizeStartX = 0
let ceidResizeStartWidth = 0

const onCeidResizerDown = (e: MouseEvent) => {
  e.preventDefault()
  ceidResizing = true
  ceidResizeStartX = e.clientX
  ceidResizeStartWidth = ceidPanelWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}
const onGlobalMouseMove = (e: MouseEvent) => {
  if (!ceidResizing || !ceidLayoutRef.value) return
  const maxW = ceidLayoutRef.value.offsetWidth * 0.5
  ceidPanelWidth.value = Math.min(maxW, Math.max(CEID_PANEL_MIN, ceidResizeStartWidth + e.clientX - ceidResizeStartX))
}
const onGlobalMouseUp = () => {
  if (!ceidResizing) return
  ceidResizing = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

const checklist = ref<Partial<Checklist>>({})
const activeTab = ref('ceid')

const vids = ref<ChecklistVID[]>([])
const rptids = ref<(ChecklistRPTID & { _vidItems?: string[]; _addVIDName?: string })[]>([])
const ceids = ref<ChecklistCEID[]>([])
const valueMaps = ref<ChecklistValueMap[]>([])

const vidLoading = ref(false)
const rptidLoading = ref(false)
const ceidLoading = ref(false)

const vidSearch = ref('')
const rptidSearch = ref('')
const ceidSearch = ref('')

const expandedVIDRows = ref<number[]>([])
const selectedCEID = ref<ChecklistCEID | null>(null)

const showImportDialog = ref(false)
const importFile = ref<File | null>(null)
const importing = ref(false)

const smlDialogVisible = ref(false)
const smlFolderName = ref('')
const smlSourceFolder = ref('SML demo')
const smlGenerating = ref(false)
const smlRootFolders = ref<string[]>([])

const flowDialogVisible = ref(false)
const flowTemplateLoading = ref(false)
const flowTemplates = ref<FlowTemplate[]>([])
const flowTemplateId = ref<number | null>(null)
const flowName = ref('')
const flowFolderName = ref('')
const flowSourceFolder = ref('SML demo')
const flowForce = ref(false)
const flowPublish = ref(false)
const flowGenerating = ref(false)

const showBatchVIDDialog = ref(false)
const batchVIDText = ref('')
const batchLoading = ref(false)

const ceidDrawerVisible = ref(false)
const ceidDrawerIsEdit = ref(false)
const ceidFormRef = ref()
const ceidFormData = reactive({ id: null as number | null, ceid: 0, name: '', linkItems: [] as string[], handler: '', require: false, description: '' })
const ceidFormRules = { ceid: [{ required: true, message: 'Required', trigger: 'blur' }], name: [{ required: true, message: 'Required', trigger: 'blur' }] }

const vidDrawerVisible = ref(false)
const vidFormRef = ref()
const vidFormData = reactive({ vid: 0, name: '', format: '', value: '', require: false, description: '' })
const vidFormRules = { vid: [{ required: true, message: 'Required', trigger: 'blur' }], name: [{ required: true, message: 'Required', trigger: 'blur' }] }

const rptidDrawerVisible = ref(false)
const rptidFormRef = ref()
const rptidFormData = reactive({ rptid: 0, name: '', linkItems: [] as string[], require: false, description: '' })
const rptidFormRules = { rptid: [{ required: true, message: 'Required', trigger: 'blur' }], name: [{ required: true, message: 'Required', trigger: 'blur' }] }

const editingVIDId = ref<number | null>(null)
const editingVIDData = reactive({ vid: 0, name: '', format: '', value: '' })
const editingRPTIDId = ref<number | null>(null)
const editingRPTIDData = reactive({ rptid: 0, name: '' })

// ---- Computed ----
const filteredVIDs = computed(() => {
  if (!vidSearch.value) return vids.value
  const q = vidSearch.value.toLowerCase()
  return vids.value.filter(v => v.name.toLowerCase().includes(q) || String(v.vid).includes(q))
})
const filteredRPTIDs = computed(() => {
  if (!rptidSearch.value) return rptids.value
  const q = rptidSearch.value.toLowerCase()
  return rptids.value.filter(v => v.name.toLowerCase().includes(q) || String(v.rptid).includes(q))
})
const filteredCEIDs = computed(() => {
  if (!ceidSearch.value) return ceids.value
  const q = ceidSearch.value.toLowerCase()
  return ceids.value.filter(v => v.name.toLowerCase().includes(q) || String(v.ceid).includes(q))
})
const selectedCEIDReports = computed(() => {
  if (!selectedCEID.value?.links) return []
  const names = selectedCEID.value.links.split(',').map(s => s.trim()).filter(Boolean)
  return names.map(n => rptids.value.find(r => r.name === n)).filter(Boolean) as ChecklistRPTID[]
})

// ---- Helpers ----
const getReportVIDs = (rpt: ChecklistRPTID): ChecklistVID[] => {
  if (!rpt.links) return []
  return rpt.links.split(',').map(n => n.trim()).filter(Boolean).map(n => vids.value.find(v => v.name === n)).filter(Boolean) as ChecklistVID[]
}
const getVIDByName = (name: string): ChecklistVID | undefined => vids.value.find(v => v.name === name)
const getVIDValueMaps = (vidName: string): ChecklistValueMap[] => valueMaps.value.filter(vm => vm.vidName === vidName)
const getVIDValueMapSummary = (vidName: string): string[] => {
  const maps = getVIDValueMaps(vidName)
  return maps.map(vm => `${vm.key}→${vm.value}`)
}
const getRPTIDVIDNames = (row: ChecklistRPTID): string[] => {
  if (!row.links) return []
  return row.links.split(',').map(s => s.trim()).filter(Boolean)
}
const availableVIDsForRPTID = (row: ChecklistRPTID) => {
  const current = getRPTIDVIDNames(row)
  return vids.value.filter(v => !current.includes(v.name))
}

const goBack = () => router.push('/checklist')

// ---- Load ----
// ---- Load ----
const dataFormatTypes = ['U1', 'U2', 'U4', 'U8', 'I1', 'I2', 'I4', 'I8', 'F4', 'F8', 'Boolean', 'A', 'B']
const dfForm = reactive({ dataIdType: 'U2', vidType: 'U4', rptidType: 'U4', ceidType: 'U4', ecidType: 'U4', alidType: 'U4', rsdcType: 'U12' })

const saveDataFormat = async () => {
  try {
    await checklistApi.update(checklistId, {
      name: checklist.value.name,
      vendor: checklist.value.vendor,
      model: checklist.value.model,
      description: checklist.value.description,
      dataIdType: dfForm.dataIdType,
      vidType: dfForm.vidType,
      rptidType: dfForm.rptidType,
      ceidType: dfForm.ceidType,
      ecidType: dfForm.ecidType,
      alidType: dfForm.alidType,
      rsdcType: dfForm.rsdcType,
    })
    ElMessage.success('DataFormat saved')
  } catch { ElMessage.error('Save failed') }
}

const loadChecklist = async () => {
  try {
    const resp = await checklistApi.getByID(checklistId)
    checklist.value = resp.data?.data || {}
    dfForm.dataIdType = checklist.value.dataIdType || 'U2'
    dfForm.vidType = checklist.value.vidType || 'U4'
    dfForm.rptidType = checklist.value.rptidType || 'U4'
    dfForm.ceidType = checklist.value.ceidType || 'U4'
    dfForm.ecidType = checklist.value.ecidType || 'U4'
    dfForm.alidType = checklist.value.alidType || 'U4'
    dfForm.rsdcType = checklist.value.rsdcType || 'U12'
  } catch { ElMessage.error('Failed to load checklist') }
}
const loadVIDs = async () => {
  vidLoading.value = true
  try { const resp = await checklistApi.getVIDs(checklistId); vids.value = resp.data?.data || [] }
  catch { vids.value = [] } finally { vidLoading.value = false }
}
const loadRPTIDs = async () => {
  rptidLoading.value = true
  try {
    const resp = await checklistApi.getRPTIDs(checklistId)
    rptids.value = (resp.data?.data || []).map((r: ChecklistRPTID) => ({
      ...r, _vidItems: r.links ? r.links.split(',').map(s => s.trim()).filter(Boolean) : [], _addVIDName: undefined
    }))
  } catch { rptids.value = [] } finally { rptidLoading.value = false }
}
const loadCEIDs = async () => {
  ceidLoading.value = true
  try { const resp = await checklistApi.getCEIDs(checklistId); ceids.value = resp.data?.data || [] }
  catch { ceids.value = [] } finally { ceidLoading.value = false }
}
const loadValueMaps = async () => {
  try { const resp = await checklistApi.getValueMaps(checklistId); valueMaps.value = resp.data?.data || [] }
  catch { valueMaps.value = [] }
}
const handleTabChange = (tab: string | number) => {
  if (tab === 'ceid' && ceids.value.length === 0) loadCEIDs()
  else if (tab === 'vid' && vids.value.length === 0) loadVIDs()
  else if (tab === 'rptid' && rptids.value.length === 0) loadRPTIDs()
}

// ---- CEID ----
const selectCEID = (c: ChecklistCEID) => { selectedCEID.value = c }
const handleAddCEID = () => {
  ceidDrawerIsEdit.value = false
  Object.assign(ceidFormData, { id: null, ceid: 0, name: '', linkItems: [], handler: '', require: false, description: '' })
  ceidDrawerVisible.value = true
}
const handleEditCEID = (row: ChecklistCEID) => {
  ceidDrawerIsEdit.value = true
  Object.assign(ceidFormData, {
    id: row.id, ceid: row.ceid, name: row.name,
    linkItems: row.links ? row.links.split(',').map(s => s.trim()) : [],
    handler: row.handler, require: row.require, description: row.description
  })
  ceidDrawerVisible.value = true
}
const handleCEIDSubmit = async () => {
  try {
    await ceidFormRef.value.validate()
    const data = { ceid: ceidFormData.ceid, name: ceidFormData.name, links: ceidFormData.linkItems.join(','), handler: ceidFormData.handler, require: ceidFormData.require, description: ceidFormData.description }
    if (ceidDrawerIsEdit.value && ceidFormData.id) {
      await checklistApi.updateCEID(checklistId, ceidFormData.id, data)
    } else {
      await checklistApi.createCEID(checklistId, data)
    }
    ElMessage.success(ceidDrawerIsEdit.value ? 'Updated' : 'Created')
    ceidDrawerVisible.value = false
    await loadCEIDs()
    if (selectedCEID.value) {
      const updated = ceids.value.find(c => c.id === selectedCEID.value!.id)
      if (updated) selectedCEID.value = updated
    }
  } catch (e: any) {
    if (e !== false) ElMessage.error(e?.response?.data?.error || 'Failed')
  }
}
const handleDeleteCEID = (row: ChecklistCEID) => {
  ElMessageBox.confirm(`Delete CEID "${row.name}"?`, 'Confirm', { type: 'warning' }).then(async () => {
    await checklistApi.deleteCEID(checklistId, row.id)
    ElMessage.success('Deleted')
    if (selectedCEID.value?.id === row.id) selectedCEID.value = null
    loadCEIDs()
  }).catch(() => {})
}

// ---- VID ----
const startInlineVID = (row: ChecklistVID, _field: string) => {
  editingVIDId.value = row.id
  Object.assign(editingVIDData, { vid: row.vid, name: row.name, format: row.format, value: row.value })
}
const saveInlineVID = async (row: ChecklistVID) => {
  if (!editingVIDId.value) return
  const newVid = Number(editingVIDData.vid)
  if (!newVid || newVid <= 0) { ElMessage.warning('VID must be a positive number'); return }
  if (vids.value.some(v => v.id !== row.id && v.vid === newVid)) { ElMessage.warning(`VID ${newVid} already exists`); editingVIDId.value = null; return }
  if (editingVIDData.name && vids.value.some(v => v.id !== row.id && v.name === editingVIDData.name)) { ElMessage.warning(`VID name '${editingVIDData.name}' already exists`); editingVIDId.value = null; return }
  editingVIDId.value = null
  const data = { vid: newVid, name: editingVIDData.name, format: editingVIDData.format, value: editingVIDData.value, require: row.require, description: row.description }
  try { await checklistApi.updateVID(checklistId, row.id, data); row.vid = data.vid; row.name = data.name; row.format = data.format; row.value = data.value }
  catch (e: any) { ElMessage.error(e?.response?.data?.error || 'Update failed'); loadVIDs() }
}
const toggleVIDRequire = async (row: ChecklistVID) => {
  row.require = !row.require
  try { await checklistApi.updateVID(checklistId, row.id, { vid: row.vid, name: row.name, value: row.value, format: row.format, require: row.require, description: row.description }) }
  catch { row.require = !row.require; ElMessage.error('Failed') }
}
const handleAddVID = () => {
  Object.assign(vidFormData, { vid: 0, name: '', format: '', value: '', require: false, description: '' })
  vidDrawerVisible.value = true
}
const handleVIDSubmit = async () => {
  try {
    await vidFormRef.value.validate()
    await checklistApi.createVID(checklistId, { vid: vidFormData.vid, name: vidFormData.name, format: vidFormData.format, value: vidFormData.value, require: vidFormData.require, description: vidFormData.description })
    ElMessage.success('Created')
    vidDrawerVisible.value = false
    loadVIDs()
  } catch (e: any) { if (e !== false) ElMessage.error(e?.response?.data?.error || 'Failed') }
}
const handleDeleteVID = (row: ChecklistVID) => {
  ElMessageBox.confirm(`Delete VID "${row.name}"?`, 'Confirm', { type: 'warning' }).then(async () => {
    await checklistApi.deleteVID(checklistId, row.id)
    ElMessage.success('Deleted')
    loadVIDs()
  }).catch(() => {})
}
const handleVIDExpand = (row: ChecklistVID, expanded: boolean) => {
  expandedVIDRows.value = expanded ? [row.id] : []
}

// ---- Batch VID ----
const handleBatchCreateVIDs = async () => {
  const lines = batchVIDText.value.trim().split('\n').filter(l => l.trim())
  if (!lines.length) { ElMessage.warning('No data'); return }
  const items = lines.map(l => {
    const parts = l.split(',').map(s => s.trim())
    return { vid: parseInt(parts[0]) || 0, name: parts[1] || '', format: parts[2] || '', value: parts[3] || '', require: false }
  }).filter(i => i.vid > 0 && i.name)
  if (!items.length) { ElMessage.warning('No valid entries'); return }
  batchLoading.value = true
  try {
    await checklistApi.batchCreateVIDs(checklistId, items)
    ElMessage.success(`Created ${items.length} VIDs`)
    showBatchVIDDialog.value = false
    batchVIDText.value = ''
    loadVIDs()
  } catch (e: any) { ElMessage.error(e?.response?.data?.error || 'Failed') }
  finally { batchLoading.value = false }
}

// ---- RPTID ----
const startInlineRPTID = (row: ChecklistRPTID) => {
  editingRPTIDId.value = row.id
  Object.assign(editingRPTIDData, { rptid: row.rptid, name: row.name })
}
const saveInlineRPTID = async (row: ChecklistRPTID) => {
  if (!editingRPTIDId.value) return
  const newRptid = Number(editingRPTIDData.rptid)
  if (!newRptid || newRptid <= 0) { ElMessage.warning('RPTID must be a positive number'); return }
  if (rptids.value.some(v => v.id !== row.id && v.rptid === newRptid)) { ElMessage.warning(`RPTID ${newRptid} already exists`); editingRPTIDId.value = null; return }
  if (editingRPTIDData.name && rptids.value.some(v => v.id !== row.id && v.name === editingRPTIDData.name)) { ElMessage.warning(`RPTID name '${editingRPTIDData.name}' already exists`); editingRPTIDId.value = null; return }
  editingRPTIDId.value = null
  try { await checklistApi.updateRPTID(checklistId, row.id, { rptid: newRptid, name: editingRPTIDData.name, links: row.links, require: row.require, description: row.description }); row.rptid = newRptid; row.name = editingRPTIDData.name }
  catch (e: any) { ElMessage.error(e?.response?.data?.error || 'Update failed'); loadRPTIDs() }
}
const toggleRPTIDRequire = async (row: ChecklistRPTID) => {
  row.require = !row.require
  try { await checklistApi.updateRPTID(checklistId, row.id, { rptid: row.rptid, name: row.name, links: row.links, require: row.require, description: row.description }) }
  catch { row.require = !row.require; ElMessage.error('Failed') }
}
const addVIDToRPTID = async (row: ChecklistRPTID & { _vidItems?: string[]; _addVIDName?: string }) => {
  if (!row._addVIDName) return
  const current = getRPTIDVIDNames(row)
  current.push(row._addVIDName)
  const newLinks = current.join(',')
  try {
    await checklistApi.updateRPTID(checklistId, row.id, { rptid: row.rptid, name: row.name, links: newLinks, require: row.require, description: row.description })
    row.links = newLinks
    row._vidItems = current
    row._addVIDName = undefined
    ElMessage.success('VID added')
  } catch { ElMessage.error('Failed') }
}
const removeVIDFromRPTID = async (row: ChecklistRPTID & { _vidItems?: string[] }, idx: number) => {
  const current = getRPTIDVIDNames(row)
  current.splice(idx, 1)
  const newLinks = current.join(',')
  try {
    await checklistApi.updateRPTID(checklistId, row.id, { rptid: row.rptid, name: row.name, links: newLinks, require: row.require, description: row.description })
    row.links = newLinks
    row._vidItems = current
    ElMessage.success('VID removed')
  } catch { ElMessage.error('Failed') }
}
const handleAddRPTID = () => {
  Object.assign(rptidFormData, { rptid: 0, name: '', linkItems: [], require: false, description: '' })
  rptidDrawerVisible.value = true
}
const handleRPTIDSubmit = async () => {
  try {
    await rptidFormRef.value.validate()
    await checklistApi.createRPTID(checklistId, { rptid: rptidFormData.rptid, name: rptidFormData.name, links: rptidFormData.linkItems.join(','), require: rptidFormData.require, description: rptidFormData.description })
    ElMessage.success('Created')
    rptidDrawerVisible.value = false
    loadRPTIDs()
  } catch (e: any) { if (e !== false) ElMessage.error(e?.response?.data?.error || 'Failed') }
}
const handleDeleteRPTID = (row: ChecklistRPTID) => {
  ElMessageBox.confirm(`Delete RPTID "${row.name}"?`, 'Confirm', { type: 'warning' }).then(async () => {
    await checklistApi.deleteRPTID(checklistId, row.id)
    ElMessage.success('Deleted')
    loadRPTIDs()
  }).catch(() => {})
}

// ---- ValueMap ----
const handleAddValueMap = async (vidName: string) => {
  try {
    await checklistApi.createValueMap(checklistId, { vidName, key: '', value: '' })
    loadValueMaps()
  } catch { ElMessage.error('Failed') }
}
const handleUpdateValueMap = async (vm: ChecklistValueMap) => {
  try { await checklistApi.updateValueMap(checklistId, vm.id, { vidName: vm.vidName, key: vm.key, value: vm.value }) }
  catch { ElMessage.error('Failed'); loadValueMaps() }
}
const handleDeleteValueMap = (vm: ChecklistValueMap) => {
  ElMessageBox.confirm(`Delete mapping "${vm.key}→${vm.value}"?`, 'Confirm', { type: 'warning' }).then(async () => {
    await checklistApi.deleteValueMap(checklistId, vm.id)
    ElMessage.success('Deleted')
    loadValueMaps()
  }).catch(() => {})
}

// ---- Import ----
const handleImport = () => { importFile.value = null; showImportDialog.value = true }
const handleImportFileChange = (file: UploadFile) => { importFile.value = file.raw || null }
const handleDoImport = async () => {
  if (!importFile.value) { ElMessage.warning('Select file'); return }
  importing.value = true
  try {
    await checklistApi.importExcel(checklistId, importFile.value)
    ElMessage.success('Import successful')
    showImportDialog.value = false
    loadVIDs(); loadRPTIDs(); loadCEIDs(); loadValueMaps()
  } catch (e: any) { ElMessage.error(e?.response?.data?.error || 'Import failed') }
  finally { importing.value = false }
}

const handleOpenGenerateSML = () => {
  smlFolderName.value = checklist.value.name || ''
  smlSourceFolder.value = 'SML demo'
  loadSMLRootFolders()
  smlDialogVisible.value = true
}

const loadSMLRootFolders = async () => {
  try {
    const resp = await smlApi.getTree()
    const data = resp.data?.data || []
    smlRootFolders.value = data.filter((n: any) => n.type === 'folder').map((n: any) => n.name).sort()
  } catch { /* ignore */ }
}

const loadFlowTemplates = async () => {
  flowTemplateLoading.value = true
  try {
    const resp = await flowTemplateApi.getAll({ page: 1, pageSize: 100 })
    flowTemplates.value = resp.data?.data?.data || []
    if (!flowTemplateId.value && flowTemplates.value.length > 0) {
      flowTemplateId.value = flowTemplates.value[0].id
    }
  } catch {
    flowTemplates.value = []
  } finally {
    flowTemplateLoading.value = false
  }
}

const handleOpenGenerateFlow = () => {
  const baseName = checklist.value.name || `Checklist ${checklistId}`
  flowName.value = `${baseName} Flow`
  flowFolderName.value = `${baseName} SML`
  flowSourceFolder.value = 'SML demo'
  flowForce.value = false
  flowPublish.value = false
  loadSMLRootFolders()
  loadFlowTemplates()
  flowDialogVisible.value = true
}

const handleGenerateFlow = async () => {
  if (!flowTemplateId.value) { ElMessage.warning('Select a flow template'); return }
  const targetFlowName = flowName.value.trim()
  const targetFolderName = flowFolderName.value.trim()
  if (!targetFlowName) { ElMessage.warning('Flow name is required'); return }
  if (!targetFolderName) { ElMessage.warning('SML folder name is required'); return }

  flowGenerating.value = true
  try {
    const resp = await checklistApi.generateFlow(checklistId, {
      templateId: flowTemplateId.value,
      flowName: targetFlowName,
      folderName: targetFolderName,
      sourceFolder: flowSourceFolder.value,
      force: flowForce.value,
      publish: flowPublish.value,
    })
    const result = resp.data?.data || {}
    flowDialogVisible.value = false

    const warningText = Array.isArray(result.warnings) && result.warnings.length
      ? `\n\nWarnings:\n${result.warnings.join('\n')}`
      : ''
    ElMessageBox.confirm(
      `Flow "${targetFlowName}" generated. Bound ${result.boundSteps || 0}/${result.totalSteps || 0} steps.${warningText}`,
      'Flow Generated',
      { confirmButtonText: 'Open Flow', cancelButtonText: 'Close', type: result.warnings?.length ? 'warning' : 'success' }
    ).then(() => {
      router.push(`/flow/${result.flowId}/edit`)
    }).catch(() => {})
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || 'Generate flow failed')
  } finally {
    flowGenerating.value = false
  }
}

const handleGenerateSML = async () => {
  const name = smlFolderName.value.trim()
  if (!name) { ElMessage.warning('Folder name is required'); return }
  smlGenerating.value = true
  const doGenerate = async (force: boolean) => {
    try {
      await checklistApi.generateSML(checklistId, { folderName: name, sourceFolder: smlSourceFolder.value, force })
      smlDialogVisible.value = false
      ElMessageBox.confirm(`SML files generated in "${name}". View in SML page?`, 'Success',
        { confirmButtonText: 'View', cancelButtonText: 'Close', type: 'success' }
      ).then(() => { router.push('/sml') }).catch(() => {})
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Generate failed'
      if (msg.includes('already exists')) {
        smlGenerating.value = false
        ElMessageBox.confirm(`Folder "${name}" already exists. Delete its contents and regenerate?`, 'Folder Exists',
          { confirmButtonText: 'Overwrite', cancelButtonText: 'Cancel', type: 'warning' }
        ).then(() => doGenerate(true)).catch(() => {})
        return
      }
      ElMessage.error(msg)
    } finally { smlGenerating.value = false }
  }
  doGenerate(false)
}

// ---- Init ----
onMounted(() => {
  loadChecklist()
  loadVIDs()
  loadRPTIDs()
  loadCEIDs()
  loadValueMaps()
  document.addEventListener('mousemove', onGlobalMouseMove)
  document.addEventListener('mouseup', onGlobalMouseUp)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onGlobalMouseMove)
  document.removeEventListener('mouseup', onGlobalMouseUp)
})

watch(ceids, () => {
  if (selectedCEID.value) {
    const updated = ceids.value.find(c => c.id === selectedCEID.value!.id)
    selectedCEID.value = updated || ceids.value[0] || null
  } else if (ceids.value.length > 0) {
    selectedCEID.value = ceids.value[0]
  }
}, { immediate: true })
</script>

<style scoped>
.checklist-detail { padding: 4px 4px 16px 4px; height: calc(100vh - 85px); min-height: 400px; box-sizing: border-box; }
.checklist-detail :deep(.el-card) { height: 100%; }
.checklist-detail :deep(.el-card__body) { height: 100%; padding: 0; display: flex; flex-direction: column; }
.detail-header { display: flex; justify-content: space-between; align-items: center; padding: 0 12px; height: 50px; border-bottom: 1px solid #dcdfe6; background-color: #f5f7fa; flex-shrink: 0; }
.header-left { display: flex; align-items: center; gap: 8px; }
.header-title { font-weight: 600; font-size: 15px; color: #303133; }
.header-right { display: flex; gap: 8px; }
.detail-tabs { flex: 1; display: flex; flex-direction: column; }
.detail-tabs :deep(.el-tabs__header) { padding: 0 12px; margin-bottom: 0; }
.detail-tabs :deep(.el-tabs__active-bar) { height: 3px; border-radius: 2px; }
.detail-tabs :deep(.el-tabs__item) { font-size: 15px; font-weight: 500; padding: 0 20px; height: 44px; line-height: 44px; }
.detail-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; }
.detail-tabs :deep(.el-tabs__content) { flex: 1; overflow: auto; padding: 0 12px 12px; }
.tab-badge :deep(.el-badge__content) { top: -2px; }
.tab-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; gap: 8px; }
.empty-hint { color: #909399; text-align: center; padding: 20px 0; font-size: 13px; }

/* CEID Layout */
.ceid-layout { display: flex; height: calc(100vh - 270px); min-height: 300px; border: 1px solid #e4e7ed; border-radius: 6px; overflow: hidden; }
.ceid-list-panel { flex-shrink: 0; border-right: none; display: flex; flex-direction: column; background: #fafbfc; overflow: hidden; }
.ceid-resizer { width: 6px; flex-shrink: 0; cursor: col-resize; background-color: #f5f7fa; display: flex; align-items: center; justify-content: center; transition: background-color 0.15s; }
.ceid-resizer:hover { background-color: #dcdfe6; }
.ceid-resizer-handle { width: 2px; height: 24px; border-radius: 1px; background-color: #c0c4cc; }
.ceid-resizer:hover .ceid-resizer-handle { background-color: #409eff; }
.panel-toolbar { padding: 10px 12px; border-bottom: 1px solid #ebeef5; display: flex; }
.ceid-list { flex: 1; overflow-y: auto; }
.ceid-item { display: flex; align-items: center; padding: 8px 14px; cursor: pointer; border-bottom: 1px solid #f0f0f0; font-size: 13px; transition: background 0.15s; }
.ceid-item:hover { background: #f0f2f5; }
.ceid-item.active { background: #ecf5ff; color: #409eff; border-left: 3px solid #409eff; padding-left: 11px; }
.ceid-id { width: 60px; color: #909399; font-size: 12px; flex-shrink: 0; font-family: 'SFMono-Regular', Consolas, monospace; }
.ceid-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ceid-del { opacity: 0; transition: opacity 0.15s; }
.ceid-item:hover .ceid-del { opacity: 1; }
.ceid-detail-panel { flex: 1; padding: 16px 20px; overflow-y: auto; }
.ceid-header-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 4px; }
.ceid-field { display: flex; align-items: center; gap: 6px; }
.field-label { color: #909399; font-size: 12px; }
.field-value { font-weight: 500; font-size: 13px; }
.ceid-desc { color: #606266; font-size: 13px; margin-top: 8px; }
.report-card { border: 1px solid #ebeef5; border-radius: 6px; margin-bottom: 10px; overflow: hidden; }
.report-header { background: #fafafa; padding: 6px 10px; display: flex; align-items: center; gap: 8px; font-size: 13px; }
.report-name { font-weight: 500; }
.vid-table { width: 100%; font-size: 12px; border-collapse: collapse; }
.vid-table th { background: #f5f7fa; padding: 4px 8px; text-align: left; color: #909399; font-weight: normal; border-bottom: 1px solid #ebeef5; }
.vid-table td { padding: 4px 8px; border-bottom: 1px solid #f0f0f0; }
.vm-cell { max-width: 250px; }

/* VID / RPTID inline edit */
.editable-cell { cursor: pointer; padding: 2px 4px; border-radius: 3px; }
.editable-cell:hover { background: #ecf5ff; }

/* Expand panels */
.vm-expand-panel, .rptid-vid-expand { padding: 8px 16px 16px; }
.vm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; }
.vm-inner-table { width: 100%; font-size: 12px; border-collapse: collapse; }
.vm-inner-table th { background: #f5f7fa; padding: 4px 8px; text-align: left; color: #909399; font-weight: normal; border-bottom: 1px solid #ebeef5; }
.vm-inner-table td { padding: 4px 4px; border-bottom: 1px solid #f0f0f0; }

/* Drawers */
:deep(.el-drawer__body) { padding: 16px 20px; overflow-y: auto; }
:deep(.el-drawer__footer) { padding: 12px 20px; border-top: 1px solid #e4e7ed; display: flex; justify-content: flex-end; gap: 10px; }

:deep(.el-table .cell) { white-space: nowrap; }

.dataformat-panel { padding: 12px 0; }
</style>
