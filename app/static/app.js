const state = {
  batchId: "",
  records: [],
  reportJobId: "",
  transactionJobId: "",
  activeView: "shipment",
  currentUser: null,
  shipmentFilters: {
    query: "",
    status: "all",
    country: "all",
    warehouse: "all",
  },
  shipmentSort: {
    field: "original_filename",
    direction: "asc",
  },
  shipmentColumnFilters: {},
  activeColumnMenu: "",
  pendingShipmentFiles: [],
  shipmentBusy: false,
};

const els = {
  loginScreen: document.querySelector("#loginScreen"),
  loginForm: document.querySelector("#loginForm"),
  loginUsername: document.querySelector("#loginUsername"),
  loginPassword: document.querySelector("#loginPassword"),
  loginStatus: document.querySelector("#loginStatus"),
  masthead: document.querySelector("#masthead"),
  appShell: document.querySelector("#appShell"),
  userBadge: document.querySelector("#userBadge"),
  logoutButton: document.querySelector("#logoutButton"),
  navItems: document.querySelectorAll("[data-view]"),
  viewPanels: document.querySelectorAll("[data-view-panel]"),
  inspectorPanels: document.querySelectorAll("[data-inspector-panel]"),
  uploadForm: document.querySelector("#uploadForm"),
  fileInput: document.querySelector("#fileInput"),
  folderUploadInput: document.querySelector("#folderUploadInput"),
  dropTarget: document.querySelector("#dropTarget"),
  uploadSelectionText: document.querySelector("#uploadSelectionText"),
  uploadPickers: document.querySelectorAll("[data-upload-picker]"),
  shipmentLogList: document.querySelector("#shipmentLogList"),
  folderForm: document.querySelector("#folderForm"),
  folderInput: document.querySelector("#folderInput"),
  filesMetric: document.querySelector("#filesMetric"),
  boxesMetric: document.querySelector("#boxesMetric"),
  validMetric: document.querySelector("#validMetric"),
  reviewMetric: document.querySelector("#reviewMetric"),
  batchLabel: document.querySelector("#batchLabel"),
  statusText: document.querySelector("#statusText"),
  resultBody: document.querySelector("#resultBody"),
  shipmentSearchInput: document.querySelector("#shipmentSearchInput"),
  shipmentStatusFilter: document.querySelector("#shipmentStatusFilter"),
  shipmentCountryFilter: document.querySelector("#shipmentCountryFilter"),
  shipmentWarehouseFilter: document.querySelector("#shipmentWarehouseFilter"),
  clearShipmentFilters: document.querySelector("#clearShipmentFilters"),
  shipmentFilterSummary: document.querySelector("#shipmentFilterSummary"),
  columnMenuButtons: document.querySelectorAll("[data-column-field]"),
  uploadSubmitButton: document.querySelector('#uploadForm button[type="submit"]'),
  folderScanButton: document.querySelector('#folderForm button[type="submit"]'),
  exportMenu: document.querySelector("#exportMenu"),
  exportMenuButton: document.querySelector("#exportMenuButton"),
  exportCsv: document.querySelector("#exportCsv"),
  exportXlsx: document.querySelector("#exportXlsx"),
  packageButton: document.querySelector("#packageButton"),
  packageResult: document.querySelector("#packageResult"),
  renameButton: document.querySelector("#renameButton"),
  reportFolderForm: document.querySelector("#reportFolderForm"),
  reportFolderInput: document.querySelector("#reportFolderInput"),
  reportFilesMetric: document.querySelector("#reportFilesMetric"),
  reportProcessedMetric: document.querySelector("#reportProcessedMetric"),
  reportDetailsMetric: document.querySelector("#reportDetailsMetric"),
  reportWarningsMetric: document.querySelector("#reportWarningsMetric"),
  reportBatchLabel: document.querySelector("#reportBatchLabel"),
  reportStatusText: document.querySelector("#reportStatusText"),
  reportResultBody: document.querySelector("#reportResultBody"),
  reportDownload: document.querySelector("#reportDownload"),
  transactionFolderForm: document.querySelector("#transactionFolderForm"),
  transactionFolderInput: document.querySelector("#transactionFolderInput"),
  transactionFilesMetric: document.querySelector("#transactionFilesMetric"),
  transactionRowsMetric: document.querySelector("#transactionRowsMetric"),
  transactionCountriesMetric: document.querySelector("#transactionCountriesMetric"),
  transactionWarningsMetric: document.querySelector("#transactionWarningsMetric"),
  transactionBatchLabel: document.querySelector("#transactionBatchLabel"),
  transactionStatusText: document.querySelector("#transactionStatusText"),
  transactionResultBody: document.querySelector("#transactionResultBody"),
  transactionDownload: document.querySelector("#transactionDownload"),
  transactionAuditDownload: document.querySelector("#transactionAuditDownload"),
  refreshHistoryButton: document.querySelector("#refreshHistoryButton"),
  historyTotalMetric: document.querySelector("#historyTotalMetric"),
  historyShipmentMetric: document.querySelector("#historyShipmentMetric"),
  historyReportMetric: document.querySelector("#historyReportMetric"),
  historyTransactionMetric: document.querySelector("#historyTransactionMetric"),
  historyReviewMetric: document.querySelector("#historyReviewMetric"),
  historyStatusText: document.querySelector("#historyStatusText"),
  historyResultBody: document.querySelector("#historyResultBody"),
  refreshSettingsButton: document.querySelector("#refreshSettingsButton"),
  serviceSettingsList: document.querySelector("#serviceSettingsList"),
  pathSettingsList: document.querySelector("#pathSettingsList"),
  processingSettingsList: document.querySelector("#processingSettingsList"),
  deploymentSettingsList: document.querySelector("#deploymentSettingsList"),
  userManagementPanel: document.querySelector("#userManagementPanel"),
  userForm: document.querySelector("#userForm"),
  newUsername: document.querySelector("#newUsername"),
  newDisplayName: document.querySelector("#newDisplayName"),
  newPassword: document.querySelector("#newPassword"),
  newRole: document.querySelector("#newRole"),
  userStatusText: document.querySelector("#userStatusText"),
  userTableBody: document.querySelector("#userTableBody"),
};

const hashByView = {
  shipment: "shipment",
  report: "report-pdf",
  transaction: "transaction-csv",
  history: "history",
  settings: "settings",
};

const shipmentColumnLabels = {
  original_filename: "原文件名",
  factory_name: "工厂",
  sku: "SKU",
  product_name: "产品名",
  destination_country: "国家",
  warehouse: "仓库",
  fba_code: "FBA编码",
  total_units: "箱/件",
  is_valid: "状态",
};

