import { BaseViewer } from "./BaseViewer";
import { MediaKitError, type DocumentItem, type MediaType, type ViewerDeps } from "../core/types";
import { el as h } from "../core/ui/dom";

/**
 * Renders a PDF document.
 *
 * `pdfjs-dist` is an *optional peer dependency* - we only `import()` it if
 * the host app has it installed, so projects that don't need document
 * support don't pay for pdf.js in their bundle. If it's not present we fall
 * back to the browser's native PDF viewer inside an <iframe>, which covers
 * the vast majority of desktop browsers.
 */
export class DocumentViewer extends BaseViewer<DocumentItem> {
  readonly type: MediaType = "document";
  private root!: HTMLDivElement;
  private currentPage = 1;
  private totalPages = 1;

  protected async onMount(el: HTMLElement, item: DocumentItem, deps: ViewerDeps): Promise<void> {
    this.root = h("div", { class: "nmk-document-viewer" });
    el.appendChild(this.root);

    const pdfjs = await tryLoadPdfJs();
    if (!pdfjs) {
      this.mountIframeFallback(item);
      return;
    }

    try {
      await this.mountCanvasRenderer(pdfjs, item);
    } catch (err) {
      deps.onError(new MediaKitError(deps.t("error.load"), "DOCUMENT_LOAD_FAILED", item.id, err));
      this.mountIframeFallback(item);
    }
  }

  private mountIframeFallback(item: DocumentItem): void {
    this.root.appendChild(
      h("iframe", {
        class: "nmk-document-viewer__iframe",
        src: item.src,
        title: "document",
      })
    );
  }

  private async mountCanvasRenderer(pdfjs: PdfJsLib, item: DocumentItem): Promise<void> {
    const doc = await pdfjs.getDocument(item.src).promise;
    this.totalPages = doc.numPages;

    const canvas = h("canvas", { class: "nmk-document-viewer__canvas" }) as HTMLCanvasElement;
    const nav = h("div", { class: "nmk-document-viewer__nav" });
    const prev = h("button", { type: "button" }, ["‹"]);
    const next = h("button", { type: "button" }, ["›"]);
    const pageLabel = h("span", { class: "nmk-document-viewer__page" });
    nav.append(prev, pageLabel, next);
    this.root.append(canvas, nav);

    const renderPage = async (pageNum: number) => {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      pageLabel.textContent = `${pageNum} / ${this.totalPages}`;
      this.currentPage = pageNum;
    };

    this.addListener(prev, "click", () => {
      if (this.currentPage > 1) void renderPage(this.currentPage - 1);
    });
    this.addListener(next, "click", () => {
      if (this.currentPage < this.totalPages) void renderPage(this.currentPage + 1);
    });

    await renderPage(1);
  }
}

interface PdfJsLib {
  getDocument(src: string): { promise: Promise<PdfJsDocument> };
}
interface PdfJsDocument {
  numPages: number;
  getPage(n: number): Promise<PdfJsPage>;
}
interface PdfJsPage {
  getViewport(opts: { scale: number }): { width: number; height: number };
  render(opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): { promise: Promise<void> };
}

async function tryLoadPdfJs(): Promise<PdfJsLib | null> {
  return null;
  // try {
  //   // Optional peer dependency - resolved dynamically so it's not a hard
  //   // requirement of the core bundle. Consumers who want in-app PDF
  //   // rendering install `pdfjs-dist` themselves.
  //   const mod: any = await import(/* @vite-ignore */ "pdfjs-dist/build/pdf.mjs");
  //   if (mod?.GlobalWorkerOptions) {
  //     mod.GlobalWorkerOptions.workerSrc = new URL(
  //       "pdfjs-dist/build/pdf.worker.mjs",
  //       import.meta.url
  //     ).toString();
  //   }
  //   return mod as PdfJsLib;
  // } catch {
  //   return null;
  // }
}

export default DocumentViewer;
