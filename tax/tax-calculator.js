(function () {
  const TAX_BRACKETS = [
    { max: 36000, rate: 0.03, quick: 0 },
    { max: 144000, rate: 0.1, quick: 2520 },
    { max: 300000, rate: 0.2, quick: 16920 },
    { max: 420000, rate: 0.25, quick: 31920 },
    { max: 660000, rate: 0.3, quick: 52920 },
    { max: 960000, rate: 0.35, quick: 85920 },
    { max: Infinity, rate: 0.45, quick: 181920 },
  ];

  const BONUS_BRACKETS = [
    { max: 3000, rate: 0.03, quick: 0 },
    { max: 12000, rate: 0.1, quick: 210 },
    { max: 25000, rate: 0.2, quick: 1410 },
    { max: 35000, rate: 0.25, quick: 2660 },
    { max: 55000, rate: 0.3, quick: 4410 },
    { max: 80000, rate: 0.35, quick: 7160 },
    { max: Infinity, rate: 0.45, quick: 15160 },
  ];

  function parseDate(value) {
    const parts = value.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatMoney(value) {
    return `${roundMoney(value).toFixed(2)}元`;
  }

  function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function padMonth(month) {
    return String(month).padStart(2, "0");
  }

  function monthStart(year, month) {
    return new Date(year, month - 1, 1);
  }

  function monthEnd(year, month) {
    return new Date(year, month, 0);
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${padMonth(date.getMonth() + 1)}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function declarationDate(config, year, month) {
    const planned = new Date(year, month, 15);
    const current = parseDate(config.currentDate);
    return dateKey(planned > current ? current : planned);
  }

  function daysOverlap(startA, endA, startB, endB) {
    const start = Math.max(startA.getTime(), startB.getTime());
    const end = Math.min(endA.getTime(), endB.getTime());
    if (start > end) return 0;
    return Math.floor((end - start) / 86400000) + 1;
  }

  function workingDays(start, end) {
    let count = 0;
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      const week = day.getDay();
      if (week !== 0 && week !== 6) count += 1;
    }
    return count;
  }

  function workingDaysOverlap(startA, endA, startB, endB) {
    const start = new Date(Math.max(startA.getTime(), startB.getTime()));
    const end = new Date(Math.min(endA.getTime(), endB.getTime()));
    if (start > end) return 0;
    return workingDays(start, end);
  }

  function isActiveInMonth(item, year, month) {
    return daysOverlap(parseDate(item.start), parseDate(item.end), monthStart(year, month), monthEnd(year, month)) > 0;
  }

  function getCap(config, year, month) {
    const target = monthStart(year, month);
    return config.shanghaiCaps.find((item) => parseDate(item.start) <= target && parseDate(item.end) >= target).baseCap;
  }

  function getAdditionalDeductions(config, year, month) {
    return config.additionalDeductions
      .filter((item) => isActiveInMonth(item, year, month))
      .map((item) => ({ name: item.name, amount: item.amount }));
  }

  function getBracket(taxableIncome, brackets) {
    return brackets.find((bracket) => taxableIncome <= bracket.max);
  }

  function calcProgressiveTax(taxableIncome) {
    if (taxableIncome <= 0) return 0;
    const bracket = getBracket(taxableIncome, TAX_BRACKETS);
    return roundMoney(taxableIncome * bracket.rate - bracket.quick);
  }

  function calcTaxMeta(taxableIncome) {
    const bracket = getBracket(Math.max(0, taxableIncome), TAX_BRACKETS);
    return {
      rate: bracket.rate,
      quick: bracket.quick,
      tax: calcProgressiveTax(taxableIncome),
    };
  }

  function calcBonusTax(amount) {
    const monthlyAverage = amount / 12;
    const bracket = getBracket(monthlyAverage, BONUS_BRACKETS);
    return roundMoney(amount * bracket.rate - bracket.quick);
  }

  function calcBonusMeta(amount) {
    const monthlyAverage = amount / 12;
    const bracket = getBracket(monthlyAverage, BONUS_BRACKETS);
    return {
      monthlyAverage: roundMoney(monthlyAverage),
      rate: bracket.rate,
      quick: bracket.quick,
      tax: roundMoney(amount * bracket.rate - bracket.quick),
    };
  }

  function calcStatutoryDeductions(config, income, year, month) {
    const policy = config.deductionPolicy;
    const base = Math.min(income, getCap(config, year, month));
    const pension = roundMoney(base * policy.pensionRate);
    const medical = roundMoney(base * policy.medicalRate + policy.medicalFixed);
    const unemployment = roundMoney(base * policy.unemploymentRate);
    const housingFund = roundMoney(base * policy.housingFundRate);
    return {
      base,
      pension,
      medical,
      unemployment,
      housingFund,
      total: roundMoney(pension + medical + unemployment + housingFund),
    };
  }

  function calcMonthlyIncome(job, year, month) {
    const start = parseDate(job.start);
    const end = parseDate(job.end);
    const startOfMonth = monthStart(year, month);
    const endOfMonth = monthEnd(year, month);
    if (daysOverlap(start, end, startOfMonth, endOfMonth) === 0) return 0;

    const fullMonthlyIncome = job.monthlySalary + job.monthlyAllowance;
    const daysInMonth = endOfMonth.getDate();
    const fullMonth = start <= startOfMonth && end >= endOfMonth;
    if (fullMonth) return fullMonthlyIncome;

    const totalWorkdays = workingDays(startOfMonth, endOfMonth);
    const activeWorkdays = workingDaysOverlap(start, end, startOfMonth, endOfMonth);
    if (activeWorkdays > 0 && totalWorkdays > 0) {
      return roundMoney(fullMonthlyIncome * activeWorkdays / totalWorkdays);
    }

    const activeDays = daysOverlap(start, end, startOfMonth, endOfMonth);
    return roundMoney(fullMonthlyIncome * activeDays / daysInMonth);
  }

  function allocateMoney(total, weights) {
    const sum = weights.reduce((value, weight) => value + weight, 0);
    if (sum <= 0) return weights.map(() => 0);

    let allocated = 0;
    const values = weights.map((weight, index) => {
      if (index === weights.length - 1) {
        return roundMoney(total - allocated);
      }
      const value = roundMoney(total * weight / sum);
      allocated = roundMoney(allocated + value);
      return value;
    });
    return values;
  }

  function buildRecords(config) {
    const records = [];

    for (let year = config.firstYear; year <= config.lastYear; year += 1) {
      const maxMonth = config.showThroughMonth[year] || 12;
      let cumulativeIncome = 0;
      let cumulativeStandardDeduction = 0;
      let cumulativeStatutory = 0;
      let cumulativeAdditional = 0;
      let cumulativeTaxPaid = 0;
      const cumulativeAdditionalItems = {};

      for (let month = 1; month <= maxMonth; month += 1) {
        const monthJobs = config.jobs
          .map((job) => ({ job, income: calcMonthlyIncome(job, year, month) }))
          .filter((item) => item.income > 0);

        const monthlyAdditionalItems = getAdditionalDeductions(config, year, month);
        const monthlyAdditional = monthlyAdditionalItems.reduce((sum, item) => sum + item.amount, 0);
        const monthlyIncome = roundMoney(monthJobs.reduce((sum, item) => sum + item.income, 0));
        const statutory = calcStatutoryDeductions(config, monthlyIncome, year, month);

        cumulativeIncome = roundMoney(cumulativeIncome + monthlyIncome);
        cumulativeStandardDeduction = roundMoney(cumulativeStandardDeduction + config.deductionPolicy.standardMonthly);
        cumulativeStatutory = roundMoney(cumulativeStatutory + statutory.total);
        cumulativeAdditional = roundMoney(cumulativeAdditional + monthlyAdditional);
        monthlyAdditionalItems.forEach((item) => {
          cumulativeAdditionalItems[item.name] = roundMoney((cumulativeAdditionalItems[item.name] || 0) + item.amount);
        });

        const taxableIncome = roundMoney(cumulativeIncome - cumulativeStandardDeduction - cumulativeStatutory - cumulativeAdditional);
        const taxMeta = calcTaxMeta(taxableIncome);
        const cumulativeTax = taxMeta.tax;
        const tax = roundMoney(Math.max(0, cumulativeTax - cumulativeTaxPaid));
        const cumulativeTaxPaidBefore = cumulativeTaxPaid;
        cumulativeTaxPaid = roundMoney(cumulativeTaxPaid + tax);

        if (monthJobs.length > 0) {
          const taxParts = allocateMoney(tax, monthJobs.map((item) => item.income));
          const standardParts = allocateMoney(config.deductionPolicy.standardMonthly, monthJobs.map((item) => item.income));
          const statutoryParts = allocateMoney(statutory.total, monthJobs.map((item) => item.income));
          const additionalParts = allocateMoney(monthlyAdditional, monthJobs.map((item) => item.income));

          monthJobs.forEach((monthJob, index) => {
            const split = monthJobs.length > 1;
            const splitId = split ? `-${monthJob.job.companyId}` : "";
            const splitStatutory = {
              base: roundMoney(statutory.base * monthJob.income / monthlyIncome),
              pension: roundMoney(statutory.pension * monthJob.income / monthlyIncome),
              medical: roundMoney(statutory.medical * monthJob.income / monthlyIncome),
              unemployment: roundMoney(statutory.unemployment * monthJob.income / monthlyIncome),
              housingFund: roundMoney(statutory.housingFund * monthJob.income / monthlyIncome),
              total: statutoryParts[index],
            };

          records.push({
            id: `salary-${year}-${padMonth(month)}${splitId}`,
            type: "salary",
            category: "工资薪金",
            subcategory: "正常工资薪金",
            year,
            month,
            order: index,
            period: `${year}-${padMonth(month)}`,
            declarationDate: declarationDate(config, year, month),
            company: config.companies[monthJob.job.companyId],
            income: roundMoney(monthJob.income),
            tax: taxParts[index],
            details: {
              standardDeduction: standardParts[index],
              statutory: splitStatutory,
              additionalItems: monthlyAdditionalItems.map((item) => ({
                name: item.name,
                amount: roundMoney(item.amount * monthJob.income / monthlyIncome),
              })),
              additionalTotal: additionalParts[index],
              taxableIncome,
              cumulativeIncome,
              cumulativeExemptIncome: 0,
              cumulativeStandardDeduction,
              cumulativeStatutory,
              cumulativeAdditional,
              cumulativeAdditionalItems: Object.keys(cumulativeAdditionalItems).map((name) => ({
                name,
                amount: cumulativeAdditionalItems[name],
              })),
              cumulativeOtherDeduction: 0,
              cumulativePension: 0,
              cumulativeDonation: 0,
              cumulativeTax,
              cumulativeTaxRate: taxMeta.rate,
              cumulativeQuickDeduction: taxMeta.quick,
              cumulativeTaxPaidBefore,
              cumulativeTaxPaid,
              monthlyTotalIncome: monthlyIncome,
              splitMonth: split,
            },
          });
          });
        }

        config.bonuses
          .filter((bonus) => bonus.year === year && bonus.month === month)
          .forEach((bonus) => {
            const amount = roundMoney(bonus.salaryBase * bonus.months);
            const bonusMeta = calcBonusMeta(amount);
            records.push({
              id: bonus.id,
              type: "bonus",
              category: "工资薪金",
              subcategory: "全年一次性奖金收入",
              year,
              month,
              order: -1,
              period: `${year}-${padMonth(month)}`,
              declarationDate: bonus.declarationDate,
              company: config.companies[bonus.companyId],
              income: amount,
              tax: bonusMeta.tax,
              details: {
                bonusMonths: bonus.months,
                monthlyAverage: bonusMeta.monthlyAverage,
                taxRate: bonusMeta.rate,
                quickDeduction: bonusMeta.quick,
              },
            });
          });
      }
    }

    return records.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.month !== b.month) return b.month - a.month;
      if (a.type !== b.type) return a.type === "bonus" ? -1 : 1;
      if (a.order !== b.order) return a.order - b.order;
      return a.id.localeCompare(b.id);
    });
  }

  function summarizeYear(records, year) {
    const yearRecords = records.filter((record) => record.year === year);
    return {
      income: roundMoney(yearRecords.reduce((sum, record) => sum + record.income, 0)),
      tax: roundMoney(yearRecords.reduce((sum, record) => sum + record.tax, 0)),
      records: yearRecords,
    };
  }

  window.TaxCalculator = {
    buildRecords,
    summarizeYear,
    formatMoney,
    roundMoney,
    calcTaxMeta,
    calcBonusMeta,
  };
})();
