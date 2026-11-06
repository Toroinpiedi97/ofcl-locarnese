// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const nivoOflTheme: any = {
  background: "transparent",
  text: {
    fontSize: 11,
    fill: "#334155",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
  },
  axis: {
    domain: {
      line: {
        stroke: "rgba(148, 163, 184, 0.4)",
        strokeWidth: 1,
      },
    },
    ticks: {
      line: {
        stroke: "rgba(148, 163, 184, 0.4)",
        strokeWidth: 1,
      },
      text: {
        fontSize: 10,
        fill: "#475569",
        fontFamily: 'monospace, -apple-system, BlinkMacSystemFont, "Inter", sans-serif',
      },
    },
    legend: {
      text: {
        fontSize: 11,
        fill: "#1e293b",
        fontWeight: 600,
      },
    },
  },
  grid: {
    line: {
      stroke: "rgba(148, 163, 184, 0.22)",
      strokeWidth: 1,
      strokeDasharray: "3 3",
    },
  },
  legends: {
    title: {
      text: {
        fontSize: 11,
        fill: "#0f172a",
        fontWeight: 600,
      },
    },
    text: {
      fontSize: 11,
      fill: "#334155",
      fontWeight: 500,
    },
  },
  tooltip: {
    container: {
      background: "rgba(15, 23, 42, 0.94)",
      color: "#f8fafc",
      fontSize: "12px",
      borderRadius: "12px",
      boxShadow: "0 10px 25px -4px rgba(0, 0, 0, 0.35)",
      padding: "8px 12px",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    },
  },
};
