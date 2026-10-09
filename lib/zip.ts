// Minimal streaming ZIP writer (STORE only — JPEGs don't compress further).
// Each entry is read fully before it's emitted so the CRC and size go in the
// local header; photos are ~1 MB, so memory stays flat.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosTime(d: Date) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

export type ZipEntry = { name: string; date: Date; read: () => Promise<Uint8Array | null> };

export function zipStream(entries: ZipEntry[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const central: Uint8Array[] = [];
  let offset = 0;
  let i = 0;
  let count = 0;

  return new ReadableStream({
    async pull(controller) {
      while (i < entries.length) {
        const e = entries[i++];
        const data = await e.read();
        if (!data) continue;
        const name = enc.encode(e.name);
        const crc = crc32(data);
        const { time, date } = dosTime(e.date);

        const local = new DataView(new ArrayBuffer(30));
        local.setUint32(0, 0x04034b50, true);
        local.setUint16(4, 20, true);
        local.setUint16(6, 0x0800, true); // UTF-8 names (Thai/Chinese)
        local.setUint16(8, 0, true);
        local.setUint16(10, time, true);
        local.setUint16(12, date, true);
        local.setUint32(14, crc, true);
        local.setUint32(18, data.length, true);
        local.setUint32(22, data.length, true);
        local.setUint16(26, name.length, true);
        local.setUint16(28, 0, true);

        const cd = new DataView(new ArrayBuffer(46));
        cd.setUint32(0, 0x02014b50, true);
        cd.setUint16(4, 20, true);
        cd.setUint16(6, 20, true);
        cd.setUint16(8, 0x0800, true);
        cd.setUint16(10, 0, true);
        cd.setUint16(12, time, true);
        cd.setUint16(14, date, true);
        cd.setUint32(16, crc, true);
        cd.setUint32(20, data.length, true);
        cd.setUint32(24, data.length, true);
        cd.setUint16(28, name.length, true);
        cd.setUint32(42, offset, true);
        central.push(new Uint8Array(cd.buffer), name);

        controller.enqueue(new Uint8Array(local.buffer));
        controller.enqueue(name);
        controller.enqueue(data);
        offset += 30 + name.length + data.length;
        count++;
        return;
      }

      let cdSize = 0;
      for (const c of central) {
        controller.enqueue(c);
        cdSize += c.length;
      }
      const end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true);
      end.setUint16(8, count, true);
      end.setUint16(10, count, true);
      end.setUint32(12, cdSize, true);
      end.setUint32(16, offset, true);
      controller.enqueue(new Uint8Array(end.buffer));
      controller.close();
    },
  });
}

// Filesystem-safe name segment that keeps Thai/Chinese characters.
export function safeSegment(s: string) {
  return (
    s
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "x"
  );
}
