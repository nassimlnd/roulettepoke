// Pont TLS local pour Chromium dans l'environnement d'exécution distant.
//
// Problème : le terminateur TLS du proxy d'egress de l'environnement reset le
// handshake BoringSSL de Chromium (curl/openssl/Node passent sans problème).
// Solution : Chromium parle à ce pont local (TLS terminé localement avec un
// certificat auto-signé + --ignore-certificate-errors), et le pont rétablit la
// connexion upstream via le proxy d'agent avec la pile TLS de Node, en vérifiant
// le certificat upstream contre le CA bundle du proxy. Les flux déchiffrés sont
// pipés dans les deux sens — HTTP/1.1 et WebSockets transitent tels quels.
//
// La vérification TLS upstream reste donc entière ; seul le tronçon
// loopback (127.0.0.1) utilise un certificat local.

import http from 'node:http';
import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';

const LISTEN_PORT = Number(process.env.BRIDGE_PORT || 4400);
const AGENT_PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:38405';
const CA_BUNDLE = process.env.NODE_EXTRA_CA_CERTS || '/root/.ccr/ca-bundle.crt';
const CERT_DIR = process.env.BRIDGE_CERT_DIR || new URL('./certs/', import.meta.url).pathname;

const proxyUrl = new URL(AGENT_PROXY);
const ca = fs.readFileSync(CA_BUNDLE);
const localKey = fs.readFileSync(`${CERT_DIR}/bridge-key.pem`);
const localCert = fs.readFileSync(`${CERT_DIR}/bridge-cert.pem`);

function connectUpstream(host, port) {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host: proxyUrl.hostname, port: Number(proxyUrl.port) }, () => {
      sock.write(`CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\n\r\n`);
    });
    let buf = Buffer.alloc(0);
    const onData = (d) => {
      buf = Buffer.concat([buf, d]);
      const idx = buf.indexOf('\r\n\r\n');
      if (idx === -1) return;
      sock.off('data', onData);
      const head = buf.slice(0, idx).toString();
      if (!/^HTTP\/1\.[01] 200/.test(head)) {
        sock.destroy();
        return reject(new Error(`CONNECT refusé: ${head.split('\r\n')[0]}`));
      }
      const rest = buf.slice(idx + 4);
      const secure = tls.connect({
        socket: sock,
        servername: host,
        ca,
        ALPNProtocols: ['http/1.1'],
      }, () => resolve(secure));
      if (rest.length) secure.unshift(rest);
      secure.on('error', reject);
    };
    sock.on('data', onData);
    sock.on('error', reject);
    sock.setTimeout(15000, () => { sock.destroy(); reject(new Error('CONNECT timeout')); });
  });
}

const server = http.createServer((req, res) => {
  res.writeHead(400); res.end('CONNECT only');
});

server.on('connect', async (req, clientSock, head) => {
  const [host, portStr] = req.url.split(':');
  const port = Number(portStr || 443);
  try {
    const upstream = await connectUpstream(host, port);
    clientSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    const clientTls = new tls.TLSSocket(clientSock, {
      isServer: true,
      key: localKey,
      cert: localCert,
      ALPNProtocols: ['http/1.1'],
    });
    if (head?.length) clientTls.unshift(head);
    clientTls.pipe(upstream);
    upstream.pipe(clientTls);
    const kill = () => { clientTls.destroy(); upstream.destroy(); };
    clientTls.on('error', kill);
    upstream.on('error', kill);
    clientTls.on('close', kill);
    upstream.on('close', kill);
  } catch (err) {
    console.error(`[bridge] ${host}:${port} — ${err.message}`);
    clientSock.destroy();
  }
});

server.listen(LISTEN_PORT, '127.0.0.1', () => {
  console.log(`[bridge] prêt sur 127.0.0.1:${LISTEN_PORT} → ${AGENT_PROXY}`);
});
