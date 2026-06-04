(function () {
  const records = window.TaxCalculator.buildRecords(window.TAX_DATA);
  const params = new URLSearchParams(window.location.search);
  const year = Number(params.get("year")) || window.TAX_DATA.currentYear;
  const record = records.find((item) => item.id === params.get("id")) || records.find((item) => item.year === year && item.type === "bonus");
  const companyMeta = {
    "支付宝（杭州）信息技术有限公司": {
      taxpayerId: "91330100MA27W6A8X3",
      taxOffice: "国家税务总局杭州市税务局",
    },
    "久瓴（上海）智能科技有限公司": {
      taxpayerId: "91310115MA1K4Q7M2L",
      taxOffice: "国家税务总局上海市浦东新区税务局",
    },
    "酷睿程（上海）科技有限公司": {
      taxpayerId: "91310000MAEM6NPU2X",
      taxOffice: "国家税务总局上海市浦东新区税务局临港税务分局",
    },
  };

  function money(value) {
    return window.TaxCalculator.formatMoney(value || 0);
  }

  function percent(value) {
    return `${(Math.round((value || 0) * 10000) / 100).toFixed(2)}%`;
  }

  function rows(items) {
    return items.map((item) => `
      <div class="card-item ${item.className || ""}">
        <div>${item.label}：</div>
        <div>${item.value}</div>
      </div>
    `).join("");
  }

  function render() {
    if (!record) return;
    const meta = companyMeta[record.company] || {};
    document.querySelector("[data-back]").href = `index.html?year=${record.year}`;
    document.querySelector("[data-summary-body]").innerHTML = rows([
      { label: "收入", value: money(record.income) },
      { label: "已申报税额", value: money(record.tax) },
    ]);
    document.querySelector("[data-subcategory]").textContent = record.subcategory;
    document.querySelector("[data-company]").textContent = record.company;
    document.querySelector("[data-taxpayer-id]").textContent = meta.taxpayerId || "";
    document.querySelector("[data-tax-office]").textContent = meta.taxOffice || "";
    document.querySelector("[data-declaration-date]").textContent = record.declarationDate;
    document.querySelector("[data-period]").textContent = record.period;

    document.querySelector("[data-income-body]").innerHTML = rows([
      { label: "收入", value: money(record.income) },
      { label: "免税收入", value: money(0) },
      { label: "减除费用", value: money(0) },
      { label: "专项扣除", value: money(0) },
      { label: "其他扣除", value: money(0) },
      { label: "准予扣除的捐赠额", value: money(0) },
      { label: "应纳税所得额", value: money(record.income), className: "strong-row divider-row" },
    ]);

    document.querySelector("[data-tax-body]").innerHTML = rows([
      { label: "应纳税所得额", value: money(record.income) },
      { label: "税率/预扣率", value: percent(record.details.taxRate) },
      { label: "速算扣除数", value: money(record.details.quickDeduction) },
      { label: "应纳税额", value: money(record.tax) },
      { label: "减免税额", value: money(0) },
      { label: "已缴税额", value: money(0) },
      { label: "申报税额", value: money(record.tax), className: "strong-row divider-row" },
    ]);
  }

  render();
})();