els.navItems.forEach((item) => {
  item.addEventListener("click", () => {
    setActiveView(item.dataset.view);
    window.location.hash = hashByView[item.dataset.view] || "shipment";
  });
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = normalizeLoginText(els.loginUsername.value).toLowerCase();
  const password = normalizeLoginPassword(els.loginPassword.value);
  if (!username || !password) {
    els.loginStatus.textContent = "请输入用户名和密码";
    if (!username) {
      els.loginUsername.focus();
    } else {
      els.loginPassword.focus();
    }
    return;
  }
  els.loginStatus.textContent = "正在登录...";
  const response = await fetch("/api/login", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    els.loginStatus.textContent = payload.error || "登录失败，请检查账号和密码";
    els.loginPassword.select();
    return;
  }
  applySession(payload.user);
});

els.logoutButton.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  state.currentUser = null;
  showLoggedOut();
});

els.uploadPickers.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.uploadPicker === "folder") {
      els.folderUploadInput.click();
      return;
    }
    els.fileInput.click();
  });
});

els.dropTarget.addEventListener("click", () => {
  els.fileInput.click();
});

els.dropTarget.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  els.fileInput.click();
});

els.fileInput.addEventListener("change", () => {
  setPendingShipmentFiles([...els.fileInput.files].map((file) => ({ file, relativePath: file.name })), "已选择 PDF 文件");
});

els.folderUploadInput.addEventListener("change", () => {
  setPendingShipmentFiles(
    [...els.folderUploadInput.files].map((file) => ({
      file,
      relativePath: file.webkitRelativePath || file.name,
    })),
    "已选择文件夹",
  );
});

["dragenter", "dragover"].forEach((eventName) => {
  els.uploadForm.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.uploadForm.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  els.uploadForm.addEventListener(eventName, (event) => {
    event.preventDefault();
    if (eventName === "dragleave" && els.uploadForm.contains(event.relatedTarget)) return;
    els.uploadForm.classList.remove("drag-over");
  });
});

els.uploadForm.addEventListener("drop", async (event) => {
  resetShipmentLogs("正在读取拖放内容...");
  const droppedFiles = await collectDroppedFiles(event.dataTransfer);
  setPendingShipmentFiles(droppedFiles, "已读取拖放内容");
});

els.folderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.shipmentBusy) return;
  resetShipmentLogs("准备扫描服务器文件夹...");
  setBusy("正在扫描服务器文件夹...");
  try {
    const response = await fetch("/api/scan-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: els.folderInput.value }),
    });
    await handleBatchResponse(response);
  } catch (error) {
    addShipmentLog("扫描请求失败，请确认服务仍在运行", "error");
    setStatus("扫描请求失败");
  }
});

els.uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.shipmentBusy) return;
  const files = state.pendingShipmentFiles;
  if (!files.length) {
    addShipmentLog("请选择至少一个 PDF 文件或拖放一个文件夹", "warning");
    setStatus("请选择至少一个 PDF 文件");
    return;
  }
  const pdfCount = files.filter((item) => isPdfFile(item.file)).length;
  if (!pdfCount) {
    addShipmentLog("当前选择里没有 PDF 文件，请重新选择", "error");
    setStatus("没有可上传的 PDF 文件");
    return;
  }

  addShipmentLog(`开始上传 ${files.length} 个文件，其中 ${pdfCount} 个 PDF`);
  setBusy(`正在上传并识别 ${pdfCount} 个 PDF...`);
  const formData = new FormData();
  files.forEach((item) => formData.append("files", item.file, item.relativePath || item.file.name));
  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    await handleBatchResponse(response);
  } catch (error) {
    addShipmentLog("上传请求失败，请确认服务仍在运行", "error");
    setStatus("上传请求失败");
  }
});

els.reportFolderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setReportBusy("正在提取交易报告 PDF，并生成 Excel...");
  disableReportDownload();
  const response = await fetch("/api/report-pdf/process-folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: els.reportFolderInput.value }),
  });
  await handleReportResponse(response);
});

els.transactionFolderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setTransactionBusy("正在清洗交易明细，并生成 Excel...");
  disableTransactionDownloads();
  const response = await fetch("/api/transaction-csv/process-folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: els.transactionFolderInput.value }),
  });
  await handleTransactionResponse(response);
});

els.refreshHistoryButton.addEventListener("click", () => {
  loadHistory();
});

els.refreshSettingsButton.addEventListener("click", () => {
  loadSettings();
});

els.userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createUser();
});

els.exportMenuButton.addEventListener("click", () => {
  if (!state.batchId) return;
  const isOpen = els.exportMenu.classList.toggle("open");
  els.exportMenuButton.setAttribute("aria-expanded", String(isOpen));
});

els.exportCsv.addEventListener("click", (event) => {
  event.preventDefault();
  startShipmentExport("csv");
});

els.exportXlsx.addEventListener("click", (event) => {
  event.preventDefault();
  startShipmentExport("xlsx");
});

els.shipmentSearchInput.addEventListener("input", () => {
  state.shipmentFilters.query = els.shipmentSearchInput.value.trim();
  renderShipmentRecords();
});

els.shipmentStatusFilter.addEventListener("change", () => {
  state.shipmentFilters.status = els.shipmentStatusFilter.value;
  renderShipmentRecords();
});

els.shipmentCountryFilter.addEventListener("change", () => {
  state.shipmentFilters.country = els.shipmentCountryFilter.value;
  renderShipmentRecords();
});

els.shipmentWarehouseFilter.addEventListener("change", () => {
  state.shipmentFilters.warehouse = els.shipmentWarehouseFilter.value;
  renderShipmentRecords();
});

els.clearShipmentFilters.addEventListener("click", () => {
  resetShipmentFilters();
  renderShipmentRecords();
});

els.shipmentFilterSummary.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter-chip]");
  if (!button) return;
  clearShipmentFilterChip(button.dataset.filterChip);
  renderShipmentRecords();
});

els.columnMenuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    toggleColumnMenu(button.dataset.columnField, button);
  });
});

document.addEventListener("click", (event) => {
  if (!els.exportMenu.contains(event.target)) {
    closeExportMenu();
  }
  if (!event.target.closest(".column-menu-popover") && !event.target.closest(".column-menu-button")) {
    closeColumnMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeExportMenu();
    closeColumnMenu();
  }
});

els.renameButton.addEventListener("click", async () => {
  if (!state.batchId) return;
  const validRenameCount = state.records.filter((record) => record.rename.can_apply).length;
  const message = `将重命名 ${validRenameCount} 个文件。此操作会修改服务器上的文件名，是否继续？`;
  if (!window.confirm(message)) return;

  setBusy("正在执行重命名...");
  const response = await fetch("/api/rename", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batch_id: state.batchId, confirm: true }),
  });
  const payload = await response.json();
  if (!response.ok) {
    setStatus(payload.error || "重命名失败");
    return;
  }
  setStatus(`已重命名 ${payload.renamed} 个文件`);
});

