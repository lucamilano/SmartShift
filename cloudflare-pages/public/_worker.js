const gateway = {
  async fetch(request, env) {
    // Keep the public URL, method, cookies, body, and Cloudflare client IP.
    // The backend has no public workers.dev URL; this binding is its only entry.
    return env.SMARTSHIFT.fetch(request);
  },
};

export default gateway;
