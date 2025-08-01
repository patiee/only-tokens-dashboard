import http from 'http';
import httpProxy from 'http-proxy';

const proxy = httpProxy.createProxyServer({ target: 'http://localhost:5173', selfHandleResponse: true });

const server = http.createServer((req, res) => {
  proxy.web(req, res);

  proxy.on('proxyRes', (proxyRes, req, res) => {
    // Copy status code
    res.writeHead(proxyRes.statusCode, Object.fromEntries(
      Object.entries(proxyRes.headers).filter(([key]) =>
        key.toLowerCase() !== 'content-security-policy' &&
        key.toLowerCase() !== 'content-security-policy-report-only'
      )
    ));

    proxyRes.pipe(res);
  });
});

server.listen(3000, () => {
  console.log('🚀 CSP-stripping proxy running at http://localhost:3000');
});