els.packageButton.addEventListener("click", async () => {
  if (!state.batchId) return;
  const reviewCount = state.records.filter((record) => !record.is_valid).length;
  const factoryCount = new Set(state.records.map((record) => record.filename_info.factory_name).filter(Boolean)).size;
  const message = reviewCount
    ? `当前还有 ${reviewCount} 个文件需要复核。确认人工核对无误，并按 ${factoryCount} 个工厂打包原始 PDF？`
    : `确认按 ${factoryCount} 个工厂打包原始 PDF？`;
  if (!window.confirm(message)) return;

  setBusy("正在按工厂打包原始 PDF...");
  els.packageButton.disabled = true;
  const response = await fetch("/api/package-by-factory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batch_id: state.batchId, confirm: true }),
  });
  const payload = await response.json();
  if (!response.ok) {
    setStatus(payload.error || "打包失败");
    updateActionButtons();
    return;
  }
  renderPackageResult(payload);
  setStatus(`已生成 ${payload.packages.length} 个工厂压缩包`);
  if (state.activeView === "history") {
    loadHistory();
  }
  updateActionButtons();
});

window.addEventListener("hashchange", () => {
  if (!state.currentUser) return;
  setActiveView(viewFromHash());
});

if (!["", "#shipment", "#report-pdf", "#transaction-csv", "#history", "#settings"].includes(window.location.hash)) {
  window.history.replaceState(null, "", "#shipment");
}

bootstrapSession();

async function bootstrapSession() {
  const response = await fetch("/api/session");
  const payload = await response.json();
  if (payload.authenticated) {
    applySession(payload.user);
  } else {
    showLoggedOut();
  }
}

function applySession(user) {
  state.currentUser = user;
  els.loginScreen.classList.add("hidden");
  els.masthead.classList.remove("hidden");
  els.appShell.classList.remove("hidden");
  els.userBadge.textContent = `${user.display_name} · ${roleLabel(user.role)}`;
  setActiveView(viewFromHash());
}

function showLoggedOut() {
  state.currentUser = null;
  state.batchId = "";
  state.records = [];
  els.loginScreen.classList.remove("hidden");
  els.masthead.classList.add("hidden");
  els.appShell.classList.add("hidden");
  els.exportMenuButton.disabled = true;
  els.loginPassword.focus();
}

async function handleBatchResponse(response) {
  const payload = await response.json();
  if (response.status === 401) {
    showLoggedOut();
    return;
  }
  if (!response.ok) {
    renderShipmentLogs(payload.logs || [{ level: "error", message: payload.error || "处理失败" }], false);
    setStatus(payload.error || "处理失败");
    return;
  }
  state.batchId = payload.batch_id;
  state.records = payload.records;
  resetShipmentFilters();
  renderBatch(payload);
  renderShipmentLogs(payload.logs || [], true);
  if (state.activeView === "history") {
    loadHistory();
  }
}

async function handleReportResponse(response) {
  const payload = await response.json();
  if (response.status === 401) {
    showLoggedOut();
    return;
  }
  if (!response.ok) {
    setReportStatus(payload.error || "处理失败");
    return;
  }
  state.reportJobId = payload.job_id;
  renderReportJob(payload);
  if (state.activeView === "history") {
    loadHistory();
  }
}

async function handleTransactionResponse(response) {
  const payload = await response.json();
  if (response.status === 401) {
    showLoggedOut();
    return;
  }
  if (!response.ok) {
    setTransactionStatus(payload.error || "处理失败");
    return;
  }
  state.transactionJobId = payload.job_id;
  renderTransactionJob(payload);
  if (state.activeView === "history") {
    loadHistory();
  }
}

function renderBatch(payload) {
  const { summary } = payload;
  els.filesMetric.textContent = summary.files;
  els.boxesMetric.textContent = summary.boxes;
  els.validMetric.textContent = summary.valid;
  els.reviewMetric.textContent = summary.needs_review;
  els.batchLabel.textContent = payload.source_label;
  setStatus(`已识别 ${summary.files} 个 PDF，${summary.needs_review} 个需要复核`);
  els.packageResult.classList.add("hidden");
  els.packageResult.innerHTML = "";

  els.exportCsv.href = `/api/export?batch_id=${payload.batch_id}&format=csv`;
  els.exportXlsx.href = `/api/export?batch_id=${payload.batch_id}&format=xlsx`;
  els.exportCsv.classList.remove("disabled");
  els.exportXlsx.classList.remove("disabled");
  els.exportMenuButton.disabled = false;

  updateActionButtons(payload.records);
  updateShipmentFilterOptions(payload.records);

  if (!payload.records.length) {
    els.resultBody.innerHTML = '<tr><td class="empty" colspan="12">该批次没有 PDF 文件。</td></tr>';
    return;
  }

  renderShipmentRecords();
}

function setPendingShipmentFiles(items, label) {
  const files = items.filter((item) => item && item.file && item.file.name);
  state.pendingShipmentFiles = files;
  const pdfCount = files.filter((item) => isPdfFile(item.file)).length;
  const skippedCount = files.length - pdfCount;
  const folderCount = uniqueSorted(files
    .map((item) => item.relativePath || item.file.name)
    .filter((path) => path.includes("/"))
    .map((path) => path.split("/")[0])).length;

  if (!files.length) {
    els.uploadSelectionText.textContent = "没有读取到文件，请重新拖放或选择";
    addShipmentLog("没有读取到文件", "warning");
    return;
  }

  const folderText = folderCount ? `，包含 ${folderCount} 个文件夹` : "";
  const skippedText = skippedCount ? `，${skippedCount} 个非 PDF 会被预处理跳过` : "";
  els.uploadSelectionText.textContent = `${label}：${files.length} 个文件，${pdfCount} 个 PDF${folderText}${skippedText}`;
  addShipmentLog(`${label}：${files.length} 个文件，${pdfCount} 个 PDF${skippedText}`, skippedCount ? "warning" : "info");
}

async function collectDroppedFiles(dataTransfer) {
  if (!dataTransfer) return [];
  const items = [...dataTransfer.items];
  const entries = items
    .filter((item) => item.kind === "file" && typeof item.webkitGetAsEntry === "function")
    .map((item) => item.webkitGetAsEntry())
    .filter(Boolean);

  if (entries.length) {
    const groups = await Promise.all(entries.map((entry) => readDroppedEntry(entry, "")));
    return groups.flat();
  }

  return [...dataTransfer.files].map((file) => ({ file, relativePath: file.name }));
}

