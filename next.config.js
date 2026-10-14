module.exports = {
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      { source: '/register', destination: '/register.html' },
    ];
  },
  async headers() {
    return [
      { source: '/(.*)', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'same-origin' },
      ] },
      { source: '/team-:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};
