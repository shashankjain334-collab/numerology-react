import { useMemo, useState } from "react";
import pairDataEn from "./pairData.en.json";
import pairDataHi from "./pairData.hi.json";
import digitEffectsEn from "./digitEffects.en.json";
import digitEffectsHi from "./digitEffects.hi.json";
import { translations } from "./translations";

const ROOT_COMPATIBILITY_MAP = {
  "1": ["1", "5", "9"],
  "2": ["2", "7"],
  "3": ["3", "5", "6", "9"],
  "4": ["4", "5", "6", "8"],
  "5": ["1", "3", "5", "6"],
  "6": ["3", "4", "5", "6", "8", "9"],
  "7": ["2", "7", "9"],
  "8": ["4", "6", "8"],
  "9": ["1", "3", "6", "7", "9"],
};

function onlyDigits(value) {
  return (value || "").replace(/\D/g, "");
}

function digitalRootFromDigits(digits) {
  if (!digits) return "";
  let sum = digits.split("").reduce((a, b) => a + Number(b), 0);
  while (sum > 9) {
    sum = String(sum)
      .split("")
      .reduce((a, b) => a + Number(b), 0);
  }
  return String(sum);
}

function formatDobInput(value) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDob(raw) {
  const digits = onlyDigits(raw);
  if (digits.length !== 8) return null;
  const dd = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const yyyy = Number(digits.slice(4, 8));
  if (!dd || !mm || !yyyy || dd > 31 || mm > 12) return null;
  return { dd, mm, yyyy, digits };
}

function getNumberConfig(type, t) {
  if (type === "house") {
    return {
      label: t.houseLabel,
      placeholder: t.housePlaceholder,
      hint: t.houseHint,
      maxLength: 20,
    };
  }
  if (type === "car") {
    return {
      label: t.carLabel,
      placeholder: t.carPlaceholder,
      hint: t.carHint,
      maxLength: 4,
    };
  }
  return {
    label: t.mobileLabel,
    placeholder: t.mobilePlaceholder,
    hint: t.mobileHint,
    maxLength: 15,
  };
}

function getDigitsForAnalysis(rawDigits, analysisType) {
  if (analysisType === "mobile" || analysisType === "house") {
    return rawDigits.replace(/0/g, "");
  }
  return rawDigits;
}

function collapseSameConsecutiveDigits(numberString) {
  if (!numberString) return "";
  let output = numberString[0];
  for (let i = 1; i < numberString.length; i += 1) {
    if (numberString[i] !== numberString[i - 1]) {
      output += numberString[i];
    }
  }
  return output;
}

function buildPairs(rawDigits, analysisType) {
  const source = collapseSameConsecutiveDigits(getDigitsForAnalysis(rawDigits, analysisType));
  const seen = new Set();
  const pairs = [];
  for (let i = 0; i < source.length - 1; i += 1) {
    const pair = source.slice(i, i + 2);
    if (pair[0] === pair[1] || seen.has(pair)) continue;
    seen.add(pair);
    pairs.push(pair);
  }
  return pairs;
}

function findClusters(rawDigits) {
  if (!rawDigits) return [];
  const clusters = [];
  let count = 1;
  for (let i = 1; i <= rawDigits.length; i += 1) {
    if (i < rawDigits.length && rawDigits[i] === rawDigits[i - 1]) {
      count += 1;
    } else {
      if (count >= 3) clusters.push({ digit: rawDigits[i - 1], count });
      count = 1;
    }
  }
  return clusters;
}

function getRootLabel(analysisType, t) {
  if (analysisType === "mobile") return t.mobileRootLabel;
  if (analysisType === "house") return t.houseRootLabel;
  return t.carRootLabel;
}