function readDroppedEntry(entry, parentPath) {
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file((file) => {
        resolve([{ file, relativePath: `${parentPath}${file.name}` }]);
      }, () => resolve([]));
    });
  }

  if (!entry.isDirectory) return Promise.resolve([]);
  const reader = entry.createReader();
  const directoryPath = `${parentPath}${entry.name}/`;
  const batches = [];

  return new Promise((resolve) => {
    const readBatch = () => {
      reader.readEntries(async (entries) => {
        if (!entries.length) {
          const resolved = await Promise.all(batches);
          resolve(resolved.flat());
          return;
        }
        batches.push(...entries.map((child) => readDroppedEntry(child, directoryPath)));
        readBatch();
      }, () => resolve([]));
    };
    readBatch();
  });
}

function isPdfFile(file) {
  return file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
}

function resetShipmentLogs(message) {
  els.shipmentLogList.innerHTML = "";
  addShipmentLog(message);
}

function addShipmentLog(message, level = "info") {
  const item = document.createElement("li");
  item.className = level;
  item.textContent = message;
  els.shipmentLogList.appendChild(item);
}

function renderShipmentLogs(logs, append = true) {
  if (!append) {
    els.shipmentLogList.innerHTML = "";
  }
  logs.forEach((entry) => {
    addShipmentLog(entry.message || String(entry), entry.level || "info");
  });
}

function renderShipmentRecords() {
  updateSortButtons();
  updateFilterButtonState();
  const visibleRecords = getVisibleShipmentRecords();
  renderShipmentFilterSummary(visibleRecords.length);
  if (!state.records.length) {
    els.resultBody.innerHTML = '<tr><td class="empty" colspan="12">该批次没有 PDF 文件。</td></tr>';
    return;
  }
  if (!visibleRecords.length) {
    els.resultBody.innerHTML = '<tr><td class="empty" colspan="12">没有符合筛选条件的记录。</td></tr>';
    setStatus(`当前显示 0 / ${state.records.length} 条记录`);
    return;
  }
  els.resultBody.innerHTML = visibleRecords.map(renderRow).join("");
  setStatus(`当前显示 ${visibleRecords.length} / ${state.records.length} 条记录`);
}

function getVisibleShipmentRecords() {
  const { query, status, country, warehouse } = state.shipmentFilters;
  const normalizedQuery = query.toLowerCase();
  return [...state.records]
    .filter((record) => {
      if (status === "valid" && !record.is_valid) return false;
      if (status === "review" && record.is_valid) return false;
      if (country !== "all" && record.destination_country !== country) return false;
      if (warehouse !== "all" && record.warehouse !== warehouse) return false;
      if (!matchesColumnFilters(record)) return false;
      if (!normalizedQuery) return true;
      return shipmentSearchText(record).toLowerCase().includes(normalizedQuery);
    })
    .sort(compareShipmentRecords);
}

function matchesColumnFilters(record) {
  return Object.entries(state.shipmentColumnFilters).every(([field, expected]) => {
    return shipmentColumnDisplayValue(record, field) === expected;
  });
}

function shipmentSearchText(record) {
  const filenameInfo = record.filename_info || {};
  return [
    record.original_filename,
    filenameInfo.factory_name,
    filenameInfo.sku,
    filenameInfo.product_name,
    record.sku,
    record.product_name,
    record.title_product_name,
    record.label_type,
    record.logistics_code,
    record.destination_country,
    record.warehouse,
    record.fba_code,
    record.shipment_total_boxes ? `${record.shipment_total_boxes}` : "",
    record.suggested_filename,
    ...(record.notes || []),
    ...(filenameInfo.notes || []),
    ...(record.comparison_notes || []),
  ].filter(Boolean).join(" ");
}

function compareShipmentRecords(left, right) {
  const field = state.shipmentSort.field;
  const direction = state.shipmentSort.direction === "desc" ? -1 : 1;
  const leftValue = shipmentSortValue(left, field);
  const rightValue = shipmentSortValue(right, field);
  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return (leftValue - rightValue) * direction;
  }
  return String(leftValue || "").localeCompare(String(rightValue || ""), "zh-Hans-CN", {
    numeric: true,
    sensitivity: "base",
  }) * direction;
}

function shipmentSortValue(record, field) {
  const filenameInfo = record.filename_info || {};
  if (field === "factory_name") return filenameInfo.factory_name || "";
  if (field === "product_name") return record.title_product_name || record.product_name || "";
  if (field === "total_units") return record.total_units ?? record.box_count ?? 0;
  if (field === "is_valid") return record.is_valid ? 1 : 0;
  return record[field] ?? "";
}

function shipmentColumnDisplayValue(record, field) {
  const filenameInfo = record.filename_info || {};
  if (field === "factory_name") return filenameInfo.factory_name || "-";
  if (field === "product_name") return record.title_product_name || record.product_name || "-";
  if (field === "total_units") {
    return record.total_units && record.total_units !== record.box_count
      ? `${record.box_count}箱 / ${record.total_units}个`
      : `${record.box_count}箱`;
  }
  if (field === "is_valid") return record.is_valid ? "通过" : "需复核";
  return String(record[field] || "-");
}

function updateShipmentFilterOptions(records) {
  renderSelectOptions(els.shipmentCountryFilter, uniqueSorted(records.map((record) => record.destination_country)));
  renderSelectOptions(els.shipmentWarehouseFilter, uniqueSorted(records.map((record) => record.warehouse)));
}

function renderSelectOptions(select, values) {
  select.innerHTML = '<option value="all">全部</option>' + values
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hans-CN", {
    numeric: true,
    sensitivity: "base",
  }));
}

function resetShipmentFilters() {
  state.shipmentFilters = {
    query: "",
    status: "all",
    country: "all",
    warehouse: "all",
  };
  state.shipmentColumnFilters = {};
  state.activeColumnMenu = "";
  closeColumnMenu();
  els.shipmentSearchInput.value = "";
  els.shipmentStatusFilter.value = "all";
  els.shipmentCountryFilter.value = "all";
  els.shipmentWarehouseFilter.value = "all";
}

function updateFilterButtonState() {
  const filters = state.shipmentFilters;
  els.clearShipmentFilters.disabled = !filters.query
    && filters.status === "all"
    && filters.country === "all"
    && filters.warehouse === "all"
    && !Object.keys(state.shipmentColumnFilters).length;
}

