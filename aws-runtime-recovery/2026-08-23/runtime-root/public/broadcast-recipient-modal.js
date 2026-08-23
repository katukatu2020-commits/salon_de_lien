(function () {
  if (window.__broadcastRecipientModalReady) return;
  window.__broadcastRecipientModalReady = true;

  function element(id) {
    return document.getElementById(id);
  }

  function updateCount() {
    var boxes = Array.from(
      document.querySelectorAll(
        '#broadcast-recipient-modal input[name="targetCustomerId"]',
      ),
    );
    var count = boxes.filter(function (box) {
      return box.checked;
    }).length;
    var summary = element("broadcast-recipient-count");
    var modalCount = element("broadcast-recipient-modal-count");
    if (summary) {
      summary.textContent = count
        ? count + "名を個別選択中"
        : "個別選択なし（条件配信）";
    }
    if (modalCount) modalCount.textContent = count + "名選択中";
  }

  function applyFilters() {
    var search = element("broadcast-recipient-search");
    var staff = element("broadcast-recipient-staff");
    var query = search ? search.value.trim().toLowerCase() : "";
    var selectedStaff = staff ? staff.value : "";
    document.querySelectorAll(".broadcast-recipient-row").forEach(function (row) {
      var matchesSearch = !query || row.dataset.recipientSearch.includes(query);
      var matchesStaff = !selectedStaff || row.dataset.recipientStaff === selectedStaff;
      row.hidden = !(matchesSearch && matchesStaff);
    });
  }

  function ensureStaffFilter() {
    var search = element("broadcast-recipient-search");
    if (!search || element("broadcast-recipient-staff")) return;
    var values = Array.from(document.querySelectorAll(".broadcast-recipient-row"))
      .map(function (row) { return row.dataset.recipientStaff || "フリー"; })
      .filter(function (value, index, values) { return values.indexOf(value) === index; })
      .sort();
    var wrap = document.createElement("label");
    wrap.className = "grid gap-1 text-xs font-semibold text-[color:var(--lien-muted)]";
    wrap.innerHTML = '<span>前回担当者で絞り込み</span><select id="broadcast-recipient-staff" class="lien-input"><option value="">すべての担当者</option>' + values.map(function (value) { return '<option value="' + value.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '">' + value + '</option>'; }).join('') + '</select>';
    search.parentElement.style.display = "grid";
    search.parentElement.style.gap = "10px";
    search.insertAdjacentElement("afterend", wrap);
  }

  function openModal() {
    var modal = element("broadcast-recipient-modal");
    var search = element("broadcast-recipient-search");
    if (!modal) return;
    modal.hidden = false;
    ensureStaffFilter();
    applyFilters();
    setTimeout(function () {
      ensureStaffFilter();
      applyFilters();
    }, 150);
    document.body.style.overflow = "hidden";
    setTimeout(function () {
      if (search) search.focus();
    }, 0);
    updateCount();
  }

  function closeModal() {
    var modal = element("broadcast-recipient-modal");
    var opener = element("broadcast-recipient-open");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    if (opener) opener.focus();
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest && event.target.closest("button");
    if (!button) return;
    if (button.id === "broadcast-recipient-open") openModal();
    if (
      button.id === "broadcast-recipient-close" ||
      button.id === "broadcast-recipient-backdrop" ||
      button.id === "broadcast-recipient-done"
    ) {
      closeModal();
    }
  });

  document.addEventListener("change", function (event) {
    if (
      event.target.matches &&
      event.target.matches(
        '#broadcast-recipient-modal input[name="targetCustomerId"]',
      )
    ) {
      setTimeout(updateCount, 0);
    }
  });

  document.addEventListener("input", function (event) {
    if (event.target.id === "broadcast-recipient-search") applyFilters();
  });

  document.addEventListener("change", function (event) {
    if (event.target.id === "broadcast-recipient-staff") applyFilters();
  });

  document.addEventListener("keydown", function (event) {
    var modal = element("broadcast-recipient-modal");
    if (event.key === "Escape" && modal && !modal.hidden) closeModal();
  });

  setTimeout(function () { ensureStaffFilter(); updateCount(); }, 600);
})();
