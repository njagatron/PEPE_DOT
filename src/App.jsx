import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Text } from "react-konva";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function App() {
  const STORAGE_PREFIX = "pepedot_rn_";

  const [rnList, setRnList] = useState([]);
  const [activeRn, setActiveRn] = useState("");
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfFileName, setPdfFileName] = useState("");
  const [background, setBackground] = useState(null);
  const [points, setPoints] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stageSize, setStageSize] = useState({ width: 960, height: 600 });
  const [bgFit, setBgFit] = useState({ w: 960, h: 600, x: 0, y: 0, scaleX: 1, scaleY: 1 });

  const stageRef = useRef();
  const exportRef = useRef();

  const deco = {
    bg: "#0d1f24",
    card: "#10282f",
    edge: "#12343b",
    ink: "#e7ecef",
    gold: "#c9a227",
    accent: "#2a6f77",
  };

  const appWrap = {
    minHeight: "100vh",
    background: `linear-gradient(180deg, ${deco.bg} 0%, #0b181c 100%)`,
    color: deco.ink,
    fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif",
  };

  const container = { maxWidth: 1180, margin: "0 auto", padding: 16 };

  const panel = {
    background: deco.card,
    border: `1px solid ${deco.edge}`,
    borderRadius: 14,
    padding: 12,
    boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 6px 24px rgba(0,0,0,0.25)",
  };

  const btn = {
    base: {
      padding: "8px 12px",
      borderRadius: 10,
      border: `1px solid ${deco.edge}`,
      background: "#0f2328",
      color: deco.ink,
      cursor: "pointer",
      transition: "transform .04s ease",
    },
    primary: { background: deco.accent, borderColor: deco.accent, color: "#fff" },
    gold: { background: deco.gold, borderColor: deco.gold, color: "#1a1a1a" },
    warn: { background: "#d99114", borderColor: "#d99114" },
    danger: { background: "#a62c2b", borderColor: "#a62c2b" },
    ghost: { background: "transparent" },
  };

  const chip = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    background: "#0c2126",
    border: `1px solid ${deco.edge}`,
    color: deco.gold,
    fontWeight: 600,
    letterSpacing: 0.4,
  };

  useEffect(() => {
    const savedList = JSON.parse(localStorage.getItem("pepedot_rn_list") || "[]");
    const savedActive = localStorage.getItem("pepedot_active_rn") || "";
    setRnList(savedList);
    if (savedActive && savedList.includes(savedActive)) loadRn(savedActive);
  }, []);

  useEffect(() => {
    const onResize = () => {
      const w = Math.min(window.innerWidth - 24, 1180);
      const h = Math.max(420, Math.round(window.innerHeight * 0.6));
      setStageSize({ width: w, height: h });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setBgFit(fitBackground(background, stageSize.width, stageSize.height));
  }, [background, stageSize]);

  useEffect(() => {
    if (activeRn) saveRn(activeRn);
  }, [points, pdfFileName, currentPage]);

  const fitBackground = (img, w, h) => {
    if (!img) return { w, h, x: 0, y: 0, scaleX: 1, scaleY: 1 };
    const iw = img.width;
    const ih = img.height;
    const scale = Math.min(w / iw, h / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    const x = (w - drawW) / 2;
    const y = (h - drawH) / 2;
    return { w: drawW, h: drawH, x, y, scaleX: drawW / iw, scaleY: drawH / ih };
  };

  const emptyRnState = () => ({ pdfFileName: "", currentPage: 1, points: [], pdfData: null });

  const loadRn = (rn) => {
    const raw = localStorage.getItem(STORAGE_PREFIX + rn);
    const data = raw ? JSON.parse(raw) : emptyRnState();
    setActiveRn(rn);
    localStorage.setItem("pepedot_active_rn", rn);
    setPdfFileName(data.pdfFileName || "");
    setCurrentPage(data.currentPage || 1);
    setPoints(data.points || []);
    if (data.pdfData) {
      loadPdfFromData(new Uint8Array(data.pdfData));
    } else {
      setPdfDoc(null);
      setBackground(null);
      setTotalPages(1);
    }
  };

  const saveRn = (rn, overridePdfData = null) => {
    const payload = { pdfFileName, currentPage, points };
    if (overridePdfData !== null) payload.pdfData = Array.from(overridePdfData);
    localStorage.setItem(STORAGE_PREFIX + rn, JSON.stringify(payload));
    if (!rnList.includes(rn)) {
      const updated = [...rnList, rn];
      setRnList(updated);
      localStorage.setItem("pepedot_rn_list", JSON.stringify(updated));
    }
  };

  const createRn = () => {
    const next = `RN${String((rnList.length || 0) + 1).padStart(3, "0")}`;
    const updated = [...rnList, next];
    setRnList(updated);
    localStorage.setItem("pepedot_rn_list", JSON.stringify(updated));
    setActiveRn(next);
    localStorage.setItem("pepedot_active_rn", next);
    setPdfDoc(null);
    setBackground(null);
    setPdfFileName("");
    setPoints([]);
    setCurrentPage(1);
    setTotalPages(1);
    saveRn(next);
  };

  const deleteRn = (rn) => {
    if (!window.confirm(`Obrisati ${rn}?`)) return;
    localStorage.removeItem(STORAGE_PREFIX + rn);
    const updated = rnList.filter((x) => x !== rn);
    setRnList(updated);
    localStorage.setItem("pepedot_rn_list", JSON.stringify(updated));
    if (activeRn === rn) {
      setActiveRn("");
      localStorage.removeItem("pepedot_active_rn");
      setPdfDoc(null);
      setBackground(null);
      setPdfFileName("");
      setPoints([]);
      setCurrentPage(1);
      setTotalPages(1);
    }
  };

  const getTodayDateSuffix = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}${mm}${dd}`;
  };

  const renderPdfPage = async (pdf, pageNum) => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const img = new window.Image();
    img.src = canvas.toDataURL();
    img.onload = () => setBackground(img);
  };

  const loadPdfFromData = async (uint8) => {
    const pdf = await pdfjsLib.getDocument(uint8).promise;
    setPdfDoc(pdf);
    setTotalPages(pdf.numPages);
    await renderPdfPage(pdf, 1);
    setCurrentPage(1);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;
    setPdfFileName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const uint8 = new Uint8Array(reader.result);
      await loadPdfFromData(uint8);
      if (activeRn) saveRn(activeRn, uint8);
    };
    reader.readAsArrayBuffer(file);
  };

  const changePage = async (dir) => {
    if (!pdfDoc) return;
    const next = Math.min(Math.max(1, currentPage + dir), totalPages);
    setCurrentPage(next);
    await renderPdfPage(pdfDoc, next);
  };

  const toCanvasCoords = () => {
    const p = stageRef.current.getStage().getPointerPosition();
    if (!p) return { x: 0, y: 0 };
    const { x, y, scaleX, scaleY } = bgFit;
    return { x: (p.x - x) / scaleX, y: (p.y - y) / scaleY };
    };

  const handleAddPoint = async () => {
    if (!background) return;
    const photoFile = await new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (ev) => resolve(ev.target.files?.[0]);
      input.click();
    });
    if (!photoFile) return;
    const base = window.prompt("Unesi naziv točke (npr. A233VIO):");
    if (!base) return;
    const comment = window.prompt("Unesi komentar (opcionalno):") || "";
    const full = `${base}${getTodayDateSuffix()}`;
    const reader = new FileReader();
    reader.onload = () => {
      const { x, y } = toCanvasCoords();
      const pt = { x, y, image: reader.result, name: full, comment, page: currentPage };
      setPoints((prev) => [...prev, pt]);
    };
    reader.readAsDataURL(photoFile);
  };

  const handleStageClick = () => handleAddPoint();

  const editPoint = (idx) => {
    const copy = [...points];
    const p = copy[idx];
    const newName = window.prompt("Uredi naziv točke:", p.name);
    if (newName !== null && newName.trim() !== "") p.name = newName.trim();
    const newComment = window.prompt("Uredi komentar:", p.comment ?? "");
    if (newComment !== null) p.comment = newComment;
    setPoints(copy);
  };

  const deletePoint = (idx) => {
    if (!window.confirm("Obrisati ovu točku?")) return;
    const copy = [...points];
    copy.splice(idx, 1);
    setPoints(copy);
  };

  const exportPDF = async () => {
    const node = exportRef.current;
    const canvas = await html2canvas(node);
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    pdf.addImage(img, "PNG", 6, 6, pw - 12, ph - 12);
    pdf.save("nacrt_s_tockama.pdf");
  };

  const exportExcel = () => {
    const data = points.map((p, i) => ({
      RedniBroj: i + 1,
      Naziv: p.name,
      Komentar: p.comment || "",
      X: Math.round(p.x),
      Y: Math.round(p.y),
      Stranica: p.page,
      RN: activeRn || "",
      Nacrt: pdfFileName || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tocke");
    XLSX.writeFile(wb, "tocke.xlsx");
  };

  return (
    <div style={appWrap}>
      <div style={container}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: deco.gold,
                display: "grid",
                placeItems: "center",
                color: "#1b1b1b",
                fontWeight: 800,
                letterSpacing: 1,
              }}
            >
              P
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>PEPEDOT</div>
              <div style={{ fontSize: 12, color: "#b7c3c8" }}>Protupožarno brtvljenje · foto → točka na nacrtu</div>
            </div>
          </div>
          <div style={{ ...chip, borderColor: deco.gold }}>Art-Deco Minimal</div>
        </header>

        <section style={{ ...panel, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button style={{ ...btn.base, ...btn.primary }} onClick={createRn}>+ Novi RN</button>
            <span style={{ fontSize: 12, color: "#b9c6ca" }}>
              Aktivni RN: {activeRn ? <strong style={{ color: deco.gold, marginLeft: 4 }}>{activeRn}</strong> : "nema"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {rnList.map((rn) => (
              <div key={rn} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  style={{ ...btn.base, ...(rn === activeRn ? btn.gold : btn.ghost) }}
                  onClick={() => loadRn(rn)}
                >
                  {rn}
                </button>
                <button style={{ ...btn.base, ...btn.danger }} onClick={() => deleteRn(rn)}>Obriši</button>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...panel, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfUpload}
              style={{
                padding: 6,
                background: "#0f2328",
                border: `1px solid ${deco.edge}`,
                borderRadius: 10,
                color: deco.ink,
              }}
            />
            {pdfFileName && (
              <span style={{ fontSize: 12, color: "#c7d3d7" }}>
                Nacrt: <strong style={{ color: deco.gold }}>{pdfFileName}</strong>
              </span>
            )}
            {pdfDoc && (
              <>
                <button style={{ ...btn.base }} onClick={() => changePage(-1)}>◀</button>
                <span style={{ fontSize: 12, color: "#c7d3d7" }}>
                  Stranica: <strong>{currentPage}</strong> / {totalPages}
                </span>
                <button style={{ ...btn.base }} onClick={() => changePage(1)}>▶</button>
              </>
            )}
            <div style={{ flex: 1 }} />
            <button style={{ ...btn.base }} onClick={exportExcel}>Izvoz Excel</button>
            <button style={{ ...btn.base, ...btn.gold }} onClick={exportPDF}>Izvoz PDF</button>
          </div>
        </section>

        <section ref={exportRef} style={{ ...panel, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, letterSpacing: 0.6 }}>Tlocrt</div>
            <div style={{ fontSize: 12, color: "#9fb2b8" }}>
              {activeRn && <span style={{ marginRight: 12 }}>RN: <strong style={{ color: deco.gold }}>{activeRn}</strong></span>}
              {pdfFileName && <span>Datoteka: <strong style={{ color: deco.gold }}>{pdfFileName}</strong></span>}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${deco.edge}` }} />
          <div style={{ padding: 10 }}>
            <div
              className="stage-wrap"
              style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${deco.edge}` }}
              onDoubleClick={handleAddPoint}
              title="Klik za dodati točku (ili dvoklik)"
            >
              <Stage width={stageSize.width} height={stageSize.height} ref={stageRef} onClick={handleStageClick}>
                <Layer>
                  {background && (
                    <KonvaImage
                      image={background}
                      x={bgFit.x}
                      y={bgFit.y}
                      width={bgFit.w}
                      height={bgFit.h}
                      listening={false}
                    />
                  )}
                  {points
                    .filter((p) => p.page === currentPage)
                    .map((p, i) => {
                      const px = bgFit.x + p.x * bgFit.scaleX;
                      const py = bgFit.y + p.y * bgFit.scaleY;
                      return (
                        <React.Fragment key={`${p.name}-${i}`}>
                          <Circle x={px} y={py} radius={6} fill={deco.gold} />
                          <Text x={px + 8} y={py - 6} text={p.name} fontSize={14} fill="#ffffff" />
                        </React.Fragment>
                      );
                    })}
                </Layer>
              </Stage>
            </div>
          </div>
        </section>

        <section style={{ ...panel, marginTop: 12 }}>
          <div style={{ fontWeight: 700, letterSpacing: 0.6, marginBottom: 8 }}>Fotografije na ovoj stranici</div>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            {points
              .filter((p) => p.page === currentPage)
              .map((p, i) => {
                const idx = points.findIndex((q) => q === p);
                return (
                  <div key={i} style={{ ...panel, background: "#0f2328" }}>
                    <img
                      src={p.image}
                      alt={p.name}
                      style={{ width: "100%", height: "auto", borderRadius: 10, border: `1px solid ${deco.edge}` }}
                    />
                    <div style={{ marginTop: 8, fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "#9fb2b8" }}>
                      X: {Math.round(p.x)}, Y: {Math.round(p.y)} · Str: {p.page}
                    </div>
                    {p.comment && <div style={{ fontSize: 12, color: "#c7d3d7", marginTop: 4 }}>Komentar: {p.comment}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button style={{ ...btn.base, ...btn.warn }} onClick={() => editPoint(idx)}>Uredi</button>
                      <button style={{ ...btn.base, ...btn.danger }} onClick={() => deletePoint(idx)}>Obriši</button>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        <footer style={{ textAlign: "center", fontSize: 12, color: "#8ea3a9", padding: 16 }}>
          © {new Date().getFullYear()} PEPEDOT · Protupožarno brtvljenje
        </footer>
      </div>
    </div>
  );
}