function renderShipmentFilterSummary(visibleCount = getVisibleShipmentRecords().length) {
  const chips = activeShipmentFilterChips();
  if (!chips.length) {
    els.shipmentFilterSummary.hidden = true;
    els.shipmentFilterSummary.innerHTML = "";
    return;
  }

  els.shipmentFilterSummary.hidden = false;
  els.shipmentFilterSummary.innerHTML = `
    <span>当前显示 ${visibleCount} / ${state.records.length}</span>
    ${chips.map((chip) => `
      <button class="filter-chip" type="button" data-filter-chip="${escapeHtml(chip.key)}">
        ${escapeHtml(chip.label)}
        <span aria-hidden="true">x</span>
      </button>
    `).join("")}
  `;
}

function activeShipmentFilterChips() {
  const filters = state.shipmentFilters;
  const chips = [];
  if (filters.query) chips.push({ key: "query", label: `搜索：${filters.query}` });
  if (filters.status !== "all") chips.push({ key: "status", label: `状态：${filters.status === "valid" ? "通过" : "需复核"}` });
  if (filters.country !== "all") chips.push({ key: "country", label: `国家：${filters.country}` });
  if (filters.warehouse !== "all") chips.push({ key: "warehouse", label: `仓库：${filters.warehouse}` });
  Object.entries(state.shipmentColumnFilters).forEach(([field, value]) => {
    chips.push({ key: `column:${field}`, label: `${shipmentColumnLabels[field] || field}：${value}` });
  });
  return chips;
}

function clearShipmentFilterChip(key) {
  if (key === "query") {
    state.shipmentFilters.query = "";
    els.shipmentSearchInput.value = "";
    return;
  }
  if (key === "status") {
    state.shipmentFilters.status = "all";
    els.shipmentStatusFilter.value = "all";
    return;
  }
  if (key === "country") {
    state.shipmentFilters.country = "all";
    els.shipmentCountryFilter.value = "all";
    return;
  }
  if (key === "warehouse") {
    state.shipmentFilters.warehouse = "all";
    els.shipmentWarehouseFilter.value = "all";
    return;
  }
  if (key.startsWith("column:")) {
    delete state.shipmentColumnFilters[key.replace("column:", "")];
  }
}

function updateSortButtons() {
  els.columnMenuButtons.forEach((button) => {
    const field = button.dataset.columnField;
    const active = field === state.shipmentSort.field;
    const filtered = Boolean(state.shipmentColumnFilters[field]);
    button.classList.toggle("active", active);
    button.classList.toggle("filtered", filtered);
    button.dataset.direction = active ? state.shipmentSort.direction : "";
    button.title = filtered
      ? `${shipmentColumnLabels[field]}：已筛选 ${state.shipmentColumnFilters[field]}`
      : `${shipmentColumnLabels[field]}：排序和筛选`;
  });
}

function toggleColumnMenu(field, button) {
  if (state.shipmentBusy) {
    els.statusText.textContent = "正在处理，完成后会刷新结果";
    return;
  }
  if (!state.records.length) {
    setStatus("请先扫描或上传一批 PDF，再使用列筛选");
    return;
  }
  if (state.activeColumnMenu === field) {
    closeColumnMenu();
    return;
  }
  renderColumnMenu(field, button);
}

function renderColumnMenu(field, button) {
  closeColumnMenu();
  state.activeColumnMenu = field;
  const menu = document.createElement("div");
  menu.className = "column-menu-popover";
  menu.innerHTML = columnMenuMarkup(field);
  document.body.appendChild(menu);
  positionColumnMenu(menu, button);

  menu.querySelector('[data-column-action="sort-asc"]').addEventListener("click", () => {
    applyColumnSort(field, "asc");
  });
  menu.querySelector('[data-column-action="sort-desc"]').addEventListener("click", () => {
    applyColumnSort(field, "desc");
  });
  menu.querySelector('[data-column-action="clear"]').addEventListener("click", () => {
    delete state.shipmentColumnFilters[field];
    closeColumnMenu();
    renderShipmentRecords();
  });
  renderColumnValueList(field, menu, "");
  const searchInput = menu.querySelector("[data-column-value-search]");
  searchInput.addEventListener("input", () => {
    renderColumnValueList(field, menu, searchInput.value);
  });
  searchInput.focus();
}

function columnMenuMarkup(field) {
  const label = shipmentColumnLabels[field] || field;
  const currentFilter = state.shipmentColumnFilters[field] || "";

  return `
    <div class="column-menu-title">${escapeHtml(label)}</div>
    <button class="column-menu-action" type="button" data-column-action="sort-asc">升序排序</button>
    <button class="column-menu-action" type="button" data-column-action="sort-desc">降序排序</button>
    <button class="column-menu-action" type="button" data-column-action="clear" ${currentFilter ? "" : "disabled"}>清除此列筛选</button>
    <div class="column-menu-section">按值筛选</div>
    <input class="column-value-search" type="search" placeholder="输入筛选值" data-column-value-search />
    <div class="column-value-count" data-column-value-count></div>
    <div class="column-value-list" data-column-value-list></div>
  `;
}

function renderColumnValueList(field, menu, query) {
  const currentFilter = state.shipmentColumnFilters[field] || "";
  const normalizedQuery = query.trim().toLowerCase();
  const values = shipmentColumnFilterValues(field).filter((value) => {
    return !normalizedQuery || value.toLowerCase().includes(normalizedQuery);
  });
  const list = menu.querySelector("[data-column-value-list]");
  const counter = menu.querySelector("[data-column-value-count]");
  counter.textContent = normalizedQuery
    ? `匹配 ${values.length} 个值`
    : `共 ${values.length} 个值`;
  list.innerHTML = "";
  if (!values.length) {
    list.innerHTML = '<div class="column-menu-empty">没有匹配的值</div>';
    return;
  }
  values.forEach((value) => {
    const item = document.createElement("button");
    item.className = `column-value ${value === currentFilter ? "selected" : ""}`;
    item.type = "button";
    item.dataset.filterValue = value;
    item.innerHTML = `<span>${escapeHtml(value)}</span>`;
    item.addEventListener("click", () => {
      state.shipmentColumnFilters[field] = value;
      closeColumnMenu();
      renderShipmentRecords();
    });
    list.appendChild(item);
  });
}

function shipmentColumnFilterValues(field) {
  return uniqueSorted(state.records.map((record) => shipmentColumnDisplayValue(record, field)).filter((value) => value && value !== "-"));
}

function applyColumnSort(field, direction) {
  state.shipmentSort = { field, direction };
  closeColumnMenu();
  renderShipmentRecords();
}

function positionColumnMenu(menu, button) {
  const rect = button.getBoundingClientRect();
  const width = 250;
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
  const top = Math.min(rect.bottom + 8, window.innerHeight - 360);
  menu.style.left = `${left}px`;
  menu.style.top = `${Math.max(12, top)}px`;
}

