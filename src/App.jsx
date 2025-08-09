<div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
  <button style={{ ...btn.base, ...btn.primary }} onClick={() => addPointWithPhoto(true)}>📷 Nova točka (kamera)</button>
  <button style={{ ...btn.base }} onClick={() => addPointWithPhoto(false)}>📁 Nova točka (iz galerije)</button>
  <div style={{ fontSize: 11, color: "#9fb2b8", alignSelf: "center" }}>
    Hint: Tapni po tlocrtu ili koristi gumb da dodaš točku s fotografijom.
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
  title="Tapni/dvoklik na tlocrt za dodavanje točke s fotografijom"
>
  <Stage width={stageSize.width} height={stageSize.height} ref={stageRef} onClick={() => addPointWithPhoto(true)}>
    ...
  </Stage>
</div>
