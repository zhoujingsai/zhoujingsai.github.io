(function () {
  const records = window.TaxCalculator.buildRecords(window.TAX_DATA);
  const params = new URLSearchParams(window.location.search);
  const requestedYear = Number(params.get("year")) || window.TAX_DATA.currentYear;
  const year = clampYear(requestedYear);
  const summary = window.TaxCalculator.summarizeYear(records, year);

  function clampYear(value) {
    return Math.min(window.TAX_DATA.lastYear, Math.max(window.TAX_DATA.firstYear, value));
  }

  function setYear(delta) {
    const nextYear = clampYear(year + delta);
    window.location.href = `${window.location.pathname}?year=${nextYear}`;
  }

  function companyLabel(record) {
    return record.company.length > 11 ? `${record.company.slice(0, 11)}...` : record.company;
  }

  function render() {
    document.querySelector(".header-title").textContent = "收入纳税明细";
    document.querySelector("[data-total-income]").textContent = window.TaxCalculator.formatMoney(summary.income);
    document.querySelector("[data-total-tax]").textContent = window.TaxCalculator.formatMoney(summary.tax);

    const list = document.querySelector("[data-list]");
    list.innerHTML = "";
    summary.records.forEach((record) => {
      const item = document.createElement("a");
      item.className = "list-item";
      item.href = `${record.type === "bonus" ? "detail-bonus.html" : "detail.html"}?id=${encodeURIComponent(record.id)}&year=${year}`;
      item.innerHTML = `
        <div class="list-item-header">
          <div>${record.category}</div>
          <div>${record.period}</div>
        </div>
        <div class="list-item-body">
          <div>所得项目小类：${record.subcategory}</div>
          <div>扣缴义务人：${companyLabel(record)}</div>
          <div>收入：${window.TaxCalculator.formatMoney(record.income)}</div>
          <div>已申报税额：${window.TaxCalculator.formatMoney(record.tax)}</div>
          <span class="iconfont icon-qianjin"></span>
        </div>
      `;
      list.appendChild(item);
    });
  }

  document.querySelector("[data-next-year]").addEventListener("click", (event) => {
    event.preventDefault();
    setYear(1);
  });

  document.querySelector("[data-prev-year]").addEventListener("click", (event) => {
    event.preventDefault();
    setYear(-1);
  });

  render();
})();