function closeColumnMenu() {
  document.querySelector(".column-menu-popover")?.remove();
  state.activeColumnMenu = "";
}

function startShipmentExport(format) {
  if (!state.batchId) {
    setStatus("请先扫描或上传一批 PDF，再导出");
    return;
  }
  const label = format === "xlsx" ? "Excel 工作簿" : "CSV 文件";
  const url = `/api/export?batch_id=${encodeURIComponent(state.batchId)}&format=${encodeURIComponent(format)}`;
  closeExportMenu();
  setStatus(`正在导出${label}...`);
  const iframe = document.createElement("iframe");
  iframe.className = "download-frame";
  iframe.src = url;
  document.body.appendChild(iframe);
  window.setTimeout(() => {
    iframe.remove();
    setStatus(`${label}下载已开始`);
  }, 1200);
}

function renderReportJob(payload) {
  const { summary } = payload;
  els.reportFilesMetric.textContent = summary.files;
  els.reportProcessedMetric.textContent = summary.processed;
  els.reportDetailsMetric.textContent = summary.detail_rows;
  els.reportWarningsMetric.textContent = summary.warnings;
  els.reportBatchLabel.textContent = payload.source_label;
  setReportStatus(`已解析 ${summary.processed} 个 PDF，${summary.warnings} 个需要复核`);

  els.reportDownload.href = payload.download_url;
  els.reportDownload.classList.remove("disabled");

  if (!payload.rows.length) {
    els.reportResultBody.innerHTML = '<tr><td class="empty" colspan="8">该文件夹没有可处理的交易报告 PDF。</td></tr>';
    return;
  }

  els.reportResultBody.innerHTML = payload.rows.map(renderReportRow).join("");
}

function renderTransactionJob(payload) {
  const { summary } = payload;
  const warningCount = (summary.date_parse_failures || 0)
    + (summary.amount_failures || 0)
    + (summary.unresolved_country_files || 0)
    + (summary.unsupported_files || 0);
  els.transactionFilesMetric.textContent = summary.source_files || 0;
  els.transactionRowsMetric.textContent = summary.total_rows || 0;
  els.transactionCountriesMetric.textContent = summary.countries || 0;
  els.transactionWarningsMetric.textContent = warningCount;
  els.transactionBatchLabel.textContent = payload.source_label;
  setTransactionStatus(`已清洗 ${summary.source_files || 0} 个文件，${summary.total_rows || 0} 条明细`);

  els.transactionDownload.href = payload.download_url;
  els.transactionAuditDownload.href = payload.audit_download_url;
  els.transactionDownload.classList.remove("disabled");
  els.transactionAuditDownload.classList.remove("disabled");

  if (!payload.rows.length) {
    els.transactionResultBody.innerHTML = '<tr><td class="empty" colspan="8">该文件夹没有可处理的交易明细文件。</td></tr>';
    return;
  }

  els.transactionResultBody.innerHTML = payload.rows.map(renderTransactionRow).join("");
}

async function loadHistory() {
  els.historyStatusText.textContent = "正在读取历史任务...";
  const response = await fetch("/api/history");
  const payload = await response.json();
  if (response.status === 401) {
    showLoggedOut();
    return;
  }
  if (!response.ok) {
    els.historyStatusText.textContent = payload.error || "历史任务读取失败";
    return;
  }
  renderHistory(payload);
}

async function loadSettings() {
  const response = await fetch("/api/settings");
  const payload = await response.json();
  if (response.status === 401) {
    showLoggedOut();
    return;
  }
  if (!response.ok) {
    renderSettingsError(payload.error || "设置读取失败");
    return;
  }
  renderSettings(payload);
}

