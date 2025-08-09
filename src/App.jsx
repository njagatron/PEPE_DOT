import React from "react";

function App() {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>PEPEDOT</h1>
        <p style={styles.subtitle}>Protupožarno brtvljenje — građevinska aplikacija</p>
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Evidencija radova</h2>
          <p style={styles.cardText}>
            Jednostavno bilježi sve radove, materijale i fotografije na gradilištu.
          </p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Sigurnosni standardi</h2>
          <p style={styles.cardText}>
            Usklađeno s protupožarnim normama i tehničkim smjernicama.
          </p>
        </div>
      </main>

      <footer style={styles.footer}>
        <p>© 2025 PEPEDOT</p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "'Gill Sans', 'Trebuchet MS', sans-serif",
    backgroundColor: "#1A1A1A",
    color: "#E6D5B8",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "20px",
    textAlign: "center",
    borderBottom: "3px solid #C89B3C",
  },
  title: {
    fontSize: "3rem",
    margin: 0,
    fontWeight: "bold",
    letterSpacing: "4px",
  },
  subtitle: {
    fontSize: "1.2rem",
    fontStyle: "italic",
    color: "#C89B3C",
  },
  main: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
    padding: "20px",
  },
  card: {
    backgroundColor: "#262626",
    border: "2px solid #C89B3C",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    transition: "transform 0.2s",
  },
  cardTitle: {
    fontSize: "1.5rem",
    marginBottom: "10px",
    color: "#FFD580",
  },
  cardText: {
    fontSize: "1rem",
    lineHeight: 1.5,
  },
  footer: {
    padding: "10px",
    textAlign: "center",
    borderTop: "2px solid #C89B3C",
    fontSize: "0.9rem",
  },
};

export default App;
