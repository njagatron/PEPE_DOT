import React, { useEffect, useRef, useState, useMemo } from "react";
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

  const [pdfs, setPdfs] = useState([]); // [{id, name, data:Array<number>, numPages}]
  const [activePdfIdx, setActivePdfIdx] = useState(0);
  const [pdfDoc, setPdfDoc] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [background, setBackground] = useState(null);

  // points: [{x,y,image,name,comment,originalName,dateISO,pdfIdx,page,source,sessionId}]
  const [points, setPoints] = useState([]);

  const [stageSize, setStageSize] = useState({ width: 960, height: 600 });
  const [bgFit, setBgFit] = useState({ w: 960, h: 600, x: 0, y: 0, scaleX: 1, scaleY: 1 });

  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const sessionId = useMemo(() => Date.now(), []);

  const stageRef = useRef(null);
  const exportRef = useRef(null);

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
    },
    primary: { background: deco.accent, borderColor: deco.accent, color: "#fff" },
    gold: { background: deco.gold, borderColor: deco.gold, color: "#1a1a1a" },
    warn: { background: "#d99114", borderColor: "#d99114", color: "#fff" },
    danger: { background: "#a62c2b", borderColor: "#a62c2b", color: "#fff" },
    ghost: { background: "transparent" },
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
    if (!activeRn) return;
    const payload = { pdfs, activePdfIdx, currentPage, points };
    localStorage.setItem(STORAGE_PREFIX + activeRn, JSON.stringify(payload));
  }, [pdfs, activePdfIdx, currentPage, points, activeRn]);

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

  const emptyRnState = () => ({
    pdfs: [],
    activePdfIdx: 0,
    currentPage: 1,
    points: [],
  });

  const loadRn = (rn) => {
    const raw = localStorage.getItem(STORAGE_PREFIX + rn);
    const data = raw ? JSON.parse(raw) : emptyRnState();
    setActiveRn(rn);
    localStorage.setItem("pepedot_active_rn", rn);
    setPdfs(data.pdfs || []);
    setActivePdfIdx(data.activePdfIdx || 0);
    setCurrentPage(data.currentPage || 1);
    setPoints(data.points || []);
    if ((data.pdfs || []).length) {
      loadPdfFromData(new Uint8Array(data.pdfs[data.activePdfIdx || 0].data), data.currentPage || 1);
    } else {
      setPdfDoc(null);
      setBackground(null);
    }
    setShowAllSessions(false);
  };

  const createRn = () => {
    const name = (window.prompt("Unesi naziv novog RN-a (npr. RN001 ili RN1-KAT):") || "").trim();
    if (!name) return;
    if (rnList.includes(name)) {
      window.alert("RN s tim nazivom već postoji.");
      return;
    }
    const updated = [...rnList, name];
    setRnList(updated);
    localStorage.setItem("pepedot_rn_list", JSON.stringify(updated));
    setActiveRn(name);
    localStorage.setItem("pepedot_active_rn", name);
    const init = emptyRnState();
    localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(init));
    setPdfs(init.pdfs);
    setActivePdfIdx(init.activePdfIdx);
    setCurrentPage(init.currentPage);
    setPoints(init.points);
    setPdfDoc(null);
    setBackground(null);
    setShowAllSessions(false);
  };

  const renameRn = () => {
    if (!activeRn) return;
    const newName = (window.prompt("Novi naziv za RN:", activeRn) || "").trim();
    if (!newName || newName === activeRn) return;
    if (rnList.includes(newName)) {
      window.alert("RN s tim nazivom već postoji.");
      return;
    }
    const oldKey = STORAGE_PREFIX + activeRn;
    const data = localStorage.getItem(oldKey);
    if (data) {
      localStorage.setItem(STORAGE_PREFIX + newName, data);
      localStorage.removeItem(oldKey);
    }
    const updated = rnList.map((r) => (r === activeRn ? newName : r));
    setRnList(updated);
    localStorage.setItem("pepedot_rn_list", JSON.stringify(updated));
    setActiveRn(newName);
    localStorage.setItem("pepedot_active_rn", newName);
  };

  const deleteRn = (rn) => {
    localStorage.removeItem(STORAGE_PREFIX + rn);
    const updated = rnList.filter((x) => x !== rn);
    setRnList(updated);
    localStorage.setItem("pepedot_rn_list", JSON.stringify(updated));
    if (activeRn === rn) {
      setActiveRn("");
      localStorage.removeItem("pepedot_active_rn");
      setPdfs([]);
      setActivePdfIdx(0);
      setCurrentPage(1);
      setPoints([]);
      setPdfDoc(null);
      setBackground(null);
    }
  };

  const deleteRnWithConfirm = (rnName) => {
    const confirmation = window.prompt(`Za brisanje RN-a upišite njegov naziv: "${rnName}"`);
    if (confirmation !== rnName) {
      window.alert("Naziv RN-a nije ispravan, brisanje otkazano.");
      return;
    }
    if (!window.confirm(`Jeste li sigurni da želite obrisati RN "${rnName}"?`)) return;
    deleteRn(rnName);
  };

  const renderPdfPage = async (pdf, pageNum) => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const img = new Image();
    img.src = canvas.toDataURL("image/png");
    img.onload = () => setBackground(img);
  };

  const loadPdfFromData = async (uint8, pageNum = 1) => {
    const pdf = await pdfjsLib.getDocument({ data: uint8 }).promise;
    setPdfDoc(pdf);
    await renderPdfPage(pdf, pageNum);
  };

  const addPdf = async (file) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const uint8 = new Uint8Array(reader.result);
      const pdf = await pdfjsLib.getDocument({ data: uint8 }).promise;
      const item = {
        id: Date.now(),
        name: file.name || "tlocrt.pdf",
        data: Array.from(uint8),
        numPages: pdf.numPages,
      };
      const next = [...pdfs, item];
      setPdfs(next);
      setActivePdfIdx(next.length - 1);
      setCurrentPage(1);
      setPdfDoc(pdf);
      await renderPdfPage(pdf, 1);
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await addPdf(file);
    e.target.value = "";
  };

  const selectPdf = async (idx) => {
    if (idx < 0 || idx >= pdfs.length) return;
    setActivePdfIdx(idx);
    setCurrentPage(1);
    await loadPdfFromData(new Uint8Array(pdfs[idx].data), 1);
  };

  const renamePdf = (idx) => {
    const p = pdfs[idx];
    const newName = (window.prompt("Novi naziv PDF-a:", p.name) || "").trim();
    if (!newName) return;
    const next = [...pdfs];
    next[idx] = { ...p, name: newName };
    setPdfs(next);
  };

  const deletePdf = (idx) => {
    const delId = idx;
    const filteredPoints = points
      .filter((pt) => pt.pdfIdx !== delId)
      .map((pt) => ({ ...pt, pdfIdx: pt.pdfIdx > delId ? pt.pdfIdx - 1 : pt.pdfIdx }));
    const nextPdfs = pdfs.filter((_, i) => i !== delId);
    setPoints(filteredPoints);
    setPdfs(nextPdfs);
    if (nextPdfs.length === 0) {
      setActivePdfIdx(0);
      setCurrentPage(1);
      setPdfDoc(null);
      setBackground(null);
    } else {
      const nextIdx = Math.max(0, delId - 1);
      selectPdf(nextIdx);
    }
  };

  const deletePdfWithConfirm = (idx) => {
    const p = pdfs[idx];
    if (!p) return;
    const confirmation = window.prompt(`Za brisanje PDF-a upišite njegov naziv: "${p.name}"`);
    if (confirmation !== p.name) {
      window.alert("Naziv PDF-a nije ispravan, brisanje otkazano.");
      return;
    }
    if (!window.confirm(`Jeste li sigurni da želite obrisati PDF "${p.name}"? (obrisat će se i točke s njega)`)) return;
    deletePdf(idx);
  };

  const changePage = async (dir) => {
    if (!pdfDoc || !pdfs.length) return;
    const total = pdfs[activePdfIdx].numPages || 1;
    const next = Math.min(Math.max(1, currentPage + dir), total);
    setCurrentPage(next);
    await renderPdfPage(pdfDoc, next);
  };

  const toCanvasCoords = () => {
    const st = stageRef.current && stageRef.current.getStage();
    const p = st && st.getPointerPosition();
    if (!p) return { x: 0, y: 0 };
    const { x, y, scaleX, scaleY } = bgFit;
    return { x: (p.x - x) / scaleX, y: (p.y - y) / scaleY };
  };

  const pickPhoto = (preferCamera = false) =>
    new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      if (preferCamera) input.capture = "environment";
      input.onchange = (ev) => resolve(ev.target.files?.[0] || null);
      input.click();
    });

  const getTodayDateSuffix = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}${mm}${dd}`;
  };

  const addPointWithPhoto = async (preferCamera) => {
    if (!pdfs.length || !pdfDoc) {
      window.alert("Prvo učitaj PDF u aktivni RN.");
      return;
    }
    const file = await pickPhoto(preferCamera);
    if (!file) return;
    const base = window.prompt("Unesi naziv točke (npr. A233VIO):");
    if (!base) return;
    const comment = window.prompt("Unesi komentar (opcionalno):") || "";
    const full = `${base}${getTodayDateSuffix()}`;
    const dateISO = new Date().toISOString().slice(0, 10);
    const source = preferCamera ? "captured" : "uploaded";

    const reader = new FileReader();
    reader.onload = () => {
      const { x, y } = toCanvasCoords();
      const pt = {
        x,
        y,
        image: reader.result,
        name: full,
        comment,
        originalName: file.name || "camera.jpg",
        dateISO,
        pdfIdx: activePdfIdx,
        page: currentPage,
        source,
        sessionId,
      };
      setPoints((prev) => [...prev, pt]);
    };
    reader.readAsDataURL(file);
  };

  const editPoint = (idx) => {
    const copy = [...points];
    const p = copy[idx];
    const newName = window.prompt("Uredi naziv točke:", p.name);
    if (newName !== null && newName.trim() !== "") p.name = newName.trim();
    const newComment = window.prompt("Uredi komentar:", p.comment || "");
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
    if (!node) return;
    const canvas = await html2canvas(node);
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    pdf.addImage(img, "PNG", 6, 6, pw - 12, ph - 12);
    pdf.save("nacrt_s_tockama.pdf");
  };

  const exportExcel = () => {
    const list = points
      .filter((p) => pdfs[p.pdfIdx])
      .filter((p) => (showAllSessions ? true : p.sessionId === sessionId));
    const data = list.map((p, i) => ({
      ID: i + 1,
      NazivTocke: p.name,
      NazivFotografije: p.originalName || "",
      Datum: p.dateISO || "",
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
              <div style={{ fontSize: 12, color: "#b7c3c8" }}>PP BRTVLJENJE - FOTOTOČKA NANACRTU</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={{ ...btn.base, ...btn.primary }} onClick={createRn}>+ Novi RN</button>
            <button style={{ ...btn.base }} onClick={renameRn} disabled={!activeRn}>Preimenuj RN</button>
          </div>
        </header>

        <section style={{ ...panel, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
                <button style={{ ...btn.base, ...btn.danger }} onClick={() => deleteRnWithConfirm(rn)}>Obriši</button>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...panel, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handlePdfUpload}
              style={{ padding: 6, background: "#0f2328", border: `1px solid ${deco.edge}`, borderRadius: 10, color: deco.ink }}
            />
            {!!pdfs.length && (
              <>
                <span style={{ fontSize: 12, color: "#c7d3d7" }}>
                  Aktivni PDF: <strong style={{ color: deco.gold }}>{pdfs[activePdfIdx]?.name}</strong>
                </span>
                <button style={{ ...btn.base }} onClick={() => renamePdf(activePdfIdx)} disabled={!pdfs.length}>Preimenuj PDF</button>
                <button style={{ ...btn.base, ...btn.danger }} onClick={() => deletePdfWithConfirm(activePdfIdx)} disabled={!pdfs.length}>Obriši PDF</button>
              </>
            )}
            <div style={{ flex: 1 }} />
            <button style={{ ...btn.base }} onClick={() => setShowAllSessions((s) => !s)}>
              {showAllSessions ? "Prikaži samo novu sesiju" : "Prikaži sve sesije"}
            </button>
            <button style={{ ...btn.base }} onClick={exportExcel}>Izvoz Excel</button>
            <button style={{ ...btn.base, ...btn.gold }} onClick={exportPDF}>Izvoz PDF</button>
          </div>

          {!!pdfs.length && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {pdfs.map((p, i) => (
                <button
                  key={p.id}
                  style={{ ...btn.base, ...(i === activePdfIdx ? btn.gold : btn.ghost) }}
                  onClick={() => selectPdf(i)}
                >
                  {p.name} ({p.numPages} str.)
                </button>
              ))}
            </div>
          )}
        </section>

        <section ref={exportRef} style={{ ...panel, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, letterSpacing: 0.6 }}>Tlocrt</div>
            <div style={{ fontSize: 12, color: "#9fb2b8" }}>
              {activeRn && <span style={{ marginRight: 12 }}>RN: <strong style={{ color: deco.gold }}>{activeRn}</strong></span>}
              {!!pdfs.length && <span>Datoteka: <strong style={{ color: deco.gold }}>{pdfs[activePdfIdx]?.name}</strong></span>}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${deco.edge}` }} />
          <div style={{ padding: 10 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <button style={{ ...btn.base, ...btn.primary }} onClick={() => addPointWithPhoto(true)}>📷 Nova točka (kamera)</button>
              <button style={{ ...btn.base }} onClick={() => addPointWithPhoto(false)}>📁 Nova točka (iz galerije)</button>
              <div style={{ fontSize: 11, color: "#9fb2b8", alignSelf: "center" }}>
                Hint: Tapni na tlocrt ili koristi gumb za dodavanje točke s fotografijom.
              </div>
              {!!pdfs.length && (
                <>
                  <button style={{ ...btn.base }} onClick={() => changePage(-1)}>◀</button>
                  <span style={{ fontSize: 12, color: "#c7d3d7" }}>
                    Stranica: <strong>{currentPage}</strong> / {pdfs[activePdfIdx]?.numPages || 1}
                  </span>
                  <button style={{ ...btn.base }} onClick={() => changePage(1)}>▶</button>
                </>
              )}
            </div>

            <div
              style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${deco.edge}` }}
              onDoubleClick={() => addPointWithPhoto(true)}
              title="Tapni ili dvoklikni na tlocrt da dodaš točku s fotografijom"
            >
              <Stage
                width={stageSize.width}
                height={stageSize.height}
                ref={stageRef}
                onClick={() => addPointWithPhoto(true)}
              >
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
                    .filter((p) => p.pdfIdx === activePdfIdx && p.page === currentPage)
                    .filter((p) => (showAllSessions ? true : p.sessionId === sessionId))
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
          <div style={{ fontWeight: 700, letterSpacing: 0.6, marginBottom: 8 }}>
            Fotografije (lista — klik na ikonu za pregled)
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {points
              .filter((p) => p.pdfIdx === activePdfIdx && p.page === currentPage)
              .filter((p) => (showAllSessions ? true : p.sessionId === sessionId))
              .map((p, i) => {
                const idx = points.findIndex((q) => q === p);
                const downloadName = `${p.source || "photo"}_${p.originalName || "photo.jpg"}`;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: `1px solid ${deco.edge}`, borderRadius: 10, padding: "8px 10px", background: "#0f2328" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button style={{ ...btn.base }} onClick={() => setPreviewPhoto(p)} title="Pregled fotografije">🔍</button>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "#9fb2b8" }}>
                        {p.originalName} · {p.dateISO} · {p.source === "captured" ? "kamera" : "galerija"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <a href={p.image} download={downloadName} style={{ ...btn.base, ...btn.ghost, textDecoration: "none" }} title="Preuzmi fotografiju">⬇️</a>
                      <button style={{ ...btn.base, ...btn.warn }} onClick={() => editPoint(idx)}>Uredi</button>
                      <button style={{ ...btn.base, ...btn.danger }} onClick={() => deletePoint(idx)}>Obriši</button>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {previewPhoto && (
          <div
            onClick={() => setPreviewPhoto(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              display: "grid",
              placeItems: "center",
              zIndex: 9999,
              padding: 16,
            }}
            title="Zatvori"
          >
            <div style={{ maxWidth: "95vw", maxHeight: "90vh", background: "#0f2328", border: `1px solid ${deco.edge}`, borderRadius: 12, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{previewPhoto.name}</div>
                <button style={{ ...btn.base, ...btn.danger }} onClick={() => setPreviewPhoto(null)}>Zatvori ✖</button>
              </div>
              <img src={previewPhoto.image} alt={previewPhoto.name} style={{ maxWidth: "90vw", maxHeight: "75vh", borderRadius: 8 }} />
            </div>
          </div>
        )}

        <footer style={{ textAlign: "center", fontSize: 12, color: "#8ea3a9", padding: 16 }}>
          © {new Date().getFullYear()} PEPEDOT · PP BRTVLJENJE - FOTOTOČKA NANACRTU
        </footer>
      </div>
    </div>
  );
}