function renderRow(record) {
  const statusClass = record.is_valid ? "ok" : "warn";
  const statusText = record.is_valid ? "通过" : "需复核";
  const actionText = record.rename.can_apply ? "可重命名" : record.rename.reason;
  const isForwarderLabel = record.label_type === "forwarder";
  const productName = record.title_product_name || record.product_name || (isForwarderLabel ? "货代标签" : "-");
  const boxText = isForwarderLabel && record.shipment_total_boxes
    ? `${record.box_count}箱 / 大货${record.shipment_total_boxes}箱`
    : record.total_units && record.total_units !== record.box_count
    ? `${record.box_count}箱 / ${record.total_units}个`
    : `${record.box_count}箱`;
  const filenameInfo = record.filename_info || {};
  const filenameSummary = [
    filenameInfo.logistics_code ? `物流 ${filenameInfo.logistics_code}` : "",
    filenameInfo.sku ? `SKU ${filenameInfo.sku}` : "",
    filenameInfo.country || "",
    filenameInfo.total_units ? `${filenameInfo.total_units}个` : "",
    filenameInfo.box_count ? `${filenameInfo.box_count}箱` : "",
    filenameInfo.warehouse || "",
    filenameInfo.fba_code || "",
  ].filter(Boolean).join(" / ") || "-";
  const warnings = [
    ...(record.notes || []),
    ...(filenameInfo.notes || []),
    ...(record.comparison_notes || []),
  ];

  return `
    <tr>
      <td class="filename">${escapeHtml(record.original_filename)}</td>
      <td>${escapeHtml(filenameInfo.factory_name || "-")}</td>
      <td>${escapeHtml(record.sku || "-")}</td>
      <td>${escapeHtml(productName)}</td>
      <td>${escapeHtml(record.destination_country || "-")}</td>
      <td>${escapeHtml(record.warehouse || "-")}</td>
      <td>${escapeHtml(record.fba_code || "-")}</td>
      <td>${escapeHtml(boxText)}</td>
      <td class="filename-check">${escapeHtml(filenameSummary)}</td>
      <td>
        <span class="badge ${statusClass}">${statusText}</span>
        ${warnings.length ? `<ul class="warning-list">${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : ""}
      </td>
      <td class="suggested">${escapeHtml(record.suggested_filename)}</td>
      <td>${escapeHtml(actionText)}</td>
    </tr>
  `;
}

function updateActionButtons(records = state.records) {
  const hasBatch = Boolean(state.batchId);
  const hasRecords = records && records.length > 0;
  const hasFactory = hasRecords && records.some((record) => record.filename_info && record.filename_info.factory_name);
  const canRename = hasRecords && records.some((record) => record.rename.can_apply);
  els.packageButton.disabled = !(hasBatch && hasFactory);
  els.renameButton.disabled = !(hasBatch && canRename);
}

function renderPackageResult(payload) {
  const packages = payload.packages || [];
  const skipped = payload.skipped || [];
  const packageLinks = packages.length
    ? packages.map((item) => `
        <a class="text-link" href="${escapeHtml(item.download_url)}">
          ${escapeHtml(item.factory_name)} · ${escapeHtml(item.file_count)} 个 PDF
        </a>
      `).join("")
    : "<span>没有生成压缩包</span>";
  const skippedText = skipped.length
    ? `<p>${escapeHtml(skipped.map((item) => `${item.filename}：${item.reason}`).join("；"))}</p>`
    : "";
  els.packageResult.innerHTML = `
    <div>
      <strong>工厂压缩包</strong>
      <span>${escapeHtml(payload.package_root || "")}</span>
    </div>
    <div class="action-links">${packageLinks}</div>
    ${skippedText}
  `;
  els.packageResult.classList.remove("hidden");
}

function renderReportRow(row) {
  const statusClass = row.status === "通过" ? "ok" : "warn";
  const period = row.year && row.month ? `${row.year}-${String(row.month).padStart(2, "0")}` : (row.period || "-");
  const counts = `${row.summary_count || 0} / ${row.detail_count || 0}`;

  return `
    <tr>
      <td class="filename">${escapeHtml(row.source_file || "-")}</td>
      <td>${escapeHtml(row.store || "-")}</td>
      <td>${escapeHtml(row.country || row.country_code || "-")}</td>
      <td>${escapeHtml(period)}</td>
      <td>${escapeHtml(row.currency || "-")}</td>
      <td>${escapeHtml(counts)}</td>
      <td><span class="badge ${statusClass}">${escapeHtml(row.status || "需复核")}</span></td>
      <td class="suggested">${escapeHtml(row.notes || "-")}</td>
    </tr>
  `;
}

function renderTransactionRow(row) {
  const statusClass = row.status === "通过" ? "ok" : "warn";
  const rowCounts = `${row.source_rows || 0} / ${row.parsed_rows || 0}`;
  const dateRange = [row.date_min, row.date_max].filter(Boolean).join(" 至 ") || "-";
  return `
    <tr>
      <td class="filename">${escapeHtml(row.source_file || "-")}</td>
      <td>${escapeHtml(row.brand || "-")}</td>
      <td>${escapeHtml(row.country || "-")}</td>
      <td>${escapeHtml(row.currency || "-")}</td>
      <td>${escapeHtml(rowCounts)}</td>
      <td>${escapeHtml(dateRange)}</td>
      <td><span class="badge ${statusClass}">${escapeHtml(row.status || "需复核")}</span></td>
      <td class="suggested">${escapeHtml(row.notes || "-")}</td>
    </tr>
  `;
}

function renderHistory(payload) {
  const { summary, tasks } = payload;
  els.historyTotalMetric.textContent = summary.total;
  els.historyShipmentMetric.textContent = summary.shipment_pdf;
  els.historyReportMetric.textContent = summary.report_pdf;
  els.historyTransactionMetric.textContent = summary.transaction_csv || 0;
  els.historyReviewMetric.textContent = summary.needs_review;
  els.historyStatusText.textContent = summary.total
    ? `已记录 ${summary.total} 个任务`
    : "记录当前服务运行期间的处理任务";

  if (!tasks.length) {
    els.historyResultBody.innerHTML = '<tr><td class="empty" colspan="7">完成一次扫描或提取后，历史任务会显示在这里。</td></tr>';
    return;
  }

  els.historyResultBody.innerHTML = tasks.map(renderHistoryRow).join("");
}

function renderHistoryRow(task) {
  const statusClass = task.status === "完成" ? "ok" : "warn";
  const summary = historySummaryText(task);
  const downloads = task.downloads && task.downloads.length
    ? task.downloads.map((download) => `<a class="text-link" href="${escapeHtml(download.url)}">${escapeHtml(download.label)}</a>`).join("")
    : "-";

  return `
    <tr>
      <td class="mono-cell">${escapeHtml(task.created_at)}</td>
      <td>${escapeHtml(task.title)}</td>
      <td>${escapeHtml(task.owner_name || task.owner_username || "-")}</td>
      <td class="filename">${escapeHtml(task.source_label)}</td>
      <td>${escapeHtml(summary)}</td>
      <td><span class="badge ${statusClass}">${escapeHtml(task.status)}</span></td>
      <td class="action-links">${downloads}</td>
    </tr>
  `;
}

function historySummaryText(task) {
  const summary = task.summary || {};
  if (task.type === "shipment_pdf") {
    return `${summary.files || 0} 个PDF / ${summary.boxes || 0} 个箱码 / ${summary.needs_review || 0} 个复核`;
  }
  if (task.type === "report_pdf") {
    return `${summary.processed || 0} 个PDF / ${summary.detail_rows || 0} 条明细 / ${summary.warnings || 0} 个复核`;
  }
  if (task.type === "transaction_csv") {
    return `${summary.source_files || 0} 个文件 / ${summary.total_rows || 0} 条明细 / ${summary.countries || 0} 个国家`;
  }
  return "-";
}

function renderSettings(payload) {
  state.currentUser = payload.current_user || state.currentUser;
  if (state.currentUser) {
    els.userBadge.textContent = `${state.currentUser.display_name} · ${roleLabel(state.currentUser.role)}`;
  }
  els.serviceSettingsList.innerHTML = renderDefinitionList({
    "服务名称": payload.service.name,
    "访问地址": payload.service.address,
    "状态": payload.service.status,
  });
  els.pathSettingsList.innerHTML = renderDefinitionList({
    "项目目录": payload.paths.project_root,
    "导出目录": payload.paths.output_root,
    "上传目录": payload.paths.upload_root,
    "允许扫描": payload.paths.allowed_input_roots.join("；"),
  });
  els.processingSettingsList.innerHTML = payload.processing.map((item) => `
    <div class="settings-row">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.engine)}</span>
      <em>LLM：${escapeHtml(item.llm)}</em>
    </div>
  `).join("");
  els.deploymentSettingsList.innerHTML = payload.deployment_notes.map((note) => `
    <p>${escapeHtml(note)}</p>
  `).join("");
  const canManageUsers = Boolean(payload.permissions && payload.permissions.can_manage_users);
  els.userManagementPanel.classList.toggle("hidden", !canManageUsers);
  if (canManageUsers) {
    loadUsers();
  }
}

function renderSettingsError(message) {
  els.serviceSettingsList.innerHTML = `<dt>状态</dt><dd>${escapeHtml(message)}</dd>`;
  els.pathSettingsList.innerHTML = "";
  els.processingSettingsList.innerHTML = "";
  els.deploymentSettingsList.innerHTML = "";
}

function renderDefinitionList(items) {
  return Object.entries(items)
    .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value || "-")}</dd>`)
    .join("");
}

