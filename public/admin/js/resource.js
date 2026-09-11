/**
 * RESOURCE — a generic list+create+edit+delete controller driven by a
 * declarative config. Covers most admin sections (services, portfolio,
 * testimonials, FAQs, notifications, landing pages, users, blog
 * categories/tags). Sections with meaningfully different shapes
 * (pricing, blog posts, leads, media, settings, overview, audit) get
 * bespoke renderers in sections.js instead of forcing this mold.
 *
 * config = {
 *   title, apiBase,
 *   columns: [{ label, key, render? }],
 *   fields: [{ name, label, type, required?, options? }],
 *   newLabel, emptyMessage,
 *   toRow(item) -> extra per-row fields (used by columns' render),
 *   afterSave?, canDelete? (default true)
 * }
 */
function createResourceController(config) {
  let items = [];

  async function load() {
    items = await API.get(config.apiBase);
    render();
  }

  function render() {
    const container = document.getElementById("content");
    const rows = items.map(item => ({
      ...item,
      __id: item.id,
      __actions: `
        <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${item.id}">Edit</button>
        ${config.canDelete !== false ? `<button class="btn btn-ghost btn-sm" data-action="delete" data-id="${item.id}">Delete</button>` : ""}
      `,
    }));

    container.innerHTML = `
      <div class="admin-toolbar">
        <div></div>
        <button class="btn btn-primary btn-sm" id="newBtn">+ ${UI.escapeHtml(config.newLabel || "New")}</button>
      </div>
      ${UI.renderTable({ columns: config.columns, rows, emptyMessage: config.emptyMessage })}
    `;

    container.querySelector("#newBtn").onclick = () => openForm(null);
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.onclick = () => openForm(items.find(i => String(i.id) === btn.dataset.id));
    });
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.onclick = () => handleDelete(btn.dataset.id);
    });
  }

  function openForm(item) {
    const isEdit = Boolean(item);
    UI.openModal(isEdit ? `Edit ${config.title}` : `New ${config.title}`, `
      ${UI.renderForm(config.fields, item || {})}
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
        <button class="btn btn-primary" id="saveBtn">${isEdit ? "Save changes" : "Create"}</button>
      </div>
    `, {
      onMount: body => {
        body.querySelector("#cancelBtn").onclick = () => UI.closeModal();
        body.querySelector("#saveBtn").onclick = async () => {
          const data = UI.readForm(config.fields);
          try {
            if (isEdit) {
              await API.put(`${config.apiBase}/${item.id}`, data);
              toast(`${config.title} updated.`, "success");
            } else {
              await API.post(config.apiBase, data);
              toast(`${config.title} created.`, "success");
            }
            UI.closeModal();
            await load();
            if (config.afterSave) config.afterSave();
          } catch (err) {
            reportError(err);
          }
        };
      },
    });
  }

  async function handleDelete(id) {
    const ok = await UI.confirmDialog(`Delete this ${config.title.toLowerCase()}? This can't be undone.`);
    if (!ok) return;
    try {
      await API.del(`${config.apiBase}/${id}`);
      toast(`${config.title} deleted.`, "success");
      await load();
    } catch (err) {
      reportError(err);
    }
  }

  return { load, render };
}
