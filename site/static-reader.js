/* Read-only transport for an exported planning site. No local service is used. */
(() => {
  const base = new URL('.', document.currentScript.src);
  const fetchFile = window.fetch.bind(window);
  const json = (message, status) => Promise.resolve(new Response(JSON.stringify({message}), {
    status, headers: {'Content-Type': 'application/json; charset=utf-8'}
  }));
  const records = {
    '/api/full/catalog': 'catalog.json',
    '/api/full/formal': 'full-formal.json',
    '/api/shop-ui/formal': 'shop-formal.json',
    '/api/formal': 'car-wash.json',
    '/api/flows/published': 'flows.json',
    '/api/health': 'health.json'
  };
  window.fetch = (input, options = {}) => {
    const url = new URL(input instanceof Request ? input.url : input, location.href);
    if (url.origin !== base.origin) return fetchFile(input, options);
    let pathname = url.pathname;
    if (pathname.startsWith(base.pathname)) pathname = '/' + pathname.slice(base.pathname.length);
    if (!pathname.startsWith('/api/')) return fetchFile(input, options);
    const method = String(options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (!['GET', 'HEAD'].includes(method)) return json('在线阅读版只允许查看', 405);
    const flow = pathname.match(/^\/api\/flows\/published\/([a-zA-Z0-9_-]{1,80})$/);
    const file = records[pathname] || (flow ? 'flows/' + flow[1] + '.json' : null);
    if (!file) return json('此内容尚未发布或不属于阅读版', 404);
    return fetchFile(new URL('assets/readonly-data/' + file, base), {
      ...options, method, signal: options.signal || (input instanceof Request ? input.signal : undefined)
    });
  };
})();
