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
  title?: string;
  subtitle?: string;
  source?: string;
  legalNotice?: string;
}

/**
 * Esporta un elemento SVG del DOM nel formato richiesto e ne avvia il download nel browser.
 * Se specificati titolo o fonte, compone una grafica editoriale completa con header istituzionale
 * e footer di trasparenza contabile (fonte ufficiale MCA2 e attribuzione ofcl.ch).
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
    title,
    subtitle,
    source,
    legalNotice,
  } = options;

  // 1. Calcola le dimensioni native effettive dell'SVG del grafico di origine
  const attrW = parseFloat(svgElement.getAttribute("width") || "");
  const attrH = parseFloat(svgElement.getAttribute("height") || "");
  const bbox = svgElement.getBoundingClientRect();
  const width = Math.round(attrW > 0 ? attrW : bbox.width > 0 ? bbox.width : 800);
  const height = Math.round(attrH > 0 ? attrH : bbox.height > 0 ? bbox.height : 400);

  // 2. Clona l'SVG del grafico per non alterare il DOM della pagina
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  if (!clonedSvg.getAttribute("viewBox")) {
    clonedSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  // 3. Determina se includere Header e Footer di trasparenza
  const hasHeader = Boolean(title);
  const hasFooter = Boolean(title || source || legalNotice);

  const headerHeight = hasHeader ? (subtitle ? 86 : 68) : 0;
  const footerHeight = hasFooter ? 54 : 0;

  // Garantisce larghezza minima (760px) affinché la tipografia e i disclaimer non vengano troncati
  const targetWidth = (hasHeader || hasFooter) ? Math.max(width, 760) : width;
  const scaleRatio = targetWidth / width;
  const targetChartHeight = Math.round(height * scaleRatio);
  const totalHeight = headerHeight + targetChartHeight + footerHeight;

  // 4. Crea l'SVG master contenitore
  const masterSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  masterSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  masterSvg.setAttribute("width", String(targetWidth));
  masterSvg.setAttribute("height", String(totalHeight));
  masterSvg.setAttribute("viewBox", `0 0 ${targetWidth} ${totalHeight}`);

  // Stile tipografico istituzionale incorporato
  const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleElement.textContent = `
    text {
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
  `;
  masterSvg.appendChild(styleElement);

  // Sfondo opaco uniforme
  if (backgroundColor && backgroundColor !== "transparent") {
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", backgroundColor);
    masterSvg.appendChild(bgRect);
  }

  // 5. Costruzione dell'Header (Brand, Titolo e Sottotitolo)
  if (hasHeader) {
    const headerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // Brand badge superiore
    const brandText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    brandText.setAttribute("x", "24");
    brandText.setAttribute("y", "22");
    brandText.setAttribute("font-size", "10");
    brandText.setAttribute("font-weight", "700");
    brandText.setAttribute("fill", "#0284c7");
    brandText.setAttribute("letter-spacing", "0.5");
    brandText.textContent = "OFCL · OSSERVATORIO FINANZE COMUNALI DEL LOCARNESE";
    headerGroup.appendChild(brandText);

    // Titolo principale del grafico
    const titleText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    titleText.setAttribute("x", "24");
    titleText.setAttribute("y", "44");
    titleText.setAttribute("font-size", "15");
    titleText.setAttribute("font-weight", "700");
    titleText.setAttribute("fill", "#0f172a");
    titleText.textContent = title || "";
    headerGroup.appendChild(titleText);

    // Sottotitolo descrittivo / entità
    if (subtitle) {
      const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      subText.setAttribute("x", "24");
      subText.setAttribute("y", "64");
      subText.setAttribute("font-size", "12");
      subText.setAttribute("font-weight", "500");
      subText.setAttribute("fill", "#475569");
      subText.textContent = subtitle;
      headerGroup.appendChild(subText);
    }

    // Linea divisoria sottile
    const headerLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    headerLine.setAttribute("x1", "24");
    headerLine.setAttribute("y1", String(headerHeight - 8));
    headerLine.setAttribute("x2", String(targetWidth - 24));
    headerLine.setAttribute("y2", String(headerHeight - 8));
    headerLine.setAttribute("stroke", "#e2e8f0");
    headerLine.setAttribute("stroke-width", "1");
    headerGroup.appendChild(headerLine);

    masterSvg.appendChild(headerGroup);
  }

  // 6. Inserimento del grafico SVG (posizionato sotto l'header)
  clonedSvg.setAttribute("x", "0");
  clonedSvg.setAttribute("y", String(headerHeight));
  clonedSvg.setAttribute("width", String(targetWidth));
  clonedSvg.setAttribute("height", String(targetChartHeight));
  masterSvg.appendChild(clonedSvg);

  // 7. Costruzione del Footer di trasparenza e legal notice
  if (hasFooter) {
    const footerY = headerHeight + targetChartHeight;
    const footerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // Linea divisoria superiore del footer
    const footerLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    footerLine.setAttribute("x1", "24");
    footerLine.setAttribute("y1", String(footerY + 8));
    footerLine.setAttribute("x2", String(targetWidth - 24));
    footerLine.setAttribute("y2", String(footerY + 8));
    footerLine.setAttribute("stroke", "#e2e8f0");
    footerLine.setAttribute("stroke-width", "1");
    footerGroup.appendChild(footerLine);

    // Fonte ufficiale contabile
    const defaultSource = "Fonte: Rendiconti e Consuntivi Ufficiali MCA2 / Sezione enti locali (SEL) Canton Ticino";
    const sourceTextEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    sourceTextEl.setAttribute("x", "24");
    sourceTextEl.setAttribute("y", String(footerY + 26));
    sourceTextEl.setAttribute("font-size", "11");
    sourceTextEl.setAttribute("font-weight", "500");
    sourceTextEl.setAttribute("fill", "#334155");
    sourceTextEl.textContent = source || defaultSource;
    footerGroup.appendChild(sourceTextEl);

    // Attribuzione OFCL e base giuridica art. 192 LOC
    const defaultLegal = "Elaborazione dati aperti: ofcl.ch · Trasparenza dei conti comunali ai sensi dell'art. 192 LOC";
    const legalTextEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    legalTextEl.setAttribute("x", "24");
    legalTextEl.setAttribute("y", String(footerY + 42));
    legalTextEl.setAttribute("font-size", "10");
    legalTextEl.setAttribute("font-weight", "400");
    legalTextEl.setAttribute("fill", "#64748b");
    legalTextEl.textContent = legalNotice || defaultLegal;
    footerGroup.appendChild(legalTextEl);

    // Watermark/link destro
    const rightBadge = document.createElementNS("http://www.w3.org/2000/svg", "text");
    rightBadge.setAttribute("x", String(targetWidth - 24));
    rightBadge.setAttribute("y", String(footerY + 42));
    rightBadge.setAttribute("text-anchor", "end");
    rightBadge.setAttribute("font-size", "10");
    rightBadge.setAttribute("font-weight", "600");
    rightBadge.setAttribute("fill", "#0284c7");
    rightBadge.textContent = "ofcl.ch";
    footerGroup.appendChild(rightBadge);

    masterSvg.appendChild(footerGroup);
  }

  // 8. Serializzazione XML dell'SVG composto
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(masterSvg);

  if (format === "svg") {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, `${filename}.svg`);
    return;
  }

  // 9. Per PNG e JPEG: rendering su canvas HTML5 off-screen a risoluzione Retina
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      try {
        const scale = Math.max(window.devicePixelRatio || 2, 2); // Minimo 2x Retina
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth * scale;
        canvas.height = totalHeight * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Impossibile inizializzare il contesto Canvas 2D");
        }

        ctx.scale(scale, scale);

        // Sfondo opaco
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, targetWidth, totalHeight);

        // Disegna l'immagine SVG rasterizzata completa
        ctx.drawImage(img, 0, 0, targetWidth, totalHeight);

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
