(function () {
  const records = window.TaxCalculator.buildRecords(window.TAX_DATA);
  const params = new URLSearchParams(window.location.search);
  const year = Number(params.get("year")) || window.TAX_DATA.currentYear;
  const requestedId = params.get("id");
  const legacySalaryMatch = requestedId && requestedId.match(/^salary-(\d{4})-(\d{2})$/);
  const record = records.find((item) => item.id === requestedId)
    || (legacySalaryMatch && records.find((item) => item.period === `${legacySalaryMatch[1]}-${legacySalaryMatch[2]}` && item.type === "salary"))
    || records.find((item) => item.year === year);
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

  function renderRows(container, rows) {
    container.innerHTML = rows
      .map((row) => `
        <div class="card-item">
          <div>${row.label}：</div>
          <div>${row.value}</div>
        </div>
      `)
      .join("");
  }

  function renderSummary(record) {
    renderRows(document.querySelector("[data-summary-body]"), [
      { label: "收入", value: window.TaxCalculator.formatMoney(record.income) },
      { label: "已申报税额", value: window.TaxCalculator.formatMoney(record.tax) },
      { label: "", value: '<a class="tax-link" data-calc-link>查看税款计算<span class="iconfont icon-qianjin"></span></a>' },
    ]);
  }

  function renderDeductionChildren(details) {
    return `
      <div class="card-children" data-deduction-children>
        <div class="card-children-item"><div>基本养老保险：</div><div>${window.TaxCalculator.formatMoney(details.statutory.pension)}</div></div>
        <div class="card-children-item"><div>基本医疗保险：</div><div>${window.TaxCalculator.formatMoney(details.statutory.medical)}</div></div>
        <div class="card-children-item"><div>失业保险：</div><div>${window.TaxCalculator.formatMoney(details.statutory.unemployment)}</div></div>
        <div class="card-children-item"><div>住房公积金：</div><div>${window.TaxCalculator.formatMoney(details.statutory.housingFund)}</div></div>
      </div>
    `;
  }

  function renderSalaryDetail(container, record) {
    const details = record.details;
    container.innerHTML = `
      <div class="card-item"><div>本期收入：</div><div>${window.TaxCalculator.formatMoney(record.income)}</div></div>
      <div class="card-item"><div>本期免税收入：</div><div>0.00元</div></div>
      <div class="card-item"><div>本期减除费用：</div><div>${window.TaxCalculator.formatMoney(details.standardDeduction)}</div></div>
      <button class="card-item deduction-toggle is-open" type="button" data-deduction-toggle>
        <div>本期专项扣除：</div>
        <div>${window.TaxCalculator.formatMoney(details.statutory.total)}<span class="triangle"></span></div>
      </button>
      ${renderDeductionChildren(details)}
      <div class="card-item"><div>本期其他扣除：</div><div>0.00元</div></div>
      <div class="card-item"><div>本期准予扣除的捐赠项目：</div><div>0.00元</div></div>
    `;

    const toggle = container.querySelector("[data-deduction-toggle]");
    const children = container.querySelector("[data-deduction-children]");
    toggle.addEventListener("click", () => {
      const isOpen = toggle.classList.toggle("is-open");
      children.hidden = !isOpen;
    });
  }

  function renderBonusDetail(container, record) {
    renderRows(container, [
      { label: "全年一次性奖金收入", value: window.TaxCalculator.formatMoney(record.income) },
      { label: "计税月均金额", value: window.TaxCalculator.formatMoney(record.details.monthlyAverage) },
      { label: "奖金折算月数", value: `${record.details.bonusMonths}个月` },
      { label: "本期应缴税额", value: window.TaxCalculator.formatMoney(record.tax) },
    ]);
  }

  function render() {
    if (!record) return;
    const meta = companyMeta[record.company] || {};
    renderSummary(record);
    document.querySelector("[data-back]").href = `index.html?year=${record.year}`;
    document.querySelector("[data-declaration-date]").textContent = record.declarationDate;
    document.querySelector("[data-period]").textContent = record.period;
    document.querySelector("[data-company]").textContent = record.company;
    document.querySelector("[data-subcategory]").textContent = record.subcategory;
    document.querySelector("[data-taxpayer-id]").textContent = meta.taxpayerId || "";
    document.querySelector("[data-tax-office]").textContent = meta.taxOffice || "";
    document.querySelectorAll("[data-calc-link]").forEach((link) => {
      link.href = `calculation.html?id=${encodeURIComponent(record.id)}&year=${record.year}`;
    });

    const body = document.querySelector("[data-detail-body]");
    if (record.type === "bonus") {
      renderBonusDetail(body, record);
    } else {
      renderSalaryDetail(body, record);
    }
  }

  render();
})();
