// Minimal one-sheet .xlsx writer with pictures placed over cells. An .xlsx is a
// ZIP of XML parts, so this reuses zipStream rather than pulling in a library.
import { zipStream, type ZipEntry } from "./zip";

export type XlsxImage = {
  data: Uint8Array;
  ext: "jpeg" | "png";
  col: number; // 0-based cell the picture sits in
  row: number;
  x: number; // px offset inside that cell
  y: number;
  w: number; // px
  h: number;
  name: string;
  link?: string; // opened when the picture is clicked
};

export type XlsxSheet = {
  name: string;
  rows: string[][]; // first row is the header
  colWidths: number[]; // px
  rowHeights: (number | undefined)[]; // px, undefined lets Excel size the row
  images: XlsxImage[];
};

// Width and height of a JPEG or PNG, or null for anything Excel can't embed.
export function imageInfo(b: Uint8Array): { ext: "jpeg" | "png"; w: number; h: number } | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b.length > 24) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { ext: "png", w: v.getUint32(16), h: v.getUint32(20) };
  }
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1];
    if (m === 0xff) {
      i++;
      continue;
    }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd8)) {
      i += 2;
      continue;
    }
    // SOF0–SOF15 carry the size; C4/C8/CC are other markers in that range.
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { ext: "jpeg", h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
    }
    i += 2 + ((b[i + 2] << 8) | b[i + 3]);
  }
  return null;
}

const esc = (s: string) =>
  s
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function colName(i: number) {
  let s = "";
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}

const EMU = 9525; // per pixel
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

function sheetXml(s: XlsxSheet) {
  const cols = s.colWidths
    .map((px, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(1, (px - 5) / 7).toFixed(2)}" customWidth="1"/>`)
    .join("");
  const rows = s.rows
    .map((row, r) => {
      const ht = s.rowHeights[r];
      const attrs = ht ? ` ht="${Math.min(409, ht * 0.75).toFixed(2)}" customHeight="1"` : "";
      const cells = row
        .map((v, c) => {
          const style = r === 0 ? 1 : 2;
          if (!v) return `<c r="${colName(c)}${r + 1}" s="${style}"/>`;
          return `<c r="${colName(c)}${r + 1}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}"${attrs}>${cells}</row>`;
    })
    .join("");
  return (
    XML +
    `<worksheet xmlns="${MAIN}" xmlns:r="${REL}">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${rows}</sheetData>` +
    (s.images.length ? `<drawing r:id="rId1"/>` : "") +
    `</worksheet>`
  );
}

function drawingXml(images: XlsxImage[]) {
  const pics = images
    .map((im, i) => {
      const link = im.link ? `<a:hlinkClick r:id="rIdL${i + 1}"/>` : "";
      return (
        `<xdr:oneCellAnchor><xdr:from><xdr:col>${im.col}</xdr:col><xdr:colOff>${Math.round(im.x * EMU)}</xdr:colOff>` +
        `<xdr:row>${im.row}</xdr:row><xdr:rowOff>${Math.round(im.y * EMU)}</xdr:rowOff></xdr:from>` +
        `<xdr:ext cx="${Math.round(im.w * EMU)}" cy="${Math.round(im.h * EMU)}"/>` +
        `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i + 2}" name="Picture ${i + 1}" descr="${esc(im.name)}">${link}</xdr:cNvPr>` +
        `<xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>` +
        `<xdr:blipFill><a:blip r:embed="rIdI${i + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
        `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(im.w * EMU)}" cy="${Math.round(im.h * EMU)}"/></a:xfrm>` +
        `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`
      );
    })
    .join("");
  return (
    XML +
    `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${REL}">` +
    pics +
    `</xdr:wsDr>`
  );
}

function rels(list: { id: string; type: string; target: string; external?: boolean }[]) {
  return (
    XML +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    list
      .map((r) => `<Relationship Id="${r.id}" Type="${REL}/${r.type}" Target="${esc(r.target)}"${r.external ? ' TargetMode="External"' : ""}/>`)
      .join("") +
    `</Relationships>`
  );
}

const STYLES =
  XML +
  `<styleSheet xmlns="${MAIN}">` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
  `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

export function xlsxStream(sheet: XlsxSheet): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const date = new Date();
  const text = (name: string, xml: string): ZipEntry => ({ name, date, read: async () => enc.encode(xml) });
  const hasImages = sheet.images.length > 0;
  const T = "application/vnd.openxmlformats-officedocument";

  const entries: ZipEntry[] = [
    text(
      "[Content_Types].xml",
      XML +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="${T}.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="${T}.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="${T}.spreadsheetml.styles+xml"/>` +
        (hasImages ? `<Override PartName="/xl/drawings/drawing1.xml" ContentType="${T}.drawing+xml"/>` : "") +
        `</Types>`,
    ),
    text("_rels/.rels", rels([{ id: "rId1", type: "officeDocument", target: "xl/workbook.xml" }])),
    text(
      "xl/workbook.xml",
      XML + `<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets><sheet name="${esc(sheet.name)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    text(
      "xl/_rels/workbook.xml.rels",
      rels([
        { id: "rId1", type: "worksheet", target: "worksheets/sheet1.xml" },
        { id: "rId2", type: "styles", target: "styles.xml" },
      ]),
    ),
    text("xl/styles.xml", STYLES),
    text("xl/worksheets/sheet1.xml", sheetXml(sheet)),
  ];
  if (hasImages) {
    entries.push(
      text("xl/worksheets/_rels/sheet1.xml.rels", rels([{ id: "rId1", type: "drawing", target: "../drawings/drawing1.xml" }])),
      text("xl/drawings/drawing1.xml", drawingXml(sheet.images)),
      text(
        "xl/drawings/_rels/drawing1.xml.rels",
        rels(
          sheet.images.flatMap((im, i) => [
            { id: `rIdI${i + 1}`, type: "image", target: `../media/image${i + 1}.${im.ext}` },
            ...(im.link ? [{ id: `rIdL${i + 1}`, type: "hyperlink", target: im.link, external: true }] : []),
          ]),
        ),
      ),
      ...sheet.images.map((im, i): ZipEntry => ({ name: `xl/media/image${i + 1}.${im.ext}`, date, read: async () => im.data })),
    );
  }
  return zipStream(entries);
}