function compatibilityMessage(moolank, numberRoot, analysisType, t) {
  const rootLabel = getRootLabel(analysisType, t);
  const directMatch = ROOT_COMPATIBILITY_MAP[moolank]?.includes(numberRoot);
  const reverseMatch = ROOT_COMPATIBILITY_MAP[numberRoot]?.includes(moolank);

  if (directMatch) {
    return {
      cls: "good",
      verdict: t.compatibilityGood(rootLabel, numberRoot, moolank),
      detail: t.compatibilityGoodDetail(rootLabel),
    };
  }
  if (reverseMatch) {
    return {
      cls: "mid",
      verdict: t.compatibilityMid(rootLabel, numberRoot, moolank),
      detail: t.compatibilityMidDetail,
    };
  }
  return {
    cls: "bad",
    verdict: t.compatibilityBad(rootLabel, numberRoot, moolank),
    detail: t.compatibilityBadDetail,
  };
}

export default function App() {
  const [language, setLanguage] = useState("en");
  const [dob, setDob] = useState("");
  const [analysisType, setAnalysisType] = useState("mobile");
  const [numberInput, setNumberInput] = useState("");
  const [moolank, setMoolank] = useState("-");
  const [bhagyank, setBhagyank] = useState("-");
  const [numberRoot, setNumberRoot] = useState("-");
  const [pairs, setPairs] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const t = translations[language];
  const pairData = language === "hi" ? pairDataHi : pairDataEn;
  const digitEffects = language === "hi" ? digitEffectsHi : digitEffectsEn;
  const numberConfig = useMemo(() => getNumberConfig(analysisType, t), [analysisType, t]);

  const message = useMemo(() => {
    if (!hasGenerated || moolank === "-" || numberRoot === "-") {
      return { cls: "mid", verdict: t.defaultVerdict, detail: t.defaultBox };
    }
    return compatibilityMessage(moolank, numberRoot, analysisType, t);
  }, [analysisType, hasGenerated, moolank, numberRoot, t]);

  const invalidateAnalysis = () => {
    setMoolank("-");
    setBhagyank("-");
    setNumberRoot("-");
    setPairs([]);
    setClusters([]);
    setHasGenerated(false);
  };

  const handleNumberInput = (value) => {
    invalidateAnalysis();
    if (analysisType === "house") {
      setNumberInput(value.slice(0, numberConfig.maxLength));
      return;
    }
    const digits = onlyDigits(value);
    if (analysisType === "car") {
      setNumberInput(digits.slice(-4));
      return;
    }
    setNumberInput(digits.slice(0, numberConfig.maxLength));
  };

  const resetAll = () => {
    setDob("");
    setAnalysisType("mobile");
    setNumberInput("");
    invalidateAnalysis();
  };

  const generateAnalysis = () => {
    const parsedDob = parseDob(dob);
    if (!parsedDob) {
      alert(t.invalidDobAlert);
      return;
    }

    const rawDigits = onlyDigits(numberInput);
    if ((analysisType === "mobile" && rawDigits.length < 10) || !rawDigits) {
      alert(t.invalidNumberAlert);
      return;
    }
    if (analysisType === "car" && rawDigits.length !== 4) {
      alert(t.invalidCarAlert);
      return;
    }

    const cleanedForAnalysis = getDigitsForAnalysis(rawDigits, analysisType);
    const localMoolank = digitalRootFromDigits(String(parsedDob.dd));
    const localBhagyank = digitalRootFromDigits(parsedDob.digits);
    const localRoot = digitalRootFromDigits(cleanedForAnalysis);

    setMoolank(localMoolank);
    setBhagyank(localBhagyank);
    setNumberRoot(localRoot);
    setPairs(buildPairs(cleanedForAnalysis, analysisType));
    setClusters(findClusters(cleanedForAnalysis));
    setHasGenerated(true);
  };

  const getPairMeaning = (pair) => pairData[pair] || t.noPairMeaning;

  const getDigitMeaning = (digit) => digitEffects[String(digit)] || t.noDigitMeaning;

  const getReportMarkup = () => {
    const pairCards = pairs.length
      ? pairs
          .map(
            (pair, idx) => `
              <article class="report-card">
                <div class="report-card-title">${t.pairPrefix} ${idx + 1}: ${pair}</div>
                <div class="report-card-meta">${t.pairMeta}</div>
                <p>${getPairMeaning(pair)}</p>
              </article>
            `,
          )
          .join("")
      : `
        <article class="report-card">
          <div class="report-card-title">${t.noAnalysis}</div>
          <div class="report-card-meta">${t.noAnalysisMeta}</div>
        </article>
      `;

    const clusterCards = clusters.length
      ? clusters
          .map(
            (cluster, idx) => `
              <article class="report-card">
                <div class="report-card-title">${t.clusterPrefix} ${idx + 1}: ${cluster.digit.repeat(cluster.count)}</div>
                <div class="report-card-meta">${t.clusterMeta}</div>
                <p>${getDigitMeaning(cluster.digit)}</p>
              </article>
            `,
          )
          .join("")
      : `
        <article class="report-card">
          <div class="report-card-title">${t.noPattern}</div>
          <div class="report-card-meta">${t.noPatternMeta}</div>
        </article>
      `;

    return `<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${t.reportTitle}</title>
    <style>
      :root {
        --ink: #2b2b2b;
        --muted: #6b5a48;
        --accent: #a04a2e;
        --paper: #fffdf9;
        --border: #e4d2bf;
        --good: #2a5b2c;
        --mid: #9a5a18;
        --bad: #9a1d1d;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        color: var(--ink);
        background: var(--paper);
      }
      .report {
        width: 100%;
        max-width: 960px;
        margin: 0 auto;
        padding: 32px 24px 40px;
      }
      .report-header {
        border-bottom: 2px solid var(--border);
        padding-bottom: 18px;
        margin-bottom: 24px;
      }
      .brand {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: var(--accent);
        text-transform: uppercase;
        margin: 0 0 6px;
      }
      .phone {
        margin: 0;
        color: var(--muted);
        font-size: 14px;
      }
      .report-title {
        margin: 18px 0 8px;
        font-size: 34px;
        line-height: 1.15;
      }
      .report-subtitle {
        margin: 0;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.6;
      }
      .section {
        margin-top: 24px;
        page-break-inside: avoid;
      }
      .section h2 {
        margin: 0 0 14px;
        font-size: 20px;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .metric-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .meta-item, .metric-item, .summary-box, .report-card {
        border: 1px solid var(--border);
        border-radius: 12px;
        background: #fff;
        padding: 14px 16px;
      }
      .label {
        display: block;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 6px;
      }
      .value {
        font-size: 18px;
        font-weight: 700;
        word-break: break-word;
      }
      .metric-item .value {
        font-size: 30px;
        color: var(--accent);
      }
      .summary-box {
        margin-top: 12px;
      }
      .verdict {
        font-size: 22px;
        font-weight: 800;
        line-height: 1.45;
      }
      .verdict.good { color: var(--good); }
      .verdict.mid { color: var(--mid); }
      .verdict.bad { color: var(--bad); }
      .insight {
        margin-top: 10px;
        line-height: 1.7;
      }
      .card-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .report-card-title {
        font-size: 15px;
        font-weight: 800;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .report-card-meta {
        margin-top: 6px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.55;
      }
      .report-card p {
        margin: 10px 0 0;
        line-height: 1.65;
        font-size: 14px;
      }
      @page {
        size: A4;
        margin: 12mm;
      }
      @media print {
        body {
          background: #fff;
        }
        .report {
          max-width: none;
          padding: 0;
        }
      }
      @media (max-width: 700px) {
        .meta-grid, .metric-grid, .card-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="report">
      <header class="report-header">
        <p class="brand">Bhagya Setu</p>
        <p class="phone">${t.phoneLabel}: +91 98765 43210</p>
        <h1 class="report-title">${t.reportTitle}</h1>
        <p class="report-subtitle">${t.reportSubtitle}</p>
      </header>

      <section class="section">
        <h2>${t.inputSummaryTitle}</h2>
        <div class="meta-grid">
          <div class="meta-item"><span class="label">${t.dobLabel}</span><span class="value">${dob || "-"}</span></div>
          <div class="meta-item"><span class="label">${t.analysisTypeValueLabel}</span><span class="value">${numberConfig.label}</span></div>
          <div class="meta-item"><span class="label">${t.inputNumberLabel}</span><span class="value">${numberInput || "-"}</span></div>
          <div class="meta-item"><span class="label">${getRootLabel(analysisType, t)}</span><span class="value">${numberRoot}</span></div>
        </div>
      </section>

      <section class="section">
        <h2>${t.coreValuesTitle}</h2>
        <div class="metric-grid">
          <div class="metric-item"><span class="label">${t.moolankLabel}</span><span class="value">${moolank}</span></div>
          <div class="metric-item"><span class="label">${t.bhagyankLabel}</span><span class="value">${bhagyank}</span></div>
          <div class="metric-item"><span class="label">${getRootLabel(analysisType, t)}</span><span class="value">${numberRoot}</span></div>
        </div>
      </section>

      <section class="section">
        <h2>${t.compatibilityTitle}</h2>
        <div class="summary-box">
          <div class="verdict ${message.cls}">${message.verdict}</div>
          <div class="insight">${message.detail}</div>
        </div>
      </section>

      <section class="section">
        <h2>${t.reportPairTitle}</h2>
        <div class="card-grid">${pairCards}</div>
      </section>

      <section class="section">
        <h2>${t.reportClusterTitle}</h2>
        <div class="card-grid">${clusterCards}</div>
      </section>
    </main>
  </body>
</html>`;
  };

  const printReport = () => {
    if (!hasGenerated) {
      alert(t.printFirstAlert);
      return;
    }

    const existingFrame = document.getElementById("report-print-frame");
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "report-print-frame";
    iframe.title = "Numerology Report Print Frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      iframe.remove();
      alert(t.printErrorAlert);
      return;
    }

    frameWindow.document.open();
    frameWindow.document.write(getReportMarkup());
    frameWindow.document.close();

    const triggerPrint = () => {
      frameWindow.focus();
      frameWindow.print();
      window.setTimeout(() => {
        iframe.remove();
      }, 1000);
    };

    iframe.onload = () => {
      window.setTimeout(triggerPrint, 300);
    };
  };

  const downloadReport = () => {
    if (!hasGenerated) {
      alert(t.downloadFirstAlert);
      return;
    }

    const blob = new Blob([getReportMarkup()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = t.reportFileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app">
      <section className="hero">
        <div className="top-brand-bar">
          <div className="brand-left">
            <p className="company-name">BHAGYA SETU</p>
            <p className="company-phone">{`${t.phoneLabel}: +91 98765 43210`}</p>
          </div>

          <label className="toggle-container" htmlFor="langToggle">
            <span className={`toggle-label ${language === "en" ? "active" : ""}`}>EN</span>
            <span className="switch">
              <input
                id="langToggle"
                type="checkbox"
                checked={language === "hi"}
                onChange={(e) => setLanguage(e.target.checked ? "hi" : "en")}
              />
              <span className="slider" />
            </span>
            <span className={`toggle-label ${language === "hi" ? "active" : ""}`}>HI</span>
          </label>
        </div>

        <div className="hero-card">
          <h1 className="title">{t.title}</h1>
          <p className="subtitle">{t.subtitle}</p>
          <div className="badge-row">
            {t.badges.map((badge) => (
              <span className="badge" key={badge}>
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="layout">
        <aside className="panel form-panel">
          <h2>{t.calculatorTitle}</h2>
          <div className="stack">
            <div>
              <label htmlFor="dob">{t.dobLabel}</label>
              <div className="date-field">
                <input
                  id="dob"
                  value={dob}
                  onChange={(e) => {
                    invalidateAnalysis();
                    setDob(formatDobInput(e.target.value));
                  }}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="DD/MM/YYYY"
                  autoComplete="bday"
                />
              </div>
              <div className="hint">{t.dobHint}</div>
            </div>

            <div>
              <label htmlFor="analysisType">{t.analysisTypeLabel}</label>
              <select
                id="analysisType"
                value={analysisType}
                onChange={(e) => {
                  invalidateAnalysis();
                  setAnalysisType(e.target.value);
                  setNumberInput("");
                }}
              >
                <option value="mobile">{t.mobileLabel}</option>
                <option value="house">{t.houseLabel}</option>
                <option value="car">{t.carLabel}</option>
              </select>
              <div className="hint">{t.analysisTypeHint}</div>
            </div>

            <div>
              <label htmlFor="numberInput">{numberConfig.label}</label>
              <input
                id="numberInput"
                value={numberInput}
                onChange={(e) => handleNumberInput(e.target.value)}
                placeholder={numberConfig.placeholder}
              />
              <div className="hint">{numberConfig.hint}</div>
              {analysisType === "mobile" && <div className="hint">{t.mobileRootHint}</div>}
            </div>

            <div className="button-row">
              <button type="button" className="primary" onClick={generateAnalysis}>
                {t.generateBtn}
              </button>
              <button type="button" className="secondary" onClick={downloadReport}>
                {t.downloadBtn}
              </button>
              <button type="button" className="secondary" onClick={printReport}>
                {t.printBtn}
              </button>
              <button type="button" className="secondary" onClick={resetAll}>
                {t.resetBtn}
              </button>
            </div>
          </div>

          <div className="metric-grid">
            <div className="metric">
              <span className="k">{t.moolankLabel}</span>
              <span className="v">{moolank}</span>
            </div>
            <div className="metric">
              <span className="k">{t.bhagyankLabel}</span>
              <span className="v">{bhagyank}</span>
            </div>
            <div className="metric">
              <span className="k">{getRootLabel(analysisType, t)}</span>
              <span className="v">{numberRoot}</span>
            </div>
          </div>

          <div className="foot">{t.foot}</div>
        </aside>

        <section className="result-grid">
          <div className="panel">
            <h2>{t.compatibilityTitle}</h2>
            <div className={`verdict ${message.cls}`}>{message.verdict}</div>
            <div className="section-title">{t.detailedInsightLabel}</div>
            <div className="box">{message.detail}</div>
          </div>

          <div className="panel" id="pairPanel">
            <h2>{t.pairPanelTitle}</h2>
            <div className="section-note">{t.pairNote}</div>
            <div className="pair-grid">
              {!pairs.length && (
                <div className="pair-card no-results">
                  <span className="pair-code">{t.noAnalysis}</span>
                  <span className="pair-meta">{t.noAnalysisMeta}</span>
                </div>
              )}
              {pairs.map((pair, idx) => (
                <div className="pair-card" key={`${pair}-${idx}`}>
                  <span className="pair-code">{`${t.pairPrefix} ${idx + 1}: ${pair}`}</span>
                  <span className="pair-meta">{t.pairMeta}</span>
                  <p>{getPairMeaning(pair)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" id="clusterPanel">
            <h2>{t.clusterPanelTitle}</h2>
            <div className="section-note">{t.clusterNote}</div>
            <div className="pair-grid">
              {!clusters.length && (
                <div className="pair-card no-results">
                  <span className="pair-code">{t.noPattern}</span>
                  <span className="pair-meta">{t.noPatternMeta}</span>
                </div>
              )}
              {clusters.map((cluster, idx) => (
                <div className="pair-card" key={`${cluster.digit}-${idx}`}>
                  <span className="pair-code">
                    {`${t.clusterPrefix} ${idx + 1}: ${cluster.digit.repeat(cluster.count)}`}
                  </span>
                  <span className="pair-meta">{t.clusterMeta}</span>
                  <p>{getDigitMeaning(cluster.digit)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
