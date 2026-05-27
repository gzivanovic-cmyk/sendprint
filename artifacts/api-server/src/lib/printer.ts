import net from "node:net";

export interface SendZplResult {
  success: boolean;
  bytesSent: number;
  errorMessage: string | null;
}

export function sendZplToPrinter(
  host: string,
  port: number,
  zpl: string,
  timeoutMs = 5000,
): Promise<SendZplResult> {
  return new Promise((resolve) => {
    const buf = Buffer.from(zpl, "utf8");
    const socket = new net.Socket();
    let settled = false;

    const finish = (result: SendZplResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);

    socket.on("timeout", () => {
      finish({ success: false, bytesSent: 0, errorMessage: `Timeout connecting to printer at ${host}:${port}` });
    });

    socket.on("error", (err) => {
      finish({ success: false, bytesSent: 0, errorMessage: err.message });
    });

    socket.connect(port, host, () => {
      socket.write(buf, (err) => {
        if (err) {
          finish({ success: false, bytesSent: 0, errorMessage: err.message });
          return;
        }
        socket.end();
        finish({ success: true, bytesSent: buf.length, errorMessage: null });
      });
    });
  });
}

export function checkPrinterReachable(
  host: string,
  port: number,
  timeoutMs = 3000,
): Promise<{ online: boolean; message: string | null }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (online: boolean, message: string | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ online, message });
    };

    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => finish(false, `Timeout connecting to ${host}:${port}`));
    socket.on("error", (err) => finish(false, err.message));
    socket.connect(port, host, () => finish(true, null));
  });
}
