/** @type {import('next').NextConfig} */
module.exports = {
  outputFileTracingIncludes: { '/*': ['./schema.sql'] },
  // Lets phones on the home network open the dev server by its LAN address.
  allowedDevOrigins: ['192.168.*.*'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
