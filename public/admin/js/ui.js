/**
 * UI — small, dependency-free helpers for modals, forms, and tables.
 * Used by resource.js and the bespoke sections in sections.js.
 */
const UI = (() => {
  const modalRegion = () => document.getElementById("modal-region");

  function closeModal() {
    modalRegion().innerHTML = "";
  }

  function openModal(titleText, bodyHtml, { onMount } = {}) {
    modalRegion().innerHTML = `
      <div class="modal-backdrop" id="modalBackdrop">
        <div class="modal-box" role="dialog" aria-modal="true" aria-label="${escapeHtml(titleText)}">
          <h2>${escapeHtml(titleText)}</h2>
          <div id="modalBody">${bodyHtml}</div>
        </div>
      </div>`;
    document.getElementById("modalBackdrop").addEventListener("click", e => {
      if (e.target.id === "modalBackdrop") closeModal();
    });
    if (onMount) onMount(document.getElementById("modalBody"));
  }

  function confirmDialog(message) {
    return new Promise(resolve => {
      openModal("Please confirm", `
        <p>${escapeHtml(message)}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="confirmNo">Cancel</button>
          <button class="btn btn-accent" id="confirmYes">Delete</button>
        </div>
      `, {
        onMount: body => {
          body.querySelector("#confirmNo").onclick = () => { closeModal(); resolve(false); };
          body.querySelector("#confirmYes").onclick = () => { closeModal(); resolve(true); };
        },
      });
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  /** Renders a <table class="data-table"> from columns + rows. */
  function renderTable({ columns, rows, emptyMessage }) {
    if (!rows.length) {
      return `<div class="data-table-wrap"><div class="table-empty">${escapeHtml(emptyMessage || "Nothing here yet.")}</div></div>`;
    }
    return `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr>${columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join("")}<th></th></tr></thead>
          <tbody>
            ${rows.map(row => `
              <tr data-id="${row.__id}">
                ${columns.map(c => `<td>${c.render ? c.render(row) : escapeHtml(row[c.key])}</td>`).join("")}
                <td class="row-actions">${row.__actions || ""}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function pill(text, color) {
    return `<span class="pill pill-${color}">${escapeHtml(text)}</span>`;
  }

  /** Renders a form field based on a simple field-schema entry. */
  function renderField(field, value) {
    const id = `f_${field.name}`;
    const val = value === undefined || value === null ? (field.default ?? "") : value;

    if (field.type === "textarea") {
      return `<div class="form-field"><label for="${id}">${escapeHtml(field.label)}</label>
        <textarea id="${id}" name="${field.name}" rows="${field.rows || 4}">${escapeHtml(val)}</textarea></div>`;
    }
    if (field.type === "select") {
      const opts = field.options.map(o => `<option value="${escapeHtml(o.value)}" ${String(o.value) === String(val) ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("");
      return `<div class="form-field"><label for="${id}">${escapeHtml(field.label)}</label>
        <select id="${id}" name="${field.name}">${opts}</select></div>`;
    }
    if (field.type === "checkbox") {
      return `<div class="form-field checkbox-field">
        <input type="checkbox" id="${id}" name="${field.name}" ${val ? "checked" : ""}>
        <label for="${id}" style="margin:0;">${escapeHtml(field.label)}</label></div>`;
    }
    if (field.type === "list") {
      const listVal = Array.isArray(val) ? val.join("\n") : "";
      return `<div class="form-field"><label for="${id}">${escapeHtml(field.label)}</label>
        <textarea id="${id}" name="${field.name}" rows="${field.rows || 4}">${escapeHtml(listVal)}</textarea>
        <div class="tag-input-hint">One per line.</div></div>`;
    }
    // default: text / number / email / url
    return `<div class="form-field"><label for="${id}">${escapeHtml(field.label)}</label>
      <input type="${field.type || "text"}" id="${id}" name="${field.name}" value="${escapeHtml(val)}" ${field.required ? "required" : ""}></div>`;
  }

  function renderForm(fields, values = {}) {
    return `<form id="resourceForm">
      ${fields.map(f => renderField(f, values[f.name])).join("")}
    </form>`;
  }

  /** Reads a form back into a plain object per the field schema. */
  function readForm(fields) {
    const out = {};
    for (const f of fields) {
      const el = document.getElementById(`f_${f.name}`);
      if (!el) continue;
      if (f.type === "checkbox") out[f.name] = el.checked;
      else if (f.type === "number") out[f.name] = el.value === "" ? null : Number(el.value);
      else if (f.type === "list") out[f.name] = el.value.split("\n").map(s => s.trim()).filter(Boolean);
      else out[f.name] = el.value;
    }
    return out;
  }

  return { openModal, closeModal, confirmDialog, escapeHtml, renderTable, pill, renderField, renderForm, readForm };
})();
