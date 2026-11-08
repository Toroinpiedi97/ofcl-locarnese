/**
 * Utility 100% client-side per l'esportazione di grafici SVG in formato PNG, JPEG e SVG.
 * Esegue la serializzazione vettoriale e il rendering su canvas HTML5 off-screen.
 * Zero chiamate al server, zero latenza, privacy-preserving.
 */

export type ExportFormat = "svg" | "png" | "jpeg";

export interface ExportChartOptions {
  filename?: string;
  format: ExportFormat;
  backgroundColor?: string;
  quality?: number; // per JPEG (0.0 - 1.0)
}

/**
 * Esporta un elemento SVG del DOM nel formato richiesto e ne avvia il download nel browser.
 */
export async function exportSvgElement(
  svgElement: SVGSVGElement,
  options: ExportChartOptions
): Promise<void> {
  const {
    filename = "grafico-ofcl",
    format = "png",
    backgroundColor = "#ffffff",
    quality = 0.95,
  } = options;

  // 1. Clona l'SVG per calcolare e incorporare gli stili computati
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

  // Calcola le dimensioni native effettive dell'SVG del grafico
  const attrW = parseFloat(svgElement.getAttribute("width") || "");
  const attrH = parseFloat(svgElement.getAttribute("height") || "");
  const bbox = svgElement.getBoundingClientRect();
  const width = Math.round(attrW > 0 ? attrW : bbox.width > 0 ? bbox.width : 800);
  const height = Math.round(attrH > 0 ? attrH : bbox.height > 0 ? bbox.height : 400);

  // Assicura viewBox per mantenere la fedeltà e il rapporto d'aspetto vettoriale
  if (!clonedSvg.getAttribute("viewBox")) {
    clonedSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  clonedSvg.setAttribute("width", String(width));
  clonedSvg.setAttribute("height", String(height));
  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  // Inietta font e stili per resa tipografica impeccabile
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    text { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  `;
  clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);

  // Sfondo solido per visualizzatori esterni (sia formato SVG che raster PNG/JPEG)
  if (backgroundColor && backgroundColor !== "transparent") {
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", backgroundColor);
    clonedSvg.insertBefore(bgRect, styleElement.nextSibling);
  }

  // Serializza l'SVG in stringa XML
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);

  if (format === "svg") {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, `${filename}.svg`);
    return;
  }

  // Per PNG e JPEG: renderizziamo su un canvas HTML5 off-screen
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      try {
        const scale = Math.max(window.devicePixelRatio || 2, 2); // Alta risoluzione Retina (minimo 2x)
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Impossibile inizializzare il contesto Canvas 2D");
        }

        ctx.scale(scale, scale);

        // Sfondo opaco (fondamentale per JPEG e PNG nitidi)
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Disegna l'immagine SVG rasterizzata
        ctx.drawImage(img, 0, 0, width, height);

        URL.revokeObjectURL(url);

        const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
        canvas.toBlob(
          (blob) => {
            if (blob) {
              downloadBlob(blob, `${filename}.${format}`);
              resolve();
            } else {
              reject(new Error("Errore durante la generazione del Blob da canvas"));
            }
          },
          mimeType,
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Errore durante il caricamento del raster SVG"));
    };

    img.src = url;
  });
}

/**
 * Scarica un Blob come file nel browser del client.
 */
function downloadBlob(blob: Blob, fullFilename: string) {
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = fullFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
