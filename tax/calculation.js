(function () {
  const records = window.TaxCalculator.buildRecords(window.TAX_DATA);
  const params = new URLSearchParams(window.location.search);
  const year = Number(params.get("year")) || window.TAX_DATA.currentYear;
  const requestedId = params.get("id");
  const record = records.find((item) => item.id === requestedId) || records.find((item) => item.year === year && item.type === "salary");

  function money(value) {
    return window.TaxCalculator.formatMoney(value || 0);
  }

  function percent(value) {
    return `${Math.round((value || 0) * 100)}%`;
  }

  function row(label, value, className) {
    return `
      <div class="card-item ${className || ""}">
        <div>${label}：</div>
        <div>${value}</div>
      </div>
    `;
  }

  function renderAdditionalChildren(items) {
    return `
      <div class="card-children" data-additional-children>
        ${items.map((item) => `
          <div class="card-children-item">
            <div>${item.name}：</div>
            <div>${money(item.amount)}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderCumulative(record) {
    const details = record.details;
    const children = details.cumulativeAdditionalItems || [];
    const body = document.querySelector("[data-cumulative-body]");
    body.innerHTML = `
      ${row("累计收入", money(details.cumulativeIncome))}
      ${row("累计免税收入", money(details.cumulativeExemptIncome))}
      ${row("累计减除费用", money(details.cumulativeStandardDeduction))}
      ${row("累计专项扣除", money(details.cumulativeStatutory))}
      <button class="card-item deduction-toggle calculation-toggle is-open" type="button" data-additional-toggle>
        <div>累计专项附加扣除：</div>
        <div>${money(details.cumulativeAdditional)}<span class="triangle"></span></div>
      </button>
      ${renderAdditionalChildren(children)}
      ${row("累计其他扣除", money(details.cumulativeOtherDeduction))}
      ${row("累计个人养老金", money(details.cumulativePension))}
      ${row("累计准予扣除的捐赠额", money(details.cumulativeDonation))}
      ${row("累计应纳税所得额", money(details.taxableIncome), "strong-row divider-row")}
    `;

    const toggle = body.querySelector("[data-additional-toggle]");
    const additionalChildren = body.querySelector("[data-additional-children]");
    toggle.addEventListener("click", () => {
      const isOpen = toggle.classList.toggle("is-open");
      additionalChildren.hidden = !isOpen;
    });
  }

  function renderTax(record) {
    const details = record.details;
    document.querySelector("[data-tax-body]").innerHTML = `
      ${row("累计应纳税所得额", money(details.taxableIncome))}
      ${row("税率/预扣率", percent(details.cumulativeTaxRate))}
      ${row("速算扣除数", money(details.cumulativeQuickDeduction))}
      ${row("累计应纳税额", money(details.cumulativeTax))}
      ${row("累计已缴税额", money(details.cumulativeTaxPaidBefore))}
      ${row("累计减免税额", money(0))}
      ${row("本期申报税额", money(record.tax), "strong-row divider-row")}
    `;
  }

  function renderBonus(record) {
    document.querySelector("[data-cumulative-body]").innerHTML = `
      ${row("全年一次性奖金收入", money(record.income))}
      ${row("计税月均金额", money(record.details.monthlyAverage))}
      ${row("奖金折算月数", `${record.details.bonusMonths}个月`)}
      ${row("累计应纳税所得额", money(record.income), "strong-row divider-row")}
    `;

    document.querySelector("[data-tax-body]").innerHTML = `
      ${row("累计应纳税所得额", money(record.income))}
      ${row("税率/预扣率", percent(record.details.taxRate))}
      ${row("速算扣除数", money(record.details.quickDeduction))}
      ${row("累计应纳税额", money(record.tax))}
      ${row("累计已缴税额", money(0))}
      ${row("累计减免税额", money(0))}
      ${row("本期申报税额", money(record.tax), "strong-row divider-row")}
    `;
  }

  function render() {
    if (!record) return;
    document.querySelector("[data-back]").href = `detail.html?id=${encodeURIComponent(record.id)}&year=${record.year}`;
    if (record.type === "bonus") {
      renderBonus(record);
      return;
    }
    renderCumulative(record);
    renderTax(record);
  }

  render();
})();