async function loadUsers() {
  els.userStatusText.textContent = "正在读取用户...";
  const response = await fetch("/api/users");
  const payload = await response.json();
  if (response.status === 401) {
    showLoggedOut();
    return;
  }
  if (!response.ok) {
    els.userStatusText.textContent = payload.error || "用户读取失败";
    return;
  }
  els.userStatusText.textContent = `已加载 ${payload.users.length} 个用户`;
  renderUsers(payload.users);
}

async function createUser() {
  els.userStatusText.textContent = "正在新增用户...";
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: els.newUsername.value,
      display_name: els.newDisplayName.value,
      password: els.newPassword.value,
      role: els.newRole.value,
      active: true,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    els.userStatusText.textContent = payload.error || "新增失败";
    return;
  }
  els.userForm.reset();
  els.newRole.value = "operator";
  els.userStatusText.textContent = `已新增用户 ${payload.user.username}`;
  await loadUsers();
}

function renderUsers(users) {
  if (!users.length) {
    els.userTableBody.innerHTML = '<tr><td class="empty" colspan="5">暂无用户。</td></tr>';
    return;
  }
  els.userTableBody.innerHTML = users.map(renderUserRow).join("");
  els.userTableBody.querySelectorAll("[data-user-action]").forEach((button) => {
    button.addEventListener("click", () => handleUserAction(button.dataset));
  });
}

function renderUserRow(user) {
  const statusClass = user.active ? "ok" : "warn";
  const nextRole = user.role === "admin" ? "operator" : "admin";
  const nextActive = user.active ? "停用" : "启用";
  const self = state.currentUser && state.currentUser.id === user.id;
  return `
    <tr>
      <td>
        <strong>${escapeHtml(user.display_name)}</strong>
        <div class="mono-cell">${escapeHtml(user.username)}</div>
      </td>
      <td>${escapeHtml(roleLabel(user.role))}</td>
      <td><span class="badge ${statusClass}">${user.active ? "启用" : "停用"}</span></td>
      <td class="mono-cell">${escapeHtml(user.created_at || "-")}</td>
      <td>
        <div class="row-actions">
          <button class="small-button" type="button" data-user-action="role" data-user-id="${escapeHtml(user.id)}" data-role="${nextRole}" ${self ? "disabled" : ""}>设为${escapeHtml(roleLabel(nextRole))}</button>
          <button class="small-button" type="button" data-user-action="active" data-user-id="${escapeHtml(user.id)}" data-active="${String(!user.active)}" ${self ? "disabled" : ""}>${nextActive}</button>
          <button class="small-button" type="button" data-user-action="password" data-user-id="${escapeHtml(user.id)}">重置密码</button>
          <button class="small-button" type="button" data-user-action="delete" data-user-id="${escapeHtml(user.id)}" ${self ? "disabled" : ""}>删除</button>
        </div>
      </td>
    </tr>
  `;
}

async function handleUserAction(dataset) {
  const userId = dataset.userId;
  if (dataset.userAction === "role") {
    await updateUser(userId, { role: dataset.role });
    return;
  }
  if (dataset.userAction === "active") {
    await updateUser(userId, { active: dataset.active === "true" });
    return;
  }
  if (dataset.userAction === "password") {
    const password = window.prompt("请输入新密码（至少 6 位）");
    if (!password) return;
    await updateUser(userId, { password });
    return;
  }
  if (dataset.userAction === "delete") {
    if (!window.confirm("确认删除这个用户？")) return;
    await deleteUser(userId);
  }
}

async function updateUser(userId, payload) {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  els.userStatusText.textContent = response.ok ? "用户已更新" : (result.error || "更新失败");
  if (response.ok) {
    await loadUsers();
  }
}

async function deleteUser(userId) {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  const result = await response.json();
  els.userStatusText.textContent = response.ok ? "用户已删除" : (result.error || "删除失败");
  if (response.ok) {
    await loadUsers();
  }
}

function setActiveView(view) {
  state.activeView = ["shipment", "report", "transaction", "history", "settings"].includes(view) ? view : "shipment";
  els.navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === state.activeView);
  });
  els.viewPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.viewPanel !== state.activeView);
  });
  els.inspectorPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.inspectorPanel !== state.activeView);
  });
  const isShipment = state.activeView === "shipment";
  els.exportMenu.classList.toggle("hidden", !isShipment);
  if (!isShipment) {
    closeExportMenu();
  }
  if (state.activeView === "history") {
    loadHistory();
  }
  if (state.activeView === "settings") {
    loadSettings();
  }
}

function viewFromHash() {
  if (window.location.hash.includes("report")) return "report";
  if (window.location.hash.includes("transaction")) return "transaction";
  if (window.location.hash.includes("history")) return "history";
  if (window.location.hash.includes("settings")) return "settings";
  return "shipment";
}

function setBusy(message) {
  state.shipmentBusy = true;
  els.statusText.textContent = message;
  updateBusyControls();
}

function setStatus(message) {
  state.shipmentBusy = false;
  els.statusText.textContent = message;
  updateBusyControls();
}

function updateBusyControls() {
  const busy = state.shipmentBusy;
  els.folderScanButton.disabled = busy;
  els.uploadSubmitButton.disabled = busy;
  els.uploadPickers.forEach((button) => {
    button.disabled = busy;
  });
  els.dropTarget.classList.toggle("disabled", busy);
  els.folderScanButton.textContent = busy ? "处理中..." : "扫描文件夹";
  els.uploadSubmitButton.textContent = busy ? "处理中..." : "上传并识别";
}

function normalizeLoginPassword(value) {
  return normalizeLoginText(value);
}

function normalizeLoginText(value) {
  return [...value.normalize("NFKC")]
    .filter((char) => {
      if (char === "\ufeff") return false;
      return !/[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufe00-\ufe0f\ufff9-\ufffb]/u.test(char);
    })
    .join("")
    .trim();
}

function setReportBusy(message) {
  els.reportStatusText.textContent = message;
}

function setReportStatus(message) {
  els.reportStatusText.textContent = message;
}

function disableReportDownload() {
  els.reportDownload.href = "#";
  els.reportDownload.classList.add("disabled");
}

function setTransactionBusy(message) {
  els.transactionStatusText.textContent = message;
}

function setTransactionStatus(message) {
  els.transactionStatusText.textContent = message;
}

function disableTransactionDownloads() {
  els.transactionDownload.href = "#";
  els.transactionAuditDownload.href = "#";
  els.transactionDownload.classList.add("disabled");
  els.transactionAuditDownload.classList.add("disabled");
}

function closeExportMenu() {
  els.exportMenu.classList.remove("open");
  els.exportMenuButton.setAttribute("aria-expanded", "false");
}

function roleLabel(role) {
  return role === "admin" ? "管理员" : "操作员";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
